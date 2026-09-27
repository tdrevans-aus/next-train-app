# Jim brief — Dublin live sweep: distinguish long intermittent gaps from permanent ones using the day's evidence (Broombridge)

**Lane:** bug-fix / product mode. **City:** dublin, country ireland (acquire the lane lock). **Date:** 27 Sep 2026. **tim-review:** no (QA script + docs; no rider-facing change).

## Symptom (Mark QA-6, note on origin/mark/dublin-flip-6)
Sweep failed on Broombridge (Green terminus): empty 24/24 polls over ~11 min (~16:30 Europe/Dublin) while Cabra was served. Mark classified it PERMANENT. It is NOT: at ~16:00 the same day (PR #484 live check, docs/dublin-d1/jim-handoff.md) Broombridge returned "Green + Brides Glen" with trips, and the #483 sweeps saw it non-empty. So Broombridge is a LONG intermittent gap (the Red Cow shape stretched to 10+ minutes), which the honest empty state already covers, and the sweep's "empty ≥ 1.5× headway in one run = fail" rule cannot tell it apart from Connolly/Saggart (never once seen non-empty in any run).

## Fix
1. **Evidence memory for the sweep.** qa/dublin-all-stations-live-sweep.mjs appends each run's per-station outcome (timestamp, headway, non-empty polls, empty-run seconds) to `docs/dublin-d1/live-sweep-log.jsonl` (committed, append-only). Verdict rule: a station is FAIL (permanent-shape) only if it has NEVER been observed non-empty across all logged runs within the last 7 days AND is empty for the whole current run; a station empty ≥ 1.5× headway this run but observed non-empty earlier is reported as `intermittent-long` (pass, with the honest empty state required on its board — assert `emptyReason` present via the rider API). Seed the log with the evidence already recorded today (Broombridge non-empty ~16:00; Rialto/Red Cow/Marlborough/Kylemore transient; Connolly/Saggart never non-empty).
2. **Coverage copy.** lib/cities/dublin/coverage.json's intermittent-gap note names the shape plainly: some stops, including termini such as Broombridge, can go 10+ minutes without live predictions; the app says so.
3. **Docs.** Append dated entries to docs/dublin-d1/jim-handoff.md and docs/dublin-d1/hazard-pack.md (H-new: NTA per-stop RT dropout, three observed shapes). Update docs/live-flip-checklist.md §9 one sentence: permanent = never observed non-empty across runs, not "empty this run".
4. Do NOT filter Broombridge. Keep "Green + Broombridge" as a chip.

## Acceptance
- Two sweep runs ≥ 10 min apart with the new rule, both `ok` (Broombridge may be `intermittent-long`; must carry `emptyReason` on `/api/board` when empty). `node qa/dublin-dogfood-gate.mjs`, `node qa/run-all.mjs --smoke` PLAIN green (known time-of-day flakes: no-live-feed-stops-gate, melbourne-dogfood-gate — re-run alone if only failure).
- Status stays "planned". PR title: "Dublin: live sweep uses the day's evidence — long intermittent gaps (Broombridge) are not permanent (flip prerequisite)". Link this brief and Mark's QA-6 note.
