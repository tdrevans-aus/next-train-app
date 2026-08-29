Oslo D1 + research pack. City stays **planned** until Jim wires testers live. Other cities'
live-gates untouched. No generator, no PR, no issues, no product edit. Do not flip oslo live from
this pack. Do not touch any other city's files (`lib/providers/`, `registry.js` included — that's
your job next, not this pack's).

Pack files: `oracle-clash-report.md` (Nico), `hazard-pack.md`, `direction-model-memo.md`,
`published-network.json` (this handoff).

D1 = ruter.no T-bane linjekart + timetables as of 29 Aug 2026, hand-transcribed. Modes v1:
T-bane (Sporveien T-banen, operator on contract from Ruter) lines **1–5 only**. Line 6 (Fornebu)
excluded — under construction, opening expected 2029; do not insert Blindern or any Line-6-only
station. Tram, bus, Vy/NSB rail out of v1.

Hub lock **Stortinget** — all five lines, "kilometer zero." Do not fragment by line. Secondary
transfer hub **Tøyen** (all five converge) — interchange, not a fragment point.

**doNotGroup Jernbanetorget T-bane (metro, in-tunnel) vs Oslo Central Station / Oslo S /
Jernbanetorget railway (Vy/NSB, above ground) vs street-level bus/tram terminals.** Same square,
different products.

Norwegian characters (ø, å, Ø, Å) preserved throughout — GTFS and D1 print forms both keep them.
Do not ASCII-fold.

Entur GTFS-RT (`https://api.entur.io/realtime/v1/gtfs-rt/trip-updates?datasource=RUT`) and
GraphQL JourneyPlanner (`https://api.entur.io/journey-planner/v3/graphql`) both need an
`ET-Client-Name` header — an identifying string, not a secret key (NLOD licence, no auth token).
Verified HTTP 200 on GTFS-RT 28 Aug 2026 per the oracle report.

Timezone `Europe/Oslo`, **has DST** (CET/CEST).

## Blocker before you build direction-collapse logic

**The oracle report does not contain full per-line station arrays or termini for lines 1–5.** Only
the six-station Common Tunnel segment (Majorstuen–Nationaltheatret–Stortinget–Jernbanetorget–
Grønland–Tøyen, all five lines) is fully ordered and sourced. `published-network.json`'s `lines[]`
entries reflect only that segment, each flagged `"stationsComplete": false` /
`"terminiConfirmed": false`. Skøyen (lines 1 & 2) and Frogner (line 3) are named as served but not
placed in any sequence — see `knownAdditionalStations` per line, kept out of the ordered
`stations` arrays on purpose.

I did not fill this from GTFS, a generator, or general knowledge of the real Oslo T-bane network —
doing so would be exactly the silent station-graph guess this pipeline is supposed to prevent, and
Jim would inherit a graph that looks locked but isn't sourced. This needs to go back to Nico for a
follow-up hand-transcription pass against the Ruter linjekart (full ordered stops + termini, both
ends, all five lines) before assertion-table (D5) or leave-by logic beyond the shared tunnel can be
built safely. §3 direction-model-memo.md recommends **line + terminus** as the target model (same
family as Rotterdam/Canberra/Auckland) and gives an explicitly-interim fallback (tunnel-end anchor
labels, Common Tunnel stations only) if Tim wants something shippable before that follow-up lands
— flagged there as interim, not to be treated as the permanent model.

Testers can pick city id **oslo** once wired, but leave-by math for anything past the six Common
Tunnel stations will be wrong/incomplete until the station-graph gap above is closed.
