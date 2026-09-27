# Vienna direction model memo (§3 for Tim)

Single operator, single mode, five linear lines — the simplest direction-model case of any city
pack written so far. The one wrinkle worth Tim's attention is that the locked hub, **Karlsplatz**,
is a *through-station* for two lines and a *terminus* for the third, which is a different shape
from every prior city's hub lock (Brussels' Arts-Loi/Kunst-Wet and Copenhagen's Kongens Nytorv are
both pure through-crosses; no line terminates at either).

## 1. All five lines — line + terminus (no exceptions, no ring)

Every U-Bahn line is confirmed linear (hazard-pack.md H4) — recommend **line + terminus**,
matching the pattern already used in every other city pack (Oslo, Malmö, Brussels, Copenhagen's
M1/M2/M4):

- `U1 + Leopoldau` / `U1 + Oberlaa`
- `U2 + Seestadt` / `U2 + Karlsplatz`
- `U3 + Simmering` / `U3 + Ottakring`
- `U4 + Heiligenstadt` / `U4 + Hütteldorf`
- `U6 + Floridsdorf` / `U6 + Siebenhirten`

No ring topology exists (unlike Copenhagen's M3 Cityringen or Brussels' inner loop run by lines 2
and 6) — don't reuse either of those recipes here. No nested short-turn codes were found in any
line's D1 source (hazard-pack.md H5), so no Helsfyr-style overlay chip is needed at D1; that's an
open flag for Jim's D2 timetable pass, not a D1 direction-model decision.

## 2. Karlsplatz — the hub lock is also U2's own terminus

**U1 and U4 pass through Karlsplatz.** Their direction chips at Karlsplatz are the ordinary
line + far-terminus pair above (`U1 + Leopoldau`/`U1 + Oberlaa`, `U4 + Heiligenstadt`/
`U4 + Hütteldorf`).

**U2 terminates at Karlsplatz.** A U2 train *arriving* at Karlsplatz is ending its journey there
— there is no "U2 + Karlsplatz" outbound chip to render at Karlsplatz itself, because Karlsplatz
is the departure board's own station, not a destination from it. The only U2 direction chip that
exists at Karlsplatz is the one **leaving** towards Seestadt: `U2 + Seestadt`. Do not invent a
second U2 chip at Karlsplatz — unlike U1/U4, which each have two live directions there, U2 has
exactly one.

**Karlsplatz is never itself a direction token** — same rule as every prior hub lock (Brussels'
Arts-Loi/Kunst-Wet, Copenhagen's Kongens Nytorv). Never render "to Karlsplatz" / "to City" /
"to Zentrum" as a chip.

## 3. Two-line interchange stations — ordinary line + terminus, no special handling

The nine two-line interchange stations (hazard-pack.md H1/H6: Praterstern, Stephansplatz,
Volkstheater, Schottenring, Schwedenplatz, Landstraße, Westbahnhof, Längenfeldgasse, Spittelau)
are all **through-stations on both lines** — neither line terminates at any of them. Each simply
shows both lines' ordinary line + terminus chip pairs, e.g. at Westbahnhof: `U3 + Simmering`,
`U3 + Ottakring`, `U6 + Floridsdorf`, `U6 + Siebenhirten`. No doNotGroup collapse risk since
there's only one operator and one mode calling at any of them in v1 scope (S-Bahn/ÖBB/Badner Bahn
overlap at some of these stations is `out-product`, per the oracle report — never rendered).

## 4. No service-type / destination-only chips needed

Unlike Copenhagen's DSB Regional/InterCity/Öresundståg (no printed line code, direction is service
type + destination) or Brussels' premetro naming questions, Vienna's five U-Bahn lines each have a
single, stable, printed passenger-facing code (U1, U2, U3, U4, U6) with no unbranded/no-code
service to model. Line + terminus is sufficient everywhere in v1 scope.

## Open §3 questions for Tim

1. **U2's single-direction chip at Karlsplatz** (§2 above): confirm the "only one live direction,
   not two" framing is what the board should show, rather than defaulting to always rendering two
   direction rows per line at every hub-adjacent station. This is the one place Vienna's hub
   differs structurally from Brussels/Copenhagen's hub locks.
2. **Short-turn overlays**: no nested codes found at D1 (hazard-pack.md H5), but this was checked
   against Wikipedia's per-line prose, not GTFS trip patterns or the live OGD Monitor feed. If
   Jim's D2 pass finds peak-only/partial-route U-Bahn services, that's new information this pack
   didn't have — not something to guess at here.
3. **"Schedifkaplatz"** (hazard-pack.md H3): the oracle report names it as a U6 interchange with
   Badner Bahn, but no primary source pulled for this pack confirms the name. Doesn't affect the
   direction model either way (Badner Bahn is out-product regardless), but flagged in case it
   turns out to be a real station this pack should have included under a different printed name.

## Correction, 27 Sep 2026 (docs/jim-brief-vienna-u2-hub-bound-direction.md)

Section 2's framing above ("only one live direction, not two" at Karlsplatz, "Karlsplatz is not
a valid outbound destination from anywhere else in the network") answered Open §3 question 1
incorrectly for every station *other than* Karlsplatz itself. Mark's flip QA found `/api/board`
and `/api/directions` silently empty at Seestadt — U2's own printed terminus — despite six real
live departures there (docs/vienna-d1/mark-qa-note.md).

Corrected framing: the hub lock (never a *bare/generic* hub token as a direction — no "Karlsplatz"
standing in for "City"/"Zentrum") does not forbid a *line-qualified* hub-bound chip. Every U2 train
from Seestadt genuinely runs towards Karlsplatz, so Karlsplatz is U2's other real, live, printed
terminus, exactly as valid a direction token as Seestadt when written as "U2 + Karlsplatz" — the
same "line + terminus" shape used everywhere else in this pack, never a bare "Karlsplatz"/"City"/
"Zentrum" chip. Precedent for a line-qualified hub-bound chip: Adelaide/Melbourne's city-bound
chips are "<hub station> (<line> line)" (PRs #439/#441).

Karlsplatz itself is unaffected: it still only has one live U2 platform (`towards: "Seestadt"`,
RBL 4202), so it still only ever offers "U2 + Seestadt" — the self-terminus skip in
`marketingLabelsForStation` continues to guarantee no self-loop "U2 + Karlsplatz" chip there.
U1 and U4 are untouched; neither gains a Karlsplatz chip. See
`lib/cities/vienna/marketing-directions.js`'s file header for the code-level correction.
