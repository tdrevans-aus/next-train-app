# Jim brief — Dwayne's accepted post-launch findings D-05, D-06, D-07, D-10 (one PR)

Mode: bug-fix / product (CLAUDE.md "Bug-fix lane"). Authorises `public/app.js` (reset handling
only), `scripts/prune-ship-assets.mjs` or the `cap:sync` chain in `package.json`, `vercel.json`
headers, `api/next-train.js`, `api/directions.js`, `api/destinations.js`, `lib/` for a shared
error helper, and `qa/`. tim-review: no — Dwayne accepted these as post-launch hardening with no
copy, IA or success-path API change. Lane lock: not required.

Source: `docs/dwayne-security-review-play-3.0.0.md` "Fix after launch (bundle into one Jim PR)".
Two of the eight are already closed and need only a line in the PR description confirming it:
**D-08** (the `nexttrain://test/seed` intent filter now lives only in
`android/app/src/debug/AndroidManifest.xml`, moved by #367) and **D-11** (the private-repo issues
link is gone from `public/about.html`, removed by #376). D-09 is Tim's Play Console action, not code.

Dispatched 13 Sep 2026 after the 3.0.1 tag; this must not change anything that alters the AAB
Tim is building from `v3.0.1` in a way that would need a re-tag. Web and API changes deploy via
Vercel on merge; the Android-side change (D-06) takes effect on the next build, which is fine.

## D-05 — `?reset=1` wipes storage on the public web

`public/app.js` ~line 731: the early-return only checks `reset !== "1"`; `localStorage.clear()`
and `sessionStorage.clear()` then run for any visitor of
`https://next-train-app.vercel.app/?reset=1`. Gate it: honour `reset=1` only when `test=1` is
also present **and** the page is served from localhost/127.0.0.1 or a non-production host (the
existing `isTest`/hostname helpers in app.js, if any, are fine to reuse). The native deep-link
path at ~line 2508 (`nexttrain://test/seed?reset=1`) is unreachable in release builds after #367;
leave it. Every QA script uses `?reset=1&test=1` against a localhost dev server, so the suite
must stay green; that is the regression check. Gate: `qa/reset-param-gated.mjs` — Playwright,
loads `/?reset=1` (no `test`) with a seeded journey and asserts the journey survives, then
`/?reset=1&test=1` and asserts it is cleared. Register in smoke.

## D-06 — the dogfood LAN origin ships in release AABs

`public/dogfood-origin.json` is gitignored but present on Tim's PC, so `npx cap sync` copies it
into `android/app/src/main/assets/public/`. `scripts/prune-ship-assets.mjs` already runs at the
end of `cap:sync`: extend it to delete `dogfood-origin.json` from the synced assets (both
Android and, for `cap:sync:ios`, the iOS web dir). Do not touch `public/dogfood-origin.json`
itself; dev still needs it. Gate: extend the existing pre-upload check
(`qa/pre-upload-check.mjs`) or add `qa/ship-assets-no-dogfood-origin.mjs` (offline) that fails
if the synced assets dir exists and contains the file. Note in the PR that Tim's `v3.0.1` build
predates this; the file is inert in release and the next build drops it.

## D-07 — no browser security headers on the public site

`vercel.json` `headers` currently only sets CORS and cache on `/api/(.*)`. Add a second entry
for `/(.*)` with: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera,
microphone and payment (geolocation must stay allowed for Near me — `geolocation=(self)`), and a
**report-only** `Content-Security-Policy-Report-Only` first, not an enforcing CSP: the app loads
Google fonts, AdSense/AdMob scripts on web, Sentry, and inline scripts in `index.html`, and an
enforcing CSP that breaks ads or Sentry on launch week is worse than none. Derive the
report-only policy from what `public/index.html`, `public/ads.js` and `web-sources/*.mjs`
actually load, and record the intended enforcing policy as a follow-up in the PR description.
Keep `/api/(.*)` behaviour unchanged. Gate: `qa/security-headers-gate.mjs` (offline) that parses
`vercel.json` and asserts the four hard headers are present on `/(.*)` and that `X-Frame-Options`
is not set on `/api/(.*)`. Verify on the Vercel preview with `curl -I` and paste the headers in
the PR.

## D-10 — 500 responses echo `error.message`

`api/next-train.js` (~76, ~94), `api/directions.js` (~102, ~128) and `api/destinations.js`
(~46, ~69) return `error.message` to the client. Replace with a generic message per endpoint
and `console.error` the real error server-side with the request's city/station for Vercel logs.
Check first whether any QA script or `public/app.js` matches on specific error text from these
endpoints (grep `error` handling in `public/app.js` and `qa/*.mjs` for the 500 bodies) — if one
does, keep that exact string as the generic message rather than inventing a new one, and say so.
Do not touch the existing `lib/providers/gtfs/redact-url.js` redaction; it still applies to what
gets logged. Gate: `qa/api-500-no-error-echo.mjs` (offline) that stubs a provider to throw an
error containing a marker like `SECRET-URL-abc` and asserts the 500 body does not contain it.
Register in smoke.

## Acceptance

1. All four new/extended gates pass and each fails when its fix is reverted (show one mutation
   per gate in the PR description).
2. `node qa/no-hardcoded-qa-port.mjs`, `node qa/lib-bare-import-gate.mjs`,
   `node qa/run-all.mjs --smoke` pass — each a foreground Bash call with an explicit 600000 ms
   timeout, never in the background; do not end the turn while a run is going. Runner on a
   non-3000 port.
3. `curl -I` of the PR's Vercel preview root shows the new headers; `/api/health` shows none of
   the frame/CSP headers.
4. PR description has a D-05 to D-11 table: finding, status (fixed here / already closed by
   #367 or #376 / Tim's console action), evidence.
5. No dev servers, headless Chrome or poll loops left running; `netstat -ano | findstr LISTENING`.

## Process

Worktree isolation; branch `jim/dwayne-post-launch`. Copy this brief into the worktree and commit
it with the change. Commit, push, open a PR linking this brief and Dwayne's review. Do not merge.
