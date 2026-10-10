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
- Never use Watch Athletics (watchathletics.com) as a live stream or Watch link. If no other stream is found, set `watch:null` and leave the Watch button out.
- When a meet has a `section.feature` "Matchup of the week" card, its Results/Watch links must match that meet's entry in MEETS exactly. If you update one, update the other.
