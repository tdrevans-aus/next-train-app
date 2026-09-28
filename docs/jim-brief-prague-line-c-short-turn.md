# Jim brief — Prague: Line C short-turn at Pražského povstání becomes a first-class terminus chip (flip prerequisite)

**Lane:** bug-fix / product mode. **City:** prague, country czechia (acquire the lane lock). **Date:** 28 Sep 2026. **tim-review:** no — controller decision under the Washington #482 precedent (real short-turns are promoted to terminus chips: Huntington, Wiehle-Reston East); Tim sees it in the flip PR.

## Finding (Jim, PR #488 live check, ~03:53 Europe/Prague)
Raw Golemio `trip.headsign` shows early-morning Line C trips terminating at **Pražského povstání** (short of Háje). hazard-pack.md H5 flagged this as unverified; it is real. `resolveTerminus`/`mapLineTerminusDestination` refuse to fabricate and fall back to a bare `"C"` chip — safe but under-specified, and a bare chip never matches a rider's saved direction.

## Fix
1. Add `Pražského povstání` as a Line C terminus in lib/cities/prague/marketing-directions.js (`LINE_TERMINI.c`), so those trips render "C + Pražského povstání"; keep the hub lock and self-terminus guard (the chip must never be offered AT Pražského povstání itself, and stations south of it never see it). Verify against the live headsign string (diacritics!) and add an alias if Golemio prints it differently.
2. Check A and B for the same pattern over one live poll during the early-morning window (or from the static GTFS trips' last stops per service period) and add any real short-turn termini the same way; record what you found in docs/prague-d1/jim-handoff.md (appended) and direction-model-memo.md (dated Correction).
3. qa/prague-dogfood-gate.mjs: synthetic case for a C trip headsigned Pražského povstání at Muzeum (chip "C + Pražského povstání", trip counted) and at Pražského povstání itself (no self chip); assert no bare line-label chip is ever produced for a known short-turn.

## Acceptance
- `node qa/prague-dogfood-gate.mjs`, `node qa/run-all.mjs --smoke` PLAIN green. Live (Prague daytime now): `/api/directions` at Muzeum lists "C + Háje" and, when such trips run, "C + Pražského povstání"; no bare "C".
- Status stays "planned". PR title: "Prague: Line C short-turn Pražského povstání as a terminus chip (flip prerequisite)". Link this brief and #488.
