# Göteborg direction model memo (§3 for Tim)

Context: **through-running** tram network plus three stub pendeltåg that start at Göteborg Central. Not an Adelaide hub and not “to City”. Official Västtrafik blinds and the 2026-06-15 legend already print **line number + far suburb** (1 Tynnered, 12 Lindholmen, Västtågen Kungsbacka).

The inner city is the hazard: a rider at **Brunnsparken** is not at **Drottningtorget**, and neither of those is **Göteborg Central**.

## Recommendation

**Line + terminus** (example: `1 + Tynnered`, `12 + Lindholmen`, `Västtågen + Kungsbacka`).

Use the **map legend far end**, not the first-halt street string. Include the **line number** because several branches share platforms (Marklandsgatan, Gamlestads Torg, Korsvägen, Brunnsparken). Official product is already this shape — not inbound/outbound.

Do not write D5 live assertion tables until Tim locks this.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | 1 + Tynnered; 12 + Lindholmen; Västtågen + Kungsbacka | Matches map legend and live destination; splits H4; works at Brunnsparken where every train is through | Must pick first-halt vs legend (H5): Opaltorget vs Tynnered |
| **B. Terminus only** | Tynnered; Lindholmen; Kungsbacka | Matches destination blinds | At Brunnsparken / Korsvägen the number is how riders choose. Port-like confusion: Tynnered vs Frölunda both “south-west” |
| **C. Inbound/outbound vs CBD + terminus** | To City / To Tynnered | Familiar from Perth/Adelaide tabs | **False** on this network. Trams through-run. “Inbound” at Järntorget is meaningless. Göteborg Central is not Brunnsparken |

## §3 examples (illustrative — not D5)

Assume model A. Locked tram string **Brunnsparken**. Locked pendeltåg string **Göteborg Central**. Legend far ends, not first-halt strings.

### Brunnsparken (tram through-station — not lines 8 or 12)

| train | label |
| --- | --- |
| 1 | 1 + Tynnered |
| 1 other way | 1 + Östra Sjukhuset |
| 2 | 2 + Högsbotorp |
| 2 other way | 2 + Biskopsgården |
| 7 | 7 + Tynnered |
| 7 other way | 7 + Bergsjön |
| 10 | 10 + Guldheden |
| 10 other way | 10 + Lindholmen |
| 11 | 11 + Saltholmen |
| 11 other way | 11 + Bergsjön |

Do not offer 8 or 12 here.

### Korsvägen (where 8 and 12 live)

| train | label |
| --- | --- |
| 8 | 8 + Frölunda |
| 8 other way | 8 + Angered |
| 12 | 12 + Mölndal |
| 12 other way | 12 + Lindholmen |
| 4 | 4 + Mölndal |
| 5 | 5 + Länsmansgården |

### Göteborg Central (pendeltåg only)

| train | label |
| --- | --- |
| Kungsbacka | Västtågen + Kungsbacka |
| Alingsås | Västtågen + Alingsås |
| Ale | Västtågen + Ale |

Do not label these **Brunnsparken** or **Drottningtorget**. Never “to City”.

### Legend vs first halt (do not print the halt as the chip)

| legend | first halt | chip |
| --- | --- | --- |
| Tynnered | Opaltorget | 1 + Tynnered |
| Högsbotorp | Axel Dahlströms Torg | 2 + Högsbotorp |
| Biskopsgården | Väderilsgatan | 2 + Biskopsgården |
| Länsmansgården | Varmfrontsgatan | 5 + Länsmansgården |
| Kortedala | Aprilgatan | 6 + Kortedala |
| Bergsjön | Komettorget | 7 + Bergsjön |
| Frölunda | Frölunda Torg | 8 + Frölunda |
| Mölndal | Mölndals Innerstad | 12 + Mölndal |
| Kålltorp | Virginsgatan | 3 + Kålltorp |
| Guldheden | Doktor Sydows Gata | 10 + Guldheden |
| Ale | Älvängen resecentrum | Västtågen + Ale |

## Open §3 questions for Tim

1. Spoken/printed line token: `1` vs `Spårvagn 1` vs `Linje 1`. Rec: **number + terminus** (`1 + Tynnered`). Pendeltåg has no passenger number on the city map — `Västtågen + Kungsbacka`.
2. Hub strings: lock **Brunnsparken** / **Göteborg Central**. Never `Centralstationen` as the tram hub.
3. Whether Ale chips should say **Ale** (legend) or **Älvängen resecentrum** (first halt). Rec: **Ale**.
4. Whether line 12 chips at Korsvägen always include Lindholmen / Mölndal even when a short turns earlier.
5. Whether v2 promotes stombuss / båt which already sit on this PDF.
