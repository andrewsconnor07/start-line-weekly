# Start Line Weekly

## Running unattended
- These updates run as scheduled routines with no one watching. Never stop to ask a question or wait for confirmation; make the most reasonable call and keep going.
- If a page won't load or a fact can't be verified, leave that item as it is, note it in the commit message, and move on. Don't stop the whole run.
- Always commit directly to main and push to main. Never create or push to another branch.
- Finish every run with a commit and push, even if only a few things changed. If nothing changed at all, skip the commit (no empty commits) and say so in the run's final summary.

## Sites behind Cloudflare
- USTFCCCA, Athletic.net and RunnerSpace/DyeStat often answer plain fetches and WebFetch with Cloudflare's "Just a moment..." page. At the start of a run, run `bash tools/setup-browser.sh` once, then load those pages with `node tools/fetch.js <url> <out.txt> [links]` and read the saved text.
- USTFCCCA poll articles (ustfccca.org/<year>/<month>/featured/...-national-coaches-poll-week-N) load this way; find the article URL with a web search. The week-by-week poll page and web4.ustfccca.org (meet list, broadcast schedule) stay blocked, so find meets through school athletics schedules and previews, TFRRS, MileSplit and Athletic.net instead.
- If fetch.js still ends on the check page, treat that source as blocked and move on.

## Marquee meets
- Every week, check this list for meets in the coming race week and include each one that is happening, even if no preview has been posted yet. The Wednesday build finds them; the Thursday run checks again for any that were missed. A marquee meet with ranked teams is a strong candidate for that division's Matchup of the week.
- Dates are the 2026 dates (verified). Most meets keep the same weekend each year; confirm the date on the meet's site before relying on it in a new season.
- High school:
  - Roy Griak (MN): Sat Sept 19 (3rd weekend of Sept)
  - Woodbridge Classic (CA): Sat Sept 19 (3rd Saturday of Sept)
  - Desert Twilight (AZ): Fri Sept 25 (last Friday of Sept)
  - Nike Portland XC (OR): Sat Sept 26 (last Saturday of Sept)
  - Bob Firman Invitational (WA, Spokane): Sat Sept 26 (last Saturday of Sept)
  - Rim Rock Classic (KS): Sat Sept 26
  - Great American XC Festival (NC): Sat Oct 3 (1st Saturday of Oct)
  - Nike XC Town Twilight (IN): Fri-Sat Oct 2-3 (1st weekend of Oct)
  - Chile Pepper Festival (AR): Sat Oct 3 (1st Saturday of Oct)
  - Brown Thrush Invitational (KS): Sat Oct 3
  - Clovis Invitational (CA, Woodward Park): Fri-Sat Oct 9-10 (2nd weekend of Oct)
  - Nike Hole in the Wall (WA): Sat Oct 10 (2nd Saturday of Oct)
  - Manhattan Invitational (NY, Van Cortlandt Park): Sat Oct 10 (2nd Saturday of Oct)
  - Mt. SAC Invitational (CA): Fri-Sat Oct 23-24, D1-D2 on Saturday (4th weekend of Oct)
- College:
  - Roy Griak Invitational: Fri Sept 18
  - Cowboy Jamboree: Sat Sept 26
  - Paul Short Run: Thu-Fri Oct 1-2
  - Joe Piane (Notre Dame): Fri Oct 2
  - Chile Pepper Festival: Sat Oct 3
  - Louisville Classic: Sat Oct 3
  - NCAA D-III Pre-Nationals: Sat Oct 3
  - Nuttycombe Invitational: Fri Oct 9 (one week earlier than its usual mid-October date)
  - Bill Dellinger Invitational: Fri Oct 9
  - NCAA D-II Pre-Nationals: Sun Oct 11
  - NCAA D-I Pre-Nationals: Fri Oct 16
- If a meet on this list is skipped, say why in the run summary (not held this week, cancelled, no ranked teams).

