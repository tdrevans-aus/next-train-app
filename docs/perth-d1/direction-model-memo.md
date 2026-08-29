# Perth direction model memo (§3 for Tim)

Context: **eight named lines**, mixed hub + through-run. Yanchep and Mandurah meet at Perth Underground / Elizabeth Quay (tunnel). Airport Line colour and Fremantle T-footnote through-run High Wycombe–Fremantle, with the Airport booklet stopping at Claremont. Armadale, Midland, Ellenbrook, Fremantle and TCL still use **Perth** (surface) as the city-side printed stop. Official pages are titled `{Line} Line` and tab **To {Suburb}** / **To Perth** (Yanchep/Mandurah: To Perth even though the listed inner stops are Perth Underground / Elizabeth Quay).

The live product already uses **line + far terminus** (example the brief cites: Mandurah Line + Mandurah) plus `shortTurnGroups` and `doNotGroup`. §3 should keep that model. Do **not** recommend inbound/outbound as the product model.

## Recommendation

**Line + terminus** (example: `Mandurah Line + Mandurah`).

Use the **actual trip terminus**, not the line’s marketing outer if the train is a printed short (H5). Use the locked inner strings only when the train is actually ending there (Airport P at Perth; TCL at Cockburn Central is an *outer* join, not an inner lock).

That matches the current live product, survives Perth Underground (where “inbound to the CBD” is already false), and splits Bayswater / Beckenham / Claremont / Cockburn Central.

Do not write D5 assertion tables until Tim locks this. Jim may later align `line-map.json` to this oracle; that is Jim, not this pack.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Mandurah Line + Mandurah; Airport Line + High Wycombe; Thornlie-Cockburn Line + Cockburn Central | Matches live product; splits H4 branches; survives tunnel through-run; matches map legend names | Must pick H5 shorts (Clarkson vs Yanchep; Claremont vs Fremantle; Cockburn Central vs Mandurah). Airport booklet says Claremont while the map + T-footnote say Fremantle. |
| **B. Terminus only** | Mandurah; High Wycombe; Byford | Matches destination blinds | At Perth, eight legal next suburbs with no line colour. At Bayswater, High Wycombe vs Ellenbrook vs Midland look like three random suburbs. |
| **C. Inbound/outbound vs CBD + terminus** | Inbound to Perth, then Outbound Mandurah | Familiar if you think 2010s Transperth | False on Yanchep–Mandurah through-running at Perth Underground. False at Bayswater (three “outbound” lines). Airport through-run is already through Perth toward Fremantle. Breaks H6. Official tabs say To Perth even on Yanchep/Mandurah, which do not list Perth (surface). |

Hybrid trap: “inbound until Perth, then terminus” still needs a hidden city-side rule and will fight Perth Underground vs Perth.

## §3 examples (illustrative — not D5)

Assume model A. Locked stop strings **Perth**, **Perth Underground**, **Elizabeth Quay**.

### Perth Underground / Elizabeth Quay (tunnel)

| train | label |
| --- | --- |
| Yanchep full | Yanchep Line + Yanchep |
| Yanchep K short | Yanchep Line + Clarkson |
| Yanchep W short | Yanchep Line + Whitfords |
| Mandurah full | Mandurah Line + Mandurah |
| Mandurah W short | Mandurah Line + Cockburn Central |

Inbound/outbound does not work here: a Mandurah train at Perth Underground is not “outbound from the CBD” if it came from Yanchep, and is not “inbound” if it is about to run south.

### Perth (surface)

| train | label |
| --- | --- |
| Fremantle full | Fremantle Line + Fremantle |
| Fremantle C short | Fremantle Line + Claremont |
| Airport through-run | Airport Line + High Wycombe (east) / Airport Line + Fremantle (west, map + T) |
| Airport P short | Airport Line + Perth |
| Midland | Midland Line + Midland |
| Ellenbrook | Ellenbrook Line + Ellenbrook |
| Armadale | Armadale Line + Byford |
| TCL | Thornlie-Cockburn Line + Cockburn Central |

### Bayswater (H4)

Ellenbrook Line + Ellenbrook vs Airport Line + High Wycombe vs Midland Line + Midland vs (westbound) Airport Line + Fremantle / Claremont / Perth. Terminus-only still works; inbound/outbound does not (three different “outbound” lines). doNotGroup High Wycombe vs Ellenbrook.

### Claremont (H4 + through-run)

Fremantle Line + Fremantle vs Fremantle Line + Claremont (C short) vs Airport Line + High Wycombe (T continuation / Airport booklet). Map draws Airport colour through to Fremantle, so a through Airport train west of Claremont is still **Airport Line + Fremantle**, not a Fremantle Line train — unless the booklet actually classified it as Fremantle (non-T).

### Cockburn Central (H4)

Mandurah Line + Mandurah vs Mandurah Line + Cockburn Central (W short) vs Thornlie-Cockburn Line + Perth (city-bound TCL) / Thornlie-Cockburn Line + Cockburn Central (arriving TCL). Do not label TCL as Mandurah Line + Mandurah.

### Beckenham (H4)

Armadale Line + Byford vs Thornlie-Cockburn Line + Cockburn Central vs (city-bound) Armadale Line + Perth / TCL + Perth.

### Byford vs Armadale

Official line token is **Armadale Line**; outer terminus is **Byford**. Rec: `Armadale Line + Byford`. Do not invent a separate Byford Line. Product `shortTurnGroups.Byford: [Byford, Armadale]` is a product grouping; the 13/10/2025 booklet does not print an Armadale-terminate code.

## Open §3 questions for Tim

1. Airport west-end token: **Fremantle** (map colour + Fremantle T-footnote + current live product) vs **Claremont** (Airport booklet cover). Rec: Fremantle for through-runs; Claremont only when the trip actually ends there (or when showing the Airport cover set).
2. Yanchep/Mandurah city-side string: covers list Elizabeth Quay / Perth Underground and still head the return pages “To Perth”. Rec: never emit Perth as a Yanchep/Mandurah stop.
3. TCL outer token: official **Cockburn Central** vs current live product **Mandurah**. Rec: Cockburn Central. Aligning line-map is Jim.
4. Spoken line token: map `Armadale Line` vs live `Armadale / Byford Line`; map `Thornlie-Cockburn Line` vs live en-dash. Rec: map/index hyphenated strings.
5. Whether Showgrounds / Perth Stadium event extras get their own overlay labels. Rec: keep them as stations on the parent line, not new lines.
