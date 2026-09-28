# Jim brief — Copenhagen (LIVE): self-terminus direction offered at termini ("M2 + Lufthavnen" at Lufthavnen)

**Lane:** bug-fix / product mode. **City:** copenhagen, country denmark (acquire the lane lock). **Date:** 28 Sep 2026. **tim-review:** no.

## Finding (controller production probe after #505, 13:40 Europe/Copenhagen)
`/api/directions?city=copenhagen&station=Lufthavnen` → `["M2 + Lufthavnen","M2 + Vanløse"]` (source `copenhagen-rejseplanen-schedule`); `/api/board` at Lufthavnen shows "M2 + Lufthavnen" with 2 trips "On Time". A rider at the airport terminus is offered a direction to the station they are standing at — the exact defect Dublin (#484) and Prague (#493) fixed with a terminus guard. Copenhagen went live on 26 Sep without one; Lufthavnen was unreachable until #505 so nobody saw it there, but every other Copenhagen terminus (Vanløse, Vestamager, Kastrup? — verify the Metro M1–M4 and S-tog termini set) may show the same.

## Fix
1. In lib/providers/copenhagen.js (and lib/cities/copenhagen/dogfood-next-train.js / marketing-directions): drop any trip whose resolved terminus (or raw headsign, never the mapped label — the Dublin lesson) equals the station being viewed, from `trips` AND from the schedule-derived direction list (`copenhagen-rejseplanen-schedule` source). Audit that the directions list at each terminus never contains its own name.
2. Sweep all 44 catalog stations offline against the trimmed fixture: assert no station's direction list contains itself; add this as a permanent case in qa/copenhagen-dogfood-gate.mjs (fixture-based, like Dublin's all-stations self-terminus pipeline test) and a live check in qa/verify-copenhagen-gtfs-snapshot.mjs or the dogfood gate.
3. Check S-tog/regional at København H for the same shape (trains terminating at København H must not be offered as a direction there).
4. Do not change labels otherwise; no registry change.

## Acceptance
- `/api/directions` at Lufthavnen → ["M2 + Vanløse"] only (plus any genuine other terminus); Vanløse, Vestamager and the S-tog termini likewise never list themselves; København H unaffected for through services; per-direction counts elsewhere unchanged vs master within live noise.
- `node qa/copenhagen-dogfood-gate.mjs` (new cases), `node qa/verify-copenhagen-gtfs-snapshot.mjs`, `node qa/run-all.mjs --smoke` PLAIN green.
- PR title: "Copenhagen: terminus guard — no self-terminus direction at any terminus (Lufthavnen)". Link this brief, #505, #484, #493.
- HARD RULES: never kill a process you did not start (port 3400 is Tim's other project); PORT + QA_BASE discipline; do not re-publish the Blob snapshot.
