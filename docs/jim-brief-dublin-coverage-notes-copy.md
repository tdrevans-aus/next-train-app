# Jim brief — Dublin coverage.json `notes`: rider prose only (coverage-notes gate; flip blocker)

**Lane:** bug-fix / product mode, copy-only. **City:** dublin, country ireland (acquire the lane lock). **Date:** 28 Sep 2026. **tim-review:** no — rewrites an existing approved note into plain rider language, no new facts.

## Symptom (Mark QA-7, note on origin/mark/dublin-flip-7)
`qa/coverage-notes-gate.mjs` (runs only for live cities) fails in the flip state: lib/cities/dublin/coverage.json's top-level `notes` mentions `docs/dublin-d1/live-sweep-log.jsonl` / `qa/dublin-all-stations-live-sweep.mjs` and matches the gate's `/\bD1\b|\boracle\b|CRS\b/i` internal-jargon regex. The field is served verbatim by `/api/coverage-notes?city=dublin`.

## Fix
Rewrite `notes` as rider prose, keeping the facts: Luas Red and Green only; DART and buses not covered; Connolly and Saggart stops not covered because the operator's live feed has no times for them (use Busáras / Fortunestown); some stops, including termini such as Broombridge, can go several minutes without live times and the app says so rather than showing a blank. No file paths, script names, "D1", "oracle", "sweep", "pipeline", "session". Check every `label`/`detail` string with the gate too. One stale comment in lib/providers/dublin.js noted by Mark as cosmetic may be fixed in passing if it is a one-liner.

## Acceptance
- Temporarily set dublin `status: "live"` locally (revert before commit) and run `node qa/coverage-notes-gate.mjs` → PASS; `node qa/dublin-dogfood-gate.mjs` PASS; `node qa/run-all.mjs --smoke` PLAIN green (known time-of-day flakes: no-live-feed-stops-gate, melbourne-dogfood-gate, adelaide-dogfood-gate in the Australian small hours — re-run alone if the only failures).
- Status stays "planned". PR title: "Dublin: coverage notes in rider prose (coverage-notes gate; flip prerequisite)". Paste the new `notes` text in the PR description.
