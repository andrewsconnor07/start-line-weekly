// Builds the site's generated pages. Run from the repo root after editing index.html MEETS or any data/meets file:
//   node tools/build-meets.js
// Writes:
//   meets/<slug>/index.html   one page per matchup of the week (data/meets/<slug>.json)
//   meets/<meet>/index.html   one page per meet in the homepage MEETS list (saved to data/meet-pages/<meet>.json,
//                             so past weeks' pages keep rebuilding after MEETS moves on)
//   meets/pages.js            matchup-page list used by the homepage buttons
//   championships/index.html + meet pages from data/championships.json (if present)
//   archive/index.html, sitemap.xml, robots.txt
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, ".."), dir = path.join(root, "data/meets"), pdir = path.join(root, "data/meet-pages");
const SITE = "https://startlineweekly.com";
const tpl = fs.readFileSync(path.join(__dirname, "meet-template.html"), "utf8");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/&ndash;/g, "–");
const slugify = s => strip(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
const FULLMON = ["", "Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const longDate = iso => { const [y, m, d] = iso.split("-").map(Number); return `${FULLMON[m]} ${d}, ${y}`; };

// ---- homepage data (MEETS) ----
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const yr = (home.match(/Race Week[^<]*?(\d{4})/) || [])[1] || String(new Date().getFullYear());
const week = ((home.match(/<b>(Race Week[^<]*)<\/b>/) || [])[1] || "").replace(/^Race Week\s*·\s*/, "");
let MEETS = [];
try {
  const a = home.indexOf("// ---- Weekly data"), b = home.indexOf("const POLLS");
  MEETS = vm.runInNewContext(home.slice(a, b) + "\n;MEETS", {});
} catch (e) { console.warn("build-meets: could not read MEETS from index.html (" + e.message + "); keeping existing meet pages"); }
fs.mkdirSync(pdir, { recursive: true });
const watchList = m => [[m.watchNote || "Live stream", m.watch], [m.watch2Note || "Live stream", m.watch2]].filter(w => w[1]);
for (const m of MEETS) {
  if (!m || !m.name || !MON[m.m]) continue;
  const iso = `${yr}-${String(MON[m.m]).padStart(2, "0")}-${String(m.d).padStart(2, "0")}`;
  const lvl = (m.d1Ranked && m.div !== "hs") ? "d1" : m.div;
  const rec = { slug: slugify(m.name), kind: "meet", lvl, iso, week, name: strip(m.name), date: longDate(iso), where: m.where,
    headline: strip(m.name), summary: m.recap ? "Final: " + m.recap : m.why, status: m.recap ? "final" : "preview",
    results: m.results || null, watch: watchList(m), lanes: [] };
  fs.writeFileSync(path.join(pdir, rec.slug + ".json"), JSON.stringify(rec, null, 1) + "\n");
}

// ---- championship week (data/championships.json) ----
// One entry per conference / state championship. Each gets a meet page (saved to data/meet-pages/ like MEETS, so it
// stays live after the week ends) and the whole list becomes the /championships/ hub.
const chFile = path.join(root, "data/championships.json");
const CH = fs.existsSync(chFile) ? JSON.parse(fs.readFileSync(chFile, "utf8")) : null;
if (CH) for (const m of CH.meets) {
  const rec = { slug: slugify(m.name), kind: "meet", lvl: m.lvl, iso: m.day, week: CH.week, name: strip(m.name), date: longDate(m.day),
    where: m.where, headline: strip(m.name), status: m.recap ? "final" : "preview",
    summary: m.recap ? "Final: " + m.recap : ([m.why, m.days, m.time].filter(Boolean).join(" · ") || `${strip(m.name)}, ${longDate(m.day)}, in ${m.where.split(" · ")[0]}.`),
    results: m.results || null, info: m.info || null, watch: m.watch || [], lanes: m.lanes || [], hub: "/championships/" };
  fs.writeFileSync(path.join(pdir, rec.slug + ".json"), JSON.stringify(rec, null, 1) + "\n");
}

// ---- matchup pages ----
const meets = fs.readdirSync(dir).filter(f => f.endsWith(".json")).map(f => {
  const m = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (m.slug !== f.replace(/\.json$/, "")) throw new Error(`${f}: slug must match the file name`);
  for (const k of ["lvl", "iso", "week", "name", "date", "where", "headline", "summary", "status"]) if (m[k] == null) throw new Error(`${f}: missing ${k}`);
  return m;
}).sort((a, b) => b.iso.localeCompare(a.iso) || a.lvl.localeCompare(b.lvl));
const pages = fs.readdirSync(pdir).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(pdir, f), "utf8")));

