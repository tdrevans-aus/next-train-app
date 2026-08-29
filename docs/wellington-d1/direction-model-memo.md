# Wellington direction model memo (§3)

Context **today (29 Aug 2026)**: five Metlink train codes **KPL / HVL / MEL / JVL / WRL**. All call at **Wellington Station** (MEL/HVL also share Ngauranga–Petone). Direction is **line + terminus**, not compass, not inbound/outbound vs CBD.

Printed termini (live):

| line | termini |
| --- | --- |
| Kāpiti Line (KPL) | Waikanae Station – Wellington Station |
| Hutt Valley Line (HVL) | Upper Hutt Station – Wellington Station |
| Melling Line (MEL) | Western Hutt Station – Wellington Station |
| Johnsonville Line (JVL) | Johnsonville Station – Wellington Station |
| Wairarapa Line (WRL) | Masterton Station – Wellington Station |

Melling Station is **not** a live terminus while closed (~late 2028).

## Recommendation

**Line + terminus** (example: `Kāpiti Line + Waikanae Station`, `Melling Line + Western Hutt Station`).

Use the opposite printed terminus on each line that serves the station. At a terminus, omit that end.

Do not label inbound/outbound. Do not use compass. Do not collapse HVL and WRL both as “Upper Hutt” without the line token.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Kāpiti Line + Waikanae Station | Matches map codes; splits HVL vs WRL at Petone/Upper Hutt | Longer chips at Wellington Station |
| **B. Terminus only** | Waikanae Station | Shorter | Loses line identity when corridors share stops |
| **C. Inbound/outbound vs CBD** | To Wellington / from Wellington | Hub is Wellington Station | False at the hub itself; WRL express patterns |

## §3 examples (illustrative)

Assume model A. Locked hub **Wellington Station**.

### Wellington Station (all five)

| train | label |
| --- | --- |
| KPL | Kāpiti Line + Waikanae Station |
| HVL | Hutt Valley Line + Upper Hutt Station |
| MEL | Melling Line + Western Hutt Station |
| JVL | Johnsonville Line + Johnsonville Station |
| WRL | Wairarapa Line + Masterton Station |

### Petone (HVL / MEL / WRL)

Hutt Valley Line + Upper Hutt Station / + Wellington Station. Melling Line + Western Hutt Station / + Wellington Station. Wairarapa Line + Masterton Station / + Wellington Station.

### Western Hutt Station (MEL terminus)

Melling Line + Wellington Station. Do not emit Melling Station while closed.
