# Jim brief — (1) a next-train request with no city silently answers for Perth; (2) the GM "Near me" smoke flake

tim-review: **yes** for item 1 (it changes the API response for requests with no city). Item 2 is QA only.
Lane: bug-fix / product mode. No lane lock expected.

## 1. A missing `city` defaults to Perth
Found by Mark in the #558 QA (https://github.com/tdrevans-aus/next-train-app/pull/558#issuecomment-7134215833).
`api/next-train.js:23` and `dev-server.js` (about lines 66 and 398) both do `query.city ?? "perth"`. On master,
a saved Uppsala journey sent `/api/next-train?station=Uppsala+C&direction=Stockholm&…` with no city, and the
server looked "Uppsala C" up as a Perth station. #558 stopped that one client path, but any stale client state,
old app build or widget that omits `city` still gets a Perth answer for a non-Perth station.

Investigate first:
- Who legitimately sends no city today? Perth was the original single-city app, so old Android/iOS builds
  and widgets may rely on the default. Check `android/`, `ios/`, widget code, `public/` and any documented API
  use.
- Get the share of no-city requests from Vercel logs if they're queryable.

Then propose, in the PR, one of these, with evidence:
- (A) Keep the Perth default only when the station is a Perth catalog station. Otherwise return 400
  `{"error":"Missing city","code":"CITY_REQUIRED"}`.
- (B) Require `city` (400) and bump every client to send it.

(A) is the safe default if old builds still depend on the Perth default. Apply the same rule to the other
`api/*` endpoints that share the default (directions, board).

## 2. The `no-live-feed-stops-gate` browser half flakes
On 24 Nov it failed twice in CI on unrelated PRs (#555, #558), and passed on rerun each time, with:
`Near me at St Peter's Square must resolve within greater-manchester, got {"station":null,…}`. It isn't one of
the three scripts with an in-runner retry, so each flake blocks a required check until someone reruns it.
Memory notes link late-suite browser failures to 429 rate-limit contamination, and to a deferred module
that has loaded but isn't wired yet (`await ensureDeferredModulesReady`).

Find the real cause. Wait on the right readiness signal, and check for 429s in the CI log around it. Fix the
script. Adding it to the retry list is a last resort, and needs a reason in the PR.

## Acceptance criteria
- Item 1:
  - a network-free test where a no-city request for a non-Perth station returns the chosen error, not a Perth
    board, and a no-city Perth station request keeps working;
  - it goes red on master, and Mark will mutation-check it.
- Item 2: the root cause stated with evidence. The script passes 10 times in a row locally under the smoke
  ordering, or in a CI loop if you can show it.
- `node qa/run-all.mjs --smoke` passes. Let it run to completion, about 650 s.

## Process
Worktree, branch `fix/missing-city-and-gm-flake`. Copy this brief from
`C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-missing-city-perth-default-and-gm-flake.md` (untracked in the
main checkout) into your worktree and commit it with the PR. Commit, push, open a PR linking it with
`tim-review` in the description.
