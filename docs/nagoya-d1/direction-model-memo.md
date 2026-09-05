# Nagoya direction model memo (§3 for Tim)

Six lines, one operator (Nagoya City Transportation Bureau), no feed to check any of this against
(hazard-pack.md H0). Four lines are ordinary linear lines with two termini; the fifth (Meijo) is a
true loop with no linear terminus; the sixth (Meiko) is a branch off the loop with real
through-running trains crossing the M/E boundary. **Do not collapse all six into one direction
recipe** — that is the mistake this memo exists to prevent, same framing as Copenhagen's
three-operator memo, just within a single operator here.

## 1. Higashiyama (H), Tsurumai (T), Sakura-dori (S) — line + official terminus

Ordinary linear lines. Recommend **line letter + official EN terminus**, matching the pattern used
in every other city pack (Oslo, Malmö, Osaka):

- `H + Takabata` / `H + Fujigaoka`
- `T + Kami Otai` / `T + Akaike`
- `S + Taiko-dori` / `S + Nonami`

**Tsurumai's both termini are Meitetsu through-running hinges** (Kami Otai → Meitetsu Inuyama Line;
Akaike → Meitetsu Toyota Line / Meitetsu Mikawa Line) — same "mutual operation" pattern as Osaka's
Esaka/Tenjimbashisuji-6-chome/Nagata. **v1 direction chips stop at the Metro terminus string** —
never `T + Inuyama` or `T + Toyota`, which are Meitetsu destinations beyond the printed D1 terminus.

## 2. Kamiiida (K) — line + terminus, but the northern terminus is itself a through-running hinge

- `K + Kamiiida` (K01, northern terminus — **Meitetsu Komaki Line through-run begins here**, out of
  v1) / `K + Heian-dori` (K02, southern terminus, interchange with Meijo M11).

Only two stations on this line. Same "stop at the Metro terminus string" rule as Tsurumai: never
`K + Komaki` or `K + Inuyama`, which are Meitetsu destinations beyond K01.

## 3. Meijō (M) — true loop, clockwise/anticlockwise, no fake terminus pair

**This is the hardest case in this pack, worked in full, per the task brief's explicit instruction
to handle it as a loop (cf. Copenhagen M3, `docs/copenhagen-d1/direction-model-memo.md` §1).**

The oracle report's roster describes the loop's own numbering direction explicitly: "M01 Kanayama
(start/end point) → M02–M27 → M28 Nishi Takakura (final station before loop closes back to M01)...
Loop runs anticlockwise (when viewed on standard map orientation)." Two things follow:

1. **There is no linear terminus pair for Meijo.** Unlike Higashiyama/Tsurumai/Sakura-dori/Kamiiida,
   there is no "Meijo + X" / "Meijo + Y" the way a straight line has two ends — the loop closes on
   itself at Kanayama. **Do not invent a fake terminus chip** (e.g. "Meijo + Kanayama") the way a
   linear line would get one — same warning the Copenhagen memo gives against inventing a fake M3
   terminus.
2. **Direction is clockwise / anticlockwise**, matching the official passenger convention printed
   on Nagoya Metro maps and platform signage for a loop line (the Japanese railway-industry
   convention for loop lines is 右回り "migi-mawari" = clockwise / 左回り "hidari-mawari" =
   anticlockwise; the oracle report's roster uses the English "anticlockwise" for the ascending
   M01→M28 numbering direction, which I take as consistent with this convention — **not
   independently confirmed against the rider site's own platform signage**, since no such official
   page was found (H0); flag for Tim/Nico to confirm the exact printed EN wording before D5).

Recommend chips:

- `M + Clockwise` (descending code direction, M28→...→M01 i.e. towards Kanayama the short way) /
  `M + Anticlockwise` (ascending code direction, M01→M02→...→M28, matching the roster's own
  numbering order)

**Kanayama (M01) is where the loop and the Meiko branch meet — this is not a linear branch fork the
way Osaka's Esaka/Tenjimbashisuji-6-chome hinges are.** See §4.

## 4. Meikō (E) — branch off the loop, line + terminus, but flag the through-running hazard

