# Jim brief — `regionExplicit: false` is dropped on save, so GPS-follow turns itself off

**Lane:** bug-fix / product mode. `tim-review: no` (restores intended behaviour, no copy).
**Lane lock:** none (`public/` + `qa/`). Leave no background loops, pollers or dev servers.
**Priority:** live regression since PR #383 merged on 14 Sep 2026; affects every returning
rider who never explicitly picked a region.

## Symptom (found by the nightly triage, PR #391, confirmed by the controller in code)

1. `public/city-session.js` `persistRegion()` writes `regionExplicit: Boolean(explicit)` via
   `nextTrainJourneyModel.persistSettings`.
2. `persistSettings` runs `migrateSettings()` (`public/journey-model.js` around line 557),
   which copies the flag **only when it is `true`**: `if (raw.regionExplicit === true) out.regionExplicit = true;`.
   A `false` is silently dropped, so the stored settings have no `regionExplicit` key.
3. On the next app open, `migrateLegacyRegionExplicit()` (city-session.js ~line 351) sees
   "savedCity set and no flag" — the pre-#383 legacy shape — and writes `regionExplicit: true`.
4. From then on `readRegionExplicit()` is true, the Region select shows a fixed region instead
   of "All", and the GPS-follow path that used to move a rider's region as they travel is off.

Net effect: the legacy migration meant for one-time upgrades fires for everyone on their
second open, and GPS-follow is permanently disabled.

## Fix

1. In `migrateSettings()` (journey-model.js), preserve `regionExplicit` when it is a boolean,
   true **or** false: `if (typeof raw.regionExplicit === "boolean") out.regionExplicit = raw.regionExplicit;`.
   Check for any other boolean settings normalised the same lossy way in that function and fix
   them the same way, listing each in the PR.
2. Make the legacy migration safe even if a flag is ever lost again: it should only mark a
   region explicit when the store has **no** `regionExplicit` key **and** carries a marker that
   the store predates #383 (e.g. `SETTINGS_SCHEMA_VERSION` below the version #383 introduced,
   or the absence of a key #383 always writes). If no such marker exists, bump
   `SETTINGS_SCHEMA_VERSION` in this PR and key the migration on it.
3. Repair riders already affected: on load, if `regionExplicit` is true but the store shows it
   was set by the migration rather than by a rider's pick (record which path set it from now on,
   e.g. `regionExplicitSource: "migration" | "picker"`), and the rider's saved city came from a
   GPS resolution (check what the GPS-follow path writes that a picker pick doesn't), reset it to
   `false`. If there is no reliable way to tell the two apart in already-written stores, say so
   in the PR and only prevent recurrence; do not guess.

## Acceptance criteria

1. `qa/country-wide-picker.mjs` (or `qa/region-selection.mjs`, whichever already covers this)
   gains cases: (a) a store with `regionExplicit: false` survives a `persistSettings` round trip
   with the key still present and false; (b) opening the app twice in a row with a GPS-set
   region leaves the Region select on "All" both times; (c) the legacy upgrade case from
   #383 round 2 (savedCity, no flag, pre-#383 schema) still migrates to explicit.
2. The journey-wizard-after-route workaround Jim added in PR #391 is either removed (if #391 has
   merged first, rebase and remove it) or noted in the PR as removable once both land.
3. `node qa/run-all.mjs --smoke` green (foreground, 600000 ms timeout).
4. No `lib/` changes.

## Process

Worktree from current master; copy this brief in; commit, push; PR "Settings: keep
regionExplicit:false so GPS-follow stays on (fixes #383 regression)".
