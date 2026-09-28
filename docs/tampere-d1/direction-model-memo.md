# Tampere direction model memo (§3 for Tim)

Context (28 Sep 2026): two lines, each with its own printed pair of termini, sharing a 4-stop
central trunk (Sammonaukio – Tulli – Rautatieasema – Koskipuisto). Official
`tampereenratikka.fi/en/tram-routes/` prints **"Line 1 Kaupin kampus/Tays-Keskustori-Pyhällönpuisto"**
and **"Line 3 Hervanta-Hakametsä-Sorin aukio"**. Live GTFS `trip_headsign` strings are shorter than
either printed terminus pair in two of four cases — see below, and see hazard-pack.md H5 for a
live-operations complication (through-running) that is flagged, not resolved, here.

## Recommendation

**Line + terminus, using the printed station name — not the shortened GTFS headsign** (example:
`1 + Pyhällönpuisto`, `1 + Kaupin kampus`, `3 + Sorin aukio`, `3 + Hervantajärvi`). Same convention
as every prior pack (Bergen, Oslo, Vienna, Helsinki). Locked hub-lock string is **Rautatieasema**
(hazard-pack.md H6), used only as the stop string, never synthesized as a direction chip — like
Bergen's Bergen busstasjon and unlike Oslo's Stortinget/R21 case, **no line terminates or
originates at Rautatieasema**, so no self-referential-hub flag is needed there.

## Why the printed station name, not the raw GTFS headsign

Live GTFS `trip_headsign` for these two lines uses exactly four strings across the whole feed:
`"TAYS"`, `"Lentävänniemi"` (route 1); `"Hervanta"`, `"Sorin aukio"` (route 3). Two of these are
**not** the actual terminus station name:

- Route 1's Kaupin-kampus-bound headsign is `"TAYS"` — the hospital stop one before the line's
  actual printed terminus, **Kaupin kampus**. TAYS and Kaupin kampus are both real, distinct,
  adjacent D1 stations (hazard-pack.md H1); the headsign undershoots the terminus by one stop.
- Route 3's Hervanta-bound headsign is `"Hervanta"` — an informal/short form, not any of the five
  actual Hervanta-corridor station names, and specifically not **Hervantajärvi**, the line's real
  printed terminus.

Using the raw headsign as the direction-chip destination would produce `1 + TAYS` (when the train
actually terminates one stop further, at Kaupin kampus) and `3 + Hervanta` (an ambiguous string
that isn't any of the five stations on that branch — hazard-pack.md H1 groups exactly this
ambiguity). **Recommendation: map headsign → printed terminus station name** (`TAYS` → display as
`Kaupin kampus`; `Hervanta` → display as `Hervantajärvi`) rather than displaying the headsign
verbatim, the same "don't trust the destination display blind" lesson as Helsinki's Matinkylä
overlay and Bergen's Sletten/NSR-name mismatch — except here the mismatch is baked into the feed's
own headsign field, not a second registry's naming.

## Why not other models

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + printed terminus** (recommend) | `1 + Pyhällönpuisto`; `1 + Kaupin kampus`; `3 + Sorin aukio`; `3 + Hervantajärvi` | Matches the official route page's own printed line descriptions; both lines' termini are real destinations riders recognise from the map and platform signage | Requires a small headsign→terminus map (`TAYS`→Kaupin kampus, `Hervanta`→Hervantajärvi) rather than passing GTFS headsign straight through — an extra lookup table Jim's adapter needs, flagged explicitly rather than silently added |
| **B. Line + raw GTFS headsign** | `1 + TAYS`; `1 + Lentävänniemi`; `3 + Hervanta`; `3 + Sorin aukio` | No lookup table needed; matches what may be printed on the physical vehicle destination sign (not independently confirmed this pass) | `TAYS` isn't the line's real terminus (Kaupin kampus is, one stop further); `Hervanta` is ambiguous against five similarly-named stations (hazard-pack.md H1); `Lentävänniemi` is also not always correct — see the through-running problem below |
| **C. Terminus only, no line number** | `Pyhällönpuisto`; `Kaupin kampus`; `Sorin aukio`; `Hervantajärvi` | Reads clean, no name clash across the two lines' four termini | Drops the line number, which is the rider-facing distinguishing mark on every vehicle and platform sign (both lines are visually branded by number/colour); no strong reason to drop it |

## The through-running problem (hazard-pack.md H5) — flagged, not modelled here

