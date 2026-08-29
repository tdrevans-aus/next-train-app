# BART direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **through-cross + East Bay wye**, not a single hub-and-spoke. **Embarcadero** is the printed inner-city lock (first downtown SF stop after the Transbay Tube; Yellow/Blue/Green/Red). The four-stop downtown SF trunk is a structure, not a direction token. Official map legend and timetable titles talk destinations (**Antioch**, **SFO Int’l Airport**, **Millbrae**, **Daly City**, **Dublin/Pleasanton**, **Berryessa/North San José**, **Richmond**, **Oakland Int’l Airport**) — not inbound/outbound.

Inbound/outbound vs CBD is already a bad product model at **Embarcadero** (four colors continue both ways; Orange never arrives), **12th St/Oakland City Center** (Red/Yellow west vs Orange south; Green/Blue skip), **MacArthur** (Yellow east vs Red/Orange north), **Bay Fair** (Blue east vs Green/Orange south), and **San Bruno** (Yellow to SFO vs Red to Millbrae).

The Legacy API’s optional `dir=n/s` (Northbound/Southbound) is **not** the product model. At Embarcadero, “North” is East Bay and “South” is Peninsula — and that language dies for Orange (never there) and for OAK.

## Recommendation

**Line + terminus** (example: `Yellow + Antioch`, or `Yellow + San Francisco International Airport (SFO)`, or `Blue + Daly City`, or `Orange + Richmond`).

Use the **far** printed suburban / airport terminus on trains leaving a node. Use **Embarcadero** only as the hub *stop string*, never as a direction token (“to City”, “to Downtown”, “to SF”, “to Powell”, “inbound”). At Embarcadero the useful pair is line + suburban/airport end.

Do not write D5 assertion tables until Tim locks this.

The pack prompt’s Chicago examples `Red + Howard` / `Brown + Kimball` are the **format** (line + terminus). BART’s far ends are **Antioch**, **SFO**, **Millbrae**, **Daly City**, **Dublin/Pleasanton**, **Berryessa/North San José**, **Richmond**, **Oakland International Airport (OAK)**.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Yellow + Antioch; Blue + Daly City; Orange + Richmond | Matches map legend and timetable blinds; splits H4 at Embarcadero / 12th St / MacArthur / Bay Fair / San Bruno | Must keep Embarcadero / Powell / SF off the terminus list; must keep Yellow’s SFO vs Millbrae distinct |
| **B. Terminus only** | Antioch; Daly City; Richmond | Matches some destination blinds | At Embarcadero several colors would collapse without a family; Daly City is Blue *and* Green; Richmond is Red *and* Orange; Millbrae is Red *and* evening Yellow |
| **C. Inbound/outbound vs CBD + terminus** | To SF / To Antioch | Close to English “into the city” | False at Embarcadero (through-run, not a sink). “SF” / “Downtown” are not the hub lock. Orange inbound to SF does not exist. API n/s is a different axis |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Embarcadero**. Structure **downtown SF trunk**.

### Embarcadero (Yellow × Blue × Green × Red)

| train | label |
| --- | --- |
| Yellow E | Yellow + Antioch |
| Yellow S (day) | Yellow + San Francisco International Airport (SFO) |
| Yellow S (evening / dashed) | Yellow + Millbrae |
| Blue E | Blue + Dublin/Pleasanton |
| Blue S | Blue + Daly City |
| Green SE | Green + Berryessa/North San José |
| Green S | Green + Daly City |
| Red N | Red + Richmond |
| Red S | Red + Millbrae |

Orange **does not call Embarcadero**. Never label an Orange train “Embarcadero” or “to SF”.

### 12th St/Oakland City Center (H4)

Red + Richmond vs Red + Millbrae vs Yellow + Antioch vs Yellow + SFO/Millbrae vs Orange + Richmond vs Orange + Berryessa/North San José. Not “to Embarcadero”. Green/Blue are not here.

### MacArthur

Yellow + Antioch vs Red + Richmond vs Orange + Richmond / Berryessa. Timed transfer southbound.

### Bay Fair

Blue + Dublin/Pleasanton vs Blue + Daly City vs Green + Berryessa vs Green + Daly City vs Orange + Berryessa vs Orange + Richmond.

### San Bruno / SFO / Millbrae

Yellow + Antioch vs Yellow + SFO vs Yellow + Millbrae (evening) vs Red + Richmond vs Red + Millbrae. Do not put SFO on a Red label from this map.

### Coliseum

Orange / Blue / Green + their far ends vs OAK + Oakland International Airport (OAK). OAK has no ETD.

## Open §3 questions for Tim

1. Spoken/printed line token: map color word **Yellow** vs ETD **YELLOW**. Rec: **Yellow + terminus** (color word; OAK Airport as **OAK**).
2. Hub far-end string: never “City” / “Downtown” / “SF” / “Powell”. Lock **Embarcadero** as the stop; directions always the suburban / airport terminus.
3. Yellow when the train is the evening Millbrae run: `Yellow + Millbrae` vs daytime `Yellow + San Francisco International Airport (SFO)`. Rec: use the actual destination blind; D1 records both.
4. SFO string: map **San Francisco International Airport (SFO)** vs legend **SFO Int’l Airport** vs stations **San Francisco International Airport**. Rec: map long form with (SFO).
5. Whether testers see bart as its own city picker (yes — do not bury under a fictional `sf` / `san-francisco` / `bay-area` city; do not merge into chicago or washington).
