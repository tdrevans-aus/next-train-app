# Stockholm oracle clash report

D1 (published): [SL Spårtrafikkarta — All spårtrafik](https://images.ctfassets.net/9t2ujbulz1j7/KPuTvfWiEovOdFcO8q2kQ/b37312b61e82f24a52502a05b425ec4c/SL_Spartrafikkarta_250414.png) (`SL_Spartrafikkarta_250414.png`), linked from [Spårtrafikkartor](https://sl.se/reseplanering/kartor/spartrafikkartor). Contentful asset updated `2025-09-25T08:17:25.788Z`. Retrieved `2026-08-24T15:53:11Z`. Format is **PNG**. The 2026 sl.se index does **not** offer a separate Tunnelbana PDF or Pendeltåg PDF; the combined rail PNG is the passenger oracle. Stations in `published-network.json` are **hand-transcribed from that map**. Not generated from GTFS.

SL Transport (no key; live names/termini probe, not D1): [Trafiklab SL Transport](https://www.trafiklab.se/api/our-apis/sl/transport) — `https://transport.integration.sl.se/v1/lines?transport_authority_id=1`, `/v1/sites?expand=true`, `/v1/sites/{siteId}/departures`. Retrieved `2026-08-24T15:53:19Z`.

GTFS (H2 names only; not D1):

| feed | result |
| --- | --- |
| Trafiklab / Samtrafiken `opendata.samtrafiken.se/gtfs/sl/sl.zip` | **403** `This API cannot be called with an empty API key` — **Trafiklab GTFS Sweden clash incomplete** as that product. No key invented. |
| Public ResRobot zip `https://api.resrobot.se/gtfs/sweden.zip` (no key) | **200**. `feed_info` Samtrafiken i Sverige AB, version **2026-08-23**. SL `agency_id` **275**. Used **only** to clash printed strings vs `stop_name` / `route_short_name`. |

Tram / lokalbana (7, 12, 21, 25–31) sit on the same PNG. Out of v1 oracle.

## Station name table

Match rule: published map string vs SL Transport `sites[].name` vs ResRobot GTFS `stop_name`. `rename` = same place, different printed string.

| published (D1 map) | SL Transport site | GTFS `stop_name` | class |
| --- | --- | --- | --- |
| **T-Centralen** | T-Centralen (9001, `TCE`) | T-Centralen T-bana; T-Centralen Spårv | **lock metro**. Do not use Stockholm City / Stockholms central. Spårväg City also uses T-Centralen on the map — other-mode, do not merge. |
| **Stockholm City** | Stockholm City (1080, `SCI`) | Stockholm City station | **lock pendeltåg**. Walking interchange with T-Centralen on the map (capsule). Different stop. |
| Stockholms central (nearby fjärrtåg; not a v1 terminus lock) | Stockholms central (9000, `CST`) | Stockholm Centralstation; Stockholm Central Vasagatan; Stockholm C Klarabergsviadukte | **do not collapse** into T-Centralen or Stockholm City |
| Odenplan (metro on map) | Odenplan (9117, `ODP`) | Odenplan T-bana | rename vs pendeltåg name |
| Stockholm Odenplan (pendeltåg; SL/API) | Stockholm Odenplan (1079, `SOD`) | Stockholm Odenplan station | map capsule is the interchange blob **Odenplan**; keep the two site ids apart |
| Arlanda central | Arlanda central (9511) | Arlanda Centralstation | rename (`central` vs `Centralstation`). Map airplane. Do not lock `Arlanda C` if print is `Arlanda central`. |
| Uppsala C | (UL/SL boundary; live dest `Uppsala C`) | (outside SL-only naming) | keep **Uppsala C** as printed/live destination |
| Södertälje centrum | Södertälje centrum (9520) | Södertälje centrum station | rename (+ `station`) |
| Södertälje hamn | Södertälje hamn (9521) | Södertälje hamn station | rename |
| Södertälje syd | Södertälje Syd (9543) | Södertälje Syd station | casing / `station` |
| Mörby centrum | (metro) | Mörby centrum T-bana | GTFS often suffixes **T-bana** on metro parents |
| Norsborg | | Norsborg T-bana | T-bana suffix |
| Akalla / Hjulsta | | Akalla T-bana / Hjulsta T-bana | T-bana suffix |
| Stockholms södra | | (GTFS typically `Stockholm… station`) | keep map **Stockholms södra** |
| Stockholms östra (Roslagsbanan, out of v1) | | | later mode; near Tekniska högskolan |

Pattern: ResRobot GTFS likes `* T-bana` for metro and `* station` for pendeltåg. The map does **not** print those suffixes. D1 keeps map strings.

## H2 — who has line codes today

| surface | 10/11/13/14/17/18/19 and 40/41/43/48? | what it actually has |
| --- | --- | --- |
| SL Spårtrafikkarta PNG (D1) | **yes** (drawn) | Colour families: Blå / Röda / Gröna linjen with T-numbers; magenta Pendeltåg 40, 41, 43, 48. 43X is a skip-stop variant, not a unique colour. |
| SL Transport `/lines` (no key) | **yes** | METRO 10–11 Blå linjen, 13–14 Röda linjen, 17–19 Gröna linjen. TRAIN 40, 41, 42, 43, 44, 48 group_of_lines Pendeltåg (42/44 have empty `name` and no live hub trips). |
| Live `/sites/1080/departures` and `/sites/9001/departures` | **yes** | 40 Uppsala C / Södertälje centrum / Tumba; 41 Märsta / Södertälje centrum / Tumba / Upplands Väsby; 43 Bålsta / Bro / Västerhaninge; 43X Kallhäll / Nynäshamn. 48 only at Södertälje centrum / Gnesta. |
| ResRobot GTFS `agency_id=275` | **yes** | `route_short_name` 10,11,13,14,17,18,19 (`route_type` 401 metro); 40,41,43,48 (`106` / Pendeltåg long name). No 42/44 in this extract. `route_color` not in this feed. |
| Trafiklab GTFS Sweden | **no (403, needs key)** | Clash incomplete for that product. |

H2 conclusion: passenger T-numbers and pendeltåg 40s **already agree** across map, SL Transport, and ResRobot SL routes. Clash is **hub name splitting** (T-Centralen ≠ Stockholm City ≠ Stockholms central), **Odenplan vs Stockholm Odenplan**, **T-bana / station suffixes**, **Arlanda central vs Centralstation**. Do not generate `published-network.json` from `routes.txt`.

## C2/C3 to put in front of Jim

1. **T-Centralen**, **Stockholm City**, and **Stockholms central** are three different printed places. Product must not emit `Stockholm Central` / `Stockholm C` as the metro or pendeltåg stop.
2. **Odenplan** (metro site 9117) vs **Stockholm Odenplan** (pendeltåg site 1079).
3. GTFS `T-bana` / `station` suffixes vs map names.
4. **Pendeltåg 48** does not through-run Stockholm City.
5. **43X** is a nested skip-stop of 43, not a colour family.
6. **42/44** linger in `/lines` after the 15 Dec 2024 timetable drop — not D1 rows.
7. Same official PNG also draws tram/lokalbana; v1 must not swallow them.
8. Green west **18** map end is Hässelby strand; live often **Alvik**.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub PR, no Perth edits.
