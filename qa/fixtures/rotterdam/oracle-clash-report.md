# Rotterdam oracle clash report

D1 (published, Expansion brief 28 Aug 2026): [RET Metrolijnenkaart PDF](https://bestanden.ret.nl/user_upload/Documenten/PDF/Kaarten_en_plattegronden/RET_metrolijnenkaart.pdf) (map date 2025-12-15) plus RET Metro A–E timetable columns as of 28 Aug 2026. Stations arrays hand-transcribed. **Not generated from GTFS.**

RET A timetable (cite with D1; 20 stops Binnenhof–Schiedam Centrum): [Metro A](https://www.ret.nl/home/reizen/dienstregeling/metro-a.html).

RET B timetable (32 stops including Hoek van Holland Strand): [Metro B](https://www.ret.nl/home/reizen/dienstregeling/metro-b.html).

GTFS (H2 names only; not D1): public zip **no key** [https://gtfs.ovapi.nl/gtfs-nl.zip](https://gtfs.ovapi.nl/gtfs-nl.zip). Filter `agency_id=RET`, `route_type=1`, `route_short_name` A–E. User-Agent `next-train`. Do not include GVB 50–54.

GTFS-RT **no key**: [https://gtfs.ovapi.nl/nl/tripUpdates.pb](https://gtfs.ovapi.nl/nl/tripUpdates.pb) User-Agent `next-train`. Filter to RET metro trips.

Tram / bus / waterbus / NS out of v1 oracle.

## Station name table (locks + known clashes)

Match rule: published D1 string (Metrolijnenkaart) vs OVapi parent `stop_name` (often `City, Stop`). `rename` = same place, different printed string.

| published (D1) | typical GTFS parent | class |
| --- | --- | --- |
| Beurs | Rotterdam, Beurs | match family. **Hub lock.** Tram Beurs/Beursplein out of v1. doNotGroup |
| Rotterdam Centraal | Rotterdam, Rotterdam Centraal | match family. **NS shared.** doNotGroup metro vs NS. Not Centraal Station |
| Den Haag Centraal | Den Haag, Den Haag Centraal | match family. Metro E stop on **rotterdam**. NS/HTM out of v1. No Hague city |
| Meijersplein/Airport | Lansingerland, Meijersplein (or / Airport) | **rename**. Map form is Meijersplein/Airport |
| Melanchthonweg | Rotterdam, Melanchthonweg | match family. Alias Melanchtonweg |
| Hoek van Holland Strand | Hoek van Holland, Strand | match family. **Map lock.** Distinct from Haven |
| Hoek van Holland Haven | Hoek van Holland, Haven | match family. Intermediate B stop |
| Schiedam Centrum | Schiedam, Schiedam Centrum | match family. NS shared. A terminus |
| Voorburg 't Loo | Voorburg, 't Loo | match family |
| Laan van NOI | Den Haag, Laan van NOI | match family. NS shared |
| Nesselande | Rotterdam, Nesselande | match family. B only — not A |
| Binnenhof | Rotterdam, Binnenhof | match family. A only |
| De Akkers | Spijkenisse, De Akkers | match family. C and D terminus |
| De Terp | Capelle aan den IJssel, De Terp | match family. C terminus |

## H2 — who has Metro A–E today

| surface | A–E? | what it actually has |
| --- | --- | --- |
| RET Metrolijnenkaart (D1) | letters A–E | Five lines, hub Beurs |
| RET A/B timetables | A 20 / B 32 | Binnenhof–Schiedam Centrum; Nesselande–Strand |
| OVapi GTFS `route_short_name` | **yes** | RET `A`–`E`, `route_type=1`. GVB `50`–`54` is amsterdam |
| OVapi GTFS-RT TripUpdates | codes ride trips | no key; User-Agent next-train |

H2 conclusion: passenger letters and GTFS short names already agree. Clash is **City, Stop** prefixes, **Meijersplein/Airport**, **Strand vs Haven**, **Rotterdam Centraal vs NS / vs Amsterdam Centraal Station**, **GVB leak if unfiltered**. Do not generate published-network.json from `routes.txt`. Do not merge into amsterdam.

## C2/C3 to put in front of Jim

1. **rotterdam is its own city.** Same OVapi zip as Amsterdam; filter RET metro A–E. Do not leak GVB M50–M54.
2. **Beurs** hub lock. Not Rotterdam, not CS, not Centraal Station.
3. **Rotterdam Centraal** metro vs NS. D terminus / E through.
4. **Den Haag Centraal** stays on rotterdam. No the-hague city.
5. **A = Binnenhof–Schiedam Centrum (20).** A does not go to Nesselande.
6. **B includes Hoek van Holland Strand** (32). Distinct from Haven.
7. **Meijersplein/Airport** map form.
8. **Europe/Amsterdam HAS DST.**
9. **71 unique stops.**

## What I did not do

No `line-map` generator from GTFS, no `stopIds` in the published JSON, no city=nl, no Perth/Amsterdam rewrite.
