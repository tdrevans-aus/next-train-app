# Jim brief: Direction hub anchoring — West Midlands (Kidderminster → "Birmingham")

**For:** Jim
**From:** Tim (product), scoped by Fable 4 Sep 2026
**Backlog:** `FB-50` (this brief), `FB-51` (other UK regions, after this is accepted), `FB-52` (other countries)
**Design background:** `docs/direction-hub-anchoring-issue.md` — read it first; this brief is the chosen option (A) from that doc.
**Scope:** `uk-west-midlands` only. Do not touch East Midlands, West of England, Liverpool City Region or any other Darwin region — those are `FB-51` and wait for Tim to review and accept this one.

---

## Problem (one paragraph)

From Kidderminster the direction picker shows **Worcester**, **Dorridge**, **Whitlocks End** and
**Stratford-upon-Avon**, because `directionChip()` prints whatever Darwin prints as the trip's final
destination. A rider on this corridor thinks "up to Birmingham, down to Worcester" and has never
heard of Dorridge or Whitlocks End. Birmingham never appears as a chip because it is a through
station, not a terminus. Separately, at fan-out hubs the next-train call fetches 15 undirected rows
and filters client-side, so one direction can show 0–1 trains even though Darwin has more.

## The Darwin fact this fix rests on

Darwin's `filterCrs` + `filterType: "to"` returns services that **call at** the filter station, not
only services that terminate there. So `GetDepartureBoard/KID?filterCrs=BSH&filterType=to` returns
every Dorridge, Whitlocks End and Stratford-upon-Avon service in one server-side call, and
excludes anything that terminates short of Birmingham. `fetchRegionalDepartureBoard()` in
`lib/providers/uk-darwin.js:441` already wraps this and is currently unused. Confirm the behaviour
with the probe before building anything:

```bash
node scripts/probe-uk-board.mjs "Kidderminster" --region=uk-west-midlands
```

and a raw filtered call (add a `--filter-crs=` flag to the probe if it doesn't have one — that is a
`scripts/` change, not a provider change).

---

## Design

### 1. Hub config — new file `lib/cities/uk-west-midlands/direction-hubs.json`

Region-local, curated, reviewed by Tim — same posture as Perth's `shortTurnGroups` in
`lib/cities/perth/line-map.json`. Proposed v1 content (Jim verifies names/CRS against live boards
and `stations.json`; Tim approves the final table in the PR):

```json
{
  "region": "uk-west-midlands",
  "notes": [
    "A hub chip means 'every train that calls at filterCrs', fetched server-side via Darwin filterCrs/filterType=to.",
    "absorbs = printed destinations that disappear from the picker because the hub chip covers them.",
    "A printed destination NOT in absorbs keeps its own chip AND its trains also appear under the hub chip.",
    "Hub chips carry no operator suffix — several operators may call at the hub."
  ],
  "hubs": [
    {
      "label": "Birmingham",
      "filterCrs": "BSH",
      "filterName": "Birmingham Snow Hill",
      "appliesFrom": ["KID"],
      "absorbs": [
        "Dorridge",
        "Whitlocks End",
        "Stratford-upon-Avon",
        "Birmingham Snow Hill",
        "Birmingham Moor Street"
      ],
      "reason": "Snow Hill line through-runs past Birmingham onto the Shakespeare Line; riders anchor on Birmingham. BSH not BMO because a Snow Hill-terminating train never calls at Moor Street."
    }
  ]
}
```

- `appliesFrom` is a list of station CRS codes. v1 is **Kidderminster only**. If probing shows the
  same chip set at other in-catalog stations west of Birmingham on this corridor (Hagley, Blakedown,
  Stourbridge Junction, Rowley Regis, etc.), list them in the PR as a proposal — do not add them
  unreviewed.
- **London Marylebone (Chiltern Railways)** services also call at Snow Hill. Do **not** put it in
  `absorbs`: it stays as its own chip, and its trains also show under Birmingham. Note this in the PR
  so Tim can confirm.
- Validate the file at load time: every `filterCrs` and `appliesFrom` entry must resolve in the
  region catalog; `absorbs` entries are printed destination strings (no operator suffix).

### 2. Directions listing — `getUkWestMidlandsDogfoodDirections()`

`lib/cities/uk-west-midlands/dogfood-next-train.js:170`. After deriving chips from the undirected
board as today, post-process with a pure function, e.g. `applyDirectionHubs(chips, entry.crs, hubs)`:

- If the station is in a hub's `appliesFrom`, **always** add the hub label as a chip (declared by
  config, not inferred from the 15 rows — otherwise the chip flickers when the sample happens to
  contain no Birmingham-bound train).
- Remove any chip whose destination part (before ` (Operator)`) is in that hub's `absorbs`.
- Leave every other chip alone. Keep the existing `localeCompare` sort.

