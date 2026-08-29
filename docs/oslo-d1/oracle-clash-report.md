# Oslo oracle clash report

D1 (published, as of 29 Aug 2026): [T-bane](https://ruter.no/rutetabeller-og-linjekart/t-bane) **Linjekart for T-banen** [linjekart-t-bane.pdf](https://cdn.sanity.io/files/5a84xxkm/prod/e46cf566dd5b9cc4e323b70b168115d7bc3c911f.pdf) (PDF title **gjeldende fra 3. april 2015**, Utgave **2016-04**, Illustrator 4 Mar 2016 — still the card linked from ruter.no on 29 Aug 2026) plus **Rutetabeller for T-bane** [rutetabeller-t-bane.pdf](https://cdn.sanity.io/files/5a84xxkm/prod/30055df46ac60424319ad6a236baeccfc9a656b2.pdf) (**Gjelder fra 10. juni 2024**, created 8 Aug 2024). Stations arrays **hand-transcribed**. **Not generated from GTFS.** Not generated from Entur Journey Planner / SIRI / stop-place register. Not generated from Wikipedia.

Current official folders (Ruter rutetabeller cover as linked 29 Aug 2026):

- 1: **1 Frognerseteren - Bergkrystallen.** 35 ticks including **Gulleråsen** (westbound Stoppestedsliste + map *Stopp i pilretningen*; eastbound folder skips it). Map: *Linje 1: Begrenset driftstid / Restricted service* on the Lambertseter arm. Holiday / off-peak short-turn **Helsfyr**.
- 2: **2 Østerås - Ellingsrudåsen.** 26. Røa branch joins line 3 at Smestad. Furuset branch leaves Hellerud.
- 3: **3 Kolsås - Mortensrud.** 33. Stoppestedsliste gyldig fra 04.09.2023. Shared Smestad–Borgen with 2; Østensjø from Hellerud.
- 4: **4 Vestli - Bergkrystallen.** 37. Grorudbanen via **Løren** to Sinsen, then Ringen west (Storo – Nydalen – Ullevål stadion) through the Common Tunnel to Lambertseter.
- 5: **5 Sognsvann - Vestli.** 43 halt ticks / 33 unique. Official through-path calls **Stortinget** (and Majorstuen / Tøyen / Carl Berners plass) twice: Sognsvann → Common Tunnel → Carl Berners plass → Ringen (Sinsen – Storo – Nydalen) → Common Tunnel again → Carl Berners plass → Hasle → Vestli.

No line 6. Fornebubanen not on either official PDF.

Hub lock: **Stortinget** (all five lines; line 5's published ring-then-spur is defined by passing it twice). Jernbanetorget is the Oslo S / Vy / bussterminal print — **doNotGroup**, not the lock. Nationaltheatret is the other T-bane / railway pair — **doNotGroup**, not the lock. Majorstuen is the west mouth of the Common Tunnel — shared approach. The linjekart *Sentrum / City centre* blob is not a stop.

H2 clash surface (after transcription): **no** product `lib/cities/oslo/`. Clash is **map-vs-halt-list** (Gulleråsen one-way; line-1 Helsfyr short-turn vs Bergkrystallen folder title; timing-point grids vs full Stoppestedsliste) plus **T-bane vs NSB/Vy name family** at Jernbanetorget / Oslo S and Nationaltheatret. Not GTFS. Trikk / bus / båt / Vy out of v1 oracle.

## Station name table

Match rule: published D1 string (Ruter / Sporveien T-banen Stoppestedsliste + linjekart tick **without** a `T` prefix) vs official map tick vs railway print of the same place. `rename` = same place, different printed string.

| published (D1) | other print | class |
| --- | --- | --- |
| Stortinget | linjekart **Stortinget**; folders all five lines; line 5 listed twice | **match (lock)**. Do not use City / Sentrum / Oslo / Jernbanetorget. All five lines. |
| Jernbanetorget | linjekart **Jernbanetorget** + **Oslo S** + **Oslo bussterminal** | **match T-bane**. doNotGroup vs **Oslo S** / Vy / NSB / Flytoget / bussterminal. Not the lock. |
| Nationaltheatret | linjekart **Nationaltheatret** + train icon | **match T-bane**. doNotGroup vs Nationaltheatret railway. Not Nationaltheateret. |
| Majorstuen | linjekart / folders | **match**. West mouth of the Common Tunnel. Shared approach, not the lock. 2026 rebuild overlay; stay in D1. |
| Tøyen | linjekart / folders | **match**. East mouth of the Common Tunnel. |
| Frognerseteren | line 1 west end | match. Not Holmenkollen as the line token. |
| Bergkrystallen | line 1 / 4 east end | match. Line 1 restricted-service arm. |
| Helsfyr | line 1 short-turn; map *Begrenset driftstid* | match as a stop. Not a terminus chip. |
| Østerås | line 2 west end | match. Keep Ø. |
| Ellingsrudåsen | line 2 east end | match. Keep å. |
| Kolsås | line 3 west end | match. Keep å. |
| Mortensrud | line 3 east end | match. |
| Sognsvann | line 5 west end | match. |
| Vestli | line 4 / 5 north-east end | match. |
| Gulleråsen | linjekart **Gulleråsen** + *Stopp i pilretningen*; line 1 westbound Stoppestedsliste | **match (one-way)**. Eastbound folder omits it. Stay in D1. |
| Ullevål stadion | linjekart / folders **Ullevål stadion** | match. Not Ullevaal / Ullevål alone. |
| Carl Berners plass | linjekart / line 5 folder | match. Not Carl Berner / Carl Berners pl. Line 5 lists it twice. |
| Løren | line 4 Økern–Sinsen | match. Line 5 does not call it (uses Hasle). |
| Hasle | line 5 Carl Berners plass–Økern | match. Line 4 does not call it (uses Løren). |
| Røa | line 2 | match. Keep ø. |
| Rødtvet | line 4 / 5 | match. Keep ø. |
| Kringsjå | line 5 | match. Keep å. |
| Østhorn | line 5 | match. Keep Ø. |
| Tåsen | line 5 | match. Keep å. |
| Åsjordet | line 3 | match. Keep Å. |
| Skøyenåsen | line 3 | match. Not unopened Fornebu **Skøyen**. |
| Gråkammen | line 1 | match. Keep å. |
| Skådalen | line 1 | match. Keep å. |
| Bøler | line 3 | match. Keep ø. |
| Gjønnes | line 3 | match. Keep ø. |
| All other D1 names in published-network.json | same Ruter / linjekart / Stoppestedsliste title | match |

**101** unique D1 names. Product `lib/cities/oslo/` absent. `assertCityLive("oslo")` is Unknown city.

## H2 — who has line codes today

| surface | 1–5? | what it actually has |
| --- | --- | --- |
| Ruter linjekart Utgave 2016-04 (D1) | **yes** | Lines 1–5 drawn. Mixed Sentrum blob + Oslo S icon. No line 6. No Fornebu. |
| Rutetabeller 10.06.2024 (D1) | **yes** | Official termini pairs and Stoppestedsliste ticks. Cover lists 1–5 only. |
| ruter.no T-bane index | **yes** | Copy: linjene 1, 2, 3, 4 og 5. Two PDF cards. |
| Product `lib/cities/oslo/` | **absent** | No oslo stations.json / line-map.json. `assertCityLive("oslo")` is Unknown city |
| Entur Journey Planner v3 | live (open + `ET-Client-Name`) | `stopPlace.estimatedCalls`. Official next-train path. Not D1. Filter metro / Ruter. |
| Entur SIRI ET / GTFS-RT (`datasetId=RUT`) | live | ET + SX; GTFS-RT trip-updates + alerts. No VM / vehicle-positions for RUT. Not D1. |
| Entur static GTFS (RUT) | not used as D1 | Not this H2 stop-order surface. |
| reise.ruter.no / Ruter-appen | passenger UI | Entur-backed. Not a product contract. |

H2 conclusion: passenger codes on the map and folders already agree (**1–5**). Clash is **one-way Gulleråsen / Helsfyr short-turn / T-bane vs Oslo S at Jernbanetorget**, and **no product oslo file**. Do not generate published-network.json from GTFS. Do not merge trikk, bus, båt, or Vy into this city.

## C2/C3 to put in front of Jim

1. **city=oslo**, agency **Ruter / Sporveien T-banen**, not `norway`, not merged into a Vy / NSB city. London TfL / Amsterdam / Rotterdam / Sweden / Berlin / Munich / Hamburg untouched.
2. **Stortinget** is the locked inner-city T-bane hub (all five lines; line 5 twice). Not Jernbanetorget, not Nationaltheatret, not Majorstuen, not City / Sentrum / Oslo.
3. **doNotGroup Jernbanetorget T-bane vs Oslo S / Vy / NSB / bussterminal.**
4. **doNotGroup Nationaltheatret T-bane vs Nationaltheatret railway.**
5. **No passenger line 6.** Fornebubanen unopened (2029). Six new stations Skøyen, Vækerø, Lysaker, Fornebuporten, Flytårnet, Fornebu — not D1 rows. Chip is not `6 + Fornebu`.
6. **Line 1 chips are Frognerseteren / Bergkrystallen.** Helsfyr is a short-turn overlay. Gulleråsen stays (one-way).
7. **Line 5 chips are Sognsvann / Vestli**, not “Ringen” / “to City”. The ring is how the official through-path is written, not a sixth code.
8. **No trikk, no bus, no Vy/NSB, no ferry.**
9. **Europe/Oslo HAS DST.** Official live path is Entur Journey Planner `estimatedCalls` + SIRI ET `datasetId=RUT`. D1 stays planned.
10. Product child stopIds stay out of this file.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub clone/push/PR, no product edit, no GTFS-derived station arrays, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden / Berlin / Munich / Hamburg.
