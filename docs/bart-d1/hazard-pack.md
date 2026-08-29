# BART hazard pack (H1–H7)

Evidence: official BART detailed system map (PDF title BART Website Map PDF Format; Last-Modified 13 Jan 2025; © BART 2025), 5-line / 3-line PNGs, stations index, and August 10 2026 timetable index retrieved 2026-08-29. No product `lib/cities/bart/`. Zero mix-in with chicago / washington / rotterdam / perth.

## H1 — parent + child

D1 has no stopIds. BART treats several transfers as **one printed name** over two systems or two vehicles.

doNotGroup: **Embarcadero** BART vs Muni Metro Embarcadero; **Powell St** BART vs Muni/cable car Powell; **Montgomery St** BART vs Muni; **Civic Center/UN Plaza** BART vs Muni; **Millbrae** BART vs Caltrain Millbrae; **Coliseum** BART vs Capitol Corridor / Amtrak vs OAK people-mover platforms; **Richmond** BART vs Capitol Corridor; **Milpitas** BART vs VTA; **Berryessa/North San José** BART vs (future) Downtown San José; **SFO** BART vs AirTrain / Caltrain-adjacent; **Oakland International Airport (OAK)** people-mover vs SFO.

## H3 — thin / event / overlay

- **Evening 3-line service (every day 9pm–midnight):** Red and Green **No Service**. Yellow far end flips to **Millbrae**. Orange and Blue unchanged. OAK unchanged. All stations remain reachable by transfer. **Overlay, not deleted D1 stops / lines.**
- **TRAIN CONTROL MODERNIZATION (SFO–Millbrae):** “After 9pm, change trains at SFO for Millbrae service.” Dashed yellow SFO–Millbrae on the map. Overlay on Yellow.
- **eBART transfer platform** east of Pittsburg/Bay Point: “Change trains at transfer platform.” Not a named passenger station. Antioch and Pittsburg Center stay Yellow.
- **Green Line buses Union City–Warm Springs this weekend (29–30 Aug 2026):** track replacement; last Berryessa train 11:10pm. **Overlay.** Union City / South Hayward / Fremont / Warm Springs/South Fremont / Milpitas / Berryessa stay in D1.
- **Weekend Red timetable +SFO** (August 10 2026 weekend file). Map Red does not enter the SFO spur. Overlay, not a Red station-list row.
- **BART to OAK:** no real-time ETD, no PDF timetable (schedules/pdfs). Average wait 4.5 minutes / ~9 minute trip. Line stays in D1 because the official map legend lists it.
- **Irvington PLANNED FUTURE STATION** and Phase II Future Service (28th St/Little Portugal, Downtown San José, Diridon, Santa Clara). **Not D1 open stops.**
- **Muni / Caltrain / ACE / Capitol Corridor / SMART / VTA / ferry** on the same detailed plate. Out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Embarcadero | Yellow/Blue/Green/Red through-run (East Bay ↔ Peninsula). Orange never arrives | Map downtown SF trunk; hub lock |
| 12th St/Oakland City Center | Red/Yellow west to West Oakland vs Orange south to Lake Merritt. Green/Blue skip | Oakland wye |
| West Oakland | Red/Yellow to 12th St vs Blue/Green to Lake Merritt | Map |
| MacArthur | Yellow east to Rockridge/Antioch vs Red/Orange north to Richmond. Timed transfer southbound | Map callout |
| 19th St/Oakland | Timed transfer northbound. Red/Orange/Yellow only | Map callout |
| Bay Fair | Blue east to Dublin/Pleasanton vs Green/Orange south to Hayward/Berryessa | Map split |
| San Bruno | Yellow to SFO vs Red to Millbrae. Dashed yellow SFO–Millbrae | Map + modernization note |
| Pittsburg/Bay Point | Heavy rail vs eBART DMU to Pittsburg Center / Antioch (same Yellow print) | Change-trains callout |
| Coliseum | Orange/Blue/Green heavy rail vs OAK Airport people-mover | Legend + gray plane line |
| Daly City | Blue/Green terminus vs Red/Yellow through to Colma / SFO / Millbrae | Map |

