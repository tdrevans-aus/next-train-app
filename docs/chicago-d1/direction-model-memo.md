# Chicago direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **Loop circulation + through-cross**, not a single hub-and-spoke. **Clark/Lake** is the printed inner-city transfer (Blue subway under the Loop rectangle; Brown/Green/Orange/Pink/Purple elevated on it). **The Loop** is a structure, not a direction token. Official line pages talk destinations (**Howard**, **95th/Dan Ryan**, **O'Hare**, **Forest Park**, **Kimball**, **Harlem/Lake**, **Ashland/63rd**, **Cottage Grove**, **Midway**, **54th/Cermak**, **Linden**, **Dempster-Skokie**) — not inbound/outbound.

Inbound/outbound vs CBD is already a bad product model at **Clark/Lake** (Blue continues both ways; Loop lines circulate and leave toward a suburb), **Howard** (Red vs Purple vs Yellow), **Garfield** (Green two south ends), **Roosevelt** (Red vs Green vs Orange), and **Belmont** (Red/Brown/Purple vs a different Blue Belmont).

## Recommendation

**Line + terminus** (example: `Red + Howard`, or `Red + 95th/Dan Ryan`, or `Brown + Kimball`, or `Purple + Linden`).

Use the **far** printed suburban terminus on trains leaving a node. Use **Clark/Lake** only as the hub *stop string*, never as a direction token (“to City”, “to Downtown”, “to The Loop”, “inbound”). At Clark/Lake the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

The pack prompt’s examples `Red + Howard` and `Brown + Kimball` are the **format** (line + terminus). Red’s other far end is **95th/Dan Ryan**. Blue is **O'Hare** / **Forest Park**. Brown’s only suburban end is **Kimball** (Loop is circulation). Green is **Harlem/Lake** / **Ashland/63rd** / **Cottage Grove**. Orange is **Midway**. Pink is **54th/Cermak**. Purple is **Linden** (Express) or **Howard** (local). Yellow is **Dempster-Skokie**.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Red + Howard; Brown + Kimball; Purple + Linden | Matches map families and line-page blinds; splits H4 at Howard / Garfield / Roosevelt / Loop gates | Must keep Loop off the terminus list; must keep Green’s two south ends distinct |
| **B. Terminus only** | Howard; Kimball; Midway | Matches some destination blinds | At Clark/Lake several colors would collapse without a family; Howard is Red *and* Purple *and* Yellow |
| **C. Inbound/outbound vs CBD + terminus** | To Loop / To Howard | Close to English “centre” | False in the Loop (circulation, not a sink). “The Loop” / “Downtown” are not the hub lock. Blue inbound does not exist (O'Hare and Forest Park are both away from the other suburb) |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Clark/Lake**. Structure **Loop**.

### Clark/Lake (Blue × Loop elevated)

| train | label |
| --- | --- |
| Blue NW | Blue + O'Hare |
| Blue W | Blue + Forest Park |
| Brown (leaving the Loop) | Brown + Kimball |
| Green W | Green + Harlem/Lake |
| Green S (Ashland Branch) | Green + Ashland/63rd |
| Green S (East 63rd) | Green + Cottage Grove |
| Orange | Orange + Midway |
| Pink | Pink + 54th/Cermak |
| Purple Express | Purple + Linden |

Red **does not call Clark/Lake**. Red’s inner-city subway string is **Lake** (then Monroe, Jackson). Do not label a Red train “Clark/Lake” or “to The Loop”.

### Howard (H4)

Red + 95th/Dan Ryan vs Purple + Linden vs Yellow + Dempster-Skokie. Not “to Clark/Lake”. Not “to The Loop”.

### Garfield (Green)

Green + Harlem/Lake vs Green + Ashland/63rd vs Green + Cottage Grove. King Drive is Harlem-bound only.

### Roosevelt

Red + Howard vs Red + 95th/Dan Ryan vs Green + Harlem/Lake vs Green + Ashland/63rd / Cottage Grove vs Orange + Midway.

### Belmont / Chicago / Harlem / Western / Pulaski

Same printed street on different lines is a different place. Direction tokens never collapse them. Never label a Blue train “Belmont” meaning the Red/Brown/Purple Belmont.

## Open §3 questions for Tim

1. Spoken/printed line token: map color word **Red** vs GTFS-style **Red** / **Brn** / **G** / **Org** / **P** / **Y**. Rec: **Red + terminus** (color word; Brown not Brn in the UI).
2. Hub far-end string: never “City” / “Downtown” / “The Loop”. Lock **Clark/Lake** as the stop; directions always the suburban terminus.
3. Purple when the train is the local shuttle: `Purple + Howard` vs Express `Purple + Linden`. Rec: use the actual destination blind; D1 records both.
4. Green south-end string: always the actual branch end (**Ashland/63rd** or **Cottage Grove**), never a collapsed “63rd”.
5. Whether testers see chicago as its own city picker (yes — do not bury under a fictional `chi` / `cta` city; do not merge into washington).
