# Washington, D.C. direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **cross**, not a single hub-and-spoke. Red runs NW–NE through **Metro Center**. Orange / Blue / Silver run E–W through **Metro Center**. Green / Yellow run N–S through **Gallery Place-Chinatown** (one stop east — **not** Metro Center) and **L'Enfant Plaza**. Official Metro Center blinds talk **Glenmont / Shady Grove** (Red; overlay may show Friendship Heights), **Ashburn / Vienna / Franconia-Springfield / Largo / New Carrollton** (Orange/Blue/Silver). Map lock for the east pair is **Downtown Largo**, not Largo.

Inbound/outbound vs CBD is already a bad product model at **Metro Center** (four compass headings on two trunks), **Stadium-Armory** (New Carrollton vs Downtown Largo), **Rosslyn** (Blue south vs Orange/Silver west), **King St-Old Town** (Huntington vs Franconia-Springfield), **Pentagon** (Yellow river vs Blue cemetery), and **Fort Totten** (Red vs Green/Yellow).

## Recommendation

**Line + terminus** (example: `Red Line + Glenmont`, or `Silver Line + Ashburn`, or `Yellow Line + Huntington`).

Use the **far** printed terminus on trains leaving a node. Use **Metro Center** only as the hub *stop string*, never as a direction token (“to City” / “to Metro Center”). At Metro Center the useful pair is line + suburban end.

Do not write D5 assertion tables until Tim locks this.

Yellow far ends are **Huntington** and **Greenbelt** (dashed every-other-train); **Mt Vernon Sq/7th St-Convention Center** is the printed solid short, not the only Yellow direction. Silver far ends are **Ashburn**, **Downtown Largo**, and **New Carrollton**.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Red Line + Glenmont; Silver Line + Ashburn; Yellow Line + Huntington | Matches map families and Metro Center blinds; splits H4 at Stadium-Armory / Rosslyn / King St-Old Town / Pentagon | Must keep Downtown Largo vs New Carrollton distinct; Yellow Greenbelt vs Mt Vernon Sq distinct |
| **B. Terminus only** | Glenmont; Ashburn; Downtown Largo | Matches destination blinds | At Metro Center four colors collapse to suburb names with no family. Blue and Silver both “Downtown Largo” the other way |
| **C. Inbound/outbound vs CBD + terminus** | To City / To Glenmont | Close to English “centre” | False at Metro Center (through-cross). “City” is not the hub lock. Gallery Place / L'Enfant Plaza trains never “arrive at City” as Metro Center |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Metro Center**.

### Metro Center (Red × Orange/Blue/Silver)

| train | label |
| --- | --- |
| Red NW | Red Line + Shady Grove |
| Red NE | Red Line + Glenmont |
| Orange west | Orange Line + Vienna/Fairfax-GMU |
| Orange east | Orange Line + New Carrollton |
| Blue west/south | Blue Line + Franconia-Springfield |
| Blue east | Blue Line + Downtown Largo |
| Silver west | Silver Line + Ashburn |
| Silver east (Largo path) | Silver Line + Downtown Largo |
| Silver east (Orange path) | Silver Line + New Carrollton |

**Metro Center is not a direction token.** Do not emit “to Metro Center” / “to City”.

### Gallery Place-Chinatown (not the hub)

Red Line + Shady Grove / Glenmont vs Green Line + Greenbelt / Branch Av vs Yellow Line + Huntington / Greenbelt (or Mt Vernon Sq short the other way). This building is **not** Metro Center.

### Stadium-Armory (H4)

Orange Line + New Carrollton vs Orange Line + Vienna/Fairfax-GMU vs Blue Line + Downtown Largo / Franconia-Springfield vs Silver Line + Downtown Largo / Ashburn / New Carrollton.

### Rosslyn / Pentagon / King St-Old Town

Line + the branch far end (Blue Franconia-Springfield vs Yellow Huntington; Blue Arlington Cemetery path vs Yellow L'Enfant Plaza river crossing). Yellow does **not** get a Rosslyn or Arlington Cemetery token.

### Fort Totten

Red Line + Glenmont / Shady Grove vs Green Line + Greenbelt / Branch Av vs Yellow Line + Greenbelt / Huntington.

## Open §3 questions for Tim

1. Spoken/printed line token: `Red Line` (map legend) vs map circle `R` vs WMATA code `RD`. Rec: **{Color} Line + terminus**.
2. Hub far-end string: never “City” / never “Metro Center” as a direction. Lock **Metro Center** as the stop; directions always the suburban terminus.
3. East-end string: map `Downtown Largo` vs board `Largo`. Rec: map long form.
4. Yellow Greenbelt vs Mt Vernon Sq: rec keep both (legend prints both); blinds that say Greenbelt on a dashed trip are correct.
5. Whether testers see washington as its own city picker (yes — do not invent city=dc).