No single SF terminus. Yellow/Blue/Green/Red through-run the downtown trunk and leave toward a suburb. Orange is East Bay only.

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Five passenger colors + OAK: **Yellow Blue Green Red Orange OAK**.

- Yellow **SFO** is the printed daytime south end. **Millbrae** is the evening / dashed south end. Both are in `termini` and `stations[]`. Not a nested short of each other.
- Red **Millbrae** is the only printed Red south end on this map.
- Evening Red/Green “No Service” is H3 overlay, not a D1 shortTurns row.
- eBART is the same Yellow color, not a nested code.

## H6 — inner city (where §3 lives)

Locked set: **Embarcadero**. Structure: the four-stop downtown SF trunk (Embarcadero, Montgomery St, Powell St, Civic Center/UN Plaza). Shared approaches: West Oakland, 12th St/Oakland City Center, 19th St/Oakland, MacArthur, Lake Merritt, Balboa Park, Daly City.

Embarcadero is a **through-cross**, not a single-end hub. Inbound/outbound vs CBD is false here (Yellow continues Antioch ↔ SFO/Millbrae; Blue Daly City ↔ Dublin/Pleasanton; Green Daly City ↔ Berryessa; Red Richmond ↔ Millbrae; Orange never arrives). Powell St is the Muni-famous stop — do not steal the lock. Civic Center/UN Plaza and Montgomery St are the same trunk — do not steal the lock. **San Francisco / Downtown / SF** are not stop strings.

## H7 — DST

**America/Los_Angeles observes DST (PDT/PST).** Do not copy Perth / Brisbane no-DST. Wall-clock is Bay Area local. Feed timestamps (when Jim wires ETD) need the same zone. ETD sample docs print PDT.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| bart vs sf / san-francisco / bay-area / oakland / sfo | One city id: **bart**. Do not invent a second city |
| bart vs chicago / washington / rotterdam / perth | Zero mix-in. Chicago and Washington stay planned. Cut #1 is Rotterdam only |
| Embarcadero vs Powell St vs Montgomery St vs Civic Center/UN Plaza | Four downtown SF names; one lock |
| Powell St vs Muni Powell | Connecting-rail mix is why Powell is not the lock |
| 12th St/Oakland City Center vs 19th St/Oakland vs West Oakland vs Lake Merritt | Oakland wye; Green/Blue skip 12th/19th; Orange skips West Oakland |
| Dublin/Pleasanton vs West Dublin/Pleasanton | Two places |
| Pittsburg/Bay Point vs Pittsburg Center | Heavy rail vs eBART stop; same Yellow |
| SFO vs OAK vs Millbrae | Three airport-adjacent names |
| Berryessa/North San José vs Downtown San José (future) | Open terminus vs Phase II |
| Fremont vs Warm Springs/South Fremont vs Irvington (planned) | Two open + one future |
| El Cerrito del Norte vs El Cerrito Plaza | Two places |
| Downtown Berkeley vs North Berkeley | Two places |
| Millbrae BART vs Caltrain Millbrae | Connecting-rail icon |
| Coliseum BART vs Capitol Corridor vs OAK platform | Three systems |
| Yellow daytime SFO vs evening Millbrae | Same color, two south ends |
| Red vs weekend +SFO timetable | Map Red does not enter SFO |
| Orange vs “to SF” / “to Embarcadero” | Orange never crosses the tube |
| OAK vs 5-line heavy rail | Included because the BART legend lists it; no ETD |
| BART vs Muni / Caltrain / ACE / Capitol Corridor / VTA / ferry | Out of v1 |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no Chicago/Washington edit, no merge into another city, no API key, no GTFS station arrays.
