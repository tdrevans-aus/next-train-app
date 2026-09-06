North East D1 + research pack. City stays **planned** / "Coming Soon" until (a) National Rail is
unblocked, (b) a confirmed Metro real-time source is found or a permanent schedule-only decision
is made, AND (c) Jim wires testers live — this pack does not flip anything.
Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. All other in-flight planned cities
untouched. **assertCityLive("north-east") must fail** (city is not in `lib/providers/registry.js`
CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not invent
city=ne, city=newcastle, city=tyne-and-wear, or city=north-east-metro. Do not touch West Midlands,
Greater Manchester, Liverpool City Region, East Midlands, or South Yorkshire — same account-level
National Rail blocker on the National Rail half, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `North East` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/north-east-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Scope and sole source

D1 input was **only** docs/north-east-d1/oracle-clash-report.md (Nico). No UK-country ledger
exists for this lane (`docs/*-ledger.md` glob has only `denmark-ledger.md`) — this pack proceeds
without one, per the country-lane doc's "region lanes read the ledger where one exists" rule,
same basis as `docs/east-midlands-d1/jim-handoff.md` and
`docs/south-yorkshire-d1/jim-handoff.md`.

Two agencies: **Tyne and Wear Metro** — two light-rail lines, 41 + 31 stations, schedule-only v1
with **no confirmed public real-time feed** (unofficial app-only API not usable). **National
Rail** — Darwin/OpenLDBWS, technically documented and live but **blocked at the account level**
(EvansAppStudio's RDM registration is Australian; Tim is re-registering with a UK address). This
half is the same blocker as East Midlands / West Midlands / Greater Manchester / Liverpool City
Region / South Yorkshire and is **not a feed problem** — the catalog below is built normally per
Nico's instruction; only `DARWIN_LDB_TOKEN` wiring waits. Already accepted per the task brief for
this pack — not re-flagged as a new blocker.

## Hub lock, doNotGroup, and the Sunderland exception — read this section carefully

**Newcastle Central (NCL CRS)** is the hub lock — Metro Central is a deep-tube station directly
below the National Rail main-line platforms, no walk-through connection named. **doNotGroup Metro
Central vs National Rail at Newcastle Central** — separate infrastructure, separate operators (DB
Regio for Nexus vs Northern Trains and other NR TOCs), separate boarding areas. Same pattern as
South Yorkshire's Sheffield Station and East Midlands' Nottingham Station hub locks
(`docs/south-yorkshire-d1/hazard-pack.md` H1, `docs/east-midlands-d1/hazard-pack.md` H1).

**Sunderland is genuinely different — do not doNotGroup it.** The report states Metro Green Line
and National Rail Northern Trains use the **same platforms on the same track** between Pelaw and
Sunderland. This is a real shared-boarding-area case: a rider on the platform can walk up and
board either service. doNotGroup exists to keep two *separate* boarding areas from merging — that
instrument is the wrong tool here. Model Sunderland as a **single shared-platform through-running
station** (`sunderlandSharedPlatform` in published-network.json): one board, both services tagged
by mode/operator, per `docs/board-eligibility-rule.md`'s walk-up rule. This is a v1 modeling note
only — Metro real-time doesn't exist yet and National Rail is blocked, so the mixed board is not
buildable end-to-end today, but the station-graph shape (one platform entity, not two) should be
set up correctly from D2 onward so it isn't retrofitted later.

**Flag for whoever owns UK station-graph QA (not resolved in this pack):** Nico's report names
Rotherham Central (South Yorkshire) as a comparable same-platform precedent for Sunderland, but
South Yorkshire's own already-merged `published-network.json` states Rotherham Central has **no
shared platform** with National Rail. One of the two descriptions is likely wrong. This pack
builds Sunderland only from what the North East report itself says (which is internally
unambiguous), and does not touch or re-open the South Yorkshire pack. See hazard-pack.md H1 for
detail.

**Pelaw** is a Metro-only through-running junction, not a National Rail station and not a
doNotGroup case — south of Pelaw is Green-exclusive track to South Hylton, north of Pelaw the
Green Line's track becomes shared with National Rail toward Sunderland. No CRS code exists for it
per the report.

## Metro (build now, schedule-only, no confirmed real-time source)

Two lines: **Yellow** (St James—South Shields, 41 stations per the report) and **Green**
(Airport—South Hylton via Sunderland, 31 stations per the report). Both converge on a shared
central section, South Gosforth–Pelaw. Static GTFS confirmed live via DFT Bus Open Data Service
(`f-bus~dft~gov~uk`, no key, OGL 3.0, verified 31 Aug 2026) — pull this at D2 for the actual
ordered stop sequence and route IDs; this pack's `stations` arrays are termini/hub/junction names
only, not the full ordered list.

**Genuine "no source" real-time gap, distinct in kind from the National Rail account block:** no
public GTFS-RT or documented real-time API found for Metro. An unofficial API exists at
metro-rti.nexus.org.uk but appears to be for the Nexus Pop app only, undocumented, not usable.
Confirm with Nexus/DB Regio whether a public real-time feed exists or will be published before
this can move past schedule-only v1.

Direction model recommendation: **line (colour) + terminus** (e.g. `Yellow + South Shields`,
`Green + South Hylton`), same shape as every reference pack. See direction-model-memo.md,
including the caveat on whether Yellow calls Pelaw itself (unconfirmed).

## National Rail (build the catalog, hold the token)

**Do not wire `DARWIN_LDB_TOKEN`** — RDM registration is blocked pending Tim's UK
re-registration, same as the rest of the UK wave. Build the National Rail piece of the
adapter/catalog structurally, but it cannot go live (nor should tester-live flip include it) until
the token exists. Station list: hub Newcastle Central (NCL), shared-platform case Sunderland (no
CRS given, see above), through-running-only Berwick-upon-Tweed (BWK, Scotland boundary). CRS
codes given in the report are used as-is; none guessed beyond what's printed.

**Berwick-upon-Tweed (BWK):** England's northernmost ECML station, Scotland boundary, Northern
Trains through-running into Scotland. Included in this pack per the report's station table, but
whether additional ECML stations between Newcastle and Berwick (Morpeth, Alnmouth) belong to
North East's catalog is **not stated** in the report — not enumerated here, flagged as a gap, not
guessed. No Rest-of-Scotland pack exists yet to check the northern side of this boundary against.

**Darlington (DRL) is excluded from this pack entirely.** The report explicitly flags it as
needing Luke-stage clarification against East Midlands, but East Midlands' own oracle report and
published pack (`docs/east-midlands-d1/*.md`, `*.json`) do not mention Darlington at all — checked
directly, no match. The boundary is genuinely open on both sides, not just under-flagged on one.
Do not add Darlington to either region's catalog until this is resolved; flagged for Tim/whoever
owns cross-region boundary decisions.

No printed route/line map exists for National Rail (Darwin is a per-station real-time board, not
a fixed-route product) — direction should be modelled as **destination + operator**, not
line+terminus, once the token exists. At Newcastle Central this coexists with doNotGroup
(separate boards); at Sunderland this coexists with the shared-platform single board (see above).
See direction-model-memo.md for the full reasoning; do not build against guessed destination
strings, confirm against a real Darwin payload first.

## Open items for Tim only — do not resolve

1. **Metro real-time source is unconfirmed.** No public GTFS-RT or documented API found; the only
   candidate (metro-rti.nexus.org.uk) appears to be app-only and undocumented. Tim (or whoever
   owns UK outreach) needs to contact Nexus/DB Regio to confirm whether/when a public real-time
   feed will exist. Genuine skip-risk gap, distinct from the National Rail account block — flag
   separately in any downstream QA/skip-risk tracking, don't fold the two together.
2. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item already
   raised for East Midlands and South Yorkshire — OGL 2.0 baseline permits redistribution with
   attribution, but the RDM Platform Agreement's language on downstream redistribution to
   third-party rider clients isn't confirmed in public sources. Tim needs to review the signed
   RDM Data Sharing Agreement once EvansAppStudio re-registers.
3. **Sunderland vs Rotherham Central precedent inconsistency.** North East's report and South
   Yorkshire's already-merged pack disagree on whether Rotherham Central shares a platform with
   National Rail. Someone owning UK station-graph QA should reconcile this — it doesn't block
   North East's own Sunderland modeling (built independently from what this report says), but it
   is a real cross-pack data-quality flag.
4. **Berwick-upon-Tweed / Rest-of-Scotland boundary and Darlington / East Midlands boundary are
   both unresolved.** Neither guessed into this pack. See hazard-pack.md doNotGroup table.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). Metro (Tyne and Wear GTFS via DFT aggregator) under OGL 3.0 —
clear, commercial redistribution with attribution permitted. National Rail under OGL 2.0 + NRE
amendments (`unclear` on third-party redistribution — see open item above).

## Flip follow-through (5 Sep 2026, docs/jim-brief-north-east-flip.md)

Ahead of the flip, this pass wired the code half of flip follow-through — safe because production
routes gate on `assertCityLive()` first, not on list membership:

- `lib/cities/north-east/dogfood-next-train.js` (National Rail derives directions live from
  Darwin; Metro surfaces `MetroFeedUnconfirmedError` unconditionally — never fabricates a board
  from the static label list).
- The `north-east` dispatch switch-cases in `lib/cities/live-city-api.js`'s `directionsFor()` /
  `getMultiCityNextTrain()`.
- `qa/north-east-dogfood-gate.mjs`, replacing the retired `qa/north-east-planned-gate.mjs`, and
  the matching swap in `qa/run-all.mjs`'s gate list.

**For Mark, at the actual flip commit — do NOT add these now:** three one-line list-membership
additions, gated by `qa/live-city-lists-sync.mjs` to exactly match the registry's `status ===
"live"` set:

1. `"north-east"` added to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. `"north-east"` added to `brisbane-dogfood.js`'s mount/available map.
3. `"north-east"` added to `journey-model.js`'s persisted-city/country lists.

Registry `status` itself also stays `"planned"` until Mark's flip PR — not touched here.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no invented Metro GTFS-RT feed or route_id (none confirmed — real gap, flagged not filled), no
invented full 41/31-station ordered stop list (report gives termini + named via-points/junction
stations only), no invented National Rail CRS code for Sunderland (not given in the report), no
resolution of the Berwick/Rest-of-Scotland or Darlington/East Midlands boundaries (both
unresolved, flagged not guessed), no resolution of the Rotherham Central precedent inconsistency
in South Yorkshire's already-merged pack (flagged for whoever owns UK station-graph QA, not
edited here), no wiring of `DARWIN_LDB_TOKEN`, no product edit, no touching West Midlands,
Greater Manchester, Liverpool City Region, East Midlands, or South Yorkshire packs.
