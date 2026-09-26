# Jim brief: flip Copenhagen live (Tim's decision, 26 Sep 2026)

**For:** Jim (bug-fix / product mode). This brief authorises the live-list edits a flip needs.
**Decision:** Tim approved this flip in chat on 26 Sep 2026 ("flip copenhagen").

## Why this skips a final Mark pass
Mark's QA (`docs/copenhagen-d1/mark-qa-note.md` on branch `mark/copenhagen-qa-note`) passed every
offline check. Two checks needed live Rejseplanen data, which Claude sandboxes can't reach
(proxy 403). GitHub Actions can reach it: `copenhagen-dogfood-gate.mjs` passed with live data in
the `--release` web-qa run on PR #448 (run 36216563967, job 108335097834; commit dde52c8 is that
PR's head before the squash-merge) and in master CI run 36217631102 on 9aa5147. The details are in
`docs/copenhagen-d1/ci-live-evidence.md` on the same branch. On 26 Sep Mark didn't accept that
evidence (he misread the pre-squash commit ID). Tim made the call instead. The flip still goes
through the normal 12-hour `flip` window, and Tim keeps his veto.

## Do
1. Branch `flip-copenhagen-live` from origin/master. Bring over `docs/copenhagen-d1/` from
   origin/mark/copenhagen-qa-note (the QA note and evidence files).
2. Flip `copenhagen` to `status: "live"` and make the live-list additions, following the
   Washington flip (commit 02ecac4, PR #444): registry, MULTI_CITY_IDS and the typedef in
   live-city-api.js, PERSISTED_CITY_IDS in journey-model.js, brisbane-dogfood.js, the
   app.js/city-session.js copies, and the picker's comingSoon flag.
3. Convert `qa/copenhagen-dogfood-gate.mjs` from pre-flip to post-flip assertions. Keep the
   live-fetch half as is: CI proves it.
4. Generate `public/city-directions/copenhagen.json` with scripts/write-city-directions.mjs if
   that works offline. If it needs network, don't hand-write the file. Say so in your report,
   so it can be generated in CI or in a networked session.
5. Run the offline parts of the gate, qa/live-city-lists-sync.mjs and qa/bundled-city-directions.mjs.
   Push the branch. Don't merge. Leave no background loops running.
