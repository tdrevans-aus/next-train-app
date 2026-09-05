Rest of Scotland D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is
unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("rest-of-scotland") must fail** (city is not in `lib/providers/registry.js`
CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
rest-of-scotland live from this pack. Do not invent city=scotland, city=highlands, or
city=perth-scotland. Do not touch West Midlands, Greater Manchester, Liverpool City Region, East
Midlands, North East, West of England, South Wales, West Yorkshire, or South Yorkshire — same
account-level National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Rest of Scotland` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/rest-of-scotland-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## City id and naming

`city: "rest-of-scotland"` — plain kebab-case, no `uk-` prefix, matching West Yorkshire and every
other UK region built so far. Note the printed hub name "Perth" collides with the existing
`docs/perth-d1/` city (Perth, Australia) — these are two entirely separate D1 cities with the same
station display name. Disambiguate at UI/adapter level (e.g. city selector shows "Perth, Scotland"
vs. "Perth, Australia" or similar) — not resolved in this pack, flagged for Jim/product.

## Structural departure from every prior UK region: FOUR co-equal hub locks, not one

**This is the key thing to know before touching this city.** Every UK region packed so far (South
Wales, West Yorkshire, South Yorkshire, etc.) locks a single primary hub, sometimes with one
secondary. This report gives **no basis to rank Perth, Inverness, Aberdeen, Dundee into a
primary/secondary hierarchy** — each is independently a genuine terminus or multi-line junction
(report lines 19-22), and the report's own attempt to call Perth "primary" (line 30) is not backed
by a station-graph fact that would make the other three subordinate to it. This pack locks all
four as tier-1 hubs (`published-network.json`'s `nationalRailStations.hubs` array).

**Implication for adapter design:** confirm the board-fetch pattern used elsewhere (single hub
station per city) generalises to four independent hub boards for one `city` value before wiring —
this pack does not assume that generalisation is trivial, only that it's needed. See hazard-pack.md
H6 and coverageGaps in published-network.json.

## Caledonian Sleeper: out-reservation, excluded from boards at four stations

Caledonian Sleeper carries verdict **`out-reservation`** (compulsory berth booking; staff platform
check-in 60-90 min before departure is a reservation check, not a check-in barrier) per the
oracle report's own Board eligibility section (report lines 32-60, with evidence URLs). It calls at
**Aberdeen, Inverness, Fort William, Mallaig** within this catalog and must be excluded from the
board at each of those four stations specifically — not city-wide, since it doesn't call at Perth
or Dundee at all per the report. ScotRail, CrossCountry, and LNER Highland Chieftain all verdict
`in` at every hub/branch station they call. See hazard-pack.md Board eligibility table and
direction-model-memo.md's exclusion note.

## Regional boundary vs. future Glasgow/Edinburgh: UNRESOLVED, do not resolve here

The report (§V1 scoping line 7, C2/C3 point 4) flags an unresolved internal boundary dispute at
Falkirk High between this region's eventual scope and future Glasgow/Edinburgh regions (neither
built yet). **Per the task brief for this pack, this is explicitly not something to resolve** —
this catalog does not include Falkirk High or any Central Belt station, and Dundee's south branch
(toward Edinburgh) is recorded as an open coordination point in hazard-pack.md's doNotGroup
proposals, not as a resolved merge/boundary decision. When Glasgow and/or Edinburgh are eventually
packed, whoever builds them should read this note and reconcile against this catalog's northern
boundary — not the reverse.

## National Rail scope

One agency family in scope: **National Rail** — Darwin/OpenLDBWS, technically documented and live
but **blocked at the account level** (EvansAppStudio's RDM registration is Australian; Tim is
re-registering with a UK address). Same blocker as every other UK region packed so far and **not a
feed problem** — the catalog below is built normally per Nico's instruction; only
`DARWIN_LDB_TOKEN` wiring waits. ScotRail is a TOC within National Rail (report line 11), not a
separately-fed agency — no parent/child pairing to model, unlike South Wales/South Yorkshire.

A reference static GTFS dump exists (Rail Delivery Group via Transitland, CC-BY-2.0 UK, verified
live 2026-09-01 per the oracle report) — same as South Wales/West Yorkshire, so the "Darwin-only,
no static base layer" open product question from West of England does not apply here either. This
pack still does not build the catalog from that GTFS dump — station list is taken directly from
the oracle report's station name table, per the read-only-the-report rule.

## Hub locks (four)

- **Perth (PTH)** — three-line junction (Highland Main Line north, Tayside line east, cross-country
  south). ScotRail + CrossCountry + LNER, all `in`. No Caledonian Sleeper documented here.
- **Inverness (INV)** — four-line terminus (Highland Main Line, Aberdeen-Inverness line, Kyle of
  Lochalsh line, Far North Line), 7 platforms. ScotRail + CrossCountry + LNER `in`; Caledonian
  Sleeper `out-reservation`.
- **Aberdeen (ABD)** — two-line terminus (Dundee-Aberdeen line, Aberdeen-Inverness line),
  6 platforms. ScotRail + CrossCountry `in`; Caledonian Sleeper `out-reservation`.
- **Dundee (DDE)** — three-line junction (Dundee-Perth west, Dundee-Aberdeen north, Dundee-Edinburgh
  south — the unresolved Central Belt boundary direction). ScotRail + CrossCountry `in`. No
  Caledonian Sleeper documented here.

Branch termini: Kyle of Lochalsh (KLS), Thurso (THR), Wick (WCK) — ScotRail only, `in`, no
through-running. Mallaig (MLG), Fort William (FTW) — ScotRail `in` + Caledonian Sleeper
`out-reservation` (nights only).

## Direction model recommendation

**Destination + operator** (e.g. `Inverness (ScotRail)`, `London King's Cross (LNER)`), matching
every other UK National Rail region's recommendation. No line+terminus model — the report's line
names (Highland Main Line, Far North Line, etc.) are corridor/route-topology names, not confirmed
board-facing vocabulary. **Illustrative only, not verified** — no destination strings can be
confirmed until `DARWIN_LDB_TOKEN` exists and a real Darwin payload can be pulled. Caledonian
Sleeper has no proposed destination string at all — it's excluded from the board entirely, so
there's nothing to model. See direction-model-memo.md.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
2. **Four-hub adapter pattern.** Confirm whether the app's per-city board-fetch pattern supports
   multiple co-equal hub boards for one `city` value, or whether this needs a design decision
   before Jim can wire it (e.g. one board per hub CRS, city selector exposing four stations).
3. **Falkirk High / Central Belt boundary** — needs Glasgow and/or Edinburgh regions to be built
   and reconciled against this catalog's northern boundary. Not resolvable from this report alone.
4. **Perth/Perth name collision** with the existing Perth, Australia city — needs a UI/product
   decision on disambiguation, not something for Jim to invent unilaterally during adapter wiring.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). National Rail static GTFS (Transitland) is
