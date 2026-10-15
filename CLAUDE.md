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
- The masthead has no byline (Connor removed "by Connor Andrews" from it); the credit lives in the footer ("Start Line Weekly is built and edited by Connor Andrews."). Don't add the byline back to the masthead, and keep the "Meet archive →" button there.
- Never use Watch Athletics (watchathletics.com) as a live stream or Watch link. If no other stream is found, set `watch:null` and leave the Watch button out.
- When a meet has a `section.feature` "Matchup of the week" card, its Results/Watch links must match that meet's entry in MEETS exactly. If you update one, update the other.

## Matchup pages and S/L Insights
- Every matchup of the week (each `section.feature` card) has its own page at `/meets/<slug>/`, built from `data/meets/<slug>.json` by `node tools/build-meets.js` (run from the repo root). The script also writes `meets/pages.js` (homepage buttons) and `archive/index.html`. Never hand-edit the generated files; edit the JSON and rerun the script, then commit the JSON and everything it generated.
- Slug: `<year>-<meet-name-in-kebab-case>`, e.g. `2026-ncaa-d1-pre-nationals`. The file name must equal the slug. Set `data-page="<slug>"` on that division's `section.feature` card.
- JSON fields: `slug, lvl (d1|d2|d3|hs), iso (YYYY-MM-DD race date), week (the race-week label, e.g. "Oct 12–18, 2026"), status ("preview"|"final"), name, date, where, headline, summary, lanes [[rank-or-place, name, small text]], results (url), watch [[label, url]], insights []`. Mirror the card: same headline, summary, lanes and links as the homepage card. When a card's links change, update its JSON too and rebuild.
- Wednesday build: for each new matchup card, create its JSON with `status:"preview"` and `insights:[]`. Do NOT delete old JSON files; past weeks stay in the archive.
- Thursday/Friday/Saturday runs: if you change a matchup card's results or watch links, make the same change in its JSON and rebuild.
- Sunday recap: for each matchup that has final results, set `status:"final"`, rewrite headline/summary/lanes to match the final card, switch watch links to replays when found, then build the insights with the calculator (below), one tab per race (men and women). Never compute insights by hand and never estimate.
- Wednesday build, before creating the new week: catch-up pass. For every `status:"final"` JSON from the last two weeks that is still missing a race's insights, try again (TFRRS usually has full results by Monday or Tuesday). Then build the new week.

### Insights calculator: `node tools/insights.js`
1. Get the race's FULL results (every finisher: place, name, team, class year, finish time; plus cumulative split columns like `2K,4K,6K` if the timer shows them). Sources, in order: the timer's live-results page, the timer's compiled results PDF, TFRRS (college), Athletic.net / MileSplit (high school). PTTiming (live.pttiming.com) blocks automated access; don't try to get around it, go straight to its PDF or TFRRS.
2. Save it as `data/results/<slug>-<men|women|boys|girls>.csv` with header `place,name,team,class,time` (+ split columns). Quote any field containing a comma. Use the team names exactly as the results show them.
3. Save the poll published BEFORE the race as `data/results/<slug>-<men|women|boys|girls>-ranks.csv` with header `team,rank`, using the same team names as the results (full top 25/30, not just the top 10).
4. Run `node tools/insights.js --meet <slug> --race "Women's 6K" --results <csv> --ranks <ranks csv> --src "<timer name>" --srcUrl "<results url>"`. Add `--dry` first to preview.
5. It prints the computed team scores. Compare them with the official team scores. If any of the top 5 teams' points differ, don't publish that race's insights (rerun without saving, or remove that tab); note it in the run summary.
6. Optionally pass `--lede "..."` with a better one- or two-sentence headline (winner and margin, individual winner and time, any record). Otherwise it writes a plain one.
7. Run `node tools/build-meets.js` and commit the CSVs, the JSON and the generated pages.
- If only the official TEAM table is readable (team, place, points and every scorer's place, 6th/7th included), save it as `data/results/<slug>-<race>-teams.csv` with header `team,place,points,places` (places separated by `;`) and pass `--teams <csv>` instead of `--results`. That gives Rank vs. Result and the Head-to-Head Board only; rerun later with `--results` once full results are readable to add Pack Gap and Next Fall.
- Rerunning the calculator replaces that race's tab but keeps any existing split cards (The Move, Closing Speed) when the new run has no splits.
- The calculator handles scoring rules (only 5+ finisher teams score, 6th/7th displace, 6th-runner tiebreak), the Rank vs. Result rows, Pack Gap, the Head-to-Head Board (every team scored one-on-one), Next Fall (the no-seniors re-score, skipped when class years are missing) and, when splits exist, The Move and Closing Speed.
- Insights card names are our own: The Race, Rank vs. Result, Pack Gap, Head-to-Head Board, Next Fall, The Move, Closing Speed. Write any insight text (ledes, notes) in our own words. Never copy section names, sentences or phrasing from a timer's or results site's own analysis pages; use their numbers only, and credit the source in `src`.

## One-time backfill (do this on the next run, then delete this section)
- Nuttycombe 2026 (`data/meets/2026-nuttycombe-wisconsin-invitational.json`). Official results: https://www.tfrrs.org/results/xc/28897/Nuttycombe_Wisconsin_Invitational (load it with `node tools/fetch.js`; WebFetch cuts the page off before the Men's Championship 8k).
  - Men's 8K: build `data/results/2026-nuttycombe-wisconsin-invitational-men.csv` from the Men's Championship 8k individual results (place, name, team, year, time) and `...-men-ranks.csv` from the USTFCCCA D-I men's Week 3 poll (Oct 6, 2026, full top 30). Run the calculator with `--race "Men's 8K"` and this lede: `<b>No. 1 New Mexico</b> won by 34 points over No. 6 Colorado, 59–93, while <b>No. 2 Iowa State</b> finished 19th. Colorado freshman <b>Meshack Kipruto</b> won in a course-record 22:30.1, and the top four men all broke the old Zimmer record of 22:33.8.` Check the computed scores against New Mexico 59, Colorado 93, BYU 146.
  - Women's 6K: it currently uses the team table only. Build `...-women.csv` from the Women's Championship 6k individual results and rerun with `--results` (same ranks file `...-women-ranks.csv`, same lede as the current Women's 6K tab) to add Pack Gap and Next Fall.
  - Use `--src "TFRRS official results; rankings are the USTFCCCA Week 3 poll" --srcUrl "https://www.tfrrs.org/results/xc/28897/Nuttycombe_Wisconsin_Invitational"`, then `node tools/build-meets.js`, commit, and delete this section.
