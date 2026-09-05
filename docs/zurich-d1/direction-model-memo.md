# Zürich direction model memo (§3 for Tim)

**This memo is necessarily provisional.** No station-by-station transcription of the VBZ tram
network was done for this pack — see hazard-pack.md header — so there are no sourced termini,
branch points, or short-turn stations to build worked §3 examples from (unlike Brussels/Copenhagen,
which had a fully transcribed station graph to reason from). This memo records the recommended
*model shape* and the open questions a follow-up transcription pass must answer before D5 assertion
tables can be written. Do not treat anything below as a settled §3 spec.

## Recommendation (shape only)

**Line + terminus**, matching the pattern used in every other city pack so far (Brussels, Malmö,
Oslo, Copenhagen's linear Metro lines): each VBZ tram line is a single printed number (2, 3, 4, 5,
6, 7, 8, 9, 10, 11, 13, 14, 15, 17) with (presumably) two printed termini, e.g. `2 + <terminus>`.
This is the default assumption for a numbered tram network with no evidence yet of a true ring
(unlike Copenhagen's M3) — but that assumption is **not verified** here. A follow-up pass must
confirm each line is genuinely linear (two termini) before this recommendation can be locked.

**Bellevue is the hub lock and must never be a direction token** — same rule as every hub in this
pipeline (Arts-Loi / Kunst-Wet in Brussels, Kongens Nytorv in Copenhagen). Do not emit "to
Bellevue" / "to City" / "to Zürich" as a direction chip.

## What is NOT known yet (all open questions — no guesses made)

1. **Per-line termini.** The oracle report names which lines call at Bellevule (2, 4, 5, 8, 9, 15)
   and at Zürich HB tram (3, 4, 6, 7, 10, 11, 13, 14, 17), but never states the far-end terminus
   station name for any line. Needs the official VBZ/ZVV map or Wikipedia's "Trams in Zurich" page,
   hand-transcribed.
2. **Whether any line is a loop/ring rather than linear.** Not checked. If one is (Zürich has no
   metro/ring service historically, but this must be confirmed, not assumed), it needs the
   Copenhagen-M3-style clockwise/counter-clockwise treatment instead of line+terminus.
3. **Branch points and shared trunks.** Not sourced. Brussels-style H4 doNotGroup branch tables
   (multiple lines forking at a named stop) cannot be built without the station-level map.
4. **Short turns.** Not checked at all — no confirmation either way of nested short-turn services
   (see hazard-pack.md H5). Zürich tram operations are known generally to run some peak-only
   short-workings on certain lines, but nothing specific is sourced for this pack; do not assume any
   named short-turn exists or doesn't.
5. **Bellevue's own line set is final-for-now, not independently re-verified.** The oracle report
   states lines 2, 4, 5, 8, 9, 15 call at Bellevule "as of 2026" without an official-map citation
   attached to that exact list in the report body. Re-confirm against the primary map when it is
   transcribed.
6. **Renovation-era instability.** Bahnhofquai (Zürich HB tram) construction Dec 2025–2026 may shift
   which lines call where during the transcription window. The chosen hub (Bellevue) was picked
   specifically to avoid building a direction model on top of a moving target — but if any of
   Bellevue's six lines are themselves rerouted during the renovation, that changes this memo too.
   Flag, don't guess, at transcription time.
7. **German-only naming vs Brussels-style bilingual pairing.** Zürich VBZ tram stop names are
   printed in German only (no FR/NL-style dual-language lock needed, unlike Brussels). Confirm this
   holds for all stop names once transcribed — no evidence of a second official language variant in
   the oracle report.

## doNotGroup carried into this memo (already locked, not open)

- **Bellevue (hub, tram-only)** vs **SBB Zürich HB** (out of mode scope, separate platforms/address)
  vs **Zürich HB tram** (rejected hub alternative, in scope as an ordinary tram stop once
  transcribed, still doNotGroup'd against SBB Zürich HB).
- **Stadelhofen** and **Wiedikon**: VBZ tram in scope, SBB out by mode cut. Same shape as the HB
  pair, smaller line count.

## Recommendation for the next pass

A follow-up Nico or Luke invocation with a working web-fetch tool should open the official
ZVV/VBZ tram map (or, as a checkable secondary source per the Copenhagen precedent, the "Trams in
Zurich" Wikipedia page and its per-line articles) and hand-transcribe: each line's ordered station
list, both termini, any branch/fork points, and any short-turn services — then this memo can be
replaced with worked §3 examples in the Brussels/Copenhagen style. Until then, D5 assertion tables
should not be written from this pack.

## Open §3 questions for Tim

1. Confirm **Bellevue** as the permanent hub lock even after the Bahnhofquai renovation completes,
   or should the pack be revisited to re-evaluate Zürich HB tram once construction lines 50/51 are
   gone and the post-renovation roster is stable?
2. Line token: printed map square/colour + number (e.g. "Tram 2") vs bare number "2"? No printed
   convention captured in this pass — needs the transcription pass.
3. Whether SBB S-Bahn should ever get its own city/board entry alongside VBZ tram in a later wave
   (out of scope for this v1 pack, but the oracle report flags S-Bahn/tram co-location at HB,
   Stadelhofen, and Wiedikon repeatedly enough that a future "Zürich rail" companion pack is
   plausible) — not decided here.
4. Whether the licence-confidence and Bearer-key/rate-limit hazards (hazard-pack.md) block starting
   the transcription pass itself, or only block the live-feed adapter build — recommend the former
   does not need to wait (transcription can proceed off the map/Wikipedia sources regardless of the
   GTFS-RT licence question), but confirm with Tim before spending effort on it.
