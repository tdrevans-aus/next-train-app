# Jim brief — Los Angeles pre-flip: no bare line chips, no terminating-here rows

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. Acquire the lane lock:
the controller checked on 25 Oct 2026 and it was free. **Date:** 25 Oct 2026. **tim-review:** no.
**Tim's decision (24 Oct, Option A):** fix these two items before the LA flip. The after-midnight
previous-service-day gap in the shared GTFS builder stays a **documented known limit**, so don't touch
the shared builder for it.
**Input:** Mark's PASS note on #520 (https://github.com/tdrevans-aus/next-train-app/pull/520#issuecomment-6384662290),
with its "Flags, not fails" 1–3, together with the registry LA notes and `docs/los-angeles-d1/`.

## 1. Bare "X Line" chips

The live probe at 06:13 LA on 24 Oct found a bare **"D Line"** chip at Union Station and 7th St/Metro
Ctr. Wilshire/Western isn't in `LINE_TERMINI` for D. Jim's earlier notes also list A short-turns to
Monrovia and APU/Citrus College, and C trips to Aviation/Century. All of these fall back to a bare
line label.

**Rule:** a rider never sees a bare line chip. Every direction is "Line + terminus".
- Derive the terminus for every trip (stop_headsign, then the trip's last stop) and accept any real
  terminus or short-turn that's actually served. Add each one to `LINE_TERMINI`, or derive the list
  from static trips. Each needs evidence: the static trips that end there, and a live sighting if you
  get one.
- If a trip's terminus genuinely can't be resolved, **drop the row**. Don't label it with the bare line.
- Hub lock: 7th St/Metro Ctr is never a direction token.

## 2. Terminating-here rows shown as departures

Union Station showed "B Line + Union Station" and "D Line + Union Station". Downtown Long Beach showed
"A Line + Downtown Long Beach". These are trains *ending* at that station, displayed as departures.
**Rule:** a trip whose terminus is the board's own station (the last stop of the trip is one of this
station's stop_ids) never appears on that station's board. That also means no self-terminus chip in
`/api/directions`. Follow the same rule the live cities follow, which `qa/no-self-terminus-gate.mjs`
enforces.

## QA

- Extend `qa/los-angeles-planned-gate.mjs`, offline with fixtures:
  - D trips ending at Wilshire/Western give "D Line + Wilshire/Western";
  - an unresolvable terminus produces no row;
  - **no bare-line chip** across all static-derived directions at every LA station (iterate the catalog);
  - Union Station and Downtown Long Beach boards exclude trips terminating there;
  - no self-terminus chip at any LA terminus.
- Mutation check: each new assertion fails with its fix reverted.
- `node qa/los-angeles-planned-gate.mjs` passes, and so does `node qa/run-all.mjs --smoke` (plain, with
  a 600000 ms timeout, in the foreground).
- **Live probe if it's LA service hours** (05:00–24:00 America/Los_Angeles): Union Station,
  7th St/Metro Ctr, Downtown Long Beach and one D-Line stop such as Wilshire/Vermont. Record the chips
  and counts in `docs/los-angeles-d1/jim-handoff.md`. `SWIFTLY_API_KEY` is in the main checkout's
  `.env.local`. Never print it, and stay under 180 requests per 15 min.

LA stays `planned`. Open a PR that links this brief and leave no background loops running.