CC-BY-2.0 UK, confidence `clear`, reference-only.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no ranking of the
four hub locks into a single primary + secondaries hierarchy, no resolution of the Falkirk
High/Central Belt boundary dispute or the RDM redistribution ambiguity (both flagged for Tim/D2),
no inclusion of any Central Belt station, no reading of any other city's in-progress pack, no
wiring of `DARWIN_LDB_TOKEN`.

## Jim flip follow-through (5 Sep 2026) — note for Mark

Per `docs/jim-brief-rest-of-scotland-flip.md`, this pass wired the dogfood module
(`lib/cities/rest-of-scotland/dogfood-next-train.js`, reusing the existing
`lib/cities/rest-of-scotland/stations.json`), the `directionsFor()` / `getMultiCityNextTrain()`
dispatch switch-cases in `lib/cities/live-city-api.js`, and
`qa/rest-of-scotland-dogfood-gate.mjs` (replacing the retired
`qa/rest-of-scotland-planned-gate.mjs`). Registry status stays `planned` — this pass does not flip
it.

**Deliberately NOT done here — these three one-line additions belong in your flip commit**
(same as Malmö/Uppsala/Göteborg/Greater Anglia/South Wales/Rest of Wales' flips did it;
`qa/live-city-lists-sync.mjs` enforces that they exactly equal the registry's `status === "live"`
set):

1. Add `"rest-of-scotland"` to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. Add Rest of Scotland to `brisbane-dogfood.js`'s mount/available map.
3. Add Rest of Scotland to `journey-model.js`'s persisted-city/country lists.

No direction-hubs.json was built — all four hub locks (Perth, Inverness, Aberdeen, Dundee) are
themselves the anchors a rider selects directly, unlike Greater Anglia's Thetford/Ely printing
"Norwich" as an intermediate destination; there is no intermediate through-station candidate in
this catalog. `loadDirectionHubs("rest-of-scotland")` degrades to an empty hub list, a no-op, which
`qa/rest-of-scotland-dogfood-gate.mjs` asserts explicitly. The Caledonian Sleeper out-reservation
exclusion (Aberdeen, Inverness, Fort William, Mallaig) is enforced inside
`lib/providers/rest-of-scotland.js`'s `fetchStationBoard()`, reused unchanged by the dogfood
module, and this gate additionally asserts no live-derived direction chip ever carries a
"Caledonian Sleeper" operator tag. The Perth/Perth (Scotland vs. Australia) display-name collision
remains unresolved — still a UI/product decision for Tim, not something wired around here.
