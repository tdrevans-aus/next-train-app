# Vienna live-verification evidence -- Mark, 27 Sep 2026

Unlike Copenhagen's flip (docs/copenhagen-d1/ci-live-evidence.md), this evidence was captured
directly by Mark from a local dev server with real outbound access to the Wiener Linien OGD
Realtime Monitor (www.wienerlinien.at) -- no sandbox proxy block was encountered, so no
separate networked-CI run was needed to supplement it. Recorded here anyway per the flip
checklist's evidence requirement.

Local dev server: `node dev-server.js`, port 3000 (confirmed free before starting, stopped
afterwards). Registry `vienna.status` was already flipped to `"live"` for this run (the actual
flip-commit state), `MULTI_CITY_IDS` etc. already updated. Requests spaced >=10s apart per the
monitor's own rate limit (a burst of 4 back-to-back requests during the first QA pass on this
city triggered a 403 / messageCode 316 "Abfragelimit erreicht").

Captured 2026-09-27, ~01:53-02:05 UTC (~03:53-04:05 CEST, Saturday-night 24h U-Bahn service
still running):

| Station | Endpoint | Response time | Directions | Trips per direction |
|---|---|---|---|---|
| Karlsplatz | /api/board | 2.1s | U1+Leopoldau, U1+Oberlaa, U2+Seestadt, U4+Heiligenstadt, U4+Hütteldorf | 5,5,6,4,5 |
| Floridsdorf | /api/board | 2.1s | U6+Siebenhirten | 5 |
| Stephansplatz | /api/board | 1.9s | U1+Leopoldau, U1+Oberlaa, U3+Ottakring, U3+Simmering | 5,5,5,4 |
| Seestadt | /api/board | 2.3s | U2+Karlsplatz | 6 |
| Aspern Nord | /api/board | 2.3s | U2+Seestadt, U2+Karlsplatz | 4,6 |
| Praterstern | /api/board | 2.2s | U1+Leopoldau, U1+Oberlaa, U2+Seestadt, U2+Karlsplatz | 5,4,6,6 |

Every board returned real, live upcoming departures (delay/on-time statuses, real platform
numbers, timestamps matching the live monitor's own clock) -- none were empty, none were
schedule-only. Seestadt in particular is the station the first QA pass (mark/vienna-flip)
found silently empty; it now returns its real live U2 service via the "U2 + Karlsplatz"
hub-bound chip added by docs/jim-brief-vienna-u2-hub-bound-direction.md.

`node qa/vienna-dogfood-gate.mjs`, `node qa/live-city-lists-sync.mjs`,
`node qa/country-regions-sync-gate.mjs`, and `node qa/run-all.mjs --smoke` (156 PASS, 0 FAIL,
602s) all ran locally against this same flip-commit state -- see docs/vienna-d1/mark-qa-note.md
for the full checklist writeup.
