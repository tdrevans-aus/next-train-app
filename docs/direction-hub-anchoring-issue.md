# Direction naming: rider's hub vs. printed terminus

**Status:** Scoped 4 Sep 2026 — option A chosen (curated hub + Darwin calling-point filter). Jim brief: `docs/jim-brief-uk-west-midlands-hub-anchoring.md` (West Midlands only; other UK regions `FB-51`, other countries `FB-52`).
**Raised by:** Tim, 4 Sep 2026, discussing Kidderminster.
**For:** Fable, to weigh solution options.

## Problem statement

Direction chips (and the direction picker built from them) show whatever a live board prints
as the trip's final destination. That's accurate to reality — it's literally what the departure
board says — but it isn't always what a regular rider mentally anchors their journey to. When a
line through-runs past the hub a rider actually cares about and continues to a farther terminus,
the chip names a station the rider may never have heard of, instead of the hub they recognize.

This is different from a bug: the board is telling the truth about where the train is going. The
gap is between "the train's actual destination" and "the landmark a habitual rider uses to think
about their own trip."

## Worked example: Kidderminster

Kidderminster (`KID`) is a National Rail station in the pre-live `uk-west-midlands` region
(`lib/cities/uk-west-midlands/stations.json:721`, oracle report at
`docs/uk-west-midlands-d1/oracle-clash-report.md`). Its only real corridor (the Severn Valley
Railway heritage line sharing its platform is excluded from the board entirely — verdict
`out-mode`, oracle report line 67) runs Worcester ↔ Kidderminster ↔ Birmingham, then continues
past Birmingham (Snow Hill/Moor Street) onto the Shakespeare Line towards Stratford-upon-Avon.

Tim's mental model of this line, as a rider who knows it well: "one line, up to Birmingham and
down to Worcester." He did not know where Dorridge or Whitlocks End are.

The app currently shows four directions from Kidderminster, matching exactly what Darwin's live
board prints, because `directionChip()` does no grouping at all:

```js
// lib/cities/uk-west-midlands/dogfood-next-train.js:109-116
function directionChip(trip) {
  const destination = String(trip?.destination ?? "").trim();
  const operator = String(trip?.operator ?? "").trim();
  if (!destination) return null;
  return operator ? `${destination} (${operator})` : destination;
}
```

- **Worcester** — southbound, matches Tim's model directly.
- **Dorridge** — a service that short-turns just past Birmingham.
- **Whitlocks End** — a service short-turning slightly farther out.
- **Stratford** (Stratford-upon-Avon) — services running the full route through to the end.

"Birmingham" never appears as a chip, because Birmingham is a through-station on this route, not
a terminus — it's exactly the station Tim anchors on, and exactly the one the board never prints.

This is not a bug against the current code: `directionChip()` is doing precisely what its
neighboring UK regions do (identical implementation in
`lib/cities/east-midlands/dogfood-next-train.js:58-65`, and the same pattern in
`liverpool-city-region` and `west-of-england` — confirmed by grep, no UK region does any
collapsing). The gap is a genuine, unaddressed product question, not a defect.

## Worked example: Perth (Edgewater → Perth)

Tim drew a second example from his own commute: he catches the train from Edgewater to Perth,
not "Edgewater to Mandurah" — Mandurah being, in his framing, the line's true terminus.

