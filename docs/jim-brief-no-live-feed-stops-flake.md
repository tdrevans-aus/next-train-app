# Jim brief — de-flake qa/no-live-feed-stops-gate.mjs (browser half)

**Lane:** bug-fix / product mode. `tim-review: no`. **Lane lock:** none (`qa/`, `public/`
only). Leave no background loops, pollers or dev servers running.
**Start from master at or after the merge of PR #385** (it swaps this gate's sample stop away
from Altrincham, which becomes a real rail station there). Do not start from an older base.

## Symptom

On 13–14 Sep 2026 at least four independent Jim/Mark runs saw `qa/no-live-feed-stops-gate.mjs`
fail inside `node qa/run-all.mjs --smoke` on clean master, always in the browser half
(greater-manchester picker), while the offline half passes and the script passes when run on
its own against a freshly started server. One of those failures was a real bug (the PR #383
picker regression, fixed in #386). The rest predate #383 and reproduce after #386, so a timing
race remains. It is currently the one standing red in an otherwise green suite and gets
rationalised away in every QA note, which is how a real failure will slip through.

## What the script does today (`qa/no-live-feed-stops-gate.mjs`, browser part)

- Fixed sleeps: `waitForTimeout(4000)` after Near me, then 500 / 200 / 800 / 800 ms pauses
  around opening the station search and typing.
- A retry loop with the comment "template wizard kept reclaiming it" around getting
  `#detail-station-input` to stay open, then a `waitFor` of 2000 ms on the search input.
- Asserts the no-live-feed sample stop never appears in the listbox, and that Help's coverage
  entry mentions Metrolink.

## Fix

1. Reproduce first: run the script standalone five times against a dev server you start on a
   free port (`QA_BASE` + `QA_ATTACH=1`), then inside `--smoke` with `QA_NO_RETRY=1` at least
   twice. Record which step fails and with what. If it never fails in ten attempts, say so and
   still do steps 2–3 (the sleeps are wrong regardless).
2. Replace every fixed sleep with a condition: await the deferred modules being wired (see the
   memory note: "script loaded" is not "deps wired" — `await ensureDeferredModulesReady` or the
   equivalent readiness hook other browser scripts use), await the region's station list having
   been fetched (network idle on `/api/city-stations?city=greater-manchester`, or the listbox
   having rendered at least one option), and open the search through
   `qa/helpers/station-combobox.mjs`'s `openStationSearch` the same way `country-wide-picker.mjs`
   does rather than fighting the template wizard by hand. If the wizard genuinely reclaims focus
   in a way a rider would hit, that is a product bug: report it in the PR and keep the
   test-side fix minimal.
3. Make the browser half also cover the country-wide list ("All" for England) for the same
   sample stop, since that is the path #383 broke; reuse the seeding approach from
   `qa/country-wide-picker.mjs` case 5 rather than duplicating it.
4. Keep the offline half unchanged.

## Acceptance criteria

1. Ten consecutive standalone runs pass; two consecutive full `--smoke` runs with
   `QA_NO_RETRY=1` pass, in the foreground with a 600000 ms timeout each, no pollers.
2. No `waitForTimeout` calls remain in the browser half except a single, commented, sub-second
   settle if genuinely unavoidable.
3. The script still fails when it should: temporarily revert the #386 filter locally and
   confirm the gate goes red on the country-wide check, then restore it (describe this in the
   PR body; don't commit the revert).
4. `node qa/run-all.mjs --smoke` green.

## Process

Worktree; copy this brief in; commit, push; PR "QA: de-flake no-live-feed-stops gate (readiness
waits, country-wide coverage)" linking this brief.

## Addendum (14 Sep 2026) — one more `qa/` tidy-up while you're there

Mark's #385 note: the phase 2b "fix stale station counts" tidy-up replaced stale counts in
the closing success messages of about ten dogfood gates with numbers that are themselves wrong
(e.g. solent prints 195 where the catalog has 7 rail stations). Cosmetic, no assertion is
affected. Fix it properly: derive the printed count from the same value the gate asserts on
(the catalog length it already read), never a literal, so it can't go stale again.