function render(m, matchup) {
  const y = m.iso.slice(0, 4), fin = m.status === "final", name = strip(m.name);
  const title = fin ? `${name} ${y} Results | Start Line Weekly`
                    : `${name} ${y} Live Results & Stream | Start Line Weekly`;
  const desc = (fin ? "" : `Live results and stream links for the ${y} ${name}, ${longDate(m.iso)}. `) + strip(m.summary);
  const canon = `${SITE}/meets/${m.slug}/`;
  const ld = { "@context": "https://schema.org", "@type": "SportsEvent", name: `${y} ${name.replace(/^The /, "")}`, sport: "Cross country running",
    startDate: m.iso, eventStatus: "https://schema.org/EventScheduled", url: canon,
    location: { "@type": "Place", name: strip(m.where).split("·").slice(-1)[0].trim(), address: strip(m.where).split("·")[0].trim() } };
  return tpl.replaceAll("{{TITLE}}", esc(title)).replaceAll("{{OGTITLE}}", esc(matchup ? strip(m.headline) : `${name} ${y}`))
    .replaceAll("{{DESC}}", esc(desc.slice(0, 300))).replaceAll("{{CANON}}", canon).replaceAll("{{SLUG}}", m.slug)
    .replace("{{LD}}", `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`)
    .replace("{{DATA}}", JSON.stringify(m).replace(/</g, "\\u003c"));
}
const write = (slug, html) => { const out = path.join(root, "meets", slug); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, "index.html"), html); };
const taken = new Set(meets.map(m => m.slug));
for (const m of meets) write(m.slug, render(m, true));
for (const m of pages) if (!taken.has(m.slug)) write(m.slug, render(m, false));

fs.writeFileSync(path.join(root, "meets/pages.js"), "// generated by tools/build-meets.js\nwindow.SLW_PAGES=" + JSON.stringify(meets.map(m => ({ slug: m.slug, lvl: m.lvl, week: m.week, status: m.status, ins: !!(m.insights && m.insights.length) }))) + ";\n");

// ---- archive ----
const LV = { d1: "D-I", d2: "D-II", d3: "D-III", hs: "High school" }, weeks = [...new Set(meets.map(m => m.week))];
const head = tpl.split("<main")[0].replaceAll("{{TITLE}}", "Archive: Past Matchups of the Week | Start Line Weekly").replaceAll("{{OGTITLE}}", "Start Line Weekly archive")
  .replaceAll("{{DESC}}", "Every Start Line Weekly matchup of the week, with their results.").replaceAll("{{CANON}}", `${SITE}/archive/`).replace("{{LD}}", "");
const arch = head + `<main><h1>Archive</h1><p class="meta">Every matchup of the week, with their final results.</p>`
  + weeks.map(w => `<section style="margin-top:24px"><h2>${esc(w)}</h2><div class="grid" style="margin-top:12px">` + meets.filter(m => m.week === w).sort((a, b) => "d1d2d3hs".indexOf(a.lvl) - "d1d2d3hs".indexOf(b.lvl)).map(m =>
    `<a class="card" style="text-decoration:none" href="/meets/${m.slug}/"><h3>${LV[m.lvl]} · ${esc(m.date)}${m.status === "final" ? " · Final" : ""}</h3><p><b>${esc(strip(m.headline))}</b></p><p class="meta">${esc(m.name)}</p></a>`).join("") + `</div></section>`).join("")
  + `</main><footer>Start Line Weekly is built and edited by Connor Andrews.</footer></div></body></html>\n`;
fs.mkdirSync(path.join(root, "archive"), { recursive: true }); fs.writeFileSync(path.join(root, "archive/index.html"), arch);

