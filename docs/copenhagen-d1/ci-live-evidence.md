# Copenhagen: live verification evidence from CI (26 Sep 2026)

The QA sandbox can't reach rejseplanen.info (the egress proxy returns 403). GitHub Actions can.
The top-level session pulled these lines from CI logs for Mark's flip decision:

- CI job 108335097834, run 36216563967 (web-qa, PR #448 head dde52c8, `--release` tier, run on
  a real Actions runner with network access and Playwright Chromium), finished 2026-09-26T04:21:51Z:
  - `copenhagen-dogfood-gate.mjs          PASS`
  - every other script in the run: PASS (no FAIL rows; `live-city-lists-sync.mjs PASS`,
    `bundled-city-directions.mjs PASS`).
  - web-qa conclusion: success.
- Master CI run 36216150457 on e23ed67: conclusion success.

Per Mark's note, the gate's live half fetches the real Rejseplanen GTFS.zip and throws if it
can't. A PASS in CI therefore means the RE/IC/ICL classification, the Nordhavn/Nørreport
line-count corrections and the Kongens Nytorv chip check all ran against live data.
Source: https://github.com/tdrevans-aus/next-train-app/actions/runs/36216563967/job/108335097834
