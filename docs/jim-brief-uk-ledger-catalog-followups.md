# Jim brief — catalog follow-ups from the UK ledger stop-ownership decisions

**Dispatched:** 5 Sep 2026 (Tim's call) · **Lane:** `united-kingdom`, region label
`ledger-catalog-followups`, stage `adapter` · **Spec:** `docs/united-kingdom-ledger.md` §2
(stop-ownership table) and open item 2.

## Why

On 5 Sep 2026 Tim decided the home region for every contested boundary station. Three
catalogs still disagree with the ledger. This brief makes them agree. Copy this file into the
repo as `docs/jim-brief-uk-ledger-catalog-followups.md` and commit it with the change.

## Item 1 — Tamworth into West Midlands (the only real addition)

`lib/cities/uk-west-midlands/stations.json` has 109 stops (74 rail + 35 Metro) and no Tamworth.
Ledger row: Tamworth, CRS **TAM**, home West Midlands (Birmingham commuter station, West
Midlands Railway Cross-City line, plus the West Coast Main Line low-level platforms).

- Add one `mode: "train"` stop in the same shape as the existing entries (name, crs, borough,
  aliases, lat, lng). Use `borough: "Tamworth"`. Coordinates: look them up from the same source
  the file's `source` field names; do not leave them null — every other West Midlands stop has
  real lat/lng and the nearby-station picker depends on them.
- Confirm the CRS live: `node scripts/probe-uk-board.mjs TAM` (or however that script takes a
  CRS — read its header) must return a real board. If it does not, stop and report; do not guess.
- Direction model: Tamworth is a two-level station — high-level (Cross-City: Birmingham New
  Street ↔ Lichfield Trent Valley / Nuneaton) and low-level (WCML: London Euston ↔ Crewe /
  Manchester / Liverpool). Probe the live board and record the destination+operator chip set
  in your handoff. Check `lib/cities/uk-west-midlands/direction-hubs.json` and its README-style
  notes: if every Birmingham-bound Cross-City train prints "Birmingham New Street" as the
  destination, the existing hub-anchoring may apply; if the live chips show an operator split
  (WMR vs Avanti/LNWR on "Birmingham New Street"), add a hub-anchoring entry in the same style
  as Kidderminster's. Do not invent chips you did not see live.
- Update `qa/uk-west-midlands-dogfood-gate.mjs`: railCount 74 → 75, stopCount 109 → 110,
  dogfood stations 109 → 110 (lines ~110, 112, 150). Add TAM to whatever CRS sweep the gate runs.
- Update the `notes` prose in `lib/providers/registry.js` for `uk-west-midlands` ONLY where it
  states the station count ("75 National Rail + 35 Metro" is already the historical figure there
  — check whether it says 74 or 75 and make it truthful: 75 after this change). Change no other
  registry entry and no `status` field.

## Item 2 — West of England: record ownership on three existing entries

`lib/cities/west-of-england/stations.json` already catalogs Gloucester (GCR), Westbury (WSB) and
Taunton (TAU) as flat entries with `class: "through-running only, boundary to … — not a merge
point"`. They are already pickable; the `class` field is prose and gates nothing. Change only the
`class` text on those three to record that West of England is the home region per the ledger,
e.g. `"regional — home region West of England per docs/united-kingdom-ledger.md (5 Sep 2026); also
a boundary toward <other region>, not a merge point"`. Leave Chepstow's entry exactly as it is
(ruled South Wales's, through-running-only in West of England). Do not touch
`direction-hubs.json`: its note says "Do NOT add hubs at Gloucester, Chepstow or Taunton" and the
ledger decision does not change that. Run `node qa/west-of-england-dogfood-gate.mjs` — it must
pass unchanged.

## Item 3 — South Yorkshire drops Denby Dale

`lib/cities/south-yorkshire/stations.json` carries a Denby Dale entry with `crs: null`. Ledger:
Denby Dale is West Yorkshire's (DBD). Remove the entry. Update the file's top-of-file prose that
lists "Denby Dale, Darton, South Elmsall, Moorthorpe" so it no longer names Denby Dale, and the
matching sentence in the `lib/providers/south-yorkshire.js` header comment. Update
`qa/south-yorkshire-planned-gate.mjs` (Denby Dale appears in its expected-station list, line
~91). South Yorkshire stays `planned`; no flip.

## Item 4 — ledger bookkeeping

In `docs/united-kingdom-ledger.md`: mark open item 2 done ("Catalog follow-ups … — done PR
#<n>"), and append one Propagation-log row naming the three catalog changes. Do not touch any
`docs/<region>-d1/` pack.

## Verification (report the output)

- `node qa/uk-west-midlands-dogfood-gate.mjs`, `node qa/west-of-england-dogfood-gate.mjs`,
  `node qa/south-yorkshire-planned-gate.mjs`, `node qa/west-yorkshire-dogfood-gate.mjs` (Denby
  Dale's real home; must be unchanged) all pass.
- `node qa/run-all.mjs --smoke` green. If any browser-automation script hangs, say which and do
  not report smoke as green.

## Guardrails

- `node qa/lane-lock.mjs check united-kingdom` first (top level confirmed it free at dispatch);
  `node qa/lane-lock.mjs acquire united-kingdom ledger-catalog-followups adapter` before editing.
- Own worktree, branch from `origin/master` after PR #236 has merged (it edits the same ledger
  section you will edit — `git fetch` and confirm `git log origin/master --oneline -1` mentions
  #236 or later before branching).
- No `status` changes, no `uk-darwin.js` changes, no new hubs at West of England.
- One PR titled "UK ledger catalog follow-ups: Tamworth (WM), WoE ownership, SY drops Denby
  Dale", with the verification output and the release command
  (`node qa/lane-lock.mjs release united-kingdom ledger-catalog-followups`) in the body.
