# Jim brief — Rail Delivery Group attribution on every Darwin-backed board

**Dispatched:** 5 Sep 2026 (Tim's call) · **Lane:** `united-kingdom`, region label `rdg-attribution`,
stage `adapter` · **Priority:** ahead of the registry sweep — this is a licence condition on five
regions that are already live.

## Why

The signed Rail Data Marketplace Data Sharing Agreement for Live Departure Board (recorded in
`docs/united-kingdom-ledger.md` §1, "Licensing — RESOLVED") permits redistribution but requires,
under clause 3.3.1 and Schedule 1 §8, that **Rail Delivery Group** is credited as the data source
whenever the data is published, "in any reasonable manner" that does not suggest RDG endorses the
app. Clause 3.3.2 asks that onward distribution carries an appropriate accuracy notice. Today the
app credits TfL and TransLink only; every Darwin region shows nothing.

## What to build

1. In `public/city-session.js`, `feedAttributionForCity(cityId)` currently special-cases
   `vancouver` and `uk-london-tfl`. Add a Darwin case that returns
   `{ text: RDG_LDB_LINE, required: true }` for **every** city whose provider is the shared
   `lib/providers/uk-darwin.js` — live or planned, so future flips inherit it with no per-region
   edit. Do not hardcode the region list in city-session.js if a Darwin/National-Rail marker is
   already derivable from the city list that file builds (check how `MULTI_CITY_IDS` and the
   country/city table at the top of the file are sourced; if the registry's `provider` or
   `agency` reaches the front end, key on that). If nothing suitable reaches the browser, add the
   smallest possible marker (e.g. a `feed: "darwin"` field on the UK region rows in that table)
   rather than a second list to keep in sync. `uk-london-tfl` keeps its TfL line — it is not
   Darwin. A region that mixes Darwin with a second feed (West Midlands Metro, Merseyrail via
   Darwin is fine, Metrolink, NET, Supertram) still shows the RDG line; do not attempt
   per-secondary-feed attribution in this brief.
2. Wording, exact: `Live departure data © Rail Delivery Group, via the Rail Data Marketplace.
   Times may change — check station displays.` Export it as a named constant next to
   `TFL_OPEN_DATA_LINE`. No RDG logo, no "official", no "partner" — nothing implying endorsement.
3. `required: true` so it renders with the existing `is-required` prominence used for Vancouver.
   Reuse that path; add no new CSS.
4. Add `qa/uk-rdg-attribution.mjs` modelled on `qa/vancouver-attribution.mjs`: asserts the exact
   string is present, that it is gated to Darwin cities, that `uk-london-tfl` still returns the
   TfL line, and that at least one live Darwin region (`west-of-england`) and one planned one
   (`london-se-national-rail`) resolve to the RDG line via `feedAttributionForCity`. Register it
   wherever `vancouver-attribution.mjs` is registered for `--smoke`.
5. Ledger: append one row to the Propagation log in `docs/united-kingdom-ledger.md` ("RDG
   attribution wired on all Darwin boards, PR #<n>") and mark open item 1 done. Do not touch any
   `docs/<region>-d1/` pack.

## Verification (report the output)

- `node qa/uk-rdg-attribution.mjs`, `node qa/vancouver-attribution.mjs` pass.
- `node qa/west-of-england-dogfood-gate.mjs` passes unchanged.
- `node qa/run-all.mjs --smoke` green — if the sandbox's browser-automation scripts hang as
  they did on the cache PR, say so and list exactly which scripts timed out; do not report smoke
  as green if it did not complete.

## Guardrails

- Run `node qa/lane-lock.mjs check united-kingdom` first and **stop and report** if any other
  region holds it (a West Midlands Jim run held it at 01:55 UTC on 5 Sep). Acquire with
  `node qa/lane-lock.mjs acquire united-kingdom rdg-attribution adapter` before editing.
- Own worktree, branch from `origin/master`. Do not edit `registry.js`, `uk-darwin.js`, or any
  flip branch. Do not flip anything live.
- One PR titled "RDG attribution on Darwin boards (licence cl. 3.3.1)", with the release command
  (`node qa/lane-lock.mjs release united-kingdom rdg-attribution`) noted for post-merge.
