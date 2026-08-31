West of England D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("west-of-england") must fail** (city is not in `lib/providers/registry.js` CITIES
today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
west-of-england live from this pack. Do not invent city=woe, city=bristol, city=bath, or
city=greater-bristol. Do not touch West Midlands, Greater Manchester, Liverpool City Region, East
Midlands, North East, or South Wales — same account-level National Rail blocker (or, for South
Wales, a separate boundary consideration), but separate regions/packs.

Lane lock: acquired `United Kingdom` / `West of England` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/west-of-england-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Scope and sole source

D1 input was **only** docs/west-of-england-d1/oracle-clash-report.md (Nico). No UK-country ledger
exists yet for this lane (`docs/*-ledger.md` glob has no `united-kingdom-ledger.md`) — this pack
proceeds without one, per the country-lane doc's "region lanes read the ledger where one exists"
rule. `docs/south-wales-d1/oracle-clash-report.md` exists in git history and was checked once for
the single Chepstow cross-reference the task instruction asked for (to avoid contradicting a
future South Wales pack); it was not otherwise read or used as a source of station-graph fact, and
South Wales has not been packed by Luke yet (no `published-network.json` there).

One agency: **National Rail** — Darwin/OpenLDBWS, technically documented and live but **blocked at
the account level** (EvansAppStudio's RDM registration is Australian; Tim is re-registering with a
UK address). Same blocker as West Midlands / Greater Manchester / Liverpool City Region / East
Midlands / North East and **not a feed problem** — the catalog below is built normally per Nico's
instruction; only `DARWIN_LDB_TOKEN` wiring waits.

**New wrinkle vs East Midlands/North East: no static GTFS exists for this feed at all.** East
Midlands had a GTFS fallback for its second agency (NET); this region has none — National Rail
Enquiries does not publish static GTFS anywhere, so there is no schedule-only v1 to build in the
interim. The whole region is Darwin-or-nothing. Flag for Tim: does Next Train's architecture
support a Darwin-only realtime board with no static-schedule base layer? This pack does not answer
that question — see coverageGaps in published-network.json.

## Hub lock and secondary hub

**Bristol Temple Meads (BRI)** is the hub lock — principal rail terminus for Bristol city, all
regional and inter-city services call here. **Bath Spa (BTH)** is the secondary hub — direct
service to BRI at 11-19 min frequency. **No doNotGroup needed at either station** — both are
GWR-dominated, single-operator (Bath Spa is GWR-only for v1), platforms distinguished by route not
operator (report C2/C3 point 4). This is a simpler hub structure than East Midlands' Nottingham
Station (no tram-over-rail two-layer case) — see hazard-pack.md H1/H6.

## Boundary through-running stations (not merges)

Four stations, all National Rail only, all through-running/franchise-boundary points, **none are
merge/de-dup points at D1**:

- **Chepstow (CPW)** — boundary to South Wales region. TfW and GWR cross into Wales here. Flag
  for D2 de-dup once South Wales ships a D1 pack (report exists but is unpacked as of this
  writing).
- **Gloucester (GCR)** — boundary to West Midlands region. GWR regional + CrossCountry
  Cardiff-Nottingham long-distance pass through.
- **Westbury (WSB)** — boundary to Solent/Thames Valley regions. GWR (Reading/Oxford) and SWR
  (Southampton/Portsmouth) share the platform, separate franchises.
- **Taunton (TAU)** — toward Southwest/Devon region (not yet a scoped region as of this pack).
  GWR continues west to Exeter and beyond.

Do not build any cross-region merge logic for these four stations in this pack's station graph —
same treatment as East Midlands' Leicester/Kettering/Wellingborough/Chesterfield/Alfreton
through-running list.

## Direction model recommendation

**Destination + operator** (e.g. `London Paddington (GWR)`, `Cardiff Central (TfW)`), matching how
National Rail departure boards actually present and identical in shape to the East Midlands
National Rail recommendation. No line+terminus model — GWR does not brand this corridor with named
lines, and inventing them would be guessing. **Illustrative only, not verified** — no destination
strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a real Darwin payload can be pulled.
See direction-model-memo.md for full reasoning and options considered.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
   redistribution with attribution, but the Rail Data Marketplace Platform Agreement may restrict
   downstream redistribution to third-party rider clients — the operative clause isn't confirmed
   in public sources. Oracle report confidence: `unclear`. Tim needs to review the signed RDM Data
   Sharing Agreement once EvansAppStudio re-registers and receives a token, before this region's
   National Rail slice can be relayed to end users.
2. **No static GTFS exists for this feed.** Unlike East Midlands (which had a GTFS-based second
   agency as a schedule-only fallback), West of England has no static-schedule product to fall
   back on while Darwin is blocked. Confirm with Tim whether Next Train's architecture supports a
   Darwin-only realtime-board model, or whether a third-party GTFS supplement is required before
   this region can go live at all (independent of the account-level token blocker).

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). Same license posture as East Midlands and North
East (same underlying feed).

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no boundary de-dup
logic for Chepstow/Gloucester/Westbury/Taunton (D2 concern for future packs), no resolution of the
RDM redistribution ambiguity or the Darwin-only-vs-GTFS product question (both flagged for Tim),
no reading of South Wales's oracle report beyond the single Chepstow cross-reference the task
instruction asked for, no touching West Midlands / Greater Manchester / Liverpool City Region /
East Midlands / North East / South Wales packs, no wiring of `DARWIN_LDB_TOKEN`.
