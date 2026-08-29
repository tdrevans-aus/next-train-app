# Chicago hazard pack (H1–H7)

Evidence: CTA ‘L’ (rail) system diagram (PDF title [FE-7861-R31] P19 L (rail) system diagram WEB; Last-Modified 11 Aug 2026) and official Red/Blue/Brown/Green/Orange/Pink/Purple/Yellow line pages retrieved 2026-08-29. No product `lib/cities/chicago/`. Zero mix-in with washington / rotterdam.

## H1 — parent + child

D1 has no stopIds. CTA treats several transfers as **one printed name** over two levels or two faregates.

doNotGroup: **Clark/Lake** Blue subway vs Loop elevated; **Roosevelt** Red subway vs Green/Orange elevated; **Jackson** Red vs Blue subway; **Howard** Red vs Purple vs Yellow; **Belmont** Red/Brown/Purple vs **Belmont** Blue (two places); **Chicago** Red vs Blue vs Brown/Purple (three places); **Quincy** ‘L’ vs **Union Station Metra/Amtrak**; **Washington/Wells** ‘L’ vs **Ogilvie**; **Washington/Wabash** ‘L’ vs **Millennium Station** / South Shore; **Library** ‘L’ vs **LaSalle Street Metra**; **LaSalle/Van Buren** ‘L’ vs Blue **LaSalle**; **Lake** Red vs **Clark/Lake** vs **State/Lake**; **Washington** Blue vs **Washington/Wabash** vs **Washington/Wells**; **Harlem** Blue O'Hare vs Blue Forest Park vs Green **Harlem/Lake**; **Jefferson Park / Davis / 35th** ‘L’ vs Metra icons.

## H3 — thin / event / overlay

- **State/Lake temporary closure** (alert 5 Jan 2026 to TBD): Loop elevated station closed for reconstruction **into 2029**. Use Clark/Lake or Washington/Wabash. Map prints State/Lake (gray / X). **Overlay, not a deleted D1 stop.**
- **Red Line Extension** (map dotted): 103rd, 111th, Michigan, 130th “future line and stations under construction.” **Not D1 open stops.**
- **Red page rush trips to/from Ashland/63rd.** Operational extra, not a Red station list row.
- **Purple Line Express** is weekday rush only (map dashed). Not a ninth line. Recorded as Purple stations[] south of Howard + shortTurns Howard for the local.
- **King Drive** Harlem-bound boarding only. Not a deleted stop.
- **CTA bus / Pace / Metra / South Shore** on the same Maps index and as icons on the ‘L’ diagram. Out of v1.

## H4 — branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Clark/Lake | Blue subway through-run O'Hare–Forest Park vs Loop elevated Brown/Green/Orange/Pink/Purple | Map nest; hub lock |
| Loop rectangle | Brown one way vs Orange/Pink/Purple the other way; Green only north/east sides | Map arrows; brown/orange/pink/purple line pages |
| Howard | Red south vs Purple local north vs Yellow west vs Purple Express south | Map three-color nest |
| Garfield (Green) | Ashland Branch (Halsted–Ashland/63rd) vs East 63rd Branch (King Drive–Cottage Grove) | Map labeled branches |
| Belmont (Red/Brown/Purple) | Red local vs Brown vs Purple Express | Map; not Blue Belmont |
| Roosevelt | Red subway vs Green south vs Orange to Midway | Map transfer |
| Ashland (Green/Pink) | Green west/south vs Pink west vs (separate) Orange Ashland | Shared Lake Street vs Orange mid-south |
| Wilson | Red local vs Purple Express first stop south of Howard | Map |

No single Loop terminus. Brown/Orange/Pink/Purple circulate and return to Kimball / Midway / 54th/Cermak / Linden. Green through-runs Lake Street → south elevated. Red and Blue through-run under the Loop and do not circulate it.

## H5 — nested short turns

No official nested codes like Adelaide GAW/SALIS. Eight passenger colors only: **Red Blue Brown Green Orange Pink Purple Yellow**.

- Purple **Howard** is the printed local south end. `shortTurns` records `Howard`. Full Purple `stations[]` still includes the Express + Loop run because those stops are open passenger stops on the current map (dashed = rush only, not closed).
- Green **Cottage Grove** vs **Ashland/63rd** are two south termini, not a nested short of each other.
- Red Friendship-style shorts are not on this map as D1 shortTurns rows.
- Red rush to Ashland/63rd is H3 overlay, not a D1 shortTurns row.

## H6 — inner city (where §3 lives)

Locked set: **Clark/Lake**. Structure: **the Loop**. Shared approaches: State/Lake, Washington/Wabash, Adams/Wabash, Library, LaSalle/Van Buren, Quincy, Washington/Wells, Lake, Washington (Blue), Monroe, Jackson, Merchandise Mart.

Clark/Lake is a **through-cross + Loop gate**, not a single-end hub. Inbound/outbound vs CBD is false here (Blue continues O'Hare ↔ Forest Park; Loop lines circulate; Red continues Howard ↔ 95th/Dan Ryan). State/Lake is closed overlay — do not steal the lock. Washington/Wabash is the east Loop + Metra/South Shore icon — do not steal the lock. Lake is Red subway — do not steal the lock. **The Loop** is not a stop string.

## H7 — DST

**America/Chicago observes DST (CDT/CST).** Do not copy Perth / Brisbane no-DST. Wall-clock is Chicago local. Feed timestamps (when Jim wires Train Tracker) need the same zone.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| chicago vs chi / cta / chicago-l / dc | One city id: **chicago**. Do not invent a second city |
| chicago vs washington / rotterdam / perth | Zero mix-in. Washington stays planned. Cut #1 is Rotterdam only |
| Clark/Lake vs State/Lake vs Lake vs Washington/Wabash | Four downtown names; one lock |
| The Loop vs Clark/Lake | Structure vs stop string |
| Harlem Blue O'Hare vs Harlem Blue Forest Park vs Harlem/Lake | Three places |
| Western (five) / Pulaski (four) / Cicero (three) / Kedzie (several) / Damen (four) / Ashland vs Ashland/63rd | Chicago same-name classic |
| Belmont Red/Brown/Purple vs Belmont Blue | Two places |
| Chicago Red vs Chicago Blue vs Chicago Brown/Purple | Three places |
| Washington Blue vs Washington/Wabash vs Washington/Wells vs (absent) Washington Red | Do not invent a Red Washington stop |
| Dempster vs Dempster-Skokie | Purple vs Yellow |
| Quincy vs Union Station Metra | Connecting-rail icon |
| Washington/Wells vs Ogilvie | Connecting-rail icon |
| Washington/Wabash vs Millennium Station | Connecting-rail icon |
| Library vs Harold Washington Library-State/Van Buren vs LaSalle St Metra | Map short vs page long vs Metra |
| Purple local vs Purple Express | Same color, two service patterns |
| Green Ashland/63rd vs Cottage Grove | Two south ends |
| Yellow vs Loop lines | Yellow is Skokie only |
| ‘L’ vs CTA bus / Pace / Metra / South Shore | Out of v1 |

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no merge into washington/rotterdam, no API key, no GTFS station arrays.
