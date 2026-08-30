East Midlands D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND Jim wires testers live — this pack does not flip anything. Perth/Sydney/Brisbane/
Adelaide/Auckland live-gates untouched. All other in-flight planned cities untouched.
**assertCityLive("east-midlands") must fail** (city is not in `lib/providers/registry.js` CITIES
today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
east-midlands live from this pack. Do not invent city=em, city=nottingham, city=net, or
city=east-midlands-trains. Do not touch West Midlands, Greater Manchester, or Liverpool City
Region — same account-level National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `East Midlands` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/east-midlands-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Scope and sole source

D1 input was **only** docs/east-midlands-d1/oracle-clash-report.md (Nico, from-scratch redo
committed 31 Aug 2026 after the untracked-file wipe). No UK-country ledger exists yet for this
lane (`docs/*-ledger.md` glob has no `united-kingdom-ledger.md`) — this pack proceeds without one,
per the country-lane doc's "region lanes read the ledger where one exists" rule.

Two agencies: **Nottingham Express Transit (NET)** — tram, two lines, schedule-only v1 (no
confirmed real-time feed), static GTFS via DFT Bus Open Data Service (`f-bus~dft~gov~uk`, no key,
verified live 30 Aug 2026). **National Rail** — Darwin/OpenLDBWS, technically documented and live
but **blocked at the account level** (EvansAppStudio's RDM registration is Australian; Tim is
re-registering with a UK address). This is the same blocker as West Midlands / Greater Manchester
/ Liverpool City Region and is **not a feed problem** — the catalog below is built normally per
Nico's instruction; only `DARWIN_LDB_TOKEN` wiring waits.

## Hub lock and doNotGroup

**Nottingham Station (NOT CRS)** is the hub lock — NET tram viaduct above National Rail main
platforms, footbridge connects. **doNotGroup NET tram vs National Rail at Nottingham Station** —
separate infrastructure, separate operators (Keolis NET vs Keolis East Midlands Trains), separate
boarding areas. This is a two-layer hub, not a single stop entity — see hazard-pack.md H1/H6.

## NET (build now, schedule-only)

Two lines: **Line 1** Hucknall — Beeston/Chilwell (via city centre), **Line 2** Phoenix Park —
city centre. No Line 3 passenger service. Both call Nottingham Station.

**Gap Jim needs to close at D2, not guessed here:** the oracle report gives **termini only** — no
intermediate stop order for either line, and no confirmed GTFS `route_id`. Pull the DFT Bus Open
Data feed (`f-bus~dft~gov~uk`, no key, https://data.bus-data.dft.gov.uk/downloads/) to get the
actual ordered stop sequence and route IDs before building the station graph past the three names
this pack has (Hucknall / Nottingham Station / Beeston/Chilwell for Line 1; Phoenix Park /
Nottingham Station / "city centre" for Line 2). The "city centre" label for Line 2's inner end is
explicitly a placeholder — confirm the real printed/GTFS name before using it in a §3 string.

Direction model recommendation: **line + terminus** (e.g. `Line 1 + Hucknall`), same shape as
every reference pack. See direction-model-memo.md.

## National Rail (build the catalog, hold the token)

**Do not wire `DARWIN_LDB_TOKEN`** — RDM registration is blocked pending Tim's UK re-registration.
Build the National Rail piece of the adapter/catalog structurally, but it cannot go live (nor
should tester-live flip include it) until the token exists. Station list: hub Nottingham Station
(NOT), through-running-only stations Leicester (LEI), Kettering (KET), Wellingborough (WEL),
Chesterfield (CHD), Alfreton (ALF) — these are **not** merge/de-dup points, just routing/filter
concerns (same operator continuing past the regional boundary). **Tamworth (TAM)** is different:
a genuine shared platform with West Midlands — flagged as a **D2 de-dup boundary for a future
West Midlands pack**, not something to build merge logic for in this one.

No printed route/line map exists for National Rail (Darwin is a per-station real-time board, not
a fixed-route product) — direction should be modelled as **destination + operator**, not
line+terminus, once the token exists. See direction-model-memo.md for the full reasoning; do not
build against guessed destination strings, confirm against a real Darwin payload first.

## Open item for Tim only — do not resolve

**National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
redistribution with attribution, but the Rail Data Marketplace Platform Agreement (the data
sharing agreement between subscriber and RDG) may restrict downstream redistribution to
third-party rider clients — the operative clause isn't confirmed in public sources. Oracle report
confidence: `unclear`. Tim needs to review the signed RDM Data Sharing Agreement once
EvansAppStudio re-registers and receives a token, before this region's National Rail slice can be
relayed to end users. This is not something Luke or Jim should guess at or work around — flagged
for Tim, full stop.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). NET GTFS under OGL 3.0 (clear, redistribution permitted,
commercial use allowed, attribution to DFT Bus Open Data Service + Nottingham Express Transit
(Keolis)). National Rail under OGL 2.0 + NRE amendments (unclear on third-party redistribution —
see open item above).

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no NET intermediate-stop invention, no National Rail route/line invention, no Tamworth de-dup
logic, no resolution of the RDM redistribution ambiguity, no touching West Midlands / Greater
Manchester / Liverpool City Region packs, no touching Edinburgh or Glasgow (their oracle reports
were lost in the same wipe and haven't been redone — someone else decides whether to re-run
Nico for those, out of scope here).
