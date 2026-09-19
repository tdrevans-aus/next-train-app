Brussels D1 + research pack. City stays **planned** until Jim wires testers live. Perth/Sydney/Brisbane/Adelaide/Auckland live-gates untouched. Rotterdam is cut #1 and **untouched**. Melbourne stays planned. Sweden / Stockholm / Göteborg / Malmö / Uppsala stay planned and **untouched**. Washington / Helsinki / Berlin / Munich / Hamburg / Oslo stay planned and **untouched**. **assertCityLive("brussels") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip brussels live from this pack. Do not edit Perth. Do not invent city=bru, city=bruxelles, city=stib, or city=belgium. Sweden out.

Drop later (Jim D2): qa/fixtures/brussels/published-network.json. Research pack is docs/brussels-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

## Flip follow-through (20 Sep 2026)

Dogfood wiring landed ahead of the flip, status stays `planned`:
`lib/cities/brussels/dogfood-next-train.js` (single agency — STIB/MIVB
metro 1/2/5/6, directions from the printed line map, board from the
LIVE `fetchStationBoard()`), dispatch switch-cases in
`lib/cities/live-city-api.js` (`directionsFor`/`getMultiCityNextTrain`),
and `qa/brussels-dogfood-gate.mjs` (replacing the retired
`qa/brussels-planned-gate.mjs`, registered in `qa/run-all.mjs`'s smoke
tier).

## STIB live board CONFIRMED and wired (20 Sep 2026) — this pass