Meiko is a short 7-station branch (E01 Kanayama → E07 Nagoyakō) that shares its junction station
with the Meijo loop. Recommend the same **line + terminus** convention as the linear lines:

- `E + Kanayama` (towards the loop junction) / `E + Nagoyakō` (towards the southern terminus)

**Do not treat E as fully independent of M.** The roster's own line note states: "Roughly every
other anticlockwise Meijo loop train diverts here rather than continuing to Nagoya Daigaku;
integrated service." Read literally, this means a physical train signed `M + Anticlockwise`
approaching Kanayama from the Nishi Takakura direction can become an `E`-branded service beyond
Kanayama rather than continuing around the loop toward M02 Higashi Betsuin. **This pack does not
model that through-running behaviour** — it only flags it as a hazard, same as the Tsurumai↔Meitetsu
and Kamiiida↔Meitetsu through-running hazards in hazard-pack.md H0/H4. Whoever builds D2 needs to
decide, with real timetable/trip data (which does not exist as a public feed today — H0), whether
a single physical trip is represented as one row that changes its line/direction chip partway, or
as two logically separate legs. **Not decided here — this is exactly the kind of station-graph/
direction-collapse mistake the task brief warns about, and guessing at it without a feed would be
worse than leaving it open.**

## §3 examples (illustrative — not D5)

Assume the models above. Locked hub stop string **Sakae** (H10 × M05 only).

### Sakae (Higashiyama + Meijo)

| train | label |
| --- | --- |
| Higashiyama west | `H + Takabata` |
| Higashiyama east | `H + Fujigaoka` |
| Meijo (ascending/numbering direction) | `M + Anticlockwise` |
| Meijo (descending direction) | `M + Clockwise` |

Hisaya-odori (M06 × S05, underground-connected) is a **separate physical station**, not folded into
the Sakae board. Sakaemachi (Meitetsu Seto Line) is out of v1 entirely.

### Kanayama (Meijo loop anchor + Meiko branch origin; H4)

| train | label |
| --- | --- |
| Meijo continuing around the loop | `M + Anticlockwise` or `M + Clockwise` per direction |
| Meiko branch outbound | `E + Nagoyakō` |
| Meiko branch inbound (towards the loop) | `E + Kanayama` — **only meaningful east of Kanayama**; at Kanayama itself this is the arrival label, not a further chip |

JR Tokaido/Chuo and Meitetsu Nagoya Line at Kanayama are out of v1 (doNotGroup, hazard-pack.md H1).

### Heian-dori (Meijo loop + Kamiiida Line origin; H4)

| train | label |
| --- | --- |
| Meijo loop | `M + Anticlockwise` / `M + Clockwise` |
| Kamiiida Line | `K + Kamiiida` / `K + Heian-dori` (arrival label at this end) |

## Open §3 questions for Tim

1. **Meijo's clockwise/anticlockwise chip wording**: English "Clockwise"/"Anticlockwise" (this
   memo's default, matching the loop-topology convention already set by Copenhagen's M3 memo) vs
   the printed Japanese platform convention 右回り/左回り romanised as "Migi-mawari"/"Hidari-mawari"?
   No official EN rider-site page was found to check this against (H0) — flag, not decided.
2. **Meijo/Meiko through-running representation at D2+**: single trip row that changes its
   line/direction label partway through, vs two logically separate legs joined at Kanayama? This
   needs real trip-level data that does not exist as a public feed today (hazard-pack.md H0, H4) —
   not something to guess at in a D1 pack.
3. **Kamiiida Line K01/K02 numbering** and **Meiko branch E00/E01 numbering**: both have an internal
   conflict between the oracle report's own prose sections and its Station roster table
   (hazard-pack.md H1a). `published-network.json` uses the roster table's values (K01=Kamiiida,
   K02=Heian-dori; E01=Kanayama) but this has not been checked against the rider site directly —
   flag for Nico to confirm before D5.
4. **Unique station count**: oracle report's summary claims 87; this pack's mechanical union of the
   roster tables (after merging the one spelling variant found) yields 83 (hazard-pack.md H1b). Not
   forced to match — flag for Nico to reconcile against the official Nagoya City Transportation
   Bureau count.
