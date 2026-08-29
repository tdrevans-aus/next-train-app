# Oslo direction model memo (§3 for Tim)

Context **today (29 Aug 2026)**: five T-bane lines (1, 2, 3, 4, 5), all converging through the
city-centre **Common Tunnel (Fellestunnelen)**, running Majorstuen – Nationaltheatret –
**Stortinget** – Jernbanetorget – Grønland – Tøyen. This is a 5-of-5 shared trunk, not a 2- or
3-line partial overlap like the reference cities seen so far (Rotterdam's Beurs is 5-of-5 too, but
Rotterdam's oracle report also hand-transcribed all five lines' full termini and branch points —
Oslo's did not; see the blocker below).

There is no city loop. All five lines run through Stortinget in both directions; none terminate
there.

## Recommendation

**Line + terminus** (example: `Line 1 + <west terminus>`, `Line 3 + <east terminus>`) — same
model as Auckland, Canberra, and Rotterdam. This is the right target model for Oslo: five lines
sharing a trunk is exactly the case where "line + terminus" beats compass or inbound/outbound
labels, because a compass or "inbound/outbound vs Stortinget" label is ambiguous the instant two
lines diverge on the same side of the tunnel (e.g. two lines both leaving Majorstuen westbound
toward different unconfirmed termini).

**This recommendation cannot be turned into a D5 assertion table yet.** The oracle report gives:

- the Common Tunnel's ordered stop list (confirmed, six stations, shared by all five lines), and
- three isolated facts — Skøyen served by lines 1 & 2, Frogner served by line 3, Blindern is a
  Line 6 (not-live) branch station —

but **no terminus name for any of lines 1–5**, and no ordered station sequence west of Majorstuen
or east of Tøyen. Line + terminus needs the terminus string on both ends of every line; without
that, any §3 example below is a placeholder, not a locked label.

**Do not fill this from GTFS, from a route generator, or from general/background knowledge of the
Oslo T-bane system.** The oracle report is explicit that D1 is hand-transcribed from the Ruter
linjekart and timetables, not generated from GTFS — inventing termini from another source here
would be exactly the "guess at a station graph" failure mode this pipeline is designed to avoid,
and would produce direction labels that look locked but aren't sourced.

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend, target) | Line 1 + Frognerseteren *(placeholder — terminus not confirmed)* | Matches the pattern used by every reference city with >1 line through a shared hub; correct even after Line 6 opens | **Blocked**: no confirmed termini for lines 1–5 in the oracle report |
| B. Terminus only | e.g. destination blind text alone | Shorter chip | Same blocker as A (no termini), and fails once two lines share a terminus area, same as Rotterdam's C-vs-D note at De Akkers |
| C. Inbound/outbound vs Stortinget | To Stortinget / Away from Stortinget | Cheap; no terminus data needed | Explicitly wrong per every other reference memo (Canberra H6, Rotterdam H6) — false the instant two lines diverge on the same side; Stortinget is a through-hub for all five lines, not an end, so "inbound/outbound" collapses two different real directions into one label at every non-Stortinget station |
| D. Tunnel-end anchor (interim only, not recommended as final) | Line 3 — towards Majorstuen / Line 3 — towards Tøyen | Usable **today** from confirmed data only (the six Common Tunnel stations are the one fully-ordered, fully-sourced segment in the report) | Only correct *inside* the tunnel; wrong the moment a line continues past Majorstuen or Tøyen toward its real terminus, so it cannot be the shipped model — flagged here only as what's buildable without new sourcing |

## §3 examples (illustrative only — not D5, blocked on missing termini)

Assume model A once termini are known. Locked hub **Stortinget**, all five lines.

### Stortinget (hub, all five lines)

| train | label (target, once termini confirmed) |
| --- | --- |
| Line 1 | Line 1 + `<west terminus>` / Line 1 + `<east terminus>` |
| Line 2 | Line 2 + `<west terminus>` / Line 2 + `<east terminus>` |
| Line 3 | Line 3 + `<west terminus>` / Line 3 + `<east terminus>` |
| Line 4 | Line 4 + `<west terminus>` / Line 4 + `<east terminus>` |
| Line 5 | Line 5 + `<west terminus>` / Line 5 + `<east terminus>` |

Every `<...terminus>` placeholder above is an open question, not a value Jim should fill in from
elsewhere — it must come back from a hand-transcribed Ruter linjekart pass.

### Tøyen (secondary transfer hub, not the lock)

Same model, same blocker. Report is explicit this is an interchange node, not a fragment point —
do not split Tøyen's label set by line the way a terminus station would be split.

### Common Tunnel interior (Nationaltheatret, Jernbanetorget, Grønland)

All five lines pass through; same blocker applies. Note Jernbanetorget additionally needs the
H1 doNotGroup applied (metro label only — never merge in Oslo S / Vy-NSB rail departures) on top
of the direction-collapse logic.

### Fallback if Tim needs something shippable before Nico's follow-up

Use model D (tunnel-end anchor: "towards Majorstuen" / "towards Tøyen") **only** for the six
Common Tunnel stations, and mark it explicitly as interim in code/config so it's easy to find and
replace once real termini land — do not let an interim compass-like label quietly become the
permanent one.

## Open §3 questions for Tim / Nico

1. **Termini for lines 1–5** (both ends, all five lines) — not in the oracle report. Required
   before any D5 assertion table can be written. This is the single biggest blocker in this pack.
2. **Ordered station sequence** west of Majorstuen and east of Tøyen for each line, including
   where Skøyen (1, 2) and Frogner (3) actually sit in that sequence.
3. **Line naming convention**: report only ever refers to "line 1" / "lines 1–5" as passenger
   codes (no line names given, unlike Rotterdam's "Metro A" style). Confirm whether Ruter prints a
   name alongside the number before Jim builds display strings.
4. Whether the Common-Tunnel-only interim label (model D above) is acceptable to ship ahead of a
   full termini pass, or whether Tim would rather hold the whole city until Nico supplies the rest.
