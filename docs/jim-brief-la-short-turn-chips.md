# Jim brief — Los Angeles: short-turn destinations get their own chips (flip blocker)

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. Acquire the lane lock:
the controller checked on 25 Oct 2026 and it was free. **Date:** 25 Oct 2026. **tim-review:** no.
This follows the established Dublin precedent: every real terminus is a named chip ("Red + Saggart",
"Green + Parnell"), never a bare line, never a hidden destination.
**Input:** Mark's FAIL note on #529 (https://github.com/tdrevans-aus/next-train-app/pull/529#issuecomment-6392282256).

## Symptom (live probe, 24 Oct ~19:05 PDT, through the dogfood module)

- **The board** at Union Station has 4 `D Line + Wilshire/Western` rows. 7th St/Metro Ctr and
  Wilshire/Vermont are similar.
- **The direction chips** at those stations offer only `D Line + Wilshire/La Cienega` for D westbound.
  **Picking it returns 0 trains, with no `emptyReason`.** Until 1 Nov every westbound D trip ends at
  Wilshire/Western. After that, the static data still has 394 trips ending at Western against 294 at
  La Cienega.
- **The same pattern** applies to A→Monrovia, A→APU/Citrus College and C→Aviation/Century.
- **Cause:** `marketingLabelsForStation` (`lib/cities/los-angeles/marketing-directions.js:248`) offers
  only primary-terminus chips, and `tripMatchesMarketingChip` (:273) is an exact string match.
- **Why the gates missed it:** the sweep and the dogfood gate check boards, not the chip path.

## Fix

1. **Short-turn termini are chips** wherever they're served from that station. Derive per-station chip
   sets from the static trips that call there, as the shared directions path does: one chip per real
   terminus, using the existing `LINE_TERMINI` and `LINE_SHORT_TURN_TERMINI` (#525). At Union Station,
   D westbound therefore offers both `D Line + Wilshire/Western` and `D Line + Wilshire/La Cienega`.
   Keep the hub lock, and never offer a self or terminating-here chip.
2. **Every board row is reachable through some chip**, and every chip either returns trips or carries an
   honest per-direction `emptyReason`:
   - `not-currently-served` when that direction has no scheduled service today (e.g.
     D + Wilshire/La Cienega before 1 Nov);
   - `no-live-predictions` when it's scheduled but has no live rows.
   
   Follow Dublin's per-direction empty state (#500). Mark saw the zero-result chip come back with **no**
   `emptyReason`. Fix that path in the dogfood module.
3. `public/city-directions/los-angeles.json`: regenerate it
   (`node scripts/write-city-directions.mjs --only=los-angeles`).
4. No new rider copy, and no changes to the shared GTFS builder.

## QA

- Extend `qa/los-angeles-dogfood-gate.mjs`, offline with fixtures and the static zip as the gate already
  uses:
  - **For every LA station, every destination that appears in the board's static candidates maps to an
    offered chip** (the reachability assertion Mark asked for);
  - Union Station offers `D Line + Wilshire/Western`;
  - a chip with no scheduled service today returns `not-currently-served`;
  - no bare, self or hub chips.
- Mutation check on each assertion.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground).
- **Live probe if LA service hours** (05:00–24:00 PDT): Union Station, 7th St/Metro Ctr, Wilshire/Vermont
  and one A station near Monrovia. Every chip either returns live trips or carries an `emptyReason`.
  `SWIFTLY_API_KEY` is in the main checkout's `.env.local`. Never print it, and stay under 180 requests
  per 15 min.

LA stays `planned`. Open a PR that links this brief and leave no background loops running.
