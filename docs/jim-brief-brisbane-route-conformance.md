# Jim brief: Brisbane route + direction conformance harness

**For:** Jim (implement)
**From:** Tim
**Date:** 22 Aug 2026
**Status:** Ready to code — **blocked on one product decision** (§3)
**Related:** `docs/jim-brief-brisbane-provider.md` · `docs/multi-city-provider-design.md` · `docs/direction-collapse-heuristic.md` · `lib/cities/perth/line-map.json` · `qa/perth-static-directions.mjs`
**Out of scope:** Flipping Brisbane to `live`; multi-city UI; Play listing; bus/ferry/tram; Sydney/Melbourne/Adelaide/Canberra

---

## 1. Why

Perth route correctness rests on `lib/cities/perth/line-map.json`, whose provenance line reads *"manual audit 2026-08-19"*. That audit is Tim's local knowledge typed in by hand. Everything downstream — `static-directions.js`, short-turn collapse groups, `doNotGroup`, the assertions in `qa/perth-static-directions.mjs` — derives from it.

Nobody on the team lives in Brisbane, so that method cannot be repeated. It also does not need to be. Unlike Transperth (scraped XML, zero topology), SEQ ships full GTFS static, and `lib/providers/gtfs/static-cache.js` already parses `stops`, `stop_times`, `trips`, `routes`, `calendar` and `calendar_dates`. Every fact Tim supplied by hand for Perth is machine-derivable for Brisbane.

**The principle:** replace local knowledge with **two independent oracles that must agree** — the GTFS feed, and Queensland Rail's published SEQ network map. Where they disagree is exactly the list a local rider would have spotted.

---

## 2. Decisions (locked)

| Rule | Lock |
|------|------|
| City stays `planned` | Yes — `assertCityLive("brisbane")` must still fail after this work |
| Perth behaviour | Unchanged. No edits to `lib/cities/perth/*` |
| Published map is an **independent** source | Hand-transcribed, never generated from GTFS |
| Assertions authored from the published map | Never copied from generator output |
| Offline tests in CI | Yes — fixture-backed, no network |
| Live sweep in CI | **No** — add to `RUNNER_EXCLUDE` in `qa/run-all.mjs` |
| Monitoring | Still none for Brisbane (see `docs/mark-dogfood-brisbane.md`) |

---

## 3. Open design question — **blocks §5 assertions**

**Brisbane lines through-run in pairs.** Ferny Grove services become Beenleigh services, Shorncliffe becomes Cleveland, Airport becomes Varsity Lakes. Translink also introduced **T1–T6 line numbering in August 2026**, which is what riders now see on the map and in-station:

| Line | Pairing |
|------|---------|
| T1 | Ipswich / Rosewood ↔ Caboolture / Nambour |
| T2 | Springfield Central ↔ Kippa-Ring |
| T3 | Doomben ↔ Roma Street |
| T4 | Cleveland ↔ Shorncliffe |
| T5 | Varsity Lakes ↔ Brisbane Airport |
| T6 | Beenleigh ↔ Ferny Grove |

Perth's rule — *directions = far termini of the lines serving this station* — works because Perth is hub-and-spoke with Perth Stn at the centre. Brisbane has no such centre: every line passes through Central, so the same rule yields roughly fifteen terminus options at one station.

**Candidate models:** line + terminus (`T6 towards Beenleigh`); terminus only (Perth-style); inbound/outbound relative to the CBD with terminus as detail.

**Jim:** build §4 (generator, fixtures, catalog) now — none of it depends on this. Do **not** write the direction-label assertions in §5 until Tim locks the model. Structure `qa/brisbane-line-map-conformance.mjs` so label expectations sit in one table at the top of the file.

---

## 4. Deliverables — topology (unblocked)

### D1 · Published map transcription (independent oracle)

