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

## Content rules
- Never use Watch Athletics (watchathletics.com) as a live stream or Watch link. If no other stream is found, set `watch:null` and leave the Watch button out.
- When a meet has a `section.feature` "Matchup of the week" card, its Results/Watch links must match that meet's entry in MEETS exactly. If you update one, update the other.
