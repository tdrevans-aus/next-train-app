# Jim brief — privacy policy + Data safety accuracy for 3.0.0 (LB-09: D-02)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `public/privacy.html`,
`public/about.html` and `docs/play-data-safety-cheatsheet.md`.

**tim-review: yes** — this is legal-facing copy and it sets what Tim then types into the Play Console
Data safety form. Do not merge without Tim.

Lane lock: not required.

Source: `docs/dwayne-security-review-play-3.0.0.md` finding D-02. This blocks Dwayne's Play-public sign-off.
Depends on `docs/jim-brief-eu-ad-consent.md` (D-01) landing first, because the policy must describe the
consent flow that actually ships.

## Symptom

`public/privacy.html` (last updated 24 Aug) and `docs/play-data-safety-cheatsheet.md` describe a Perth-only
app with no crash reporting and no feedback form. The 3.0.0 build has all three. An inaccurate Play Data
safety declaration is a policy violation on its own, independent of any security defect.

## What is wrong, and what the build actually does

1. **Sentry is not disclosed.** `web-sources/analytics-native.mjs` initialises `@sentry/capacitor` with the
   DSN from `public/site-config.json`, `enableAutoSessionTracking: true` and `tracesSampleRate: 0`. It sends
   device and OS info, app version and release, session data, and default breadcrumbs — which include our own
   API request URLs, so **station and direction**. Ingest is US-hosted. `beforeBreadcrumb` strips `apiKey`,
   `admobAppId` and `admobBannerId`; `trackEvent` strips `apiKey`, `station` and `email` from event props
   (this does **not** strip the station from automatic fetch breadcrumbs — describe what is true).
2. **The feedback form is not disclosed.** `api/feedback.js` forwards a free-text note plus an **optional
   email** to a Formspree webhook that reaches our support inbox.
3. **The policy is Perth/Transperth-only.** 3.0.0 covers 33 regions across AU, UK, SE, FI and NO. Live times
   are fetched by our API from the relevant operator (TfNSW, TfL, National Rail, Trafiklab, Digitransit,
   Entur and others), sending station and direction only — no identity, still no accounts.
4. **Wrong price.** The policy says Remove ads is A$3.99. It is **A$7.99** (`site-config.json`
   `adFreeListPrice`, and Tim's 11 Sep monetisation decision). Fix the policy, not the config.
5. **No GDPR/UK-GDPR content**, now that we ship in the UK, Sweden, Finland and Norway. Add: controller
   identity (Evans Studios, contact email), what we rely on for each purpose (crash diagnostics vs
   consent-based personalised ads, per D-01), the rights available (access, deletion, objection, withdrawing
   ad consent via Menu → Privacy options), and that data is processed outside the EEA/UK (Vercel and Sentry,
   US).
6. **About page** still describes a Perth-only app, and its "GitHub issues" link points at a private repo that
   404s for users (D-11 — fold it into this PR since you are in the file: drop the link, keep the support
   email).

## Constraints

- **Do not invent collection.** Every claim must match code you can point at. If something is ambiguous,
  leave a `TODO(tim)` rather than guessing.
- Keep the existing structure, headings and theme script in `privacy.html`. This is an edit, not a rewrite.
- Bump "Last updated" to the merge date.
- Keep the plain, non-legalese register the current policy uses.

## Data safety cheat sheet

Update `docs/play-data-safety-cheatsheet.md` so Tim can fill the Console form straight from it:
- **Crash logs: Yes** and **Diagnostics: Yes** (Sentry) — collected, not shared for ads, not linked to an
  identity, cannot be deleted on request (no account).
- **Personal info → Email address: Yes, optional**, collected only when a user types one into Send feedback.
- **App activity / Device IDs:** keep following Google's AdMob guidance, and note that in the EEA/UK ads only
  run after UMP consent.
- Correct the "email collected in-app: **No**" row — it is wrong today.
- Add a change-log row.

## Acceptance

- Every claim in `privacy.html` maps to shipped code; nothing the build does is missing.
- Sentry, the feedback form, multi-region operators, A$7.99 and the GDPR section are all present.
- The cheat sheet matches the policy, with no row contradicting it.
- `privacy.html` and `about.html` still render correctly in light and dark themes at mobile width.
- Links all resolve (no private-repo 404).

## QA

- `node qa/run-all.mjs --smoke` (static pages, but the smoke tier renders them).
- Manual: load `/privacy.html` and `/about.html` on the dev server in both themes.

## Dispatch notes

Commit, push, and open a **draft** PR linking this brief and `docs/dwayne-security-review-play-3.0.0.md`, and
say plainly in the description that it is `tim-review: yes` and must not be merged without Tim. Leave no
background sleep or poll loops running when you finish.
