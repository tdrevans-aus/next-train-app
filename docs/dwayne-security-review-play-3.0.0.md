# Dwayne — lean security review, Next Train Android 3.0.0 (LB-09)

**Reviewer:** Dwayne (Cybersecurity)  
**Date:** 11 Sep 2026  
**Against:** the lean checklist accepted 11 Aug (`docs/dwayne-brief-security-signoff.md`)  
**Build reviewed:** master @ `d760e98` — versionName 3.0.0 / versionCode 24. Release manifest freshly merged
(`gradlew :app:processReleaseMainManifest`, 11 Sep), live `https://next-train-app.vercel.app`, and source.
**Not done:** on-device install of the Play closed-test build. Everything below comes from source, the merged
release manifest, and the live site.

## Verdict: **not signed off yet — conditional**

The engineering baseline from S-01→S-06 has held up well. What changed is **scope**. The checklist and its
accepted residuals were agreed on 11 Aug for a Perth-only app. Release 1 ships 33 regions across AU, the UK,
Sweden, Finland and Norway, with Sentry and a feedback form added since then. Two of the residuals Tim
accepted assumed that old scope, and the privacy claims don't describe the current build.

I will sign off for Play public once **D-01 to D-04** are closed (D-01 needs Tim's decision). I can re-check
within one business day of the fixes landing. **Realistic sign-off date: Tue 16 Sep**, provided the
fixes merge by Mon 15 Sep. That still leaves room before the ~18 Sep public flip. D-05 to D-11 can ship after
launch.

## Checklist results

| Area | Result | Notes |
| --- | --- | --- |
| Permissions | **PASS (with Tim action)** | Location, notifications, exact alarm and full-screen intent are all justified by features and degrade cleanly when revoked (`canScheduleExactAlarms` / `canUseFullScreenIntent` checks). **No DATA_SYNC FGS** in the 3.0.0 merged release manifest. `FOREGROUND_SERVICE` comes only from WorkManager (via AdMob), with no FGS type. See D-09. |
| Data at rest | **PASS** | `allowBackup="false"` (S-04). No secrets tracked; all provider keys (TfL, TfNSW, Trafiklab, Darwin, Digitransit, TfWM…) are server-side env only; keystore is untracked with only an `.example` checked in. |
| Network | **FAIL → D-03, D-04** | HTTPS API with HSTS preload. Every data endpoint has the city gate, station allowlist and rate limit. `/api/dev/board` returns 404 in prod. Keyed upstream URLs are redacted in errors (`redact-url.js`). **But:** cleartext is enabled in the release manifest (D-03), and `/api/feedback` has no abuse control (D-04). |
| WebView / XSS | **PASS** | Every `innerHTML` sink is a static string, a clear, or escaped (`escapeTemplateHtml`). The dogfood origin override only takes effect off-native on localhost. `CapacitorHttp` is off and there's no `allowNavigation`. |
| Deep links | **PASS** | Native host allowlist (`journey`/`nearby`/`home`/`paywall`/`reminders`). The `test` host is gated by `BuildConfig.DEBUG` natively **and** by `isDebugBuild()` in JS. See D-08 (hygiene only). |
| Ads / IAP | **PASS for AU · FAIL for UK/EEA → D-01** | Prod AdMob IDs, `admobTestMode:false`, and release builds force test mode off (`resolveEffectiveTestMode`). Client-side IAP stays accepted (S-05). |
| Privacy claims | **FAIL → D-02** | `privacy.html` and the Data safety cheat sheet don't match 3.0.0. |
| Release hygiene | **PASS (minor)** | Not debuggable; signing comes from an untracked `keystore.properties`; WebView debugging follows the debuggable flag. D-06 and D-08 are leftovers. |
| Dev/debug leftover | **PASS (minor)** | `?widgetDebug=` works natively only and reads the app's own state. Fast-test and seed paths are debug-gated. `?reset=1` is still live on the public web (D-05). |

## Findings

### Must close before Play public

**D-01 · EU/UK ad consent. The residual needs a new decision (Tim).**  
On 11 Aug, "UMP/EU consent SDK" was accepted as out of scope for a Perth app. Release 1 now serves AdMob
to users in the UK, Sweden, Finland and Norway. Google's EU User Consent Policy requires a Google-certified
CMP for ads shown to EEA/UK users. Without one we risk an AdMob policy strike, limited or no fill in those
regions, and direct GDPR/ePrivacy exposure for Evans Studios. This is compliance risk, not a code
vulnerability, but my sign-off can't carry a residual that was accepted under a different scope.
**Tim chose Option A on 12 Sep 2026.** Brief: `docs/jim-brief-eu-ad-consent.md`.

- **Option A (chosen):** add UMP before public. `@capacitor-community/admob` already provides
  `requestConsentInfo()` / `showConsentForm()`, and the ad-free path already skips ads. It's a small Jim
  change plus a Privacy & messaging form set up in AdMob.
- **Option B:** suppress the AdMob banner whenever the active region is UK/SE/FI/NO until UMP lands, and ship
  ads in AU only. This gives up UK/EEA ad revenue until October.

**D-02 · Privacy policy and Data safety don't match the build (Tim review — copy).**  
`privacy.html` (last updated 24 Aug) and `docs/play-data-safety-cheatsheet.md` have these gaps:
1. **Sentry crash reporting isn't disclosed.** It's a third-party processor (US ingest). It receives device
   and OS info, app version, session tracking (`enableAutoSessionTracking`), and default fetch breadcrumbs,
   which include our API request URLs, so **station + direction**. Data safety needs "Crash logs" and
   "Diagnostics" declared.
2. **The feedback form isn't disclosed.** It sends free text plus an **optional email** through Formspree to
   our inbox. The cheat sheet's "email collected in-app: No" is wrong. It should say *Yes, optional*.
3. **The policy is still Perth/Transperth only.** Live times are now relayed to TfNSW, TfL, National Rail,
   Trafiklab, Digitransit, Entur and others through our API (station + direction only).
4. **Wrong price.** The policy says "Remove ads A$3.99" but `site-config.json` lists A$7.99.
5. **UK/EEA users need GDPR basics:** controller identity (Evans Studios + contact), legal basis (legitimate
   interest for crash logs; consent for personalised ads, tied to D-01), data-subject rights, and
   international transfer (Vercel/Sentry, US).

An inaccurate Data safety form is a Play policy violation in its own right, separate from security.
Brief: `docs/jim-brief-privacy-copy-3.0.0.md` (tim-review: yes; depends on D-01 landing first).

**D-03 · Cleartext traffic enabled in the release build (Jim).**  
`android/app/src/main/AndroidManifest.xml:16` sets `android:usesCleartextTraffic="true"`, and the 3.0.0
merged **release** manifest confirms it ships. `docs/simon-brief-security-hardening.md` records "no cleartext
config" as done. `src/debug/AndroidManifest.xml` already carries its own cleartext override and a debug
network-security config for LAN dogfooding, so removing the attribute from `main` costs debug nothing. It
isn't exploitable today (every API base is `https://`), but it switches off the platform guardrail for any
future regression.

**D-04 · `/api/feedback` is an open relay (Jim).**  
There's no rate limit, origin check or honeypot. Anyone can POST 4,000-character notes with an arbitrary
`_replyto` to our Formspree endpoint at any volume. That means inbox spam, Formspree quota exhaustion
(feedback goes dark at launch), and reply-to abuse. Fix: `checkRateLimit` with a tighter feedback bucket
(e.g. 5 per 10 min per IP) plus a hidden honeypot field.

### Fix after launch (bundle into one Jim PR)

- **D-05 · `?reset=1` wipes storage on the public web.** On the live site, a crafted link like
  `https://next-train-app.vercel.app/?reset=1` clears a visitor's saved journeys (`app.js:731`). It can't be
  reached in the native app. Gate it on `test=1` + localhost, or remove it.
- **D-06 · The dogfood LAN origin ships in release AABs.** `public/dogfood-origin.json` is gitignored but sits
  on Tim's PC, so `cap copy` packages it into `assets/public/` (containing `http://192.168.68.62:3000`). It's
  inert in release but discloses an internal address. Exclude it from release builds.
- **D-07 · No browser security headers on the public site.** The live site sends HSTS but no CSP,
  `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options` or `Referrer-Policy`. Add them in
  `vercel.json` as defence in depth.
- **D-08 · `nexttrain://test/seed` intent-filter is declared in the release manifest.** The handler is inert
  in release. Move the filter to `src/debug/AndroidManifest.xml`.
- **D-10 · 500 responses echo `error.message`.** Redaction covers the known keyed URLs, but new adapters
  could regress it. Return a generic message and log the detail server-side.
- **D-11 · About links to a private repo's issues page.** `github.com/tdrevans-aus/next-train-app/issues`
  returns 404 to users. Drop the link (support email is enough).

### Tim actions (Play Console, no code)

- **D-09 · Permission declarations.** Target SDK 36 with `USE_FULL_SCREEN_INTENT` and `SCHEDULE_EXACT_ALARM`.
  Play Console needs the full-screen-intent declaration (leave-by alarm = alarm functionality) and the
  exact-alarm justification. Without them, Play revokes FSI by default on Android 14+. The app degrades
  gracefully, but the lock-screen alarm (FB-34) quietly stops working. Neither declaration is tracked in any
  launch doc today.

## Informational (no action for launch)

- `npm audit --omit=dev` reports 7 issues (1 high: `@xmldom/xmldom`). All of them are in build and dev tooling
  (Capacitor CLI → plist → xmldom; `express` is used only by `dev-server.js`). None reach the shipped app or
  the Vercel functions.
- The API rate limit is an in-memory per-instance bucket, so it's weak against distributed abuse. That was
  accepted under S-03 and still holds.
- `allowBackup="false"` doesn't stop Android 12+ device-to-device transfer. The data is non-sensitive
  (journeys/prefs), so this is acceptable.
- The FileProvider `external-path path="."` is broad but the provider isn't exported and nothing grants it.
  It's a Capacitor template default.

## Sign-off

Pending D-01 (decision) and D-02 to D-04 (fixes). When they're closed I'll add the sign-off line below.

> _(not yet)_ I have completed a lean security review of Next Train (Android / Play 3.0.0) against the agreed
> checklist. Findings are closed or accepted. **Signed off for Play public release.** — Dwayne, \<date\>

The iOS review stays at ~13–20 Oct, as planned.

---

## Re-check — 13 Sep 2026

**Against:** `origin/master` @ `57b6325` (six merges since `d760e98`: #356, #357, #362, #363, #364, #366).  
**Trigger:** Jim reported the fixes done.

**Result: no change. Still not signed off.** None of the fix work is on master, and I can't find it on any
branch, open or closed PR, worktree, or stash either:

| Finding | Evidence on `origin/master` | Status |
| --- | --- | --- |
| D-01 ad consent | `web-sources/ads-native.mjs` has no `requestConsentInfo` / `canRequestAds`; no `qa/ad-consent-gate.mjs` | **Open** |
| D-02 privacy copy | `public/privacy.html` still "Last updated: 24 August 2026", no Sentry, still A$3.99 | **Open** |
| D-03 cleartext | `AndroidManifest.xml:16` still `usesCleartextTraffic="true"`; `host="test"` still at line 76 | **Open** |
| D-04 feedback relay | `api/feedback.js` has no rate limit or honeypot; no `qa/feedback-abuse.mjs` | **Open** |

The only checklist-relevant change in those merges is `api/health.js` (#361): it now imports `@vercel/blob`
inside the cron branch. The `CRON_SECRET` bearer check is unchanged and still fails closed, so it's no
regression.

**Sign-off date:** Tue 16 Sep still holds **only** if D-01, D-03 and D-04 merge by Mon 15 Sep and D-02 is
merged with Tim's review. Nothing has started as of 13 Sep, so if it isn't dispatched this weekend, sign-off
moves to the day after the fixes merge.

**13 Sep, later:** Tim published the AdMob **European regulations (GDPR) message** for Next Train (Consent,
Manage options, Do not consent). That was D-01's console prerequisite. D-01 stays open until the UMP code
lands (`docs/jim-brief-eu-ad-consent.md`) and the consent form is verified on a device.

---

## Re-check — 13 Sep 2026, afternoon

**Against:** `origin/master` @ `43abf1f` (fetched fresh; this is #370, #367, #368, #372, #373, #374, #375
beyond the morning re-check's `57b6325`). **D-02 checked on the open PR branch** `jim/privacy-copy-3.0.0-v2`
(`gh pr diff 376`), not master — that PR hasn't merged.

**Trigger:** Tim wants Play public submitted today, production, staged rollout. Re-reading the actual diffs
and running the three gates myself, not relying on Jim's or Mark's reports.

| Finding | Evidence | Status |
| --- | --- | --- |
| **D-01** ad consent | `web-sources/ads-native.mjs` on master now has `ensureConsent()`: calls `requestConsentInfo()`, shows the UMP form when `status === REQUIRED`, fails closed (`canRequestAds: false`) on any error or timeout, and gates both the banner (`showNativeBanner`) and the privacy-options entry point on it. `public/ads.js` and `qa/ad-consent-gate.mjs` (new) exist on master. Ran `node qa/ad-consent-gate.mjs` myself: **PASS** — "UMP consent correctly gates every native ad request" (the logged "UMP unavailable (simulated)" line is the gate's own fail-closed test case, not a real error). Console prerequisite (the GDPR message) was published by Tim on 13 Sep per the prior re-check. | **Closed in code.** Residual: consent form rendering for a real EEA user is a device check only Tim can do — see conditions below. |
| **D-02** privacy/Data safety copy | Master's `public/privacy.html` is still the stale 24 Aug version (checked directly: `Last updated: 24 August 2026`, no Sentry, no GDPR section). The fix is **PR #376** (`jim/privacy-copy-3.0.0-v2`, OPEN, `tim-review: yes`, mergeable). Read the full diff via `gh pr diff 376`: adds a Sentry crash/diagnostics disclosure, a "Send feedback" section describing the optional email to Formspree, replaces Perth/Transperth-only language with the 33-region AU/UK/SE/FI/NO list, fixes the Remove-ads price (`A$3.99` → `A$7.99`) in both `privacy.html` and the cheat sheet, adds a UK/EEA GDPR section (controller identity, legal basis, rights, international transfer, UMP consent description matching #370 as shipped — correctly describes "no ad request at all" pending consent, not a personalised/non-personalised fallback), updates `docs/play-data-safety-cheatsheet.md` row-by-row, and drops the dead GitHub-issues link from `about.html` (folds in D-11). PR body records `qa/run-all.mjs --smoke` PASS 128/128 from Mark's/Jim's run. | **Open — conditional on #376 merging as reviewed.** Not yet true on master. |
| **D-03** cleartext in release manifest | `git show origin/master:android/app/src/main/AndroidManifest.xml` — no `usesCleartextTraffic` attribute, no `host="test"` entry. Landed in #367 (`77e35c7`), which moved both to `android/app/src/debug/AndroidManifest.xml` (confirmed: debug manifest carries `usesCleartextTraffic="true"` and the `nexttrain://test/seed` intent-filter, with a comment citing D-08/this review). | **Closed on master.** |
| **D-04** `/api/feedback` open relay | `git show origin/master:api/feedback.js` — `checkRateLimit(req, res, FEEDBACK_RATE_LIMIT)` with a named `{bucket: "feedback", limit: 5, windowMs: 10*60_000}` bucket, and a honeypot check (`body.website`) that short-circuits to `200 {ok:true}` with no webhook call. Landed in #367. Ran `node qa/feedback-abuse.mjs` myself: **PASS** — "rate limit, honeypot and OPTIONS behaviour all correct." | **Closed on master.** |

**Other gate run:** `node qa/lib-bare-import-gate.mjs` — **PASS**, 150 files reachable from `api/*.js`, no
bare npm imports outside `api/`. Relevant because of the two mid-September Vercel bare-import outages
(`@vercel/blob`, `fflate`) that `/api/health` stayed green through; #361 (already on master before this
re-check window) is the fix for that class of bug and this gate is its regression guard. No new bare-import
risk introduced by anything in this batch (#373 pins `api/health.js`'s region, #374 removes an inert
`vercel.json` key, #375 adds a per-city sweep alarm, #368 is a cache-bust, #372 is QA port isolation — none
touch `lib/`-from-`api/` import shape).

**Not re-litigated:** D-05 through D-11 were "fix after launch" or "Tim action" items in the original review
and none of today's merges regress them, except D-11 (About's dead GitHub-issues link), which #376 also
fixes — folded into the D-02 row above rather than given its own line.

### Conditions I cannot verify from code — Tim must confirm before rollout

1. **The UMP consent form actually renders for an EEA/UK user on a device.** The code path is correct and
   fails closed, but `requestConsentInfo()`'s behaviour depends on Google's live consent decision for this
   app ID plus the published GDPR message — that only proves out on-device (or via AdMob's debug geography
   override) after this build installs. If it doesn't render, the fail-closed path means no ads in that
   region rather than an unconsented ad, so the risk is lost revenue, not a compliance breach — but it
   should still be checked before or immediately after rollout.
2. **D-09 Play Console permission declarations** (`USE_FULL_SCREEN_INTENT`, `SCHEDULE_EXACT_ALARM`
   justification) — unchanged since the original review, still Tim's action in the Play Console, not
   verifiable from source. Missing them doesn't block submission but silently drops the lock-screen leave-by
   alarm (FB-34) on Android 14+ if Play revokes FSI by default.
3. **PR #376 merging as reviewed.** D-02's "closed" status above is conditional on that exact diff (or an
   equivalent one) landing — if Tim's review changes the substance of the GDPR section, Sentry disclosure, or
   price, re-check before treating D-02 as closed.

### Outcome

D-01, D-03 and D-04 are closed on `origin/master` @ `43abf1f`, verified by reading the merged source (not
the PR descriptions) and running `qa/ad-consent-gate.mjs` and `qa/feedback-abuse.mjs` myself in the
foreground — both PASS. D-02 is not yet true on master; it's a reviewed, mergeable, QA-green open PR
(#376) that matches what the checklist needs, waiting on Tim's review as its own gate (legal-facing copy).

I'm comfortable signing off **conditional on #376 merging substantially as diffed**, plus the two device/
console confirmations above that no amount of source-reading can substitute for. This isn't a full
re-litigation of D-05–D-11 (unchanged, already accepted as post-launch) or a new pen test — same lean
scope as the checklist.

> I have completed a lean security review of Next Train (Android / Play 3.0.0) against the agreed checklist.
> D-01, D-03 and D-04 are closed on `origin/master` @ `43abf1f`. D-02 is closed **conditional on PR #376
> merging as reviewed** (`jim/privacy-copy-3.0.0-v2`) — Tim's copy review, not a code concern. Two items need
> Tim's confirmation outside source that I cannot verify myself: the UMP consent form rendering for a real
> EEA/UK user on-device, and the D-09 Play Console permission declarations (`USE_FULL_SCREEN_INTENT`,
> `SCHEDULE_EXACT_ALARM`). D-05 through D-11 remain accepted for post-launch as before. **Signed off for Play
> public release (production, staged rollout), conditional on #376 merging and the two confirmations above.**
> — Dwayne, 13 Sep 2026
