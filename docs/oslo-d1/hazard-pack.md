# Oslo hazard pack (H1–H7)

Evidence: Ruter Linjekart for T-banen Utgave 2016-04 (still linked 29 Aug 2026); Rutetabeller for T-bane gjelder fra 10. juni 2024; ruter.no T-bane index; T-baneløftet 2026 page; Oslo kommune Fornebubanen; Sporveien T-baneprogrammet; Entur Journey Planner v3 + Real-Time Data (codespace RUT); product `lib/cities/oslo/` absent. **Added 30 Aug 2026:** `docs/oslo-d1/oracle-clash-report.md` Board eligibility section (Vy/Flytoget `in` verdicts, per-line evidence URLs, Tim's decision) plus `docs/board-eligibility-rule.md`.

## H1 — parent + child

D1 has no stopIds. Entur stop-place register and Journey Planner collapse T-bane + railway + bus under nearby printed names at the Oslo S and Nationaltheatret clusters.

doNotGroup: **Jernbanetorget** (T-bane 1–5) vs **Oslo S** (Vy / NSB / Flytoget) vs **Oslo bussterminal**; **Nationaltheatret** T-bane vs **Nationaltheatret** railway; future **Skøyen** / **Lysaker** T-bane (Fornebu, unopened) vs existing Vy stations of those names. **Stortinget** is T-bane-only in the inner lock — keep it as the hub string.

**Scope update (30 Aug 2026 — Tim's board-eligibility decision):** Vy regional/commuter rail (RE10, RE11, R12, R13, R14, R21, L1, L2) and Flytoget (FLY1, FLY2) are now `in` at **Jernbanetorget** and **Nationaltheatret**, per `docs/board-eligibility-rule.md`'s two boarding-contract tests (both pass — no compulsory reservation, no check-in barrier at these stations; see oracle report's Board eligibility table for per-line evidence URLs). This does **not** loosen the doNotGroup above — it sharpens it to three operator groups at both stations: **T-bane** (mapGroup `T-bane`) vs **Vy** (mapGroup `Vy`) vs **Flytoget** (mapGroup `Flytoget`). Boards at Jernbanetorget and Nationaltheatret must render three separate platform sections, never a merged "trains" list. Oslo bussterminal and NSB (name retired in favour of Vy) stay out of v1 as before. Coverage stays scoped to these two named stations only — the rest of each Vy/Flytoget corridor (Drammen, Lillehammer, Skien, Eidsvoll, Kongsberg, Dal, Asker, Kongsvinger, Moss, Spikkestad, Lillestrøm, Stabekk, Ski, Oslo Airport Station) is **not** in this catalog; the oracle report gives boarding-contract evidence and official terminus-pair naming for direction chips, not stop-level data for those other stations, so no station graph is asserted for them here.

## H3 — thin / event / overlay

- **No passenger line 6.** Official index and 2024 cover print **1–5** only. Historical Ringen-as-6 is gone.
- **Fornebubanen unopened.** Oslo kommune / Sporveien: passenger target **2029**. Six new stations Skøyen, Vækerø, Lysaker, Fornebuporten, Flytårnet, Fornebu. Absent from the 2016 linjekart and the 2024 folders. Out of v1.
- **Line 1 Restricted service** east of Helsfyr (map *Begrenset driftstid*). Folder footnotes: some trips, plus romjul / påske / sommer, short-turn **Helsfyr**. Overlay. Official title still Frognerseteren–Bergkrystallen. Helsfyr is in `shortTurns`, not a terminus chip.
- **Gulleråsen** one-direction (toward Frognerseteren). Overlay on calling pattern, not a deleted stop.
- **2026 T-baneløftet** (as of 29 Aug 2026): CBTC + Majorstuen rebuild + Fornebu tie-in. 17–23 Aug line 5 Sognsvann bus-for-bane Nydalen–Sognsvann (ended). 23–30 Aug *evenings* line 4 Helsfyr–Storo / line 5 Helsfyr–Sognsvann only — Fri 28 and Sat 29 Aug run normally. 31 Aug–2 Sep evenings line 3 Avløs–Mortensrud only (bus 3B Kolsås–Avløs). Official folder still prints the full path. Overlay, not deleted D1 rows. Replacement bus out of v1.
- **Trikk / bus / båt** on the same official rutetabeller index. Out of v1. **Vy regional/commuter rail and Flytoget are now `in` at Jernbanetorget and Nationaltheatret only (30 Aug 2026 scope update) — see the doNotGroup note under H1 and the H4 table below. Not in scope anywhere else, and no other operator (NSB name retired, bus, trikk, båt) is added by this change.**

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Stortinget | all five lines through the Common Tunnel; line 5 twice (ring-then-spur) | linjekart; all five folders |
| Jernbanetorget | same five T-bane lines + **Vy (RE10, RE11, R12, R13, R14, R21, L1, L2, in scope)** + **Flytoget (FLY1, FLY2, in scope)** + Oslo bussterminal (out) — three doNotGroup operator sections | linjekart Oslo S icon; oracle report Board eligibility table (30 Aug 2026) |
| Nationaltheatret | five T-bane lines + **Vy (same 8 lines, in scope)** + **Flytoget (same 2 lines, in scope)** — three doNotGroup operator sections | linjekart train icon; oracle report Board eligibility table (30 Aug 2026) |
| Majorstuen | 1 Holmenkollen vs 2/3 west vs 4/5 ring west. Common Tunnel starts | linjekart |
| Tøyen | Common Tunnel ends; 1/2/3/4 east vs 5 to Carl Berners plass | linjekart |
| Carl Berners plass | line 5 onto Ringen vs line 5 out to Hasle–Vestli | line 5 Stoppestedsliste lists it twice |
| Økern | line 4 via Løren vs line 5 via Hasle | folders |
| Sinsen / Storo / Nydalen | line 4 Vestli–Bergkrystallen vs line 5 ring | folders |
| Ullevål stadion | line 4 through vs line 5 Sognsvann branch | linjekart |
| Smestad / Borgen | line 2 Røa vs line 3 Kolsås | folders |
| Brynseng | 1/4 Lambertseter vs 2/3 Hellerud | linjekart |
| Hellerud | line 2 Furuset vs line 3 Østensjø | linjekart |
| Helsfyr | line 1 short-turn vs through to Bergkrystallen | map *Begrenset driftstid*; folder footnote |

No city loop as a single extra passenger code — line 5 is published as **Sognsvann – Vestli** via the ring, not as “6” or “Ringen”. Inbound/outbound vs City is false at **Stortinget** (all five lines through in both compass headings; line 5 both ways on one trip), **Jernbanetorget** (same plus rail), and **Carl Berners plass** (ring vs Grorud).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Five passenger codes only: **1–5**. No 6.

Line 1 some trips (and holiday periods) terminate **Helsfyr**. Line 5 late-night footnote *Kun til Tøyen; fortsetter videre som linje 1* is an overlay. `shortTurns` on line 1 = `Helsfyr`; others empty.

Night extras on the T-bane index (“på dagtid og natt”) are the same 1–5 codes at reduced frequency, not extra D1 rows. Replacement bus (3B / 4B / 5B) out of v1.

## H6 — inner city (where §3 lives)

Locked set: **Stortinget**. Shared approaches: Jernbanetorget (T-bane + Oslo S), Nationaltheatret (T-bane + railway), Majorstuen (west mouth), Tøyen (east mouth), Carl Berners plass (line 5 ring hinge).

Stortinget is a **through Common Tunnel**, not a single-end hub. All five lines call it. Line 5 calls it twice. Inbound/outbound vs City is false here (west ends Frognerseteren / Østerås / Kolsås / Sognsvann and east/north ends Bergkrystallen / Ellingsrudåsen / Mortensrud / Vestli). Jernbanetorget is the Oslo S cluster — still not the T-bane lock. Majorstuen is four western branches plus the ring — still not the printed inner lock.

## H7 — DST

**Europe/Oslo observes DST (CEST/CET).** Do not copy no-DST cities. Wall-clock is Oslo local. Entur `expectedDepartureTime` is offset-aware ISO-8601; do not treat raw clock minutes as elapsed minutes across the spring jump. **Vy and Flytoget confirmed same handling:** both operate on Entur GTFS (`datasetId=VY` / `FLY`), same offset-aware ISO-8601 timestamps, same Europe/Oslo tz, same DST caution — no separate timezone logic needed for the newly in-scope services.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| oslo vs city=norway / vy / nsb / ruter-trikk | Separate city; agency Ruter / Sporveien T-banen |
| oslo vs berlin / munich / hamburg / rotterdam / goteborg / amsterdam / london-tfl | Other packs; do not reopen |
| Stortinget vs City / Sentrum / Oslo / Jernbanetorget | Hub lock vs marketing / Oslo S |
| Jernbanetorget T-bane vs Oslo S / Vy / NSB / bussterminal | linjekart mixes the icon |
| Nationaltheatret T-bane vs Nationaltheatret railway | Same name family, different mode |
| Jernbanetorget T-bane vs Vy vs Flytoget | Three operators, three doNotGroup platform sections (30 Aug 2026 scope update); Vy and Flytoget in scope, bussterminal stays out |
| Nationaltheatret T-bane vs Vy vs Flytoget | Three operators, three doNotGroup platform sections (30 Aug 2026 scope update) |
| Vy R21 terminus Oslo S vs Jernbanetorget board string | Self-referential hub — see direction-model-memo.md flag; only `R21 + Moss` is a valid outbound chip |
| Ullevaal vs Ullevål stadion | Stadium spelling |
| Carl Berner vs Carl Berners plass | Halt-list long form |
| Nationaltheateret vs Nationaltheatret | Extra e |
| Oslo S vs Jernbanetorget | Railway vs T-bane string |
| Helsfyr vs Bergkrystallen as line 1 end | Short-turn vs folder terminus |
| Gulleråsen omitted vs included | One-way tick |
| Løren vs Hasle | Line 4 vs line 5 at Økern |
| Line 6 / Ringen vs line 5 | No passenger 6 |
| Fornebu / Flytårnet / Fornebuporten / Vækerø vs 1–5 | Unopened |
| Skøyen / Lysaker T-bane vs Vy Skøyen / Lysaker | Unopened metro vs existing rail |
| Trikk / bus / båt vs T-bane | Other modes on the same index |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden / Berlin / Munich / Hamburg. No station-graph invention for the rest of the Vy/Flytoget corridors (Drammen, Lillehammer, Skien, Eidsvoll, Kongsberg, Dal, Asker, Kongsvinger, Moss, Spikkestad, Lillestrøm, Stabekk, Ski, Oslo Airport Station) — those stations are not in this catalog and the oracle report gives no stop-level data for them; Vy/Flytoget scope stays exactly Jernbanetorget + Nationaltheatret.