`qa/fixtures/brisbane/published-network.json` — hand-transcribed from Queensland Rail's **text version** of the SEQ network map (`queenslandrail.com.au/forcustomers/stations-and-maps/text-version-of-seq-network-map`). Text page, so this is typing, not reading coloured lines.

Shape: `{ source, retrievedAt, lines: [{ id, number, name, stations: [...ordered], termini: [...] }] }`.

Record `retrievedAt` and the source URL. This file is **never** regenerated from GTFS — that would collapse the two oracles into one and defeat the whole exercise.

### D2 · Line-map generator

`scripts/build-line-map.mjs --city=brisbane` → writes `lib/cities/brisbane/line-map.json` in the **same shape as Perth's**, derived from GTFS static:

- ordered stations per route, taken from the longest trip pattern on that route
- termini and headsign strings with occurrence counts
- junction stations (served by more than one route)
- first / last service per route per day type (weekday / Saturday / Sunday)
- `shortTurnGroups` / `doNotGroup` proposed via `proposeDirectionGroups()` from `lib/direction-collapse-heuristic.js`, written as **proposals** for product review, not auto-accepted

Keep the generator city-agnostic where cheap — Sydney and Adelaide use the same GTFS stack.

### D3 · GTFS fixture snapshot

Commit a rail-only trimmed SEQ GTFS snapshot to `qa/fixtures/brisbane/gtfs/` so the generator and offline tests are reproducible and never hit Translink in CI. Include a `README.md` with the source URL, snapshot date, and the trim command.

### D4 · Station catalog expansion

`lib/cities/brisbane/stations.json` currently holds **10 stations with empty `stopIds`**, resolving by name. Expand to all SEQ rail stations from GTFS, and **populate `stopIds` with every child platform stop under each parent station**. See hazard H1.

---

## 5. Deliverables — conformance (label assertions blocked on §3)

### D5 · `qa/brisbane-line-map-conformance.mjs` — offline, runs in CI

Diffs the two oracles and asserts invariants. No network; uses D3 fixtures.

| ID | Invariant |
|----|-----------|
| C1 | Every line in `published-network.json` maps to ≥1 GTFS route, and vice versa |
| C2 | Station sets per line match between the two sources (report both directions of difference) |
| C3 | Station **order** per line matches |
| C4 | Every station in the catalog appears on ≥1 line |
| C5 | Frozen `shortTurnGroups` stay frozen — new proposals fail the test until reviewed |
| C6 | Frozen `doNotGroup` pairs are never merged |
| C7 | Direction count after collapse stays under the agreed ceiling at every station (Central is the canary) |

C2/C3 failures are the high-value output: a genuine feed-vs-map disagreement, or a transcription typo. Print both, do not guess which is right.

### D6 · `qa/brisbane-network-sweep.mjs` — live, **excluded from CI**

Sweeps **every** catalog station rather than a handful, and emits an anomaly report rather than a bare pass/fail. Early on you want the list, not the verdict.

| ID | Check |
|----|-------|
| S1 | Every destination string on a live board is a known terminus or short turn for a line serving that station — unknown strings reported, this is how undiscovered short turns surface |
| S2 | Every through station offers ≥1 direction each way |
| S3 | No direction offered where GTFS shows zero services for today's day type (see H3) |
| S4 | Board for station X includes trips from **all** child platform stops (see H1) |
| S5 | Live board departures agree with independently decoded GTFS-RT within tolerance — the differential oracle that substitutes for standing on the platform |
| S6 | No station dead during published service hours |

Run modes: `--time=am-peak|midday|pm-peak|late`, `--day=weekday|sat|sun`. Report to `qa/reports/brisbane-sweep-<timestamp>.json` plus a readable summary on stdout.

Add to `RUNNER_EXCLUDE` in `qa/run-all.mjs` — it hits Translink live and must not gate PRs. Expose as `npm run sweep:brisbane` alongside the existing `probe:brisbane`.

---

