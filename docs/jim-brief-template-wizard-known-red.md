# Jim brief: retire two KNOWN-RED template-wizard scripts

**For:** Jim (bug-fix / product mode)
**From:** top-level session, 26 Sep 2026
**tim-review:** no (test-only). Escalate if you find a real product bug.

## Symptom

`qa/run-all.mjs` `KNOWN_RED_SCRIPTS` lists `template-wizard-hours-zindex.mjs` and
`template-wizard-skip.mjs`. In QA nightly they fail every night (one with exit 1, one with a
180 s timeout). The comment there says both assert against `#template-wizard-step-3`
("Active hours"), which no longer exists. Current wizard steps: name, step-1 station, step-2
target train, step-reminder. Active hours now auto-derive from the target time
(`journeyWindowAroundTarget`).

Nightly log (24 Sep): `template-wizard-skip.mjs FAIL — scrim dismissed wizard` —
`#template-wizard-primary-btn` resolves but is "not visible" on every retry.

## What to do

For each script, read what it was protecting and decide:
- If the behaviour still exists (the skip path works; the wizard layers correctly above other
  UI), rewrite the script against the current step IDs so it passes.
- If the behaviour was removed with the step, delete the script, and say why in the PR.
- If the product itself is broken (e.g. the scrim really does dismiss the wizard, or Next really
  is hidden), stop: write up the evidence in the PR and leave it KNOWN-RED.

Then remove whichever names no longer need to be in `KNOWN_RED_SCRIPTS`.
**Don't touch `nearby-location-hint-keeps-cache.mjs`.** That one is waiting on a product decision from Tim.

## Acceptance

- Each rewritten script passes 3 runs in a row (`node qa/<script>`).
- `node qa/run-all.mjs --smoke` passes.
- The PR links this brief. Leave no background sleep/poll loops running.
