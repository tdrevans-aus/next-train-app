# Jim brief — Hong Kong: parallelise per-line fetches (Admiralty board 3.5 s)

**Lane:** bug-fix / product mode. **City:** hong-kong (acquire the lane lock — this edits lib/providers/hong-kong.js). **Date:** 27 Sep 2026. **tim-review:** no.

## Symptom
Production `/api/board?city=hong-kong&station=Admiralty` takes 3.3–3.8 s (controller probe 27 Sep 11:30 HKT: 3509 ms; Mark's QA note: 3.3–3.8 s). Single-line stations answer in ~1.3–1.5 s. The flip pre-check target is < 3 s. Cause (documented in the adapter): one MTR Next Train REST call per (line, station), issued sequentially — Admiralty serves four lines (TWL, ISL, SIL, EAL), Hong Kong/Kowloon/Tsing Yi two (TCL + AEL), Sunny Bay two (TCL + DRL).

## Fix
- In lib/providers/hong-kong.js issue the per-line requests for one station concurrently (`Promise.all`, or `Promise.allSettled` with the existing failure semantics preserved: a failed line must still surface as a failure for that line's directions, never a silent empty direction — keep NT-301/NT-205/isdelay propagation exactly as today). Cap concurrency at the number of lines a station serves (max 4); do not add cross-station parallelism.
- Keep the request pacing polite: no retries-in-a-loop; one attempt per line per board request.
- Extend qa/hong-kong-dogfood-gate.mjs with a synthetic test that a 4-line station issues its line fetches concurrently (e.g. stub fetch with a per-call delay and assert wall time ≈ one delay, not four) and that one failing line still propagates as a failure.

## Acceptance
1. Dev server: `/api/board?city=hong-kong&station=Admiralty` < 2 s on three consecutive samples during HK service hours; Hong Kong and Sunny Bay boards unchanged in content (TCL+AEL, TCL+DRL rows).
2. `node qa/hong-kong-dogfood-gate.mjs`, `node qa/hong-kong-line-map-conformance.mjs`, `node qa/run-all.mjs --smoke` green (known local flake: no-live-feed-stops-gate — re-run alone if only failure).
3. Status stays "live"; no other file outside lib/providers/hong-kong.js, its gate, and this brief.
4. PR title: "Hong Kong: fetch a station's lines concurrently (Admiralty board 3.5 s → < 2 s)". Link this brief.
