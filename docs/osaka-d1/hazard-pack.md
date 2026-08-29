# Osaka hazard pack (H1–H7)

Evidence: official EN routes / station list https://subway.osakametro.co.jp/en/station_guide/ (retrieved 2026-08-29); official JP sister list; 2025-04-04 路線図 PDF https://subway.osakametro.co.jp/img/osakametro_rosenzu_20250404.pdf (empty-key 200); Hommachi station page https://subway.osakametro.co.jp/en/station_guide/m/m18/ ; Nico clash report 2026-08-29.

## H1 — parent + child

D1 has no stopIds. There is **no official public GTFS** to collapse parent/child platforms. The hazard is **name-family**, not feed hierarchy.

doNotGroup: **Hommachi** (metro hub M18 × Y13 × C16) vs **Sakaisuji-Hommachi** (C17 × K15); **Umeda** vs **Higashi-Umeda** vs **Nishi-Umeda** vs Hankyu Osaka-Umeda / Hanshin Osaka-Umeda / JR Osaka; **Namba** vs Nankai Namba / JR Namba / Kintetsu Osaka-Namba / Hanshin Osaka-Namba; **Shinsaibashi** vs **Yotsubashi**; **Esaka** vs Kitakyu Senri-Chuo / Momoyamadai / Minoh-Kayano; **Nagata** vs Kintetsu beyond Nagata; **Tenjimbashisuji 6-chome** vs Hankyu through-run; **Tennoji** vs JR / Kintetsu Tennoji. **Hommachi** is the metro lock string — keep it.

## H3 — thin / event / overlay

- **No New Tram in v1.** Official routes list prints a ninth section New Tram / Nanko Port Town P09–P18. Out of v1. Cosmosquare and Suminoekoen stay as Chuo / Yotsubashi subway stops.
- **No Kitakyu north of Esaka.** Mutual-operation transfer at M11. Boarding PDF `m_minohkayano.pdf` is a filename trap, not a D1 terminus.
- **No Hankyu beyond K11 / no Kintetsu beyond C23.** Same mutual-operation pattern.
- **Yumeshima C09 is already open** on the official list — in, not an overlay.
- **Imazato Liner BRT / Osaka City Bus / JR / private rail / monorail / Hankai** on neighbouring official sites. Out of v1.
- **列車走行位置 HTML pages** on the rider site are not a published developer feed. Do not treat them as a product contract.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Hommachi | Midosuji + Yotsubashi + Chuo | Official M18 page transfers Y13 + C16 only |
| Sakaisuji-Hommachi | Chuo + Sakaisuji | Official C17 / K15. Not the hub |
| Umeda cluster | Umeda / Higashi-Umeda / Nishi-Umeda + Hankyu / Hanshin / JR | Official Umeda transfers list private rail |
| Namba cluster | Midosuji + Yotsubashi + Sennichimae + Nankai / JR / Kintetsu / Hanshin | Official Namba transfers |
| Esaka | Metro M11 vs Kitakyu through-run | Official “Kita-Osaka Kyuko Line (Mutual Line Operation)” |
| Shinsaibashi / Yotsubashi | M19 × N15 vs Y14 | Official distinct stations |
| Nagata | Metro C23 vs Kintetsu through-run | Official “Kintetsu Line (Mutual Line Operation)” |
| Tenjimbashisuji 6-chome | Metro K11 vs Hankyu through-run | Official “Hankyu Line (Mutual Line Operation)” |

No city loop as a passenger code. Inbound/outbound vs City is false at **Hommachi** (three lines through in both directions), **Umeda**, and **Namba**.

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Eight passenger line tokens only: **M, T, Y, C, S, K, N, I**. No New Tram P-code in v1.

`shortTurns` empty on all eight lines.

## H6 — inner city (where §3 lives)

Locked set: **Hommachi**. Shared approaches: Shinsaibashi (Midosuji × Nagahori; not Yotsubashi), Yotsubashi (Y14), Sakaisuji-Hommachi, Namba, Umeda, Daikokucho.

Hommachi is a **through trunk**, not a single-end hub. Three lines call it. Inbound/outbound vs City is false here (ends are Esaka / Nakamozu, Nishi-Umeda / Suminoekoen, Yumeshima / Nagata). Umeda and Namba are the private-rail clusters — still not the metro lock.

## H7 — DST

**Asia/Tokyo does not observe DST.** Do not copy Europe/Stockholm or Australia/Sydney DST cities. Wall-clock is Japan standard time year-round.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| osaka vs city=japan / tokyo / keihanshin / kintetsu / osk / osaka-metro | Separate city; agency Osaka Metro |
| Hommachi vs City / Downtown / Honmachi / Hommachi Station | Hub lock vs marketing / misspelling |
| Hommachi vs Sakaisuji-Hommachi | Two official Metro stations |
| Umeda vs Higashi-Umeda vs Nishi-Umeda vs Hankyu / Hanshin / JR Osaka | Metro vs private rail / sibling Metro |
| Namba vs Nankai / JR / Kintetsu / Hanshin Namba | Metro vs private rail |
| Shinsaibashi vs Yotsubashi | Two official Metro stations |
| Esaka vs Senri-Chuo / Momoyamadai / Minoh-Kayano | Metro terminus vs Kitakyu through-run |
| Nagata vs Kintetsu beyond Nagata | Metro terminus vs mutual operation |
| Tenjimbashisuji 6-chome vs Hankyu through-run | Metro terminus vs mutual operation |
| New Tram P-codes vs subway | Printed ninth section; out of v1 |
| ODPT / Transitland / Tokyo Metro zip vs this city | No official public feed |

## What I did not do

No generator, no live city flip, no Perth edit, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Stockholm / Göteborg, no invented ODPT zip, no version bump, no public store listing.
