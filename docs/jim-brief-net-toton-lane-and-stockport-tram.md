# Jim brief — two catalog entries that could not be geocoded because they aren't real stops

**Date:** 7 Sep 2026 · **Lane:** bug-fix lane, bug-fix / product mode · **tim-review:** no (Tim asked for the two stops to be resolved; this is the honest resolution).
**Dispatch:** `subagent_type: jim`, `isolation: "worktree"`. Branch `net-toton-lane-stockport-tram` from origin/master. Copy this brief into `docs/` and commit it with the change. Run `node qa/lane-lock.mjs check gb` and acquire for `east-midlands` on this branch if free (you touch `lib/cities/*` only, but stay on the safe side for the UK lane).

## Findings (top-level triage, 7 Sep 2026)
After PR #328 two UK stops still have `lat: null`. Neither is a geocoding gap:

1. **`lib/cities/east-midlands/stations.json` → `"Beeston/Chilwell"` (mode metro, "NET Line 1 terminus").** Not a stop name — it is NET's label for the Line 1 branch. Real stops: **Toton Lane** (Line 1 terminus, in Chilwell, NaPTAN ATCO prefix 3390ZZNO/9400ZZNO) and **Beeston Centre** (Beeston's main stop), with Chilwell Road, High Road – Central College, Cator Lane, Bramcote Lane, Eskdale Drive, Inham Road between them. The pack's termini-only rule means the terminus is what belongs here.
2. **`lib/cities/greater-manchester/stations.json` → `"Stockport (tram stop)"` (mode metro).** Does not exist. Manchester Metrolink has never served Stockport; a Stockport extension has only been proposed. The oracle report's "Stockport National Rail vs Metrolink Stockport, ~0.5 km apart, do not conflate" hazard is built on a stop that isn't there.

## Fix
- East Midlands: rename the entry to `Toton Lane`, `aliases: ["Beeston/Chilwell", "Toton"]`, class "NET Line 1 terminus (Chilwell)"; geocode it with the repo helper (`scripts/lib/uk-naptan.mjs`, StopType TMU/MET, name match "Toton Lane") and record the source line in `notes` (replace the "exceptions: Beeston/Chilwell" wording). Update `docs/east-midlands-d1/published-network.json` and the direction chips in `lib/cities/east-midlands/marketing-directions.js` (or wherever "Beeston/Chilwell" appears — `grep -rn "Beeston" lib qa docs/east-midlands-d1`) so the printed terminus is "Toton Lane"; keep the chip readable ("to Toton Lane (Beeston)" is fine if the direction model supports a suffix, otherwise plain "Toton Lane"). Add a dated line to the pack `notes` and to the oracle report's Board eligibility section explaining the rename.
- Greater Manchester: delete the `Stockport (tram stop)` entry; strip the "NOT co-located with the Metrolink 'Stockport' tram stop" sentences from the National Rail Stockport entry's `class` and from the pack `notes` (line ~18), replacing them with one dated note: "No Metrolink stop at Stockport — the earlier 'two Stockports' hazard was an error (7 Sep 2026)". Update `docs/greater-manchester-d1/published-network.json` and hazard-pack the same way; add a propagation-log line in `docs/united-kingdom-ledger.md`. Update `qa/greater-manchester-dogfood-gate.mjs` (asserts "4 rail + 15 Metrolink") to 14 Metrolink and `qa/east-midlands-dogfood-gate.mjs` ("6 rail + 4 NET") to expect Toton Lane.
- `lib/cities/greater-manchester/coverage.json` and `lib/cities/east-midlands/coverage.json` (from PR #327, if merged by the time you run — check `git log origin/master -- lib/cities/greater-manchester/coverage.json`; if #327 is still open, leave coverage.json alone and note it in the PR body): fix the stations line counts.

## Acceptance
1. `node qa/uk-catalog-coords-gate.mjs` reports 0 null coordinates across UK regions (Toton Lane geocoded, Stockport tram gone).
2. `node qa/east-midlands-dogfood-gate.mjs`, `node qa/greater-manchester-dogfood-gate.mjs`, `node qa/uk-city-bounds-overlap-gate.mjs`, `node qa/coverage-notes-gate.mjs` (if #327 merged) green.
3. `grep -rn "Beeston/Chilwell\|Stockport (tram stop)" lib qa public` returns only alias/notes mentions, no live entries.
4. `node qa/run-all.mjs --smoke` green. Commit with the Co-Authored-By trailer, push, open a PR linking this brief.
