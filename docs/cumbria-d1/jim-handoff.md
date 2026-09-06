Cumbria D1 + research pack. City stays **planned** / "Coming Soon" until National Rail is unblocked
AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("cumbria") must fail** (city is not in `lib/providers/registry.js` CITIES today —
Unknown city / 400). No generator, no product edit. Jim owns D2-D6. Do not flip cumbria live from
this pack. Do not invent city=cumbria-lakes, city=carlisle, or city=lake-district. Do not touch
West Midlands, Greater Manchester, Liverpool City Region, East Midlands, North East, West of
England, South Wales, West Yorkshire, South Yorkshire, or Rest of Scotland — same account-level
National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Cumbria` / `luke` before writing (release happens
post-merge, per CLAUDE.md country-lane rule — not run by this pack).

**This is the LAST region in the current UK expansion wave** per the dispatch brief — after this
pack, the UK expansion queue as currently scoped is complete. No further UK region packs are
expected to follow immediately; the next country-lane or region dispatch should confirm this before
assuming otherwise.

Research pack is docs/cumbria-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md,
direction-model-memo.md, jim-handoff.md (this file).

## City id and naming

`city: "cumbria"` — plain kebab-case, no `uk-` prefix, matching every other UK region built this
wave (including Rest of Scotland). No printed hub name collision found with any other D1 city
(Carlisle, Oxenholme, Barrow-in-Furness, Penrith are all unique station names in the current D1
catalog set) — unlike Rest of Scotland's Perth / Perth-Australia collision.

## Single hub lock, two secondary hubs — the simplest UK station-graph shape this wave

Carlisle (CAR) is unambiguously the sole tier-1 hub: 8 platforms, ~1.97M passengers, junction of
four lines directly (WCML, Settle-Carlisle, Tyne Valley, Cumbrian Coast) plus a fifth (Lakes Line)
reachable via Oxenholme. Oxenholme Lake District (OXO) and Barrow-in-Furness (BIF) are tier-2
secondary hubs, each a genuine two-line junction with a station-graph basis for the ranking (unlike
Rest of Scotland's four co-equal hubs, which had no such ranking basis). Penrith (PEN) is a major
WCML station but not a junction — built as a regional station, not promoted to tier-2 hub status.
No doNotGroup case anywhere in this catalog: every junction is a single physical station, no
separate infrastructure or walk-link pair (contrast Liverpool City Region's Lime Street or Greater
Manchester's Piccadilly/Piccadilly Gardens).

**Implication for adapter design:** standard single-hub-plus-secondaries board-fetch pattern
applies — no special multi-hub accommodation needed (contrast Rest of Scotland's four-hub open
item).

## Caledonian Sleeper: out-reservation, excluded from the board at Carlisle only

Caledonian Sleeper carries verdict **`out-reservation`** (compulsory berth booking; staff platform
check-in 60-90 min before departure is a reservation check, not a check-in barrier) per the oracle
report's own Board eligibility section (report lines 45-68, with evidence URLs). It calls at
**Carlisle only** within this catalog (crew/supply change stop) and must be excluded from Carlisle's
board specifically. Northern Trains, TransPennine Express, and Avanti West Coast all verdict `in` at
every station they call. CrossCountry's calling pattern is unconfirmed (see coverageGaps) — not
added to any station's operator list pending confirmation. Verdict is consistent with Rest of
Scotland (excluded at Aberdeen/Inverness/Fort William/Mallaig) and Liverpool City Region (excluded,
does not call Lime Street) — same service, same reasoning, checked directly against both
already-merged packs before writing this one.

## Regional boundaries: checked against already-merged adjacent packs, no live conflict found

The oracle report flags two cross-region boundaries (Lockerbie/Scotland to the north, Settle-
Hellifield/Preston to the south) and explicitly asks Luke/Mark to flag rather than de-dup. Per the
dispatch instruction, this pack read `docs/rest-of-scotland-d1/published-network.json` and
`docs/greater-manchester-d1/published-network.json` (both already-merged) to check for live
overlap:

- **Rest of Scotland** does not claim Lockerbie or any station south of its four hubs
  (Perth/Inverness/Aberdeen/Dundee) — no overlap with Cumbria's Carlisle-anchored northern boundary
  today. Remains an open D2 item if Rest of Scotland's scope ever extends into Dumfries & Galloway.
- **Greater Manchester** does not claim Preston, Wigan, or Settle — no overlap with Cumbria's
  southern boundary today. Confirms (not just assumes) the oracle report's own "no overlap
  identified" line.

Neither check required reading any in-progress or unfinished pack — both source packs are already
merged to master.

## Station coverage: only 7 of 48 Cumbrian stations catalogued — flagged, not guessed at

The report names 48 total Cumbrian stations but individually details only 7 (Carlisle, Penrith,
Oxenholme, Windermere, Kendal, Barrow-in-Furness, Settle) — and its own aggregate count for the
remainder is internally inconsistent (38 at report line 32 vs. 41 at report line 102). This pack
catalogues only the 7 detailed stations. **Do not extend the catalog to the other 41 stations by
inventing CRS codes or names** — that requires either a corrected/complete station list from Nico
or a verified GTFS/Darwin pull, neither of which this pack performs. See hazard-pack.md H2/H3 and
published-network.json's coverageGaps for the full detail.

## National Rail scope

One agency family in scope: **National Rail** — Darwin/OpenLDBWS, technically documented and live
but **blocked at the account level** (EvansAppStudio's RDM registration is Australian; Tim is
re-registering with a UK address). Same blocker as every other UK region packed so far and **not a
feed problem** — the catalog below is built normally per Nico's instruction; only
`DARWIN_LDB_TOKEN` wiring waits. Northern Trains, Avanti West Coast, TransPennine Express are TOCs
within National Rail (report line 17), not separately-fed agencies — no parent/child pairing to
model.

A reference static GTFS dump exists (Rail Delivery Group via Transitland, CC-BY-2.0 UK, verified
live 2026-09-01 per the oracle report). This pack still does not build the catalog from that GTFS
dump — station list is taken directly from the oracle report's station name table, per the
read-only-the-report rule.

## Hub locks

- **Carlisle (CAR)** — 8 platforms, four/five-line junction (WCML, Settle-Carlisle, Tyne Valley,
  Cumbrian Coast, +Lakes Line via Oxenholme). Northern + Avanti + TransPennine `in`; Caledonian
  Sleeper `out-reservation`, excluded here specifically.
- **Oxenholme Lake District (OXO)** — WCML/Lakes Line branch point. Northern + Avanti +
  TransPennine `in`.
- **Barrow-in-Furness (BIF)** — 3 platforms, Furness Line/Cumbrian Coast Line junction. Northern
  only, `in`.

Regional/branch stations: Penrith (PEN, WCML major station, all three operators `in`), Windermere
(WND, Lakes Line terminus, Northern only), Kendal (KND, Lakes Line, Northern only), Settle (SLF,
Settle-Carlisle Line southern boundary, Northern only).

## Direction model recommendation

**Destination + operator** (e.g. `Glasgow Central (Avanti West Coast)`, `Leeds (Northern Trains)`),
matching every other UK National Rail region's recommendation. No line+terminus model — the
report's line names (West Coast Main Line, Settle-Carlisle Line, etc.) are corridor/route-topology
names, not confirmed board-facing vocabulary. **Illustrative only, not verified** — no destination
strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a real Darwin payload can be pulled.
Caledonian Sleeper has no proposed destination string at all — it's excluded from the board
entirely, so there's nothing to model. See direction-model-memo.md.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
2. **Station-count shortfall (7 of 48 catalogued).** Needs either a corrected/complete Cumbrian
   station list from Nico (the report's own internal count is inconsistent — 38 vs. 41) or a
   verified GTFS/Darwin pull before D2 can extend beyond these 7. Not resolvable from this report
   alone.
3. **CrossCountry's Cumbrian calling pattern is unconfirmed** — report flags this itself. Needs
   confirmation before adding CrossCountry to any station's operator list.
4. **Lockerbie/Rest-of-Scotland boundary and Settle-Hellifield/Preston boundary** — no live
   conflict found against already-merged adjacent packs today, but remain open D2 coordination
   points if either adjacent region's scope changes.
5. **This is the last region in the current UK wave** — confirm before dispatching further UK
   region packs whether the queue has genuinely been exhausted or whether new regions have been
   added to scope since this pack was written.

## Flip follow-through (Jim, 6 Sep 2026) — done ahead of the flip, and what's left for Mark

Per CLAUDE.md's flip-follow-through split (added 30 Aug 2026, corrected same day) and
docs/jim-brief-cumbria-flip.md, the following is code (not list membership) and is landed here,
ahead of the flip, with cumbria still `status: "planned"`:

- `lib/cities/cumbria/dogfood-next-train.js` — National Rail dogfood module, same shape as
  south-wales/greater-anglia/north-east. No `direction-hubs.json` ships (no live Darwin payload
  has ever been pulled to evidence a hub-chip candidate the way Greater Anglia's Norwich hub was)
  — `loadDirectionHubs()` degrades to an empty, no-op hub list.
- Dispatch switch-cases added to `directionsFor()`/`getMultiCityNextTrain()` in
  `lib/cities/live-city-api.js` for `cityId === "cumbria"`. Safe ahead of the flip: production
  routes gate on `assertCityLive()` first, not on `MULTI_CITY_IDS` membership.
- `qa/cumbria-dogfood-gate.mjs` replaces the retired `qa/cumbria-planned-gate.mjs`, registered in
  `qa/run-all.mjs` in its place.

**NOT done here — bundle these three one-line additions into Mark's actual status-flip commit**
(same as every other UK region's flip so far):

1. Add `"cumbria"` to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. Add cumbria to `brisbane-dogfood.js`'s mount/available map.
3. Add cumbria to `journey-model.js`'s persisted-city/country lists.

`qa/live-city-lists-sync.mjs` enforces that those three lists exactly equal the registry's
`status === "live"` set — adding cumbria to them while status is still `planned` breaks that gate.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). National Rail static GTFS (Transitland) is
CC-BY-2.0 UK, confidence `clear`, reference-only.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no extension of the
station catalog beyond the 7 stations the report individually details, no resolution of the
report's own internal station-count mismatch, no resolution of the Lockerbie or Settle/Preston
cross-region boundary flags beyond checking already-merged adjacent packs for live conflict, no
resolution of the RDM redistribution ambiguity (flagged for Tim), no inclusion of any station
outside Cumbria's own scope, no reading of any other city's in-progress pack, no wiring of
`DARWIN_LDB_TOKEN`.