A non-trivial minority of live GTFS trips (roughly 2–9% depending on direction) tagged `route_id`
`"1"` or `"3"`, with headsign `"Lentävänniemi"` or `"Hervanta"` respectively, physically run the
**entire opposite corridor** rather than the printed route — e.g. a `route_id="1"`,
headsign=`"Lentävänniemi"` trip that starts at **Hervannan kampus** (a Line-3 station) and runs the
full Hervanta corridor plus the full Line-1-west corridor to Pyhällönpuisto, never touching Kaupin
kampus, TAYS, or Sorin aukio at all.

**This pack does not attempt a direction-chip rule for that minority.** Locking `line + printed
terminus` (model A above) works correctly for the large majority of trips that do run the printed
route. For the through-running minority, `1 + Pyhällönpuisto` would still be the *correct*
eventual destination (both the clean and the through-running Line-1-tagged trips that start
west end up at Pyhällönpuisto), but a `3`-tagged through-trip whose headsign says `"Hervanta"` and
which actually starts at Pyhällönpuisto and ends at Hervantajärvi would need `3 + Hervantajärvi`,
which model A already produces correctly if Jim's adapter reads the *actual* last stop of the live
trip rather than assuming a fixed printed-route stop sequence per line. **The open question for
Jim's D2 is implementation, not the chip model**: build direction chips from each trip's own
`stop_time_update`s / actual remaining stops, not from a hardcoded "Line 1 always visits these 20
stops in this order" assumption — the same general engineering practice good live-departures
adapters already need, but flagged here explicitly because Tampere is the first pack in this
pipeline where the printed line model and the live operational pattern provably diverge for a
measurable minority of trips.

## §3 examples (illustrative — not D5)

### Rautatieasema (hub lock; both lines, plain through-station on both)

| train | label |
| --- | --- |
| 1 towards Pyhällönpuisto | 1 + Pyhällönpuisto |
| 1 towards Kaupin kampus | 1 + Kaupin kampus |
| 3 towards Sorin aukio | 3 + Sorin aukio |
| 3 towards Hervantajärvi | 3 + Hervantajärvi |

No self-referential-hub case exists here — Rautatieasema is never itself a printed terminus for
either line (same shape as Bergen busstasjon, contrast Oslo's Vy R21/Jernbanetorget case).

### Sammonaukio / Tulli / Koskipuisto (shared trunk, not the lock)

Same four chips as Rautatieasema — these are the other three stops in the shared trunk
(hazard-pack.md H4), plain through-stations on both lines.

### Keskustori (Line 1 only — not shared, not the lock)

| train | label |
| --- | --- |
| 1 towards Pyhällönpuisto | 1 + Pyhällönpuisto |
| 1 towards Kaupin kampus | 1 + Kaupin kampus |

Only Line 1's two chips ever appear here — Line 3 does not call at Keskustori at all
(hazard-pack.md H2/H6). Do not synthesize a `3 +` chip here.

### Kaupin kampus (Line 1's own terminus; Line 3 does not call here)

| train | label |
| --- | --- |
| 1 towards Pyhällönpuisto | 1 + Pyhällönpuisto |

Only one direction exists (true terminus). `1 + Kaupin kampus` is never synthesized here
(self-referential). The GTFS headsign at this end is `"TAYS"`, one stop short of the actual
terminus — display `Kaupin kampus`, not `TAYS` (see above).

### Sorin aukio (Line 3's own terminus; Line 1 does not call here)

| train | label |
| --- | --- |
| 3 towards Hervantajärvi | 3 + Hervantajärvi |

Same shape as Kaupin kampus above, mirrored for Line 3. The GTFS headsign at the Hervanta end is
the informal `"Hervanta"` — display `Hervantajärvi`, the actual printed terminus, not the bare
district name (ambiguous against the other four Hervanta-corridor stations, hazard-pack.md H1).

## Open §3 questions for Tim

1. **Headsign-to-terminus mapping** (`TAYS`→Kaupin kampus, `Hervanta`→Hervantajärvi): confirm this
   pack's recommendation to map to the printed terminus rather than pass the raw GTFS headsign
   through, given the headsign strings are shorter/ambiguous versions of the real termini.
2. **Through-running minority** (hazard-pack.md H5): confirm the recommendation that Jim's D2
   adapter build direction chips from each live trip's own actual remaining stops rather than a
   fixed per-line stop sequence, so the ~2–9% of trips that cross between corridors still get a
   correct destination chip. This pack does not propose a third line-like code for these trips —
   they're still either "line 1" or "line 3" by GTFS tag, just with an unusual path.
3. Spoken/printed line token: `1`/`3` vs `Ratikka 1`/`Linja 1`. Rec: **{1,3} + official printed
   terminus**, matching every prior pack's convention.
