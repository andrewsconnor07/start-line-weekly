// Builds the site's generated pages. Run from the repo root after editing index.html MEETS or any data/meets file:
//   node tools/build-meets.js
// Writes:
//   meets/<slug>/index.html   one page per matchup of the week (data/meets/<slug>.json)
//   meets/<meet>/index.html   one page per meet in the homepage MEETS list (saved to data/meet-pages/<meet>.json,
//                             so past weeks' pages keep rebuilding after MEETS moves on)
//   meets/pages.js            matchup-page list used by the homepage buttons
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

// ---- sitemap + robots ----
const today = new Date().toISOString().slice(0, 10);
const urls = [[`${SITE}/`, today, "daily"], [`${SITE}/archive/`, today, "weekly"]]
  .concat(fs.readdirSync(path.join(root, "meets"), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => {
    const f = path.join(root, "meets", d.name, "index.html"); return [`${SITE}/meets/${d.name}/`, fs.statSync(f).mtime.toISOString().slice(0, 10), "weekly"];
  }));
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + urls.map(([u, d, c]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod><changefreq>${c}</changefreq></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`built ${meets.length} matchup pages, ${pages.length} meet pages, archive, sitemap (${urls.length} URLs)`);
