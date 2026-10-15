// S/L Insights calculator. Computes one race's insights from its full results and writes them
// into data/meets/<slug>.json (replacing that race's tab if it already exists).
//
// Usage (from the repo root):
//   node tools/insights.js --meet <slug> --race "Men's 8K" --results <results.csv> | --teams <teams.csv>  --ranks <ranks.csv> [--lede "..."] [--src "..."] [--srcUrl "..."] [--dry]
//
// results.csv  header row required. Columns: place,name,team,class,time  plus optional split columns
//              named like 2K,4K,6K (cumulative times, in race order). One row per finisher, every
//              finisher in the race (unattached runners included; give them team "" or "Unattached").
//              time/splits: "22:30.1", "1:02:03.4" or seconds. class: FR, SO, JR, SR, GR (blank = unknown).
// ranks.csv    team,rank  - the national poll published BEFORE the race (USTFCCCA / DyeStat).
//              Use the team name as it appears in the results, or the script matches loosely.
//
// Scoring follows standard XC rules: only teams with 5+ finishers score; runners from non-scoring
// teams are removed and places renumbered; a team's top 5 score, its 6th and 7th displace; ties
// break on the 6th runner (a team with a 6th beats one without).
// Always compare the printed team scores with the official ones. If they differ, do not publish.
const fs = require("fs"), path = require("path");

const args = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) if (av[i].startsWith("--")) { const k = av[i].slice(2); args[k] = (av[i + 1] && !av[i + 1].startsWith("--")) ? av[++i] : true; }
for (const k of ["meet", "race"]) if (!args[k]) { console.error(`missing --${k}`); process.exit(1); }
if (!args.results && !args.teams) { console.error("need --results <csv> or --teams <csv>"); process.exit(1); }

function csv(file) {
  const rows = []; let row = [], f = "", q = false; const s = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(f); f = ""; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else f += c; }
  row.push(f); if (row.some(x => x.trim())) rows.push(row);
  const head = rows.shift().map(h => h.trim());
  return { head, rows: rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()]))) };
}
const sec = t => { if (t == null || t === "") return null; if (/^\d+(\.\d+)?$/.test(t)) return +t; const p = t.split(":").map(Number); return p.reduce((a, b) => a * 60 + b, 0); };
const fmt = s => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, "0")}`; };
const norm = s => s.toLowerCase().replace(/&/g, "and").replace(/\bst\.?(?=\s|$)/g, "state").replace(/\b(university|univ|u|college|of|the|at)\b/g, "").replace(/[^a-z0-9]/g, "");
const ord = n => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

// --teams mode: only the official TEAM table is available (team,place,points,places with places
// separated by ";" and including 6th/7th runners). Gives the upset meter and dual meets; pack spread,
// next year's race and split cards need --results.
const TEAMS_ONLY = !args.results;
let splitCols = [], runners;
if (TEAMS_ONLY) {
  const T = csv(args.teams).rows; runners = [];
  for (const r of T) { const ps = r.places.split(/[;\s]+/).filter(Boolean).map(Number);
    if (ps.slice(0, 5).reduce((a, b) => a + b, 0) !== +r.points) { console.error(`${r.team}: places don't add up to ${r.points}; fix the table`); process.exit(1); }
    ps.forEach(p => runners.push({ name: "", team: r.team.trim(), cls: "", t: p, place: p, splits: [] })); }
  runners.sort((a, b) => a.place - b.place);
} else {
  const R = csv(args.results);
  splitCols = R.head.filter(h => /^\d+(\.\d+)?\s*(k|km|m|mi|mile)$/i.test(h));
  runners = R.rows.map(r => ({ name: r.name, team: (r.team || "").trim(), cls: (r.class || "").toUpperCase(), t: sec(r.time), place: +r.place, splits: splitCols.map(c => sec(r[c])) }))
    .filter(r => r.t != null).sort((a, b) => a.place - b.place || a.t - b.t);
}
const isTeam = t => t && !/^unattached$/i.test(t);