// ---- championship hub ----
if (CH) {
  const DAYN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayLabel = iso => { const d = new Date(iso + "T12:00:00Z"); return `${DAYN[d.getUTCDay()]}, ${FULLMON[d.getUTCMonth() + 1]} ${d.getUTCDate()}`; };
  const shortDay = iso => { const d = new Date(iso + "T12:00:00Z"); return `${DAYN[d.getUTCDay()].slice(0, 3)} ${FULLMON[d.getUTCMonth() + 1].replace(".", "")} ${d.getUTCDate()}`; };
  const SH = { d1: "D-I", d2: "D-II", d3: "D-III", hs: "High school" };
  const btns = m => {
    const b = [];
    if (m.results) b.push(`<a class="res" href="${esc(m.results)}" target="_blank" rel="noopener"><span class="dot"></span>${m.recap ? "Final results" : "Live results"}</a>`);
    for (const w of (m.watch || [])) b.push(`<a href="${esc(w[1])}" target="_blank" rel="noopener">Watch · ${esc(w[0])}</a>`);
    if (m.info) b.push(`<a href="${esc(m.info)}" target="_blank" rel="noopener">Meet info</a>`);
    if (!b.length) b.push(`<a href="/meets/${slugify(m.name)}/">Meet page →</a>`);
    return b.join("");
  };
  const row = m => `<article class="cm" data-lvl="${m.lvl}"><div class="cf">${esc(m.conf)}</div><div class="cb">
<h3><a href="/meets/${slugify(m.name)}/">${esc(strip(m.name))}</a>${m.recap ? '<span class="fin">Final</span>' : ""}</h3>
<div class="meta">${esc(m.where)}${m.days ? " · " + esc(m.days) : ""}${m.time ? " · " + esc(m.time) : ""}</div>
${m.recap ? `<p class="why"><b>Final:</b> ${esc(m.recap)}</p>` : m.why ? `<p class="why">${esc(m.why)}</p>` : ""}</div><div class="ca">${btns(m)}</div></article>`;
  const now = CH.meets.filter(m => !m.next), next = CH.meets.filter(m => m.next);
  const days = [...new Set(now.map(m => m.day))].sort();
  const cnt = l => now.filter(m => m.lvl === l).length;
  const stats = [["d1", "D-I conference meets"], ["d3", "D-III conference meets"], ["hs", "high school state finals"]].filter(([l]) => cnt(l)).map(([l, t]) => `<span><b>${cnt(l)}</b> ${t}</span>`).join("");
  const tops = now.filter(m => m.top);
  const lvls = ["d1", "d2", "d3", "hs"];
  const group = (list) => lvls.map(l => { const g = list.filter(m => m.lvl === l); return g.length ? `<div class="lg" data-lvl="${l}"><h3 class="gh"><b>${SH[l]}</b>${g.length}</h3>${g.map(row).join("")}</div>` : ""; }).join("");
  const css = `<style>
.chero{background:var(--navy);color:var(--on-navy);border-top:6px solid var(--red);padding:28px 24px}
.chero .eyebrow{color:#FF8A99}.chero h1{color:#fff}.chero p{max-width:66ch;margin:8px 0 0;color:var(--on-navy-muted)}
.stats{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:16px;font:500 13px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--on-navy-muted)}
.stats b{font:700 26px var(--display);color:#fff;margin-right:6px;vertical-align:-3px}
.jump{display:flex;flex-wrap:wrap;gap:8px}
.jump a,.cfil button{font:700 14px var(--body);padding:9px 14px;border:2px solid var(--rule);border-radius:4px;background:var(--surface);color:var(--ink);text-decoration:none;cursor:pointer}
.cfil{display:flex;flex-wrap:wrap;gap:8px}
.cfil button[aria-pressed="true"]{background:var(--navy);border-color:var(--navy);color:#fff}
.tops{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.top4{background:var(--surface);border:1px solid var(--line);border-top:6px solid var(--red);padding:18px;display:flex;flex-direction:column;gap:8px;min-width:0}
.top4 h3{font:700 24px/1.05 var(--display);text-transform:uppercase;margin:0}.top4 h3 a{text-decoration:none}
.top4 p{margin:0;font-size:15px}.top4 .btns{margin-top:auto}
.day h2{border-bottom:4px solid var(--rule);padding-bottom:6px;margin-bottom:4px;scroll-margin-top:80px}
.gh{display:flex;justify-content:space-between;font:500 12px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:18px 0 8px}
.gh b{color:var(--red-ink)}
.cm{display:grid;grid-template-columns:110px 1fr auto;gap:14px;align-items:start;background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--rule);padding:14px 16px;margin-bottom:8px}
.cf{font:700 17px/1.1 var(--display);text-transform:uppercase;color:var(--red-ink);overflow-wrap:anywhere}
.cb{min-width:0}.cb h3{margin:0 0 2px;font:700 17px/1.3 var(--body)}.cb h3 a{text-decoration:none}.cb h3 a:hover{text-decoration:underline;text-decoration-color:var(--red)}
.cb .meta{font-size:14px}.why{margin:6px 0 0;font-size:15px}
.fin{display:inline-block;font:500 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:3px;background:var(--red);color:#fff;margin-left:8px;vertical-align:2px}
.ca{display:flex;flex-direction:column;gap:6px;min-width:150px}
.ca a{display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;font:700 13px var(--body);padding:9px 12px;border-radius:4px;border:2px solid var(--ink);white-space:nowrap}
.ca a.res{background:var(--red);border-color:var(--red);color:#fff}
@media (max-width:700px){.cm{grid-template-columns:1fr}.ca{flex-direction:row;flex-wrap:wrap;min-width:0}.ca a{flex:1}.chero{padding:22px 16px}}
</style>`;
  const ttl = `${CH.title} ${CH.week.slice(-4)}: Conference & State Cross Country Live Results | Start Line Weekly`;
  const dsc = `Live results and streams for every ${CH.week} cross country championship: ${now.filter(m => m.lvl === "d1").map(m => m.conf).slice(0, 6).join(", ")} and every D-I conference, the top D-III conferences and high school state finals.`;
  const hhead = tpl.split("<main")[0].replaceAll("{{TITLE}}", esc(ttl)).replaceAll("{{OGTITLE}}", esc(`${CH.title} · Start Line Weekly`))
    .replaceAll("{{DESC}}", esc(dsc.slice(0, 300))).replaceAll("{{CANON}}", `${SITE}/championships/`).replace("{{LD}}", "");
  const html = hhead + `<main style="display:grid;gap:24px">${css}
<section class="chero"><div class="eyebrow">${esc(CH.week)}</div><h1>${esc(CH.title)}</h1>
<p>Every D-I conference championship, the biggest D-III conference meets and this week's high school state finals, with live results and streams in one place.</p>
<div class="stats">${stats}</div></section>
${tops.length ? `<section aria-labelledby="dm"><h2 id="dm" style="margin-bottom:12px">Don't miss</h2><div class="tops">${tops.map(m => `<div class="top4" data-lvl="${m.lvl}"><div class="eyebrow">${shortDay(m.day)} · ${SH[m.lvl]}</div><h3><a href="/meets/${slugify(m.name)}/">${esc(strip(m.name))}</a></h3><div class="meta">${esc(m.where.split(" · ")[0])}${m.time ? " · " + esc(m.time) : ""}</div><p>${esc(m.recap ? "Final: " + m.recap : m.why)}</p><div class="btns">${btns(m)}</div></div>`).join("")}</div></section>` : ""}
<nav class="jump" aria-label="Jump to day">${days.map(d => `<a href="#d-${d}">${shortDay(d)}</a>`).join("")}${next.length ? `<a href="#next">Coming next</a>` : ""}</nav>
<nav class="cfil" aria-label="Filter by level"><button type="button" data-f="all" aria-pressed="true">All</button>${["d1", "d3", "hs"].filter(cnt).map(l => `<button type="button" data-f="${l}" aria-pressed="false">${SH[l]}</button>`).join("")}</nav>
${days.map(d => `<section class="day" id="d-${d}"><h2>${dayLabel(d)}</h2>${group(now.filter(m => m.day === d))}</section>`).join("")}
${next.length ? `<section class="day" id="next"><h2>Coming next</h2>${[...new Set(next.map(m => m.day))].sort().map(d => `<h3 class="gh"><b>${dayLabel(d)}</b></h3>` + next.filter(m => m.day === d).map(row).join("")).join("")}</section>` : ""}
</main><footer>Start Line Weekly is built and edited by Connor Andrews. Results and streams link out to the meet's official timer or broadcaster. <a href="/archive/">Past weeks →</a></footer></div>
<script>
document.querySelectorAll(".cfil button").forEach(b=>b.addEventListener("click",()=>{const f=b.dataset.f;
document.querySelectorAll(".cfil button").forEach(x=>x.setAttribute("aria-pressed",x===b));
document.querySelectorAll(".lg,.top4").forEach(el=>el.hidden=!(f==="all"||el.dataset.lvl===f));
document.querySelectorAll(".day:not(#next)").forEach(s=>s.hidden=![...s.querySelectorAll(".lg")].some(g=>!g.hidden));}));
</script></body></html>
`;
  fs.mkdirSync(path.join(root, "championships"), { recursive: true }); fs.writeFileSync(path.join(root, "championships/index.html"), html);
}

// ---- sitemap + robots ----
const today = new Date().toISOString().slice(0, 10);
const urls = [[`${SITE}/`, today, "daily"], [`${SITE}/archive/`, today, "weekly"]].concat(CH ? [[`${SITE}/championships/`, today, "daily"]] : [])
  .concat(fs.readdirSync(path.join(root, "meets"), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
    const f = path.join(root, "meets", d.name, "index.html"); return [`${SITE}/meets/${d.name}/`, fs.statSync(f).mtime.toISOString().slice(0, 10), "weekly"];
  }));
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + urls.map(([u, d, c]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod><changefreq>${c}</changefreq></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built ${meets.length} matchup pages, ${pages.length} meet pages, ${CH ? "championship hub, " : ""}archive, sitemap (${urls.length} URLs)`);
