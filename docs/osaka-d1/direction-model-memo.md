# Osaka direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: **through trunk**, not a single hub-and-spoke. Official Osaka Metro routes list and 2025-04-04 路線図 talk **Midosuji Esaka–Nakamozu**, **Yotsubashi Nishi-Umeda–Suminoekoen**, **Chuo Yumeshima–Nagata**, not “to City” / “to Osaka” / “to Downtown”.

Inbound/outbound vs City already dies at **Hommachi** (three lines through), **Umeda** (Midosuji through plus the Umeda name-family), **Namba** (three subway lines plus private rail), **Shinsaibashi** (Midosuji × Nagahori; Yotsubashi is a different station), and **Sakaisuji-Hommachi** (not the hub).

## Recommendation

**Line + official terminus** (example: `Midosuji + Nakamozu`, or `Chuo + Yumeshima`).

Use the **official EN terminus** on trains leaving a node. Use **Hommachi** only as the hub *stop string*, never as a direction token (“to City” / “to Osaka” / “to Downtown”). At Hommachi the useful pair is line + suburban end.

Do not write D5 assertion tables that invent a live board. There is no official public feed. City stays planned.

The pack prompt’s chips are **line + official terminus**, not compass N/S/E/W, not “to City”, not inbound/outbound. D1 locks sheet strings: **Esaka**, **Nakamozu**, **Dainichi**, **Yao-minami**, **Nishi-Umeda**, **Suminoekoen**, **Yumeshima**, **Nagata**, **Nodahanshin**, **Minami-Tatsumi**, **Tenjimbashisuji 6-chome**, **Tengachaya**, **Taisho**, **Kadoma-minami**, **Itakano**, **Imazato**. **Senri-Chuo / Minoh-Kayano** are not chips. **Downtown** is not a chip.

**There is no New Tram in v1.** No P-code chip.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Midosuji + Nakamozu; Chuo + Yumeshima | Matches official routes-list titles and destination blinds; splits H4 at Hommachi / Umeda / Namba | Must not collapse Kitakyu / Hankyu / Kintetsu through-run ends into chips |
| **B. Terminus only** | Nakamozu; Yumeshima | Matches some blinds | At Hommachi three lines collapse to suburb names with no family |
| **C. Inbound/outbound vs City + terminus** | To City / To Nakamozu | Close to English “centre” | False at Hommachi (through-trunk). “City” / “Downtown” is not the hub lock |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Hommachi**. Official EN termini.

### Hommachi (Midosuji + Yotsubashi + Chuo)

| train | label |
| --- | --- |
| Midosuji north | Midosuji + Esaka |
| Midosuji south | Midosuji + Nakamozu |
| Yotsubashi north | Yotsubashi + Nishi-Umeda |
| Yotsubashi south | Yotsubashi + Suminoekoen |
| Chuo west | Chuo + Yumeshima |
| Chuo east | Chuo + Nagata |

Umeda / Namba private rail is **out of this city**. Inbound/outbound does not work (every line both ways is not “to City”). “To Downtown” is false as a metro direction.

### Umeda (H4; Midosuji only at this string)

Midosuji + Esaka vs Midosuji + Nakamozu. **Higashi-Umeda / Nishi-Umeda / Hankyu / Hanshin / JR Osaka are different stations.** doNotGroup.

### Namba (H4)

Midosuji + Esaka / Nakamozu, Yotsubashi + Nishi-Umeda / Suminoekoen, Sennichimae + Nodahanshin / Minami-Tatsumi. Not “to City”.

### Esaka (Kitakyu hinge)

Midosuji + Nakamozu only as a v1 chip. Senri-Chuo / Momoyamadai / Minoh-Kayano are not chips.

## Open §3 questions for Tim

1. Spoken/printed line token: official EN `Midosuji` vs `Midosuji Line` vs code `M`. Rec: **{Midosuji, Tanimachi, Yotsubashi, Chuo, Sennichimae, Sakaisuji, Nagahori Tsurumi-ryokuchi, Imazatosuji} + official EN terminus**.
2. Hub far-end string: never “City” / “Osaka” / “Downtown”. Lock **Hommachi** as the stop; directions always the official suburban terminus.
3. Whether testers see osaka as its own city picker (yes — do not bury under a Japan / Keihanshin / Tokyo city).
4. Whether a later unpublished 列車走行位置 page would even be licensable — do not interpret as allowed. D1 stays planned.