// Score a set of runners (already in finish order). Returns [{team, pts, five:[places], six, spread, n}] sorted.
function score(list, key = r => r.t) {
  const ordered = [...list].sort((a, b) => key(a) - key(b));
  const cnt = {}; ordered.forEach(r => { if (isTeam(r.team)) cnt[r.team] = (cnt[r.team] || 0) + 1; });
  const used = {}, teams = {}; let p = 0;
  for (const r of ordered) {
    if (!isTeam(r.team) || cnt[r.team] < 5) continue;
    used[r.team] = (used[r.team] || 0) + 1; if (used[r.team] > 7) continue;
    p++; (teams[r.team] ||= { team: r.team, places: [], times: [] }).places.push(p); teams[r.team].times.push(key(r));
  }
  return Object.values(teams).map(t => ({ team: t.team, pts: t.places.slice(0, 5).reduce((a, b) => a + b, 0), five: t.places.slice(0, 5), six: t.places[5] ?? Infinity,
    spread: t.times[4] - t.times[0] })).sort((a, b) => a.pts - b.pts || a.six - b.six);
}

const teams = score(runners);
if (teams.length < 2) { console.error("fewer than two scoring teams; nothing to compute"); process.exit(1); }
const place = Object.fromEntries(teams.map((t, i) => [t.team, i + 1]));
console.log("Computed team scores (check against the official results):");
teams.slice(0, 15).forEach((t, i) => console.log(`  ${i + 1}. ${t.team} ${t.pts}  [${t.five.join(", ")}]`));

const out = { race: args.race };
// lede
const win = runners[0], [t1, t2] = teams;
out.lede = args.lede || (TEAMS_ONLY ? `<b>${t1.team}</b> won with ${t1.pts} points to ${t2.team}'s ${t2.pts}.` : `<b>${t1.team}</b> won with ${t1.pts} points to ${t2.team}'s ${t2.pts}. <b>${win.name}</b>${win.team ? ` (${win.team})` : ""} won the individual title in ${fmt(win.t)}.`);

// upset meter
if (args.ranks) {
  const rk = csv(args.ranks).rows.map(r => ({ team: r.team, rank: +r.rank })).filter(r => r.team && r.rank);
  const byNorm = Object.fromEntries(teams.map(t => [norm(t.team), t.team]));
  const rows = [];
  for (const r of rk) { const tm = teams.find(t => t.team === r.team)?.team || byNorm[norm(r.team)]; if (tm) rows.push({ rk: r.rank, tm, pl: place[tm] }); }
  const missing = rk.filter(r => !rows.some(x => x.rk === r.rank && norm(x.tm) === norm(r.team)) && !teams.some(t => t.team === r.team));
  if (rows.length >= 2) { out.rankedN = rows.length; out.upset = rows.sort((a, b) => a.rk - b.rk); }
  console.log(`Ranked teams in the race: ${rows.length}` + (missing.length ? ` (not found as scoring teams: ${missing.slice(0, 40).map(m => m.team).join(", ")}${missing.length > 40 ? ", ..." : ""})` : ""));
}

// pack spread
if (!TEAMS_ONLY) out.spread = teams.slice(0, 6).map(t => [t.team, +t.spread.toFixed(1)]);

// dual meets
const top7 = {}; runners.forEach(r => { if (place[r.team]) { (top7[r.team] ||= []); if (top7[r.team].length < 7) top7[r.team].push(r); } });
const rec = Object.fromEntries(teams.map(t => [t.team, { w: 0, l: 0 }])); const flips = [];
for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) {
  const A = teams[i].team, B = teams[j].team, s = score([...top7[A], ...top7[B]]);
  const [w, l] = s; rec[w.team].w++; rec[l.team].l++;
  if (w.team === B) flips.push({ w: B, l: A, ws: w.pts, ls: l.pts, tie: w.pts === l.pts, sum: place[A] + place[B] });
}
const rr = rec[t1.team];
let dual = `<b>${t1.team}</b> went ${rr.w}–${rr.l} in head-to-head scoring against the field.`;
if (flips.length) { const f = flips.sort((a, b) => a.sum - b.sum)[0];
  dual += ` ${flips.length} head-to-head${flips.length === 1 ? " goes" : "s go"} against the final team standings; the highest-placed is ${ord(place[f.w])}-place ${f.w} beating ${ord(place[f.l])}-place ${f.l} ${f.ws}–${f.ls}${f.tie ? " on the sixth-runner tiebreak" : ""}.`; }