## Content rules
- Write meet descriptions, matchup cards, recaps and athlete blurbs as plain statements of who is racing whom and what's at stake. Never tell readers where the information came from or what is missing: no "listed on their schedules", "on the meet's MileSplit attending list", "per Stanford's schedule", "DyeStat's preview says", "entries/lineups have not been posted", "not confirmed", "so they are not counted" or similar. If something isn't known yet, leave it out; a later run adds it once it is known.
- If a ranked team lists two meets on the same day (often a split squad), list it at the bigger, more competitive meet and say nothing about the other one.
- Still state only facts you verified. Keep notes about sources, missing entries or unconfirmed teams in the commit message and run summary, not on the page.
- The header is the sticky navy top bar with two links, This Week and Rankings. No byline there (the credit lives in the footer), and no archive button: the archive link is the "Past weeks →" link at the end of the footer. Keep the `<div class="week">` race-week label in `.mast` updated each week. Rankings live in the right-hand `aside.rail` (id `rankings`); keep updating them through the POLLS array only.
- Never use Watch Athletics (watchathletics.com) as a live stream or Watch link. If no other stream is found, set `watch:null` and leave the Watch button out.
- A meet's results link must never be a site's home page (tfrrs.org, athletic.net, milesplit.com, a timer's home page), and every run must fix any it finds. Find the meet's own page: the host's schedule page ("Live Stats"/"Results" link for that meet), the host's meet-info page, team previews (visiting schools' previews often link "Live Results"), and the timer's meet list (e.g. results.wayzatatiming.com/meet-list, live.gingerbreadtiming.com/meet-list). If no live page is posted yet, use the meet's Athletic.net or MileSplit meet page. This overrides any routine step that says to leave a race-day link as it is.
- Every page has the Google Analytics tag (G-VM39PTKQW9) right after the opening `<head>`. Never remove it, and keep it in tools/meet-template.html.
- When a meet has a `section.feature` "Matchup of the week" card, its Results/Watch links must match that meet's entry in MEETS exactly. If you update one, update the other.

## Matchup and meet pages
- Every matchup of the week (each `section.feature` card) has its own page at `/meets/<slug>/`, built from `data/meets/<slug>.json` by `node tools/build-meets.js` (run from the repo root). The script also writes `meets/pages.js` (homepage buttons) and `archive/index.html`. Never hand-edit the generated files; edit the JSON and rerun the script, then commit the JSON and everything it generated.
- Slug: `<year>-<meet-name-in-kebab-case>`, e.g. `2026-ncaa-d1-pre-nationals`. The file name must equal the slug. Set `data-page="<slug>"` on that division's `section.feature` card.
- JSON fields: `slug, lvl (d1|d2|d3|hs), iso (YYYY-MM-DD race date), week (the race-week label, e.g. "Oct 12–18, 2026"), status ("preview"|"final"), name, date, where, headline, summary, lanes [[rank-or-place, name, small text]], results (url), watch [[label, url]], insights []`. Mirror the card: same headline, summary, lanes and links as the homepage card. When a card's links change, update its JSON too and rebuild.
- Wednesday build: for each new matchup card, create its JSON with `status:"preview"` and `insights:[]`. Do NOT delete old JSON files; past weeks stay in the archive.
- Thursday/Friday/Saturday runs: if you change a matchup card's results or watch links, make the same change in its JSON and rebuild.
- Sunday recap: for each matchup that has final results, set `status:"final"`, rewrite headline/summary/lanes to match the final card, switch watch links to replays when found, then rebuild.
- Every meet in the homepage MEETS list also gets its own page at /meets/<meet-name-slug>/, built by `node tools/build-meets.js` from MEETS (saved in data/meet-pages/). Run `node tools/build-meets.js` at the end of EVERY run that changes index.html or data/meets, and commit data/meet-pages/, meets/, archive/, sitemap.xml and robots.txt with it. Never hand-edit those files, and never delete data/meet-pages/ files (they keep past weeks' pages and Google search traffic alive).
- Keep the homepage <title> ("Start Line Weekly | Cross Country Live Results, Streams & Rankings"), the canonical link and the meta description inside <head>.
- S/L Insights is paused. Don't run tools/insights.js or fill `insights`; the meet pages don't show them.

## One-time: restore matchup order (Wednesday Oct 28 build, then delete this section)
- For the Oct 19–25 week only, Connor moved the high school Matchup of the week card (`section.feature[data-lvl="hs"]`) to the top, above D-I. In the Oct 28 Wednesday build, put the cards back in the usual order (d1, d2, d3, hs), then delete this section.
