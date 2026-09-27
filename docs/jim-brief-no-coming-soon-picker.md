# Jim brief — picker: no "Coming Soon" rows (in or out)

**Lane:** bug-fix / product mode. **Date:** 27 Sep 2026. **tim-review:** no — Tim's decision in chat, 27 Sep 2026: "It's either in or out." Product copy/IA change authorised by that decision.

## Symptom
public/city-session.js's COUNTRIES tree carries `comingSoon: true` rows that render as "Coming Soon" in the rider-facing picker. Today: Dublin (flips live today — Mark's flip commit removes its flag), BART and Chicago (both key-blocked, would sit as Coming Soon indefinitely). Tim saw Ireland "Coming Soon" in production and ruled: no third state.

## Fix
1. Remove the BART and Chicago region rows (and the United States country entry only if no live region remains in it — Boston and Washington are live, so the country stays). Do NOT touch Dublin's row if Mark's flip PR is already open/merged (check `gh pr list --label flip`); if Dublin is still comingSoon on master when you start, remove that row too — the flip commit re-adds it as live.
2. Remove any `comingSoon` rendering branch in the picker UI (public/*.js, public/index.html) and any CSS only it used, so the concept has no code path left. Keep `CITY_BOUNDS` entries for BART/Chicago (harmless, and needed at flip).
3. `qa/country-regions-sync-gate.mjs` (or the closest picker gate): assert no region carries `comingSoon`; assert every picker region is a `status: "live"` registry city. Update the gate's header comment to cite this brief.
4. Registry `notes` for bart/chicago: replace "Picker Coming Soon" wording with "not in the picker until live". Grep `Coming Soon` across lib/, public/, docs/live-flip-checklist.md and .claude/agents/*.md and fix the precedent text so no future Jim/Mark re-adds a comingSoon row (agent-definition edits are allowed by this brief, keep them to the one sentence).
5. Jim's expansion-mode follow-through convention becomes: a first-city-in-country picker entry is added in the FLIP commit (Copenhagen #454 precedent), never as comingSoon ahead of it.

## Acceptance
- `grep -rn "comingSoon" public/ lib/ qa/` returns only the gate's negative assertion.
- `node qa/country-regions-sync-gate.mjs`, `node qa/live-city-lists-sync.mjs`, `node qa/region-selection.mjs` green; `node qa/run-all.mjs --smoke` green (known local flake: no-live-feed-stops-gate — re-run alone if it is the only failure).
- Dev server: /api/country-stations for the US returns Boston + Washington only; picker shows no "Coming Soon" text anywhere.
- PR title: "Picker: remove Coming Soon rows — cities are in or out". Link this brief.