else dual += " Every head-to-head matches the final team standings.";
out.dual = dual;

// next year's race (no seniors / grad students)
const known = runners.filter(r => r.cls).length / runners.length;
if (TEAMS_ONLY) {} else if (known >= 0.9) {
  const ny = score(runners.filter(r => !/^(SR|GR|5TH|RS-SR)/.test(r.cls)));
  if (ny.length >= 2) { const a = ny[0], b = ny[1];
    const lost = t => (top7[t] || []).slice(0, 5).filter(r => /^(SR|GR|5TH|RS-SR)/.test(r.cls)).length;
    out.next = `Take out the seniors and <b>${a.team}</b> wins this race with ${a.pts} points` + (a.team === t1.team ? `, ahead of ${b.team} (${b.pts}).` : `. ${t1.team} loses ${lost(t1.team)} of its five scorers and would be ${ord(ny.findIndex(t => t.team === t1.team) + 1 || ny.length + 1)}${ny.some(t => t.team === t1.team) ? ` with ${ny.find(t => t.team === t1.team).pts}` : " (can't field five)"}.`); }
} else console.log("Class years missing for more than 10% of finishers; skipping next year's race.");

// splits
const notes = [];
if (splitCols.length && runners.every(r => r.splits.every(x => x != null))) {
  const at = splitCols.map((c, k) => score(runners, r => r.splits[k]));
  const posAt = (k, tm) => at[k].findIndex(t => t.team === tm) + 1;
  const lead = splitCols.findIndex((c, k) => at.slice(k).every(s => s[0].team === t1.team));
  const path = tm => splitCols.map((c, k) => `${ordinal(posAt(k, tm))} at ${c}`);
  function ordinal(n) { return ord(n); }
  let w;
  if (lead === 0) w = `${t1.team} led at ${splitCols[0]} and never gave it back.`;
  else if (lead > 0) w = `${t1.team} was ${path(t1.team).slice(0, lead).join(", ")}, took the lead at ${splitCols[lead]} and never gave it back.`;
  else w = `${t1.team} was ${path(t1.team).join(", ")} and moved into 1st only at the finish.`;
  w += ` ${t2.team} was ${ord(posAt(0, t2.team))} at ${splitCols[0]} and finished 2nd.`;
  notes.push(["Where it was won", w]);
  const last = splitCols.length - 1, seg = runners.map(r => ({ r, s: r.t - r.splits[last] })).sort((a, b) => a.s - b.s);
  notes.push(["Fastest finish", `${seg[0].r.name}${seg[0].r.team ? ` (${seg[0].r.team})` : ""} ran the fastest ${splitCols[last]}-to-finish split, ${fmt(seg[0].s)}, and finished ${ord(seg[0].r.place)}. ${seg[1].r.name} was next at ${fmt(seg[1].s)}.`]);
}
if (notes.length) out.notes = notes;
if (args.src) out.src = args.src; if (args.srcUrl) out.srcUrl = args.srcUrl;

console.log("\n" + JSON.stringify(out, null, 1));
if (!args.dry) {
  const f = path.join(__dirname, "..", "data/meets", args.meet + ".json"); const m = JSON.parse(fs.readFileSync(f, "utf8"));
  m.insights = m.insights || []; const i = m.insights.findIndex(x => x.race === args.race);
  // keep hand-added split cards when this run has no splits
  if (i >= 0 && !out.notes && m.insights[i].notes) out.notes = m.insights[i].notes;
  if (i >= 0) m.insights[i] = out; else m.insights.push(out);
  fs.writeFileSync(f, JSON.stringify(m, null, 1) + "\n"); console.log(`\nwrote ${args.race} insights to ${f}. Now run: node tools/build-meets.js`);
}