Worth noting before Fable digs in: Perth's *current* shipped data model already treats this
correctly for this specific pair. `lib/cities/perth/line-map.json` models the Yanchep line
(which serves Edgewater) and the Mandurah line as two **separate** lines, each independently
terminating at "Perth" (lines 46–84) — they are not modeled as one continuous corridor. So this
example is best read as an **illustration of the general shape of the problem** (a through-service
continuing past the hub a rider cares about, to a terminus they don't), not as a live bug report
against Perth's shipped groups.

## Why the existing v8 heuristic doesn't solve this

Perth already has a shipped, city-agnostic mechanism for a *related* problem — but it solves it
in the opposite direction from what Tim is describing.

`docs/direction-collapse-heuristic.md` (v8, code in `lib/direction-collapse-heuristic.js`,
tracked as `FB-07` / Done in `docs/feature-backlog.md`) collapses **nested short-turns up to the
farthest terminus** on a corridor:

| ID | Rule | Action |
|----|------|--------|
| R1 | Nested short-turns on an ordered corridor | Farthest terminus is canonical; nearer terminals are members |
| R2 | Two termini co-list at ≥3 non-junction stations | Propose merge under outer/canonical |
| R3 | Either terminus is a known branch name | Do not auto-merge |
| R4 | Pair only co-occurs at a branched junction | Reject / undo merge |

Shipped Perth groups (all canonicalizing to the corridor's outer end): **Yanchep** ← Whitfords,
Clarkson, Butler; **Mandurah** ← Cockburn; **Fremantle** ← Claremont
(`docs/jim-brief-mandurah-cockburn-direction.md`, `docs/jim-brief-yanchep-whitfords-direction.md`).

R1's whole point is that the *farthest* terminus wins — it optimizes for "don't let a rider miss
a train that's going where they're going, just not quite all the way." What Tim is describing is
close to the opposite: collapsing a *longer* through-service **down** to a meaningful
**intermediate, non-terminal** hub (Birmingham, Perth) that isn't the corridor's terminus at all.

Naively extending v8 to Kidderminster would do the wrong thing: it would canonicalize Dorridge /
Whitlocks End / Stratford-upon-Avon all under **Stratford-upon-Avon** (the farthest terminus) —
correctly merging the three into one direction, but anchored on a station even less familiar to
Tim than the ones he already didn't recognize, not on Birmingham. This is a different axis, not
a strict extension of v8's ruleset — the two problems should not be conflated into one heuristic
without deliberate design.

## Open questions for Fable

- **How is a "meaningful hub" identified?** Manually curated per city/corridor (extending
  Perth's `line-map.json` pattern with an explicit hub field), inferred from interchange/transfer
  density, or some other signal? Unlike v8's ruleset (purely topological — nesting and
  co-occurrence), "meaningful to a rider" is inherently subjective and city-specific.
- **Does collapsing to a hub hide information a rider needs?** A rider who boards expecting
  "Birmingham" needs to know if their specific train actually terminates *before* reaching it
  (e.g. at a station short of the hub) — collapsing must not silently swallow that distinction.
  v8 already respects this for short-turns; a hub-anchoring rule would need an equivalent
  guarantee in the other direction.
- **Is this a city-wide label or a per-rider preference?** Tim's own habitual hub (Birmingham,
  Perth) is personal to how he uses the line. A different rider on the same corridor might
  reasonably anchor on a different landmark. That could mean this belongs in journey
  personalization rather than the shared direction-picker layer — worth deciding explicitly
  rather than defaulting to "one label for everyone."
- **Relationship to hub-lock / `doNotGroup`:** research confirms these are an unrelated existing
  mechanism (same-name-station disambiguation at a hub — e.g. Nottingham Station rail vs. metro,
  or Birmingham New Street vs. West Midlands Metro's "Grand Central" catalog entry — not
  destination collapsing). Flagging so this isn't conflated with the new problem.
- **Manual product review, same as v8?** `direction-collapse-heuristic.md` step 5 requires
  product review of every proposed group before shipping. A hub-anchoring rule, being more
  subjective, likely needs at least the same review gate — possibly a stricter one.

## Related diagnosis: sparse results per direction at busy hubs (added 4 Sep 2026)

Separate from the naming question above, but surfaced in the same conversation: picking Birmingham
New Street plus any one direction can return as little as **1 train**. Fine for Near Me / My
Routes (which show whatever's coming in any direction), a killer for My Journeys (which needs a
dependable feed for one specific direction).

**Root cause — confirmed, not yet fixed.** Every UK Darwin-backed region's next-train call fetches
an *undirected* board and filters client-side, rather than asking Darwin to filter server-side:

1. `getUkWestMidlandsDogfoodNextTrain()` (and the identical pattern in every other Darwin region,
   e.g. `getEastMidlandsDogfoodNextTrain()`) calls `fetchBoardForMode()` →
   `fetchStationBoard()`, which hits Darwin's `GetDepartureBoard` with **`numRows: 15` and no
   destination filter** (`lib/providers/uk-darwin.js:418`).
2. Only after that fixed, undirected batch of 15 comes back does the app filter client-side to
   trips whose `directionChip()` exactly matches the chosen direction
   (`lib/cities/uk-west-midlands/dogfood-next-train.js:203`:
   `board.trips.filter((trip) => directionChip(trip) === destination)`).

At a small branch station this is invisible — most of the 15 raw rows go the same one or two
ways. At a big fan-out hub like **Birmingham New Street** (many platforms, many operators, dozens
of destinations), the 15 undirected rows are spread thin across all of them, so filtering to one
specific direction can leave 0–1 matches even though Darwin has plenty more trains toward that
destination further out — they just never made it into the first unfiltered batch of 15.

**The fix already half-exists, unused.** `fetchRegionalDepartureBoard()`
(`lib/providers/uk-darwin.js:441-468`) is a fully-built function that asks Darwin **server-side**
for departures filtered to one destination CRS, using Darwin's own native `filterCrs` +
`filterType: "to"` support — exactly what's needed here. Grepping the codebase confirms **no city
adapter calls it**; every region imports and uses only the generic undirected `fetchStationBoard()`.

**Scope:** this is not specific to pre-live Kidderminster/`uk-west-midlands` — the same
undirected-fetch-then-client-filter pattern is used by every Darwin-backed region's
`dogfood-next-train.js`/provider (confirmed in `east-midlands`, which is already live). Any live
region with a busy multi-platform hub is potentially affected, not just this one.

**Not yet scoped as a fix** — wiring `fetchRegionalDepartureBoard()` into next-train calls would
need each region to resolve its destination chip string back to a CRS code (the catalog already
has these) before querying, across every Darwin-backed region's dogfood module. Left here as
diagnosis only.

## Pointers

- `docs/direction-collapse-heuristic.md` — the existing v8 heuristic and process.
- `lib/direction-collapse-heuristic.js` — its implementation.
- `lib/cities/perth/line-map.json` — Perth's shipped line/hub data.
- `docs/jim-brief-mandurah-cockburn-direction.md`, `docs/jim-brief-yanchep-whitfords-direction.md`
  — the briefs that shipped v8's groups.
- `lib/cities/uk-west-midlands/dogfood-next-train.js` — Kidderminster's `directionChip()`.
- `docs/uk-west-midlands-d1/oracle-clash-report.md` — Kidderminster/Severn Valley Railway context.
- `docs/feature-backlog.md` — `FB-07` (v8, Done) and `FB-50` (this issue, Backlog).
