## RESCOPED 4 Sep 2026 — full-network rescope, read this before rewiring

**The catalog grew from 6 stations to 98 (29 National Rail + 69 Merseyrail).** This happened
*after* the city was already flipped live (commit `222f89a`, `#194` currently open/merged on the
old 6-station shape — see qa-note.md's sign-off for that flip). **`#194` (or whatever the flip PR
built on the 6-station catalog is called) must be superseded, not merged as-is** — a fresh QA pass
and, if needed, a fresh flip PR must run against this 98-station catalog before anyone treats the
old flip as final. Full before/after detail, sourcing (ORR Table 6329 + NaPTAN, not the DFT Bus
Open Data precedent the brief initially suggested — that precedent doesn't apply here, see below),
and the one real unsourced gap: `docs/liverpool-city-region-d1/rescope-addendum.md`.

**What Jim needs to re-check against the new 98-station catalog:**

1. **`lib/providers/liverpool-city-region.js` and `lib/cities/liverpool-city-region/dogfood-
   next-train.js` are generic** — they call `listRailStations`/`listMetroStops`/
   `listCatalogStations` from `lib/providers/uk/catalog.js`, which derives counts directly from
   `stations.json`. No hand-written station lists exist in either file, so **no code change should
   be needed there** for the count to update — verify this holds (it did when this rescope ran
   `node qa/liverpool-city-region-dogfood-gate.mjs` and `node qa/uk-region-catalog-conformance.mjs`,
   both green after only updating the two gates' own hardcoded count assertions).
2. **`marketing-directions.js`'s `marketingLabelsForStation()`** still only generates chips for the
   originally-named termini/interchanges (Ellesmere Port, Liverpool Central, Moorfields). The
   rescope did not extend it to the five newly-catalogued named termini (Southport, Ormskirk,
   Headbolt Lane, West Kirby, Chester) — that's a product decision (should they get the same
   terminus-only chip treatment?), left to Jim per direction-model-memo.md's rescope addendum.
3. **CITY_BOUNDS in `public/city-session.js`** (see qa-note.md's illustrative box, `minLat: 53.25,
   maxLat: 53.43, minLng: -3.02, maxLng: -2.85`) was derived from only 5 station coordinates and
   flagged as needing a real geocode pass. `stations.json` now has real NaPTAN-sourced lat/lng for
   all 98 stations — recompute the bounding box from the full set rather than the old 5-point
   estimate before the next flip lands.
4. **Do not resolve the Northern/Wirral line-membership gap by inference.** ~60 of the 69
   Merseyrail stations have no `line` field in `stations.json` — ORR Table 6329 has no route/line
   column and Transitland's REST API returned 401 with no key available. See hazard-pack.md H3 and
   rescope-addendum.md. This is a genuine sourcing gap for Nico to close with a scoped follow-up,
   not something to fill in from geography at wiring time.

## Original D1 pack (1–2 Sep 2026), still accurate for everything not listed above

Liverpool City Region D1 + research pack. City stays **planned** / "Coming Soon" until (a)
National Rail is unblocked (`DARWIN_LDB_TOKEN`), (b) Merseyrail's real-time feed status is
confirmed with Merseyrail (or explicitly accepted as permanently schedule-only), (c) the Lime
Street structural ambiguity (H1) is resolved, (d) the Ellesmere Port registry discrepancy is
resolved, and (e) Jim wires testers live — this pack does not flip anything. **assertCityLive
("liverpool-city-region") must fail** (city is not in `lib/providers/registry.js` CITIES today —
Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not touch
`uk-ellesmere-port` or any other UK region's entry — same account-level National Rail blocker, but
separate regions/packs.

Lane lock: acquired `United Kingdom` / `Liverpool City Region` / `luke` before writing (checked
free first — `node qa/lane-lock.mjs check "United Kingdom"` returned "free", Greater Manchester's
lock released post-merge, PR #183).

Research pack is docs/liverpool-city-region-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file). This was a fresh
from-scratch build 1 Sep 2026 — the tracker's prior "Packed 2026-08-28" claim was false; no trace
of an earlier Liverpool City Region pack existed anywhere in the codebase before this one.

## V1 scope decision — READ THIS BEFORE WIRING

**The oracle report left the Merseyrail v1 scope question open, recommending National Rail only
(Option B) as its headline suggestion. This pack builds Option A instead: National Rail +
Merseyrail, Merseyrail schedule-only.**

Reasoning (full detail in direction-model-memo.md):

1. **National Rail's blocker (DARWIN_LDB_TOKEN) is account-level, not catalog-level** — same as
   every other UK region this wave. It doesn't compound with Merseyrail's separate real-time
   uncertainty; the two blockers are independent and both should be built through, not around.
2. **Merseyrail's static schedule is confirmed live** (Transitland `f-gc-rail~delivery~group~
   planar~gtfs`, verified 2026-08-31). Only real-time is unconfirmed — no public GTFS-RT endpoint
   found anywhere. This is exactly the shape this pipeline already shipped twice this wave:
   **Greater Manchester's Metrolink** (schedule-only, TfGM portal deprecated) and **South
   Yorkshire's Supertram** (schedule-only, no SYFTL feed confirmed). Neither of those modes was
   deferred entirely for the same reason Merseyrail's report recommends deferring here.
3. **Board eligibility verdicts Merseyrail `in`** (report line 84, walk-up, no reservation, no
   check-in barrier) — deferring a board-eligible, in-scope mode to H2 without a Merseyrail-specific
   reason distinct from Metrolink's/Supertram's would be inconsistent with how this pipeline treats
   "confirmed static, unconfirmed real-time" everywhere else it's come up.
4. **Scale matters:** Merseyrail is 69 stations, larger than the report's own ~30–40 estimate for
   National-Rail-only stations in this region. Deferring it would ship a catalog that excludes the
   majority of the region's rail network and both named Merseyrail interchange stations (Liverpool
   Central, Moorfields).

**This is a deliberate deviation from the report's headline recommendation — flagged as open item
1 for Tim in direction-model-memo.md. Confirm this scope call makes sense before wiring; do not
default back to "National Rail only" without re-reading the reasoning above and in
direction-model-memo.md.**

## Hub architecture — two separate agency structures, Lime Street structurally ambiguous

- **National Rail:** hub lock = **Liverpool Lime Street (LIV)**. Secondary hub = **Liverpool
  South Parkway (LPY)**. Standard hub+secondary-hub pattern, unambiguous.
- **Merseyrail:** interchange pair = **Liverpool Central** and **Moorfields** — both named
  "dual-line interchange" by the report with no ranking given between them. Neither built as sole
  hub lock over the other.
- **Liverpool Lime Street's Merseyrail relationship is UNRESOLVED — read hazard-pack.md H1 before
  wiring the station graph.** The report contradicts itself: line 41 says Merseyrail
  "interchanges at platform level" at Lime Street (implying shared platforms/building); line 73 and
  C2/C3 point 2 say "separate infrastructure, separate entrance/footbridge" (implying a walk-link
  pair). No distance/time figure is given either way, unlike Manchester Victoria's explicit
  "escalator/lift, 2–5 min" or Manchester Piccadilly/Piccadilly Gardens' explicit "~100m, 5–10
  min." This pack built Lime Street as **two separate stationGroups** (`liverpool-lime-street-nr`
  and `liverpool-lime-street-merseyrail`), `doNotGroup: true` between them, using the more
  conservative separate-infrastructure reading — safe either way (never risks a false merge), but
  genuinely unconfirmed. **Confirm with a walk-distance figure, site documentation, or a live
  Merseyrail/Darwin response before treating this as the final station graph.**

## Ellesmere Port registry discrepancy — RESOLVED 2 Sep 2026

Tim's decision: `uk-ellesmere-port` was a hangover, not a real region — delete it. The standalone
registry entry, `city-session.js` picker row, `lib/providers/uk/regions.json` entry, and its
`lib/cities/uk-ellesmere-port/stations.json` catalog file are all gone. This pack's Merseyrail
scope already carried Ellesmere Port as a Wirral Line terminus (`stationGroups` id
`ellesmere-port` in `published-network.json`) — that entry is untouched and is now the only one.
No merge or CRS-list absorption was needed; there was nothing to move.

## Direction model recommendation

**Merseyrail: line + terminus** — same model as every reference metro/light-rail pack (Rotterdam,
Newcastle, Boston, East Midlands NET, South Yorkshire Supertram, Greater Manchester Metrolink).
Two lines (Northern Line, Wirral Line), termini/branches only given by the report (not a full
69-stop order — real gap, same shape as Metrolink's 99-stop gap).

**National Rail: destination + operator**, no line+terminus model — same as every prior UK
National Rail region. At Lime Street this applies across all seven operators in one flat board (no
evidence of platform-mixing complexity requiring an internal doNotGroup among the NR operators
themselves — doNotGroup only applies against the Merseyrail layer, per H1). **Illustrative only,
not verified** — no destination strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a
real Darwin payload can be pulled. See direction-model-memo.md for full reasoning and options
considered.

## Skip risk — Merseyrail real-time feed status (genuine unknown, not the standard account block)

No documented public GTFS-RT endpoint found in Transitland, Mobility Database, or Merseyrail's own
developer documentation — only a mobile app ("Train Check") with an undocumented internal API. This
is a different *kind* of hazard than the National Rail account block — it is not "Tim needs to
re-register," it may genuinely be "no public real-time feed exists for Merseyrail at all." Same
shape as Greater Manchester's Metrolink gap and South Yorkshire's Supertram/SYFTL gap.
**Merseyrail ships v1 schedule-only.** Whoever wires this adapter should first contact Merseyrail
(data@merseyrail.org / https://www.merseyrail.org/) to confirm whether a public feed exists or is
planned before assuming this is a temporary state.

## Open items for Tim only — do not resolve

1. **Confirm the National Rail + Merseyrail (schedule-only) v1 scope decision** — this pack's own
   judgment call, departing from the oracle report's headline recommendation (defer Merseyrail).
   See reasoning above and in direction-model-memo.md.
2. **Lime Street/Merseyrail structural relationship is unresolved** (hazard-pack.md H1) — report
   contradicts itself, no distance/time figure given. Confirm before Jim wires the station graph.
3. **Merseyrail real-time feed status** — genuinely unknown, Merseyrail contact needed. See skip
   risk above.
4. **Ellesmere Port / `uk-ellesmere-port` registry discrepancy** — second flag, needs an actual
   decision at wiring stage (merge into this region, or keep standalone and override the tracker's
   note).
5. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers and receives a token.
6. **Liverpool Central vs Moorfields ranking** — report names both as Merseyrail "dual-line
   interchange" with no ranking given, unlike Metrolink's explicit St Peter's Square-over-Victoria
   ranking. Confirm if a real ranking exists before treating one as senior to the other.
7. **UK country ledger retrofit is still overdue** — no `docs/united-kingdom-ledger.md` exists as
   of this pack (Greater Manchester's pack flagged this as overdue too; still not written). The
   Lime Street structural ambiguity and Ellesmere Port discrepancy recorded here are exactly the
   kind of cross-region facts that ledger should hold once it exists, rather than being re-derived
   by a future region.
8. **96 CRS tracker claim is unverified** (report line 57) — this pack enumerates only the five
   individually named stations (Lime Street, South Parkway, Central, Moorfields, Ellesmere Port);
   the remaining ~90-100 stations are a real gap, not populated. Pull the confirmed static GTFS
   feed for the full station list at adapter time.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail static GTFS (Transitland) is CC-BY-2.0 UK,
confidence `clear`, reference-only. National Rail real-time is OGL 2.0 baseline with NRE
amendments, confidence `unclear` on third-party redistribution — same open item as every other UK
NR region. Merseyrail static GTFS inherits CC-BY-2.0 UK via the bundled national feed, confidence
`unclear` (no separate Merseyrail license page found — verify feed metadata before shipping).
Merseyrail real-time has no license because no confirmed feed exists — confidence `not found`.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit
(including no edit to `uk-ellesmere-port`), no GTFS fetch/parse (Transitland's National Rail feed
is verified live and cited, but not pulled — station names/lines come from the oracle report's own
tables), no invented station-graph or stop-order facts beyond what the report's tables/C2/C3 points
state (Merseyrail's full 69-stop order is a real gap, not filled), no invented destination strings,
no CRS verification against a live feed or Darwin response, no resolution of the Lime
Street/Merseyrail structural ambiguity (H1, flagged not resolved), no resolution of the Ellesmere
Port registry discrepancy (Jim/Tim call, second flag), no resolution of the OpenLDBWS
redistribution-terms ambiguity (open item for Tim, same as every other UK NR region), no
resolution of the Merseyrail real-time feed status (open item for Tim/Merseyrail contact), no
wiring of `DARWIN_LDB_TOKEN`, no `docs/united-kingdom-ledger.md` creation (flagged as overdue, not
this pack's job to write), no reading of any other city's in-progress (unfinished) pack.

## Flip commit — list additions for Mark (added 2 Sep 2026, Jim's code-side follow-through)

Darwin's OpenLDBWS is genuinely live now (`lib/providers/uk-darwin.js` REST rewrite, PR #188,
verified against Bristol Temple Meads) — Tim has authorized flipping Liverpool City Region live.
Ahead of that, this pass landed the code-side follow-through only: `lib/cities/
liverpool-city-region/dogfood-next-train.js`, the `liverpool-city-region` switch-cases in
`lib/cities/live-city-api.js`'s `directionsFor`/`getMultiCityNextTrain`, and
`qa/liverpool-city-region-dogfood-gate.mjs` (replacing `qa/liverpool-city-region-planned-gate.mjs`
in `qa/run-all.mjs`'s smoke list). **Merseyrail real-time is a permanent, known gap, not a
blocker** — `fetchMerseyrailStopBoard()` throws `MerseyrailFeedUnconfirmedError` unconditionally
and the dogfood dispatch surfaces it rather than fabricating a schedule, same posture as Greater
Manchester's Metrolink and South Yorkshire's Supertram. **Lime Street's H1 structural ambiguity is
preserved exactly as built — NOT resolved by this pass** (two separate stationGroups, `doNotGroup:
true`, conservative separate-infrastructure reading; see `lib/providers/liverpool-city-region.js`
file header and `hazard-pack.md` H1).

**Deliberately NOT done in this pass — bundle these into the actual status-flip commit** (same
split West of England's/East Midlands' flips used):

1. `lib/providers/registry.js` — flip the `liverpool-city-region` entry's `status` from
   `"planned"` to `"live"`. Also worth updating the `notes`/`integration` prose the same way prior
   flips did (record the Darwin unblock + flip date + confirm the Merseyrail-permanent-gap
   posture), though that's prose, not a gate.
2. `lib/cities/live-city-api.js` — add `"liverpool-city-region"` to the `MultiCityId` typedef union
   and to the `MULTI_CITY_IDS` array (both currently end in `..."oslo","west-of-england"]`/`|"oslo"|
   "west-of-england"`).
3. `public/app.js` — add `"liverpool-city-region"` to `NEARBY_MULTI_CITY_IDS` and to the
   `LIVE_CITY_IDS` `Set`.
4. `public/brisbane-dogfood.js` — add `"liverpool-city-region"` to the `MULTI_CITY_IDS` array and
   add `"liverpool-city-region": true` to the `available` map.
5. `public/city-session.js` — add `"liverpool-city-region"` to the `MULTI_CITY_IDS` array; add a
   picker region entry under the `gb` country's regions list, e.g. `{ id:
   "liverpool-city-region", name: "Liverpool City Region", timeZone: "Europe/London", comingSoon:
   false }` (follow the exact shape West of England's/East Midlands' flips used, inserted after
   the existing `west-of-england` entry or wherever the gb regions array currently ends); add a
   `CITY_BOUNDS` entry — derived below since `stations.json`'s lat/lng are null for every station
   (no coordinate source was pulled by this D1 pack; confirmed in the file header), same situation
   West Midlands' and East Midlands' flips hit. Derived from real, independently known locations
   of the five named catalog stations (Liverpool Lime Street ~53.4075°N -2.9776°W, Liverpool South
   Parkway ~53.3527°N -2.8888°W, Liverpool Central ~53.4041°N -2.9789°W, Moorfields ~53.4093°N
   -2.9884°W, Ellesmere Port ~53.2814°N -2.8969°W — Liverpool city centre overall is roughly
   53.41°N, -2.98°W per the task brief), with a small pad:
   `"liverpool-city-region": { minLat: 53.25, maxLat: 53.43, minLng: -3.02, maxLng: -2.85 }`
   (illustrative — confirm against a real geocode pass before shipping, same caveat West
   Midlands'/East Midlands' notes carried).
6. `public/journey-model.js` — add `"liverpool-city-region"` to `PERSISTED_CITY_IDS` (the `"gb"`
   country id is already in `PERSISTED_COUNTRY_IDS` from `uk-london-tfl`, no change needed there).
7. `qa/uk-planned-gate.mjs` — add `"liverpool-city-region"` to the `LIVE_UK_REGION_IDS` `Set`
   (currently `new Set(["uk-london-tfl", "west-of-england"])`), and update the trailing
   `console.log` summary string to mention liverpool-city-region is live. **This assertion cannot
   be made to pass both before and after the flip** — `LIVE_UK_REGION_IDS` is a hardcoded set
   checked directly against `getCity(id)?.status`, not derived from the registry, so adding
   `"liverpool-city-region"` to it before the status flip lands would make the gate fail *now*
   (status still `"planned"`) instead of *after* (status `"live"`). Note: `liverpool-city-region`
   IS already a member of `UK_REGION_IDS` in `lib/providers/uk/catalog.js` (unlike West Midlands,
   which needed its own dedicated dogfood gate because it predates the D1-pack pipeline and was
   never covered by this generic loop) — `qa/uk-planned-gate.mjs` already exercises it today as a
   planned region; this item is only the one-line move from the planned branch to the live branch
   of that same loop, in the same commit (or the very next one) that flips `registry.js`'s status
   line, not before.

Verify with `node qa/live-city-lists-sync.mjs` after all of the above — it derives the expected
membership directly from the registry's `status === "live"` set and will catch any list that's
missing `liverpool-city-region` or, just as importantly, any list where it was added too early
relative to the others.
