# Newcastle direction model memo (§3 for Tim)

Context **today (27 Aug 2026)**: **single line**. NLR runs **Newcastle Interchange – Newcastle Beach**. Official page talks “from Newcastle Interchange in Wickham to Newcastle Beach”. Timetable heads are those two ends. There is no branch and no city loop.

Civic is **not** the hub (it is stop C). The hub is **Newcastle Interchange**.

Inbound/outbound vs the beach works on this one line and still loses the line token if a future Broadmeadow extension appears.

## Recommendation

**Line + terminus** (example: `NLR + Newcastle Beach`, or `Newcastle Light Rail + Newcastle Interchange`).

Use **Newcastle Beach** on services leaving the Interchange. Use **Newcastle Interchange** (not Wickham, not Civic, not Newcastle Station) on services arriving at the rail hub.

Do not write D5 assertion tables until Tim locks this.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | NLR + Newcastle Beach; NLR + Newcastle Interchange | Matches map; splits Interchange trains vs NLR; survives a future western extension | Official timetable adds suburbs (Wickham / Newcastle) |
| **B. Terminus only** | Newcastle Beach; Newcastle Interchange | Matches destination blinds | At the Interchange a Hunter train is also “not the beach” — need the line token |
| **C. Inbound/outbound vs beach + terminus** | To Beach / To Interchange | Close to the geography | “Beach” is the lock (Newcastle Beach), not a generic inbound. Civic is mid-line |

## §3 examples (illustrative — not D5)

Assume model A. Locked hub string **Newcastle Interchange**. Locked beach **Newcastle Beach**.

### Newcastle Interchange (hub)

| train | label |
| --- | --- |
| NLR | Newcastle Light Rail + Newcastle Beach |

Hunter / NSW TrainLink at the same parent are **out of this city**.

### Civic

Newcastle Light Rail + Newcastle Beach vs Newcastle Light Rail + Newcastle Interchange.

### Newcastle Beach

NLR + Newcastle Interchange.

### After a future Broadmeadow extension (preview only — not D1)

Only if a new official NLR map shows it **in service**. Then add a western terminus token. That is a **new D1**.

## Open §3 questions for Tim

1. Spoken/printed line token: `NLR` (timetable / GTFS) vs `Newcastle Light Rail` (map/page). Rec: **NLR / Newcastle Light Rail + terminus**.
2. Hub string: map `Newcastle Interchange` vs timetable `Newcastle Interchange, Wickham` vs GTFS `Newcastle Interchange Light Rail`.
3. Whether testers see newcastle as its own city picker (yes — do not bury under Sydney).