The BMC Waiting Time live JSON path this pack's D1 note (below, "Live
boards" line) flagged as unconfirmed **is now confirmed and wired**. The
previous session's exhaustive path-guessing against the developer portal
(`api-management-opendata-production.developer.azure-api.net/apis`, a
client-side-rendered SPA) never found the real operation because it was
guessing against the wrong surface. The fix: the portal itself exposes a
public, unauthenticated content-listing endpoint used to render its own
API catalogue —
`GET https://api-management-opendata-production.developer.azure-api.net/mapi/apis?api-version=2018-06-01-preview`
— which returns every published API's real `properties.path`. That listing
named `api/datasets/stibmivb/rt/WaitingTimes` directly; its
`/operations` sub-resource gave the exact `urlTemplate` (`/`, i.e. the
API's own base path). The live call is against the **gateway** host, not
the portal host:
`GET https://api-management-opendata-production.azure-api.net/api/datasets/stibmivb/rt/WaitingTimes?where=...`,
header `Ocp-Apim-Subscription-Key: STIB_API_KEY`. Verified live with the
real key: Arts-Loi / Kunst-Wet (point IDs 8041/8042/8401/8402, matching
this catalog's `stopIds` exactly — STIB point IDs and this catalog's GTFS
stop IDs are the same numbering scheme, no separate mapping needed)
returned all four v1 lines with genuine `expectedArrivalTime` timestamps;
Simonis/Elisabeth returned lines 2 and 6, including a live-only
`"message": "Do not embark"` entry that cannot exist in a static schedule
— itself confirmation this is real vehicle tracking, not a schedule echo.
No response headers exposed a numeric rate limit; the adapter uses a
conservative 15s cache TTL per station (documented as a placeholder, same
posture as Göteborg's Västtrafik cache). `lib/providers/brussels.js` is
rewritten around this live source — no timetable fallback
(`MissingStibCredentialsError` / `StibUnavailableError` are hard errors,
per Tim's standing rule, Göteborg PR #332). This closes the "STIB metro
live JSON also still unconfirmed" line in the registry `notes` — the
**only** remaining flip blocker is SNCB below.

**SNCB/NMBS — NOT wired, still holds the flip.** The Board eligibility section
below rules SNCB domestic rail `in` at Gare Centrale / Gare du Midi / Gare
de l'Ouest (walk-up, no compulsory reservation) and it has a confirmed
free real-time source (iRail liveboard API, no key required — verified
live 19 Sep 2026 against `https://api.irail.be/liveboard/?station=Brussels-Central`,
returned real departures with live delay minutes). It is deliberately left
out of this pass rather than faked: implementing it cleanly needs (1) a
second provider surface for iRail, (2) a station-name map between iRail's
English names (Brussels-Central / Brussels-South/Brussels-Midi /
Brussels-West) and this catalog's locked FR/NL names, and (3) a
doNotGroup-by-mode catalog split at all three stations (SNCB is a separate
building/platform section from the metro, same shape as South Yorkshire's
Sheffield Station rail-vs-Supertram split) — genuine follow-up scope, not
a missing key or a broken call. Recorded in the registry `notes` so Mark's
QA correctly holds the flip on this gap rather than passing it silently.

**Note for Mark — bundle these three one-line additions into the actual
flip commit, not before** (per CLAUDE.md's flip-follow-through split; adding
them early breaks `qa/live-city-lists-sync.mjs` for every city, not just
this one):

1. Add `"brussels"` to `MULTI_CITY_IDS` (and the `MultiCityId` typedef) in
   `lib/cities/live-city-api.js`.
2. Add brussels to `brisbane-dogfood.js`'s mount/available map.
3. Add brussels to `journey-model.js`'s persisted-city/country lists.

## SNCB/NMBS board-eligibility gap CLOSED + Belgium flip readiness (20 Sep 2026)

Both remaining flip blockers from Mark's Boston second pass
(`docs/boston-d1/mark-qa-note.md`, 20 Sep section) are addressed —
`docs/jim-brief-brussels-flip-readiness.md` is the full brief; this is the
short version for whoever opens the flip PR.

**A. SNCB/NMBS is now on the three shared boards.** Gare Centrale /
Centraal, Gare du Midi / Zuidstation, Gare de l'Ouest / Weststation
(exactly the three the oracle report's Board eligibility section names —
Schuman/Luxembourg were NOT added, the report doesn't name them as
SNCB-shared) now show SNCB domestic rail alongside metro, via a second live
source — iRail liveboard (`https://api.irail.be/liveboard/`, no key,
`lib/providers/irail.js`), not a fork of the STIB pipeline. Every trip
carries `mode`/`agency` (`"metro"`/`"STIB/MIVB"` vs `"rail"`/`"SNCB/NMBS"`)
so the two are never merged into one direction group (doNotGroup-by-mode).
Eurostar/Thalys/TGV INOUI/OUIGO/Nightjet/European Sleeper are filtered out
by iRail vehicle type (`classifySncbVehicleType`); ICE stays `in`. iRail
failing degrades that station's board to metro-only with `partial: true`
on the returned board object (`lib/providers/contract.js`'s `StationBoard`
typedef now documents this field) — it never refuses the board. STIB
failing is unchanged: still a hard refusal of the whole board. Proven
offline in `qa/brussels-dogfood-gate.mjs` against
`qa/fixtures/brussels/irail-liveboard.json` (one row of every
board-eligibility-relevant vehicle type, plus a canceled and an
already-departed row that must both drop regardless of type) — the
"iRail down" case needs no separate fixture, since the gate's top-of-file
fetch stub already throws on any real network attempt, so omitting the
`irailRawDepartures` escape hatch alone proves the degrade-to-partial path.

**One open item for whoever flips this next:** the iRail vehicle-type
codes used for the international filter (THA/TGV/OUI/NJ/EN/EUR) are built
from documented iRail conventions, not re-verified against a fresh live
capture in this pass — the 19 Sep 2026 live check that confirmed iRail
itself works was against Brussels-Central's ordinary IC/S traffic only.
Worth one live capture at Gare du Midi (where Thalys/Eurostar/TGV actually
call) before flip, same "confirm at D2" caveat Boston's MBTA route_id
mapping and Copenhagen's route-type regex both already carry.

**B. Belgium flip readiness.** `public/city-session.js` now has a
`Belgium` country (id `be`) with Brussels as a `comingSoon: true` region,
placed after Australia/before England (alphabetical, matching the existing
order), plus a `CITY_BOUNDS` box (`lat 50.79-50.92, lng 4.24-4.49`, padded
from the 60-station catalog's actual extent). This does not change
`assertCityLive("brussels")` or the registry `status` — both stay exactly
as before this pass. `qa/live-city-lists-sync.mjs` and
`qa/uk-city-bounds-overlap-gate.mjs` both stay green with Brussels still
`planned` (verified this pass) — a `comingSoon` entry outside the live set
isn't checked by either gate, only the live-city set is.

### Flip commit — exact edits (for whoever opens Brussels' flip PR)

Registry status flip PLUS these list-membership edits, exactly the pattern
`qa/live-city-lists-sync.mjs` checks (8 copies of "which cities are live"):

1. `lib/providers/registry.js` — brussels `status: "planned"` → `"live"`.
2. `lib/cities/live-city-api.js` — add `"brussels"` to `MULTI_CITY_IDS` and
   the `MultiCityId` typedef (already flagged above, repeated here for the
   single combined list).
3. `public/app.js` — add `"brussels"` to both `NEARBY_MULTI_CITY_IDS` and
   `LIVE_CITY_IDS`.
4. `public/city-session.js` — add `"brussels"` to `MULTI_CITY_IDS`, AND
   flip the Belgium picker entry's `comingSoon: true` to `comingSoon:
   false` (or drop the flag entirely, matching how other live single-region
   countries like Finland/Norway are written) — the picker entry itself
   from part B above does NOT need to move or be re-created, only that one
   flag changes.
5. `public/brisbane-dogfood.js` — add `brussels: true` to both its own
   `MULTI_CITY_IDS` array and the `available` map.
6. `public/journey-model.js` — add `"brussels"` to `PERSISTED_CITY_IDS`,
   and `"be"` to `PERSISTED_COUNTRY_IDS` (not already present — this is
   Belgium's first live region).
7. `public/city-session.js`'s `CITY_BOUNDS` already carries the `brussels`
   entry from part B above — no edit needed here at flip time, only
   confirm `qa/live-city-lists-sync.mjs`'s "CITY_BOUNDS missing entries for
   live cities" check passes (it will, the entry already exists).

`qa/live-city-lists-sync.mjs` will fail loudly (naming exactly which of the
8 copies is out of sync) if any of 1-6 above is missed — the same
self-checking property it was built for.

D1 = official STIB/MIVB **Map for metro, CHRONO lines and SNCB-NMBS** https://www.stib-mivb.be/files/live/sites/STIBMIVB/files/Travel/Plans%20r%C3%A9seau/Plan_Metro_Train.pdf (PDF title Plan_Metro_Train_240923; HTTP Last-Modified **Thu, 03 Oct 2024 15:13:01 GMT**) plus official district-map texts as support. Index https://www.stib-mivb.be/travel/network-and-district-maps. Mixed plate — v1 is the **metro legend only**. Stations hand-transcribed from the rendered map. **Not generated from GTFS.** Static NAP zip may 200 empty-key — do not use it to build JSON.

Four lines: **1** Gare de l'Ouest / Weststation – Stockel / Stokkel (21), **2** Simonis – Elisabeth (19), **5** Erasme / Erasmus – Herrmann-Debroux (28), **6** Roi Baudouin / Koning Boudewijn – Elisabeth (26). **60** unique open metro stops. **94** line ticks. **No passenger metro 3 or 4.** Tracker M1–M6 overstates.

Hub lock **Arts-Loi / Kunst-Wet** (metro **1 × 2 × 5 × 6**; official district text: metro 1, 2, 5, 6; no tram). Not Gare du Midi / Zuidstation, not Gare Centrale, not De Brouckère, not Rogier, not Simonis, not Elisabeth. **Simonis ≠ Elisabeth.** Bilingual FR/NL names.

C2/C3: (1) Separate city brussels, agency STIB/MIVB. Do not invent city=bru. (2) Lock Arts-Loi / Kunst-Wet. (3) Metro 1/2/5/6 only. Tram, premetro, CHRONO, SNCB, De Lijn, TEC out. (4) Metro 3 Albert–Bordet frozen — out. (5) doNotGroup Simonis vs Elisabeth; Midi SNCB vs metro; Gare du Nord (no metro). (6) FR/NL slash pairs as locked.

H2: no product brussels stations.json. Clash is **map-stack order vs FR/NL lock** plus **metro vs premetro / SNCB name family**.

**Live boards: BMC Waiting Time + Vehicle Positions keyed later — not a D1 blocker.** Portal https://api-management-opendata-production.developer.azure-api.net/apis. Header `Ocp-Apim-Subscription-Key`. No STIB GTFS-RT (NAP). Empty-key WaitingTimes.json **404** on 29 Aug 2026. This pack has **no key** and did not call the API with a real key. Never paste a key. D1 stays planned. assertCityLive("brussels") must fail. **UPDATE 20 Sep 2026: confirmed and wired — see the "STIB live board CONFIRMED and wired" section above.** The real operation path was `api/datasets/stibmivb/rt/WaitingTimes` on the gateway host, recovered from the developer portal's own public `/mapi/apis` content-listing endpoint, not the guessed paths this line originally referred to.

H7: Europe/Brussels **HAS DST**. Do not copy Perth / Brisbane no-DST.

§3 rec: line + terminus (`1 + Stockel / Stokkel`, `6 + Roi Baudouin / Koning Boudewijn`). Flag: inbound/outbound dies at Arts-Loi / Kunst-Wet. **Arts-Loi / Kunst-Wet is a hub stop string, not a direction token.** Hold D5. Jim owns D2–D6. When Jim wires, testers can pick city id **brussels**. Do not flip from this pack. Testers live is Jim’s job, not this pack’s flip.
