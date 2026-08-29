# Helsinki hazard pack (H1–H7)

Evidence: HSL Metro haarukka 10/2023 (still on staticfiles 29 Aug 2026); Tervetuloa metroon 2/2025; 02/2026 metro station sheets Rautatientori / Kamppi / Helsingin yliopisto / Itäkeskus; 02/2026 juna-asemat Helsinki; HSL trunk-route page; Digitransit Routing v2 + HSL GTFS-RT + HFP; product `lib/cities/helsinki/` absent.

## H1 — parent + child

D1 has no stopIds. Digitransit stop-place register and Routing API collapse metro + railway + bus under nearby printed names at the Helsinki Central and Kamppi clusters.

doNotGroup: **Rautatientori** (metro M1/M2) vs **Päärautatieasema / Helsinki Central** (VR / HSL commuter) vs buses from Rautatientori / Elielinaukio; **Kamppi** metro vs **Kamppi** bus terminal; **Pasila** (commuter / VR, no metro). **Rautatientori** is the metro lock string — keep it.

## H3 — thin / event / overlay

- **No passenger M3.** Official trunk page and 2/2025 sheet print **M1 / M2** only.
- **Itämetro / Östersundom unopened.** Not on the 10/2023 haarukka, not on the 2/2025 sheet, not on 02/2026 station maps. Out of v1.
- **Länsimetro to Kivenlahti is already open** (3 Dec 2022). Five stations Finnoo, Kaitaa, Soukka, Espoonlahti, Kivenlahti are D1 rows. Matinkylä is no longer the west end.
- **Stale index caption** on hsl.fi printable maps: *M1 Matinkylä-Vuosaari*. Overlay on the index card. Official sheet west end is **Kivenlahti**.
- **Tervetuloa first-train footnote** *Keskustasta Mellunmäkeen: vaihda junaa Itäkeskuksessa*. Overlay on early M2, not a deleted through-path. Official M2 pair stays Tapiola–Mellunmäki.
- **Metro-replacement X-buses** (20X / 100X / 130X / 140X / 150X) on 02/2026 station sheets. Out of v1.
- **Tram / light rail 15 / bus / commuter rail / Suomenlinna ferry** on the same official kartat index. Out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Rautatientori | both metro lines through + Päärautatieasema / VR / commuter + buses / trams | haarukka City Centre icons; 02/2026 metro sheet vs 02/2026 juna-asemat sheet |
| Kamppi | both metro lines + bus terminal | 02/2026 Kamppi sheet |
| Tapiola | M2 west end vs M1 continuing to Kivenlahti | haarukka; Tervetuloa M2 marker |
| Itäkeskus | M1 Vuosaari vs M2 Mellunmäki; light rail 15 | haarukka east fork; 02/2026 Itäkeskus sheet |
| Matinkylä | former west end vs through to Kivenlahti | Länsimetro 3 Dec 2022; current sheet |
| Pasila | commuter / VR only — no metro | Tervetuloa rail icon from Rautatientori; no metro tick |

No city loop as a passenger code. Inbound/outbound vs City is false at **Rautatientori** (both lines through in both compass headings), **Kamppi** (same plus bus terminal), and **Itäkeskus** (east fork, not “to City”).

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Two passenger codes only: **M1**, **M2**. No M3.

`shortTurns` empty on both lines. The Itäkeskus change-for-Mellunmäki first-train footnote is an overlay, not a third code.

Night extras are the same M1/M2 codes at reduced frequency (Tervetuloa wait-time bands), not extra D1 rows. Replacement bus out of v1.

## H6 — inner city (where §3 lives)

Locked set: **Rautatientori**. Shared approaches: Kamppi (metro + bus terminal), Helsingin yliopisto (east neighbour), Tapiola (M2 west hinge), Itäkeskus (east fork).

Rautatientori is a **through trunk**, not a single-end hub. Both lines call it. Inbound/outbound vs City is false here (west ends Kivenlahti / Tapiola and east ends Vuosaari / Mellunmäki). Kamppi is the bus-terminal cluster — still not the metro lock. Helsingin keskusta is the map blob — not a stop.

## H7 — DST

**Europe/Helsinki observes DST (EEST/EET).** Do not copy no-DST cities. Wall-clock is Helsinki local. Digitransit `realtimeDeparture` is seconds-since-midnight of `serviceDay`; do not treat raw clock minutes as elapsed minutes across the spring jump.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| helsinki vs city=finland / vr / hsl-bus / hsl-tram | Separate city; agency HKL / HSL metro |
| helsinki vs berlin / munich / hamburg / oslo / rotterdam / goteborg / amsterdam / london-tfl | Other packs; do not reopen |
| Rautatientori vs City / Helsingin keskusta / Helsinki / Päärautatieasema | Hub lock vs marketing / railway |
| Rautatientori metro vs Helsinki Central / VR / commuter | HSL files metroasemat vs juna-asemat |
| Pasila vs any metro row | No metro at Pasila |
| Kamppi metro vs Kamppi bus terminal | Same name family, different mode |
| Aalto University vs Aalto-yliopisto | English vs Finnish print |
| University of Helsinki / Kaisaniemi vs Helsingin yliopisto | English / old name |
| Central Railway Station vs Rautatientori | Railway English subtitle vs metro lock |
| Matinkylä vs Kivenlahti as M1 west | Former vs current terminus |
| M3 / Itämetro vs M1/M2 | Unopened |
| Light rail 15 / tram / bus / ferry vs metro | Other modes on the same index |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no reopen of London TfL, no redo of Amsterdam / Rotterdam / Sweden / Berlin / Munich / Hamburg / Oslo.
