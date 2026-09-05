# Fukuoka direction model memo (§3 for Tim)

Context **today (6 Sep 2026)**: Fukuoka City Subway is a simpler graph than Osaka's — three lines, one genuine two-line hub (**Hakata**, K11 x N18), and one hazard the Osaka precedent didn't have: **JR Chikuhi through-running** on the Kuko line at Meinohama, which is a board-eligibility `in` but a v1 line-graph terminus, not a node to extend the graph through.

## Hakata is not symmetric between its two lines

Unlike Osaka's Hommachi (three lines all running through), Hakata is:

- A **through-station** on Kuko (K11, between Gion K10 and Higashi-Hie K12) — Kuko continues past Hakata in both directions (west to Meinohama, east to Fukuoka Airport).
- A **terminus** on Nanakuma (N18, the east end since the 27 March 2023 Hakata extension) — Nanakuma does not continue past Hakata.

So "Hakata" as a direction *target* only makes sense for Nanakuma trains terminating there. As a direction *origin*, Kuko trains passing through Hakata need line + onward official terminus (Meinohama or Fukuoka Airport), not "to Hakata."

## Recommendation

**Line + official terminus** (example: `Kuko + Fukuoka Airport`, `Nanakuma + Hakata`, `Hakozaki + Kaizuka`). Same model as Osaka's H4/direction memo.

Use the **official EN terminus** on trains leaving a node. Use **Hakata** as a hub stop string always; as a direction token it is valid **only** for Nanakuma trains (which genuinely terminate there) — never invent "to Hakata" for Kuko trains, which are passing through toward Meinohama or Fukuoka Airport.

Do not write D5 assertion tables that invent a live board. There is no official public feed (no GTFS, no GTFS-RT). City stays planned.

The pack prompt's chips are **line + official terminus**, not compass N/S/E/W, not "to City," not inbound/outbound. D1 locks sheet strings: **Meinohama**, **Fukuoka Airport**, **Kaizuka**, **Hashimoto**, **Hakata**. **JR Hakata** is not a chip (separate facility). Chikuhi stations west of Meinohama (Chikuzen-Maebaru, Karatsu, Nishi-Karatsu, etc.) are **not chips** — they are outside v1 scope entirely, not merely non-preferred labels.

**There is no through-line chip past Meinohama.** JR Chikuhi through-running is a board-eligibility fact at the Meinohama (K01) platform, not a direction extension of the Kuko line graph.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Kuko + Fukuoka Airport; Nanakuma + Hakata | Matches official route-information titles and destination framing; correctly distinguishes Hakata-as-terminus (Nanakuma) from Hakata-as-through-stop (Kuko) | Must not collapse JR Chikuhi's western terminus (Karatsu / Nishi-Karatsu) into a Kuko chip — Kuko's own official terminus is Meinohama, full stop |
| **B. Terminus only** | Fukuoka Airport; Hakata | Matches some destination blinds | At Hakata, collapses to a bare station name with no line context — ambiguous which line a Nanakuma-terminating vs Kuko-passing-through train is |
| **C. Inbound/outbound vs Hakata + terminus** | To Hakata / To Meinohama | Reads like a hub-and-spoke city | False for Kuko (through-station, not an endpoint) — only true for Nanakuma. Mixing a valid-for-one-line, invalid-for-another model is worse than Osaka's uniform false case at Hommachi |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Hakata**. Official EN termini.

### Hakata (Kuko through + Nanakuma terminus)

| train | label |
| --- | --- |
| Kuko west (toward Meinohama) | Kuko + Meinohama |
| Kuko east (toward Fukuoka Airport) | Kuko + Fukuoka Airport |
| Nanakuma (arriving/departing, terminus) | Nanakuma + Hakata |

JR Hakata (mainline / Shinkansen) is a **different facility** — never a direction target for the metro board. doNotGroup.

### Nakasu-Kawabata (Kuko x Hakozaki, not the hub)

Kuko + Meinohama / Fukuoka Airport, Hakozaki + Kaizuka. Not "to Hakata" — Nakasu-Kawabata is its own interchange, one stop short of Hakata on the Kuko line.

### Meinohama (Kuko west terminus, JR Chikuhi hinge)

Kuko + Fukuoka Airport is the only v1 chip in this direction. JR Chikuhi through-trains continuing west to Karatsu are a board-eligibility fact at this platform, not a Kuko direction chip — do not print "Kuko + Karatsu."

### Tenjin / Tenjin-Minami (not a hub, doNotGroup)

Tenjin (K08, Kuko only): Kuko + Meinohama / Fukuoka Airport. Tenjin-Minami (N16, Nanakuma only): Nanakuma + Hashimoto / Hakata. These are two different stations linked by an underground concourse (Tenjin Chikagai) — never merge their direction chips.

## Open §3 questions for Tim

1. Spoken/printed line token: official EN `Kuko` vs `Kuko Line` vs `Airport Line` vs code `K`. Rec: **{Kuko, Hakozaki, Nanakuma} + official EN terminus**, matching the official rider site's own line names.
2. Hub direction asymmetry at Hakata: confirm the app's direction model can express "valid direction chip for one line, not for the other, at the same stop" — Hakata is the first Japan-lane city where this matters (Osaka's Hommachi was uniform-through on all three lines).
3. Whether testers see fukuoka as its own city picker entry (yes — do not bury under a Japan / Kyushu / Osaka / Tokyo city).
4. Whether the community GitHub GTFS (kuwayamamasayuki/GTFS-FukuokaCitySubway) should ever be evaluated as an unofficial fallback source for a later D2+ pass — not decided here; this pack does not use it and flags it only as a known non-source.
5. Whether a future unpublished live path (rider-site schedule pages) would even be licensable — do not interpret as allowed. D1 stays planned.
