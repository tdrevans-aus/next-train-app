# Jim brief: London TfL rail provider — build, don’t enable

**For:** Jim (implement)  
**From:** Zoe / Tim  
**Date:** 23 Aug 2026  
**Status:** Ready to spike after Darwin WM/EP path exists. **Do not enable live.**  
**Related:** `docs/uk-architecture.md` · `docs/uk-provider-design.md` · `docs/multi-city-provider-design.md`  
**Out of scope:** Buses, river, cable car, National Rail as NR, Heathrow Express, fares, journey planner, store listing, city picker.

---

## 1. Why

London is not another Darwin city. Tube / DLR / trams are **not** on Darwin. Elizabeth and Overground sit on both, but this region’s source of truth is **TfL**.

Tim lock: **TfL rail only**. No London Buses. No National Rail termini as NR (Paddington high-level GWR is `uk-london-se-nr` later).

---

## 2. Decisions (locked)

| Rule | Lock |
|------|------|
| City / region id | `uk-london-tfl` |
| TZ | `Europe/London` |
| Registry | `planned` only. `?city=uk-london-tfl` → **501** |
| `assertCityLive("uk-london-tfl")` | Must fail |
| Modes v1 | Underground, Elizabeth line, DLR, London Overground, London Trams |
| Feed | **TfL Unified API only** — do not call Darwin for this region |
| Catalog | Built from TfL StopPoint by mode, not a hand-typed 272-name list |
| Auth | `TFL_APP_KEY` in **Vercel env only** — never client / git |
| Attribution | TfL open-data terms. Do not impersonate TfL. |

---

## 3. In (modes)

Official TfL “What we do” / operator pages (do not sum these into one station total; interchanges are shared):

| Mode | Official size | TfL line / mode id (use API, confirm) |
|------|----------------|----------------------------------------|
| London Underground | **272** stations, **11** lines, 402 km | `modeName=tube` |
| Elizabeth line | **41** stations | `modeName=elizabeth-line`, line `id=elizabeth` (not stale `tflrail`) |
| DLR | **45** stops (DfT YE Mar 2025) | `modeName=dlr`, `id=dlr` |
| London Trams | **39** stops | `modeName=tram`, `id=tram` |
| London Overground | **6 lines**; **113** stations (TfL Nov 2024 press) | `modeName=overground` |

Tube line API ids (live `GET /Line/Mode/tube`, 23 Aug 2026): `bakerloo`, `central`, `circle`, `district`, `hammersmith-city`, `jubilee`, `metropolitan`, `northern`, `piccadilly`, `victoria`, `waterloo-city`.

Overground names (TfL, 28 Nov 2024) — not one ginger line:

| API `id` | Name | Colour | Typical ends |
|----------|------|--------|----------------|
| `lioness` | Lioness | yellow | Euston – Watford Junction |
| `mildmay` | Mildmay | blue | Stratford – Richmond / Clapham Junction |
| `windrush` | Windrush | red | Highbury & Islington – New Cross / Clapham Junction / Crystal Palace / West Croydon |
| `weaver` | Weaver | maroon | Liverpool Street – Enfield Town / Cheshunt / Chingford |
| `suffragette` | Suffragette | green | Gospel Oak – Barking Riverside |
| `liberty` | Liberty | grey | Romford – Upminster |

Overground and Elizabeth are also National Rail. **Still TfL for this region.** A later `uk-london-se-nr` region may show GWR/SWR/etc. at the same geography.

Watford Junction, Cheshunt, Richmond, etc. may sit outside Greater London. If TfL lists them as stops on these modes, **they are in**.

---

## 4. Out

- London Buses (and BODS)
- Thames Clippers / Uber Boat
- IFS Cloud Cable Car
- London River Services
- National Rail that is **not** a TfL mode (Avanti at Euston, GWR at Paddington, Thameslink, Southeastern, etc.)
- Heathrow Express
- Cycle hire, coaches
- Northern Ireland, rest of UK
- TfL Journey Planner (we are a departure board, not a router)

A train/tube may be advertised onward to an OUT NR station. Show the name. Do not add that CRS to this catalog.

---

## 5. Integration

