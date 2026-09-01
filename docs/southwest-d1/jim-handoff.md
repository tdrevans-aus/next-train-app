Southwest D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("southwest") must fail** (city is not in `lib/providers/registry.js` CITIES
today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
southwest live from this pack. Do not invent city=uk-southwest, city=devon-cornwall, or
city=south-west-england (plain kebab-case `southwest`, no prefix, per dispatch instruction and
matching every other UK region built tonight). Do not touch West Midlands, Greater Manchester,
Liverpool City Region, East Midlands, South Wales, West of England, or London & South East
National Rail — same account-level National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Southwest` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/southwest-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Scope and sole source

D1 input was **only** docs/southwest-d1/oracle-clash-report.md (Nico). No UK-country ledger
exists yet for this lane (`docs/*-ledger.md` glob has no `united-kingdom-ledger.md`) — this pack
proceeds without one, per the country-lane doc's "region lanes read the ledger where one exists"
rule. Two already-merged UK packs were read strictly for the two consistency checks the dispatch
instruction named — `docs/west-of-england-d1/` (Taunton boundary flag) and
`docs/london-se-national-rail-d1/` (Night Riviera Sleeper board-eligibility verdict) — and not
otherwise used as a source of station-graph fact for this region.

One agency: **National Rail** — Darwin/OpenLDBWS, technically documented and live but **blocked at
the account level** (EvansAppStudio's RDM registration is Australian; Tim is re-registering with a
UK address). Same blocker as West Midlands / Greater Manchester / Liverpool City Region / East
Midlands / South Wales / West of England / London & South East, and **not a feed problem** — the
catalog below is built normally per Nico's instruction; only `DARWIN_LDB_TOKEN` wiring waits.

**Same "no static GTFS at all" gap as West of England / London & South East National Rail.**
National Rail Enquiries does not publish static GTFS anywhere, so there is no schedule-only v1 to
build in the interim. The whole region is Darwin-or-nothing. Same open flag for Tim carried
forward from those two packs, not re-litigated here — see coverageGaps in published-network.json.

## Hub lock, secondary hub, terminus

**Exeter St Davids (EXD)** is the hub lock — principal rail terminus for Exeter city, all GWR
InterCity and regional services call here, main interchange between London Paddington services and
the Southwest corridor. **Plymouth (PLY)** is the secondary hub — frequent service to EXD (30-60
min), direct service to Penzance via Riviera Line, largest passenger station in the region after
Exeter. **Penzance (PNZ)** is the terminus — westernmost and southernmost National Rail station,
end of the Cornish Main Line. **No doNotGroup needed at any of the three** — all GWR-dominated,
platforms distinguished by route not operator; CrossCountry through-running is on distinct
platforms but the report does not ask for a doNotGroup split (report C2/C3 point 6). Same simple
hub structure as West of England's Bristol Temple Meads/Bath Spa pair, extended with a terminus
node for Penzance — see hazard-pack.md H1/H4/H6.

## Boundary through-running station (not a merge)

**Taunton (TAU)** — boundary to West of England region. GWR and CrossCountry services cross into
West of England (Bristol/Bath/London Paddington direction) at this point. Already documented from
the West of England side (`docs/west-of-england-d1/published-network.json`,
`throughRunningOnly[3]`: "toward Southwest/Devon region — not a merge. GWR continues west to
Exeter and beyond."). This pack's own report (line 18) independently reaches the matching
conclusion from the Southwest side: "through-running point, boundary to West of England region.
Not a merge." **No contradiction between the two packs** — both mark Taunton as a boundary
through-running point, neither merges it, and this pack does not build any cross-region merge
logic for it. Flag for D2 de-dup once both regions ship live, same treatment as every other UK
boundary station packed so far.

Five further intermediate through-running-only stations are in-catalog with no boundary
implication: Newton Abbot (NAB), Totnes (TON), Truro (TRU), St Austell (SAU), St Erth (SER) — see
published-network.json `nationalRailStations.throughRunningOnly`.

## Night Riviera Sleeper — excluded, out-reservation

Compulsory sleeping-car cabin reservation, cannot be booked online, must be reserved at station or
via GWR telesales — walk-up boarding is not available. Calls at Exeter St Davids, Plymouth, Truro,
St Austell, St Erth, and terminates at Penzance. Verdict `out-reservation`, consistent with the
same service's `out-reservation` verdict at Paddington in
`docs/london-se-national-rail-d1/published-network.json`. Do not include Night Riviera Sleeper on
any board logic when Jim wires the adapter — see `excludedServices` in published-network.json.

## Direction model recommendation

**Destination + operator** (e.g. `London Paddington (GWR)`, `Nottingham (CrossCountry)`),
matching how National Rail departure boards actually present and identical in shape to the West
of England / East Midlands / London & South East National Rail recommendations. No line+terminus
model — GWR does not brand this corridor with rider-facing "line" identifiers a direction model
could key off (Cornish Main Line/Riviera Line are geographic branch labels in the station table,
not boardable direction names), and inventing them would be guessing. **Illustrative only, not
verified** — no destination strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a real
Darwin payload can be pulled. See direction-model-memo.md for full reasoning and options
considered.

## Darwin structural block (account-level, distinct from the RDM blocker)

Per dispatch: Darwin is additionally structurally blocked in this environment because
`DARWIN_LDB_TOKEN` is unset — this is the same account-level blocker described above (EvansAppStudio's
RDM registration needs to move to a UK address before any token, including a southwest-scoped one,
can be provisioned). Nothing new to reconcile here; the station graph and exclusions in this pack
are built normally per instruction, and the city lands as Coming Soon (`status: "planned"`) exactly
as every other UK National Rail region has, pending that unblock plus Jim's wiring.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
   redistribution with attribution, but the Rail Data Marketplace Platform Agreement may restrict
   downstream redistribution to third-party rider clients — the operative clause isn't confirmed
   in public sources. Oracle report confidence: `unclear`. Same open item as every other UK
   National Rail region packed so far — not re-litigated here.
2. **No static GTFS exists for this feed.** Same gap as West of England and London & South East.
   Confirm with Tim whether Next Train's architecture supports a Darwin-only realtime-board model,
   or whether a third-party GTFS supplement is required before this region can go live at all
   (independent of the account-level token blocker).

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). Same license posture as every other UK National
Rail region (same underlying feed).

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no boundary de-dup
logic for Taunton (D2 concern for whichever of Southwest/West of England ships second), no
resolution of the RDM redistribution ambiguity or the Darwin-only-vs-GTFS product question (both
flagged for Tim, already flagged identically by two prior packs), no reading of any city's oracle
report or in-progress pack beyond the two named consistency checks (West of England Taunton flag,
London & South East Night Riviera verdict), no touching West Midlands / Greater Manchester /
Liverpool City Region / East Midlands / South Wales / West of England / London & South East
National Rail packs, no wiring of `DARWIN_LDB_TOKEN`.
