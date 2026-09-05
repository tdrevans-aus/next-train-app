# Jim brief — Tamworth (TAM): Birmingham hub-anchoring (FB-54 outcome)

**Dispatched:** 5 Sep 2026 (Tim's call) · **Lane:** `united-kingdom`, region label `tamworth-hub`,
stage `adapter` · **Region:** `uk-west-midlands` (live). Copy this file into the repo as
`docs/jim-brief-uk-tamworth-hub.md` and commit it with the change.

## The live finding (probe run 5 Sep 2026, 06:45–08:30 Europe/London)

`node scripts/probe-uk-board.mjs "Tamworth" --region=uk-west-midlands --filter-crs=BHM`
returned 7 trips, all CrossCountry, all platform 4, printed destinations **Cardiff Central ×2,
Reading ×2, Bournemouth, Plymouth, Birmingham New Street** — every one calls at Birmingham New
Street. The unfiltered board (15 trips) adds the low-level WCML services (London Euston ×4 Avanti
/ LNR & WMR, Crewe, Liverpool Lime Street) and the northbound high-level CrossCountry services
(Nottingham ×3, Edinburgh). No operator split anywhere — this is the FB-50 Kidderminster shape
(one rider hub hidden behind several printed termini), not a doNotGroup case. Tamworth is NOT
on the Cross-City line; its Birmingham service is CrossCountry on the Birmingham–Derby line.

## What to build

1. `lib/cities/uk-west-midlands/direction-hubs.json`: add a second entry to `hubs`, same shape as
   the existing Kidderminster/Snow Hill one:
   - `label`: `"Birmingham"`
   - `filterCrs`: `"BHM"`, `filterName`: `"Birmingham New Street"`
   - `appliesFrom`: `["TAM"]` only. Do not extend to Wilnecote or Polesworth — neither is in the
     catalog (Wilnecote is Birmingham–Derby line but was not catalogued; leave that to a
     catalog decision, note it in your handoff).
   - `absorbs`: `["Cardiff Central", "Reading", "Bournemouth", "Plymouth", "Birmingham New Street"]`.
     Nottingham and Edinburgh are NOT absorbed — they are the opposite direction and keep their
     chips. London Euston / Crewe / Liverpool Lime Street are low-level WCML and keep their chips.
   - `reason`: cite this brief and the probe output.
   Add a `notes` line explaining that Tamworth's Birmingham direction is CrossCountry through-
   running to the South West / South Coast, riders anchor on Birmingham, BHM not BMO/BSW because
   these trains use New Street only.
2. Read `lib/cities/uk-west-midlands/direction-hubs.js` and `dogfood-next-train.js` to confirm a
   second hub entry with a different `filterCrs` is supported by the loader (the code was written
   for one hub; if it assumes a single `filterCrs`, make the minimal generalisation and say so).
3. `qa/uk-west-midlands-dogfood-gate.mjs`: extend the existing hub-anchoring assertions — TAM's
   plan must be `hub` with filterCrs BHM, and the absorbed set above must not appear as separate
   chips for TAM; Kidderminster's assertions must be unchanged. Also assert that a station NOT in
   `appliesFrom` (e.g. Birmingham International, BHI) is unaffected by the new hub.
4. Do NOT edit `docs/united-kingdom-ledger.md` or `docs/feature-backlog.md` — the top-level
   session records FB-54's closure and the ledger propagation row in a separate docs PR to avoid
   conflicts. Put everything the ledger should say in your PR description instead.

## Verification (report the output)

- `node qa/uk-west-midlands-dogfood-gate.mjs` passes with the new assertions.
- `node scripts/probe-uk-board.mjs "Tamworth" --region=uk-west-midlands --filter-crs=BHM`
  transcript pasted in the PR body (re-run it; service hours are fine now).
- `node qa/uk-region-catalog-conformance.mjs` unchanged and green.
- `node qa/run-all.mjs --smoke`. Known issue: browser-automation scripts have hung in this sandbox
  on three previous runs and left node processes alive. If it stalls past 12 minutes, kill it,
  say which scripts hung, and rely on the named gates above. Do not leave node processes running.

## Guardrails

- `node qa/lane-lock.mjs check united-kingdom` first (top level confirmed free at dispatch);
  acquire `node qa/lane-lock.mjs acquire united-kingdom tamworth-hub adapter` before editing.
- Own worktree, branch from `origin/master`. No `status` changes, no `registry.js`, no
  `uk-darwin.js`, no catalog additions.
- One PR titled "Tamworth: Birmingham hub-anchoring (BHM), FB-54", with the release command
  (`node qa/lane-lock.mjs release united-kingdom tamworth-hub`) in the body.
