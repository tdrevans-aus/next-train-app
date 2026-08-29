# Wellington oracle clash report

D1 (published): [Wellington Regional Rail Network](https://www.metlink.org.nz/assets/Network-maps/RegionalRailNetwork.pdf) (Metlink Rail Network Map), linked from [Maps, apps & guides](https://www.metlink.org.nz/getting-started/apps-maps-and-guides). Retrieved `2026-08-29`. Format is **PDF**. Stations in `published-network.json` are **hand-transcribed** from that map + Metlink line timetables (Station suffix). **Not generated from GTFS.**

Kāpiti Line timetable (ordered stops): [KPL Waikanae–Wellington 23-03-2026](https://backend.metlink.org.nz/assets/Uploads/KPL-Kapiti-Line-Waikanae-Wellington-23-03-2026.pdf).

GTFS (H2 names only; not D1): public static zip **no key** [https://static.opendata.metlink.org.nz/v1/gtfs/full.zip](https://static.opendata.metlink.org.nz/v1/gtfs/full.zip). GTFS-RT TripUpdates: [https://api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates](https://api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates) with **`METLINK_API_KEY` → `x-api-key`**. Portal: https://opendata.metlink.org.nz/

Bus / ferry / cable car / Capital Connection / Northern Explorer out of v1 oracle.

## Agency / feed / auth

| field | value |
| --- | --- |
| Agency | Metlink (Greater Wellington) |
| Static | Metlink GTFS full.zip (no key) |
| RT | GTFS-RT tripupdates (`METLINK_API_KEY`, `x-api-key`) |
| v1 mode cut | **TRAIN only** — KPL, HVL, MEL, JVL, WRL |
| Hub lock | **Wellington Station** |
| DST | `Pacific/Auckland` (HAS DST — same as Auckland) |
| Skip risks | Bus/ferry leak; folding into auckland; treating closed **Melling Station** as live |

## Station name table (locks + known clashes)

| published (D1) | typical GTFS parent | class |
| --- | --- | --- |
| **Wellington Station** | Wellington Station | **lock hub**. Parent `WELL`. |
| Waikanae Station | Waikanae Station | match family. KPL outer. |
| **Western Hutt Station** | Western Hutt Station | **lock MEL live terminus**. Map still labels Melling Line. |
| Melling Station | *(absent in current rail feed)* | **closed** ~Christmas Eve 2025 until ~late 2028 (RiverLink). Not a live D1 stop. |
| Paekākāriki Station | Paekākāriki Station | match family (macron). |
| Taita Station | Taita Station | match family. Schematic may print **Taitā**. |
| Upper Hutt Station | Upper Hutt Station | HVL outer; also WRL through. |
| Masterton Station | Masterton Station | WRL outer. |
| Johnsonville Station | Johnsonville Station | JVL outer. |

## H2 — who has line codes today

| surface | KPL/HVL/MEL/JVL/WRL? | what it actually has |
| --- | --- | --- |
| Regional Rail Network PDF (D1) | **yes** | Five lines drawn; hub Wellington Station |
| Metlink KPL timetable | **yes** | 14 stops Waikanae–Wellington |
| GTFS `route_short_name` (rail) | **yes** | KPL, HVL, MEL, JVL, WRL (`route_type=2`) |
| GTFS-RT TripUpdates | codes ride trips | needs `METLINK_API_KEY` |

H2 conclusion: passenger codes and GTFS short names **already agree**. Clash is **Melling Station closed vs Western Hutt live terminus**, optional **Taitā** print vs **Taita**, and schematic names without `Station`. Do not generate `published-network.json` from `routes.txt`. Do not merge into auckland.

## C2/C3 to put in front of Jim

1. **Wellington Station** hub lock. Separate city from **auckland**.
2. **TRAIN only** — five codes. No bus/ferry/cable car.
3. **Melling Line** product name stays; live outer stop is **Western Hutt Station** until Melling reopens (~2028).
4. **47 unique** stations in the D1 set.
5. **Pacific/Auckland HAS DST.**
6. Adapter already exists (`lib/providers/wellington.js`) — see `qa-note.md` for verification flags. Do not flip live.

## What I did not do

No silent adapter rewrite, no live city flip, no UI edits, no Auckland merge.
