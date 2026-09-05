Prague D1 + research pack. City stays **planned** until Jim wires testers live. No other city's
files touched. `assertCityLive("prague")` must still fail (city is not in `lib/providers/registry.js`
CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
prague live from this pack. Do not invent city=praha, city=pida, city=pid, or merge into another
Czech adapter — none exists yet.

Drop later (Jim D2): `qa/fixtures/prague/published-network.json`. This research pack is
`docs/prague-d1/`: `published-network.json`, `oracle-clash-report.md`, `hazard-pack.md`,
`direction-model-memo.md`, `jim-handoff.md`.

D1 station roster is reproduced from the official topology cited in the oracle report — [List of
Prague Metro stations](https://en.wikipedia.org/wiki/List_of_Prague_Metro_stations) — **not
independently re-fetched in this lane (no live-fetch tool available to Luke)**. The roster is
stable/well-documented (three lines, unchanged station counts for several years) and matches the
oracle report's verified per-line counts and interchange names. **Before any product edit, cross-
check every `stations[]` entry against PID static GTFS `stops.txt` `stop_name`** (verified live 200
anonymous at https://data.pid.cz/PID_GTFS.zip, per oracle report, no key required) — both for
completeness and for exact diacritic form (some feeds ASCII-fold Czech names; this pack's strings
carry full diacritics and must not be silently normalized).

Three lines: **A** Nemocnice Motol – Depo Hostivař (17 stations), **B** Zličín – Černý Most (24
stations, longest), **C** Letňany – Háje (20 stations, oldest). **61** line-station ticks (sum of
per-line counts); **58** unique station strings (61 minus the three interchange names each counted
on two lines: Muzeum, Můstek, Florenc). The oracle report's "61 unique D1 metro names" phrase is
the tick count, not the unique-name count — resolved the same way the Brussels pack distinguished
`lineTicks` (94) from `uniqueNames` (60). **No Line D** (under construction, no passenger service
until 2031-2032 earliest). No tram, bus, trolleybus, funicular, regional rail (Esko), ferries.

Hub lock **Muzeum** (metro **A × C**, beneath Wenceslas Square / National Museum), per this task's
instruction and the oracle report's "Muzeum listed first" tracker note. **Not Můstek** (A × B,
secondary), **not Florenc** (B × C, third vertex). No single station serves all three lines — this
is a **triangle of three two-line interchanges**, unlike Brussels' single 4-line cross or
Copenhagen's single hub. doNotGroup all three against each other.

C2/C3: (1) Separate city `prague`, agency PID (coordinator ROPID) / DPP (operator, metro). Do not
invent city=praha/pida/pid. (2) Lock Muzeum as hub; Můstek and Florenc as distinct doNotGroup
interchanges, never merged into the hub or each other. (3) Metro A/B/C only. Line D, tram, bus,
trolleybus, funicular, Esko, ferries all out. (4) Diacritics are load-bearing — lock full-diacritic
official forms (Můstek, Náměstí Míru, Vysočanská, etc.), confirm GTFS `stop_name` match at D2. (5)
No documented short-turn/partial-route codes in the oracle report — `shortTurns: []` is a default
pending D2 GTFS verification (`trip_headsign`/`stop_times`), **not** a confirmed empty; check before
relying on it.

H2 (from oracle report): station rosters and line codes are already public and stable (PID map,
Wikipedia); the actual clash is **mode filtering** (PID GTFS is a full multi-mode feed — filter to
metro only, do not generate `published-network.json` from `routes.txt`/`stops.txt`), **real-time
feed choice** (Golemio proprietary JSON, not GTFS-RT), and **the three-line interchange triangle**
(three separate doNotGroup nodes, not one hub).

**Live boards: Golemio API (api.golemio.cz), keyed later — not a D1 blocker.** Header
`X-Access-Token`. Free registration, non-commercial tier, email verification. No public GTFS-RT
confirmed for PID. This pack has **no key** and did not call the API. Never paste a key. D1 stays
planned. `assertCityLive("prague")` must fail. **Confirm Golemio API endpoint coverage for metro
departures/vehicle positions and ToS commercial-use terms at D2** — oracle report flags both as
open items, license section recommends Tim review Golemio ToS before wiring.

H7: Europe/Prague **HAS DST** (CEST/CET, last Sunday March/October). Do not copy Perth/Brisbane/
Auckland no-DST handling.

§3 rec: line + terminus (`A + Depo Hostivař`, `B + Zličín`, `C + Háje`). **Muzeum is a hub stop
string, not a direction token.** No compass-heading or loop ambiguity reported (each line is a
simple two-end trunk) — simpler direction model than Brussels or Copenhagen, but the interchange
triangle (Muzeum/Můstek/Florenc) must stay three distinct doNotGroup nodes. Hold D5. Jim owns
D2–D6. When Jim wires, testers can pick city id **prague**. Do not flip from this pack — testers
live is Jim's job, not this pack's flip.

## Gaps flagged back (not guessed at)

1. **Station roster not independently re-verified against GTFS** — reproduced from the oracle
   report's cited Wikipedia source only, since this lane has no live-fetch tool. Confirm against
   PID `stops.txt` before product edit (see hazard-pack.md, top note).
2. **No short-turn/partial-route service pattern documented.** `shortTurns: []` is a default, not a
   confirmed empty. Verify against GTFS `trip_headsign` at D2.
3. **Golemio API endpoint coverage and ToS/commercial-use terms unconfirmed.** Oracle report
   explicitly defers this to D1/D2 and recommends Tim review Golemio ToS before wiring — do not
   treat Golemio as license-clear the way PID's static CC BY 4.0 GTFS is.
4. **DPP metro agency/route filter string in GTFS not yet confirmed exact** — oracle report says
   "agency 'DPP metro' (or confirmed name)"; confirm exact `agency_name`/`route_type` filter at D2
   against the live GTFS zip rather than guessing a string.