| Piece | Detail |
|-------|--------|
| Portal | https://api-portal.tfl.gov.uk/ — register an app, get a key |
| Docs | https://tfl.gov.uk/info-for/open-data-users/ |
| Base | `https://api.tfl.gov.uk` |
| Auth | **`app_key` only** (header or query). `app_id` is obsolete |
| Rate | **50 req/min** anonymous; **500 req/min** keyed product; email developers@tfl.gov.uk for more |
| Attribution | Footer: `Powered by TfL Open Data` plus OS / Geomni lines from TfL T&Cs. No fake TfL branding |
| Board | `GET /StopPoint/{stationAtcoCode}/Arrivals` (or `/Line/{id}/Arrivals`). Not Journey Planner |
| Status | `GET /Line/Mode/tube,overground,elizabeth-line,dlr,tram/Status` (no spaces) |
| Catalog | `GET /Line/Mode/tube,overground,elizabeth-line,dlr,tram` then `/Line/{id}/StopPoints`. Persist ATCO `naptanId` + lat/lon + modes[] |
| Adapter | `lib/providers/uk-tfl.js` |
| Catalog path | `lib/cities/uk-london-tfl/stops.json` |
| Probe | `scripts/probe-uk-london-tfl-board.mjs` — fail clearly if key missing |

**Do not** reuse `uk-darwin.js` for Tube/DLR/tram. Do not invent a second protobuf stack.

Parent vs child: use the **mode child**, not the hub. Staff examples: King’s Cross hub `HUBKGX` vs Circle/H&C/Met `940GZZLUKSX`; Paddington LU `940GZZLUPAC` vs NR/Elizabeth `910GPADTON`. Never merge LU + Elizabeth + NR into one id. Filter arrivals: `modeName` in `{tube, overground, elizabeth-line, dlr, tram}` only.

Index on boot or deploy from the API. Do not hand-type stations. Marketing counts (272 / 41 / 45 / 39 / 113) are a ballpark check, not the catalog.

---

## 6. Contract mapping

Same `ProviderTrip` as AU / Darwin (`docs/uk-provider-design.md` §3):

| `ProviderTrip` | TfL arrivals field (typical) |
|----------------|------------------------------|
| `scheduledDeparture` | `expectedArrival` / `timeToStation` derived, UK-local ISO |
| `liveDeparture` | same when TfL marks it live |
| `platform` | `platformName` if present |
| `destination` | `towards` or destination name |
| `line` / direction label | Line name (Victoria, Windrush, …) — riders know lines here |
| `cancelled` | only if TfL says so |

`direction` / `lineGroups`: prefer **line name + towards**, not TOC.

---

## 7. Watch-outs

- Shared names: “Paddington” is LU, Elizabeth, and NR. This region only serves TfL modes.
- Overground stops often have a CRS as well. Store TfL id as primary; CRS optional for later overlap with `uk-london-se-nr`.
- Elizabeth west of West Drayton is still Elizabeth (Reading, Heathrow). In if TfL StopPoint says Elizabeth.
- Do not hand-maintain 272+41+45+39 names. Refresh catalog from the API. Commit a generated snapshot if that is how AU cities work.
- Cache arrivals ~15–30s server-side. 500/min is plenty with cache; do not hit the API per keystroke from the client.
- Night Tube / weekend engineering: still arrivals; do not special-case unless empty.
- Overground operator is **First Rail London** from **3 May 2026** (was Arriva). Same six lines, not a new network.
- DLR to Thamesmead / Beckton Riverside is **not open** (consultation / 2030s). Do not add those stops.
- Elizabeth still **41**. No new Tube/DLR/tram stations in 2025–26 official materials.

---

## 8. Acceptance

| Check | Pass |
|-------|------|
| Probe: King’s Cross St Pancras **Underground** shows Victoria/Northern/Piccadilly (etc.) next trains | Yes |
| Probe: an Elizabeth central stop (e.g. Tottenham Court Road) shows Elizabeth only from this adapter | Yes |
| Probe: a DLR stop (e.g. Canary Wharf DLR, not the Elizabeth one) resolves | Yes |
| Probe: an Overground stop shows a **named** line (Windrush / Mildmay / …) | Yes |
| Probe: a Tram stop in Croydon resolves | Yes |
| Paddington **GWR** board is not returned by this adapter | Yes |
| Bus stop SM or similar is not in the catalog | Yes |
| Without `TFL_APP_KEY`, probe fails loudly | Yes |
| `assertCityLive("uk-london-tfl")` is false | Yes |
| Not registered in production city picker | Yes |

---

## 9. Slack / Jim

> Jim — London is its own adapter, not Darwin. `docs/jim-brief-uk-london-tfl.md`. Region id `uk-london-tfl`. Tube + Elizabeth + DLR + Overground (six names) + Trams. Catalog from TfL StopPoint. Needs `TFL_APP_KEY`. **Do not** enable live. **Do not** add buses or NR.


## Version

| Date | Change |
|------|--------|
| 2026-08-23 | First brief |
| 2026-08-23 | API ids, 113 Overground, attribution, First Rail London, hub/child ATCO examples |
