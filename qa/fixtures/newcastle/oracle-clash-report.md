# Newcastle oracle clash report

D1 (published, live as of 27 Aug 2026): [Newcastle Light Rail map](https://www.newcastletransport.info/wp-content/uploads/2019/11/MAP-SIMPLE-Newcastle-Light-Rail.pdf) linked from [Light rail — Newcastle Transport](https://www.newcastletransport.info/plan-your-trip/light-rail/) as **Download Light Rail Map**. Stations arrays hand-transcribed. **Not generated from GTFS.**

Ordered-stop corroboration: [NLR timetable PDF](https://www.newcastletransport.info/wp-content/uploads/2022/03/NLR_tt_20220403_web.pdf) (Valid from 03/04/2022; still the linked “Download Light Rail Timetable” on 27 Aug 2026). Cover: **Newcastle Light Rail servicing Newcastle Interchange, Honeysuckle, Civic, Crown Street, Queens Wharf & Newcastle Beach**. Route code **NLR**. Columns add suburbs: Newcastle Interchange, Wickham … Newcastle Beach, Newcastle.

Page copy: “Newcastle light rail runs from Newcastle Interchange in Wickham to Newcastle Beach in the east end of Newcastle. With six convenient stops.”

GTFS (H2 names only; not D1): same **TFNSW_API_KEY** as Sydney.

| path | auth | result 27 Aug 2026 |
| --- | --- | --- |
| `https://api.transport.nsw.gov.au/v1/gtfs/schedule/lightrail/newcastle` | API key | HTTP **200** zip `newcastle_GTFS_PROD_20260824150000.zip`, `Last-Modified` Mon, 24 Aug 2026 15:00:15 GMT |
| `https://api.transport.nsw.gov.au/v1/gtfs/realtime/lightrail/newcastle` | API key | HTTP **200** protobuf trip updates, live |

Static feed_info: publisher **Newcastle Light Rail**, url newcastletransport.info, version `25082026-010012`. Agency `NT` **Newcastle Transport**, timezone **Australia/Sydney**. One route: `route_id` `NT_NLR`, `route_short_name` **NLR**, `route_long_name` **Newcastle Light Rail**, `route_type=0`, `route_color` `EE343F`.

Do **not** use NSW TrainLink / Sydney Trains / Central Coast & Hunter as this city. Separate city id **newcastle**.

Bus/ferry out of v1 oracle.

## Station name table

Match rule: published D1 string (map) vs TfNSW NLR `stop_name`. This LR-only feed has one `location_type=1` parent (**Newcastle Interchange**) and ten platform/stop children.

| published (D1) | GTFS name | class |
| --- | --- | --- |
| Newcastle Interchange | parent **Newcastle Interchange** (`229310`, loc=1). Child **Newcastle Interchange Light Rail** (`229315`, parent 229310, platform 1) | match family on the parent. **rename (lock)** vs the Light Rail child. Do not use Wickham / Newcastle Station. Timetable column: Newcastle Interchange, Wickham. Map suburb label WICKHAM. |
| Honeysuckle | Honeysuckle Light Rail (`2300107`, `2300108`) | rename (GTFS adds Light Rail). No parent |
| Civic | Civic Light Rail (`2300123`, `2300124`) | rename. Intermediate stop — **not** the hub. Do not confuse with Canberra Civic |
| Crown Street | Crown Street Light Rail (`2300125`, `2300126`) | rename |
| Queens Wharf | Queens Wharf Light Rail (`2300127`, `2300128`) | rename. Ferry is a different mode at the same precinct |
| Newcastle Beach | Newcastle Beach Light Rail (`2300129`) | rename. Map suburb label NEWCASTLE EAST is not the stop. Timetable column: Newcastle Beach, Newcastle |
| (none) | (no Broadmeadow / Wickham Station LR rows) | future corridor not on the map — not inserted |

## H2 — who has NLR today

| surface | NLR? | what it actually has |
| --- | --- | --- |
| Light rail map (D1) | no code on the schematic | Six L-icon stops. Termini Newcastle Interchange / Newcastle Beach |
| NLR timetable PDF | **yes** | Route code NLR. Cover lists the six names |
| Newcastle Transport page | no code | “Newcastle light rail” + six stops |
| TfNSW GTFS `route_short_name` | **yes** | `NLR` / `Newcastle Light Rail` / `NT_NLR` / `route_type=0` |
| TfNSW GTFS-RT | codes ride trips | same key as Sydney |

H2 conclusion: passenger NLR and GTFS NLR already agree. Clash is **map omits Light Rail suffix**, **Wickham/Newcastle East suburb labels vs stop names**, **Newcastle Interchange parent shared with heavy rail**. Do not generate published-network.json from `routes.txt`. Do not merge into Sydney.

## C2/C3 to put in front of Jim

1. **newcastle is its own city.** Same TFNSW_API_KEY as Sydney. Do not fold into Sydney light rail or NSW TrainLink.
2. **Newcastle Interchange** is the locked hub string. Wickham is the suburb. GTFS child is Newcastle Interchange Light Rail. Heavy rail uses the same parent name.
3. **Newcastle Beach** is the locked beach terminus. Not Newcastle East.
4. **Civic** is an intermediate stop, not the hub (unlike Canberra’s Civic/Alinga problem).
5. Six stops only. No Broadmeadow extension on the official map.
6. **Australia/Sydney HAS DST.** Do not copy Brisbane no-DST.

## What I did not do

No `line-map` generator, no `stopIds` in the published JSON, no live city flip, no GitHub PR, no merge into Sydney, no Perth/Melbourne touch.
