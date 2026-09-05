# Dublin direction model memo (§3 for Tim)

Context (06 Sep 2026): Dublin has **two colour-branded lines, no route numbers** — Red (two southwestern branches, Tallaght and Saggart, sharing one northeastern terminus The Point) and Green (one line, but with a **one-way city-centre loop** between Parnell and Trinity where the northbound and southbound tracks call at different stops). Inbound/outbound vs "City" is not the failure mode here the way it was at Brussels' Arts-Loi — Dublin's failure mode is **branch identity** (Red) and **direction-exclusive stops** (Green).

## Recommendation

**Line colour + printed terminus**, same shape as most of this pipeline's other cities (example: `Red + Tallaght`, `Red + Saggart`, `Green + Broombridge`, `Green + Brides Glen`). Do not print a bare "Red" or "Green" chip without the terminus — Red's two branches are only distinguishable by terminus, and there is no line number to fall back on.

Use the **far printed terminus** on trains leaving a node, same convention as Brussels. **Abbey Street** is the hub *stop string* (locked by the oracle report), never a direction token — do not emit "to Abbey Street" / "to City" / "to Centre".

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Colour + terminus** (recommend) | Red + Tallaght; Red + Saggart; Green + Broombridge; Green + Brides Glen | Only way to disambiguate Red's two branches; matches how Luas itself announces trams ("next tram to Tallaght") | None found |
| B. Colour only | Red; Green | Fails at Belgard/Kingswood/Red Cow — a rider there has no idea if the Red tram goes to Tallaght or Saggart | Breaks branch disambiguation entirely — reject |
| C. Terminus only | Tallaght; Saggart; Broombridge; Brides Glen | Matches destination blinds on the tram itself | Loses the colour grouping riders use to distinguish Red vs Green boards at shared-ish areas; still workable but recommend keeping colour prefix for consistency with other cities in this pipeline |

## Red Line branch handling

**Belgard is the fork.** North/east of Belgard (Belgard → Kingswood → Red Cow → … → The Point) is common to both branches and is not itself a direction-collapse hazard — any tram on this common trunk is labelled by its own far terminus (Tallaght or Saggart), same as any other line. **Do not** collapse the common trunk into a single "Red" chip that hides which branch a specific tram belongs to — the terminus string carries that information, so §3 boards on the common trunk must always show the tram's actual destination (Tallaght or Saggart), never a generic "Red Line" chip.

## Green Line loop — this is the one D5 needs a real answer on

**Between Parnell and Trinity, the official map shows a one-way loop with different stops per direction:**

- **Northbound (towards Broombridge):** … → Trinity → **O'Connell - GPO** → **O'Connell Upper** → Parnell → Dominick → …
- **Southbound (towards Brides Glen):** … Dominick → Parnell → **Marlborough** → Trinity → Westmoreland → …

This is **not** a branch (both directions still reach the same two termini, Broombridge and Brides Glen) and **not** inbound/outbound-vs-Centre collapse (there is no "Centre" node being falsely used as a direction token here). It is a genuine **direction-exclusive stop set**: a board at O'Connell - GPO or O'Connell Upper should only ever show **northbound (Broombridge-bound)** Green trams, because no southbound tram calls there. A board at Marlborough should only ever show **southbound (Brides Glen-bound)** Green trams. Trinity and Parnell see both directions (they're the two merge points).

**Recommendation for D5 assertion tables:** treat `O'Connell - GPO`, `O'Connell Upper`, and `Marlborough` as single-direction-only stops in the station model, not as ordinary through-stops with a "both directions" board. If the board-rendering code assumes every stop has both an inbound and an outbound service, **this will silently produce a phantom platform/direction that never runs** at these three stops — flagged as the sharpest hazard in this pack. Confirm with Tim before D5 whether the product's station model can represent a stop with only one valid direction; if not, this needs a design decision, not a guess from this pack.

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Abbey Street** (Red hub).

### Abbey Street (Red trunk only)

| train | label |
| --- | --- |
| Red towards Tallaght | Red + Tallaght |
| Red towards Saggart | Red + Saggart |
| Red towards The Point | Red + The Point |

No Green service calls at Abbey Street — a board here must never show a Green chip. Green interchange (Marlborough / O'Connell - GPO / O'Connell Upper) is a ~200 m walk, not a same-platform transfer.

### Belgard (Red fork)

Red + Tallaght vs Red + Saggart vs Red + The Point (eastbound common trunk). This is the node where the branch actually forks — boards here must distinguish the two southwest labels correctly.

### O'Connell - GPO / O'Connell Upper (Green, northbound-only)

Only ever: Green + Broombridge. **Never** show a Green + Brides Glen (or any southbound) chip here — that tram runs via Marlborough instead, not this stop.

### Marlborough (Green, southbound-only)

Only ever: Green + Brides Glen (or whichever far southern terminus/short-turn is actually in service). **Never** show Green + Broombridge here.

### Trinity / Parnell (Green, both directions — loop merge points)

Green + Broombridge vs Green + Brides Glen, both valid here — these two are the only stops in the loop bracket that behave like an ordinary two-direction stop.

## Open §3 questions for Tim

1. **Can the station model represent a stop with only one valid travel direction?** (O'Connell - GPO, O'Connell Upper, Marlborough). This is the single most important open question in this memo — flagged in `hazard-pack.md` H4a as well.
2. Spoken/printed line token: is it "Red Line" / "Red" / just the colour swatch? Rec: **{Red, Green} + official terminus**, matching this pipeline's existing convention.
3. Confirm Red's two branches should both be labelled "Red" (colour) rather than invented sub-names like "Red (Tallaght)" as a line id — rec: keep "Red" as the single line id, disambiguated by terminus only, since Luas itself has no printed sub-brand for the two branches.
4. Whether testers see dublin as its own city picker (yes — do not invent city=dub, city=ie, or merge into a national Irish feed).
5. Confirm the Parnell↔Trinity direction-exclusivity against a second source (live NTA GTFS-RT trip patterns, once keyed) before D5 locks it — this pack's evidence is the official static map only, one asset, hand-read.
6. Confirm the Connolly dogleg (H4, hazard pack) is an inline stop and not a short-turn spur — this pack assumes inline based on general knowledge of Luas operations, not confirmed against a second primary source.
