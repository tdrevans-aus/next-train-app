# Jim brief — security fixes before Play public (LB-09: D-03, D-04)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises
`android/app/src/main/AndroidManifest.xml`, `android/app/src/debug/AndroidManifest.xml`,
`api/feedback.js`, `lib/api-rate-limit.js`, `public/index.html` (feedback form only), `public/app.js`
(feedback submit only), and `qa/`.

tim-review: no — mechanical hardening. It changes no copy, no IA and no API response shape for a valid request.

Lane lock: not required — this touches no city's `lib/providers/<city>.js` adapter.

Source: `docs/dwayne-security-review-play-3.0.0.md` (Dwayne, 11 Sep 2026). These two findings sit between
Next Train and Dwayne's Play-public sign-off. They need to merge by **Mon 15 Sep**.

## Item 1 — D-03: remove cleartext from the release manifest

**Symptom.** `android/app/src/main/AndroidManifest.xml:16` sets `android:usesCleartextTraffic="true"`.
The 3.0.0 merged release manifest
(`android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml`,
from `gradlew :app:processReleaseMainManifest`) shows it ships in the release build.
`docs/simon-brief-security-hardening.md` records "no cleartext config" as already done.

**Fix.** Delete the attribute from `main`. Leave `src/debug/AndroidManifest.xml` and
`network_security_config_debug.xml` alone: they're what keeps LAN/emulator dogfooding over
`http://10.0.2.2:3000` working in debug builds.

**Also in this item (D-08, same file, no extra risk):** move the `nexttrain://test/seed` intent-filter from the
`main` manifest into the debug manifest's `MainActivity` entry. The handler is already `BuildConfig.DEBUG`
gated in `DeepLinkHelper.java`, so this is hygiene only. Make sure Maestro's debug seed flow still resolves.

**Acceptance.**
- A regenerated merged **release** manifest has no `usesCleartextTraffic="true"` and no `host="test"`.
- The merged **debug** manifest still has both.
- The `android-unit` CI job stays green.

## Item 2 — D-04: rate-limit and honeypot `/api/feedback`

**Symptom.** `api/feedback.js` has no rate limit, origin check or bot filter. Anyone can POST 4,000-character
notes with an arbitrary `_replyto` to our Formspree webhook at any volume. That spams the inbox, can exhaust
the Formspree quota (feedback goes dark at launch), and allows reply-to abuse.

**Fix.**
1. Rate-limit feedback with its own tighter bucket: **5 POSTs per 10 minutes per IP**. Extend
   `lib/api-rate-limit.js` to accept a named bucket and limit/window rather than copying it, and keep the
   existing 60/min default unchanged for every other caller. OPTIONS preflight must stay unlimited.
2. Add a hidden honeypot field to the feedback form in `public/index.html` (off-screen, `tabindex="-1"`,
   `autocomplete="off"`, `aria-hidden="true"`). Send it in the POST body. If it's non-empty, the server
   answers `200 {ok:true}` and **does not** call the webhook, so bots get no signal.
3. Don't forward `_replyto` unless `email` passes the existing check. (It already only sets it from `email`;
   keep it that way and add a test.)

**Acceptance.**
- A new `qa/feedback-abuse.mjs` exercises the handler in-process with a stubbed webhook (no real Formspree
  call, and **never** POST to production). It checks: the sixth POST from one IP within the window gets 429
  with `Retry-After`; a filled honeypot gets 200 and makes zero webhook calls; a normal submit makes one
  webhook call; OPTIONS is never limited.
- Register it in `qa/run-all.mjs` in the smoke tier.
- Manual: Menu → Send feedback still works in the local dev server with a stub webhook.

## QA to run

- `node qa/feedback-abuse.mjs`
- `node qa/run-all.mjs --smoke`

## Out of scope here

D-01 (EU/UK ad consent) is waiting on Tim's decision, and D-02 (privacy policy / Data safety copy) is
`tim-review: yes` and depends on D-01. They'll get their own briefs. D-05, D-06, D-07, D-10 and D-11 are
post-launch.

## Dispatch notes

Commit, push, and open a PR that links this brief and `docs/dwayne-security-review-play-3.0.0.md`. Leave no
background sleep or poll loops running when you finish.