## 6. Known hazards — no Perth analogue, so no existing test covers them

**H1 · Parent stations and platform stops.** SEQ GTFS uses parent stations with child platform stops; Perth's catalog is flat names. If name resolution picks one platform instead of all, the board silently shows half the trains. **Most dangerous bug class here** — it looks entirely plausible from Perth. Covered by D4 + S4.

**H2 · T1–T6 numbering is one month old.** GTFS `route_short_name` may not have caught up with the published map. Check and record which source carries the numbers; riders will search "T5".

**H3 · Services that only sometimes exist.** Doomben is weekday-peak only; Exhibition is an event service with a sparse calendar. A naive static-directions fallback offers a rider a Doomben direction on a Sunday with no trains behind it. Exhibition will also pollute direction lists at Bowen Hills and Fortitude Valley — needs a suppression rule.

**H4 · Branch traps (heuristic rule R4).** Airport and Shorncliffe share track to Eagle Junction; Springfield Central splits from Ipswich at Darra; Cleveland splits from Beenleigh near Park Road. Same shape as Perth's High Wycombe / Ellenbrook at Bayswater, which had to be blacklisted by hand. Expect several `doNotGroup` entries.

**H5 · Nested short turns are far denser than Perth.** Gympie North ⊃ Nambour ⊃ Caboolture ⊃ Petrie ⊃ Northgate on one corridor alone; also Ipswich ⊃ Darra, Cleveland ⊃ Manly, Shorncliffe ⊃ Northgate, Ferny Grove ⊃ Mitchelton. R1 should handle these, but there are many more chains than Perth's three — review every proposal.

**H6 · Inner-city stations.** Bowen Hills, Fortitude Valley, Central, Roma Street, South Brisbane, South Bank and Park Road are served by nearly every line. These are where §3's direction model will succeed or fail; make them explicit cases in D5.

**H7 · No DST in Brisbane.** Unlike Adelaide and Sydney. Leave-by phases should be simpler here, not harder — do not import DST workarounds.

---

## 7. Acceptance

| Check | Pass |
|-------|------|
| `node scripts/build-line-map.mjs --city=brisbane` regenerates `line-map.json` deterministically from fixtures | Yes |
| `qa/fixtures/brisbane/published-network.json` exists, sourced + dated, not generated | Yes |
| `node qa/brisbane-line-map-conformance.mjs` runs offline and passes | Yes |
| C2 / C3 disagreements are zero, or each one is documented in `coverageGaps` with a reason | Yes |
| Catalog covers all SEQ rail stations with populated child-platform `stopIds` | Yes |
| `npm run sweep:brisbane` produces an anomaly report across all stations | Yes |
| Sweep is in `RUNNER_EXCLUDE`; `npm run test:web` is unaffected | Yes |
| `assertCityLive("brisbane")` still fails | Yes |
| Perth `/api/next-train` and `qa/perth-static-directions.mjs` unchanged | Yes |
| `TESTING.md` gains a short "Brisbane route conformance" section | Yes |

---

## 8. Follow-ups (not this brief)

- Direction model decision (§3), then the label assertions in D5
- Brisbane rider dogfood — extend `docs/mark-dogfood-brisbane.md` from a dev-board probe into a scripted route audit with side-by-side screenshots against the Translink app
- Nightly soak alerting on new destination strings and RT/static divergence — reuse `qa/soak-status.mjs` and `docs/fb-33-soak.md`. **Gated on Tim flipping the city live**; `docs/mark-dogfood-brisbane.md` currently forbids Brisbane monitors

---

## 9. Slack / Jim

> Jim — start `docs/jim-brief-brisbane-route-conformance.md`. Build the GTFS line-map generator, the published-map transcription, the expanded station catalog, and the two conformance scripts. The live sweep must stay out of CI. Hold off on direction-label assertions until Tim locks the direction model in §3. Brisbane stays `planned`; Perth unchanged.
