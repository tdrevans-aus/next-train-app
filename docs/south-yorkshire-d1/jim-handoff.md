South Yorkshire D1 + research pack. City stays **planned** / "Coming Soon" until (a) National
Rail is unblocked AND (b) Supertram's real-data-source status is confirmed with SYFTL/SYMCA AND
Jim wires testers live — this pack does not flip anything. Perth/Sydney/Brisbane/Adelaide/
Auckland live-gates untouched. All other in-flight planned cities untouched.
**assertCityLive("south-yorkshire") must fail** (city is not in `lib/providers/registry.js`
CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not invent
city=sy, city=sheffield, city=supertram, or city=south-yorkshire-supertram. Do not touch West
Midlands, Greater Manchester, Liverpool City Region, or East Midlands — same account-level
National Rail blocker on the National Rail half, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `South Yorkshire` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/south-yorkshire-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Scope and sole source

D1 input was **only** docs/south-yorkshire-d1/oracle-clash-report.md (Nico). No UK-country
ledger exists yet for this lane (`docs/*-ledger.md` glob has only `denmark-ledger.md`) — this
pack proceeds without one, per the country-lane doc's "region lanes read the ledger where one
exists" rule, same basis as `docs/east-midlands-d1/jim-handoff.md`.

Two agencies: **Sheffield Supertram** — four light-rail/tram-train lines, 51 stops,
schedule-only v1 with **no confirmed data source at all** (see the operator-transition gap
below — genuinely different in kind from the usual account block). **National Rail** —
Darwin/OpenLDBWS, technically documented and live but **blocked at the account level**
(EvansAppStudio's RDM registration is Australian; Tim is re-registering with a UK address). This
half is the same blocker as East Midlands / West Midlands / Greater Manchester / Liverpool City
Region and is **not a feed problem** — the catalog below is built normally per Nico's
instruction; only `DARWIN_LDB_TOKEN` wiring waits. Already accepted per the task brief for this
pack — not re-flagged as a new blocker.

## Hub lock and doNotGroup

**Sheffield Station (SHF CRS)** is the hub lock — Supertram tram viaduct above National Rail
main platforms, footbridge connects. **doNotGroup Supertram tram vs National Rail at Sheffield
Station** — separate infrastructure, separate operators (SYFTL vs EMR/Northern/TPE/CrossCountry),
separate boarding areas. Two-layer hub, not a single stop entity — see hazard-pack.md H1/H6, same
pattern as East Midlands' Nottingham Station.

**Meadowhall Interchange (MHS CRS)** is a second, distinct case — **not** a hub lock. Supertram
Tram-Train switches onto National Rail infrastructure here to continue toward Rotherham Central
and Parkgate; shared platform area but separate operators/infrastructure (doNotGroup still
applies, but model it as a through-running/infrastructure-switch point, not a parent hub). See
hazard-pack.md H1/H4/H6 and `meadowhallThroughRunningSwitch` in published-network.json.

## Supertram (build now, schedule-only, source TBD — genuine skip risk)

Four lines: **Blue** (Malin Bridge—Halfway via city centre/Manor Top/Gleadless Townend/Crystal
Peaks), **Purple** (Sheffield Station—Herdings Park via city centre/Manor Top; branches to
Gleadless Townend), **Yellow** (Middlewood—Meadowhall via city centre/Kelham Island/
Hillsborough/Sheffield Arena), **Tram-Train** (Sheffield—Rotherham Central—Parkgate via Sheffield
Arena and Meadowhall, switching to National Rail infrastructure post-Meadowhall South/Tinsley).

**Distinct hazard, flagged clearly per the task brief: no confirmed data source exists at all
under the current operator.** Sheffield Supertram changed operators on 22 March 2024 —
Stagecoach (previously published TransXChange/NetEx open data) handed over to **South Yorkshire
Future Tram Limited (SYFTL)**, an arm's-length public-authority subsidiary of South Yorkshire
Mayoral Combined Authority. No public GTFS or GTFS-RT feed has been confirmed under SYFTL, and
whether old Stagecoach data-sharing terms carry over is unconfirmed (license confidence
`unclear` per the oracle report). This is **not** the standard Rail-Data-Marketplace
account-registration block that affects National Rail across the whole UK wave — it is a genuine
"no feed exists" gap. A live departures board exists at livetrams.azurewebsites.net but has no
documented API and no GTFS-RT; not usable as a machine-readable v1 source. **Do not build against
a guessed Supertram feed.** Confirm with SYFTL / South Yorkshire MCA before any real GTFS pull;
until then this stays schedule-only with source TBD, and the catalog data below is
termini/via-points only (no full 51-stop ordered list — the report doesn't give one).

**Gap Jim needs to close at D2, not guessed here:** once/if a SYFTL feed is confirmed, pull it
for the actual ordered stop sequence and route IDs before building the station graph past the
termini/via-point names this pack has. Also confirm the Purple line's Gleadless Townend branch
junction point (report gives the branch by name only, no junction detail — see
direction-model-memo.md).

Direction model recommendation: **line (colour) + terminus** (e.g. `Blue + Halfway`), same shape
as every reference pack. See direction-model-memo.md.

## National Rail (build the catalog, hold the token)

**Do not wire `DARWIN_LDB_TOKEN`** — RDM registration is blocked pending Tim's UK
re-registration, same as the rest of the UK wave. Build the National Rail piece of the
adapter/catalog structurally, but it cannot go live (nor should tester-live flip include it)
until the token exists. Station list: hub Sheffield Station (SHF), through-running-only stations
Rotherham Central, Denby Dale, Darton, South Elmsall, Moorthorpe (West Yorkshire/South Yorkshire
boundary, ticketing schemes valid both ways at South Elmsall per the report) — these are **not**
merge/de-dup points, just routing/filter concerns (same operator continuing past the regional
boundary). CRS codes for these five were not given in the oracle report — do not guess them; pull
from a real Darwin/NRE reference once the token exists.

**Meadowhall Interchange (MHS)** is the one exception to "not a merge point" — it's a genuine
through-running **infrastructure switch** for Supertram Tram-Train (see Hub lock section above),
not a plain National Rail through-running station like the boundary five.

**Chesterfield is intentionally excluded from this pack.** It's East Midlands' station, not South
Yorkshire's — `docs/east-midlands-d1/published-network.json` already lists it under East
Midlands' `throughRunningOnly` (CRS CHD). The South Yorkshire oracle report (line 42) frames it
consistently: "not in South Yorkshire proper but may be served by through-running services." Do
not add a duplicate Chesterfield entry to South Yorkshire's catalog — this was checked against
the East Midlands pack per the task brief, not guessed.

No printed route/line map exists for National Rail (Darwin is a per-station real-time board, not
a fixed-route product) — direction should be modelled as **destination + operator**, not
line+terminus, once the token exists. See direction-model-memo.md for the full reasoning; do not
build against guessed destination strings, confirm against a real Darwin payload first.

## Open items for Tim only — do not resolve

1. **Supertram data source under SYFTL is unconfirmed.** No public GTFS/GTFS-RT found; license
   terms under the new operator are unclear (Stagecoach's prior terms may not carry over). Tim
   (or whoever owns UK outreach) needs to contact SYFTL/SYMCA to confirm whether/when a public
   feed will exist and what its terms are. This is a genuine skip-risk gap, distinct from the
   National Rail account block — flag separately in any downstream QA/skip-risk tracking, don't
   fold the two together.
2. **National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
   redistribution with attribution, but the Rail Data Marketplace Platform Agreement may restrict
   downstream redistribution to third-party rider clients — the operative clause isn't confirmed
   in public sources. Oracle report confidence: `unclear`. Tim needs to review the signed RDM
   Data Sharing Agreement once EvansAppStudio re-registers and receives a token. Same open item
   already raised for East Midlands — not a new discovery, just re-flagged here since it applies
   to this region's National Rail slice too.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). Supertram license: `unclear` confidence — SYFTL/SYMCA has not
published explicit GTFS/data-sharing terms in sources checked; do not assume open redistribution.
National Rail under OGL 2.0 + NRE amendments (`unclear` on third-party redistribution — see open
item above).

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no invented Supertram GTFS feed, route_id, or full 51-stop ordered list (report gives termini +
named via-points only — real gap, flagged not filled), no invented National Rail route/line
topology or CRS codes for the five boundary stations, no de-dup logic for the West Yorkshire
boundary stations (Denby Dale/Darton/South Elmsall/Moorthorpe — D2 concern for a future West
Yorkshire pack), no Chesterfield entry (owned by the existing East Midlands pack instead), no
resolution of the Supertram data-source gap or the OpenLDBWS redistribution ambiguity (both open
items for Tim, see above), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no touching
Edinburgh or Glasgow packs.