Put the pure function in its own module (`lib/cities/uk-west-midlands/direction-hubs.js`) so the QA
gate can test it without a Darwin token.

### 3. Next-train — `getUkWestMidlandsDogfoodNextTrain()`

`lib/cities/uk-west-midlands/dogfood-next-train.js:190`. Branch on the chosen `destination`:

| Chosen destination | Fetch | Filter |
|---|---|---|
| Matches a hub `label` for this station | `fetchRegionalDepartureBoard(station, hub.filterCrs, { regionId, numRows: 15 })` | none — Darwin already filtered |
| Exact chip whose destination resolves to a CRS in the region catalog | `fetchRegionalDepartureBoard(station, destCrs, { regionId, numRows: 15 })` then keep trips whose `directionChip(trip) === destination` (operator match) | server-side + client operator check |
| Anything else (e.g. out-of-region "London Euston") | current undirected path, unchanged | client-side as today |

- Metro mode is untouched — hubs are rail-only; `mode === "metro"` never consults the hub file.
- Remap each returned trip's `destination` to the chosen chip as today, but **keep the printed
  destination**: add `printedDestination` to the trip before `buildNextTrainResponse()` and carry
  it through `buildTripPayload()` in `lib/train-times-core.js` (additive field, nothing else
  changes). For hub chips this is how the row shows "Birmingham · to Stratford-upon-Avon"; for
  exact chips it equals `destination` and can be omitted from the render.
- Row render: show `printedDestination` as a secondary label on each board row when it differs
  from the chosen direction. Find the row renderer in `public/` (the working tree currently has
  **uncommitted, unrelated edits to `public/city-session.js`** — branch from master and do not
  clobber them). If the render turns out to be more than a small change, ship the API field and
  file the render as a follow-up in the PR rather than expanding this brief.

### 4. Provider file — expect no change

`fetchRegionalDepartureBoard()` already exists with `numRows` and `regionId` options. West Midlands
registers no `excludeOperators`/`includeOperators`, so its lack of operator filtering is not a
problem here. If you find you genuinely need to edit `lib/providers/uk-darwin.js`, **stop**: the UK
lane is currently locked by `liverpool-city-region (adapter)` (`node qa/lane-lock.mjs status`).
Region-local files under `lib/cities/uk-west-midlands/`, `qa/`, `scripts/` and `public/` are fine.

---

## Guardrails

- Never fabricate departures; a Darwin error on the filtered call surfaces exactly as it does on the
  undirected one.
- Board-eligibility rule still applies: hub anchoring hides no *train*. Every train the rider can
  board toward Birmingham is on the hub board; every train to an un-absorbed destination keeps its
  own chip. Record in the PR that no service is excluded.
- Do not generalise into a shared UK helper yet. One region, then review, then `FB-51`.
- Do not flip `status: "live"`.

---

## QA

Extend `qa/uk-west-midlands-dogfood-gate.mjs` (token-tolerant, like the rest of that file):

1. `direction-hubs.json` loads and validates: `BSH` and `KID` resolve in the catalog; `absorbs`
   strings carry no operator suffix.
2. `applyDirectionHubs()` with a fixture chip set
   `["Dorridge (West Midlands Railway)", "Whitlocks End (West Midlands Railway)", "Stratford-upon-Avon (West Midlands Railway)", "Worcester Foregate Street (West Midlands Railway)", "London Marylebone (Chiltern Railways)"]`
   at `KID` returns exactly `["Birmingham", "London Marylebone (Chiltern Railways)", "Worcester Foregate Street (West Midlands Railway)"]`.
3. The same fixture at `BHM` (not in `appliesFrom`) is returned unchanged.
4. Next-train with `destination: "Birmingham"` at Kidderminster calls the filtered fetch (stub
   `fetchRegionalDepartureBoard` or assert via a fixture) and returns trips with
   `printedDestination` populated and `destination === "Birmingham"`.
5. Next-train with an unresolvable exact chip falls back to the undirected path.

Then `node qa/run-all.mjs --smoke`.

**Live check (input to Tim's review, needs `DARWIN_LDB_TOKEN`):** in the PR description, paste a
before/after table of Kidderminster chips from the probe, and a Birmingham-filtered board sample
with each row's printed destination, so Tim can approve the `absorbs` list and the Marylebone
decision. This is the product-review gate `docs/direction-collapse-heuristic.md` step 5 requires
for v8 groups; hub anchoring gets at least the same.

---

## Out of scope (noticed while scoping, not for this PR)

- `Birmingham Snow Hill` in `stations.json:96` has `lat: 51.6455…`, which is ~90 km south of the
  station. Looks like a typo; flag it, fix separately.
- Other Darwin regions (`FB-51`), other countries (`FB-52`), per-rider destination choice in My
  Journeys (option B in the design doc).
