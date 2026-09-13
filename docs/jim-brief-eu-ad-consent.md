# Jim brief — EU/UK ad consent (UMP) before Play public (LB-09: D-01)

**Mode: bug-fix / product mode** (CLAUDE.md "Bug-fix lane"). Authorises `web-sources/ads-native.mjs`,
`public/ads-bundle.js`, `public/ads.js`, `public/index.html` (Menu entry only), `public/app.js` (wiring only),
and `qa/`.

tim-review: no — Tim chose **Option A** on 12 Sep 2026 after reading
`docs/dwayne-security-review-play-3.0.0.md`. The consent form itself is rendered by Google from the AdMob
console message, so there is no copy for us to write.

Lane lock: not required — this touches no city's `lib/providers/<city>.js` adapter.

Source: `docs/dwayne-security-review-play-3.0.0.md` finding D-01. This blocks Dwayne's Play-public sign-off.
Needs to merge by **Mon 15 Sep**.

## Why

Release 1 serves AdMob to users in the UK, Sweden, Finland and Norway. Google's EU User Consent Policy
requires a Google-certified CMP (the UMP SDK) before ads are requested for EEA/UK users. Without it we risk an
AdMob policy strike, limited or no fill in those regions, and direct GDPR/ePrivacy exposure. The residual was
accepted on 11 Aug when the app was Perth-only; that scope no longer holds.

## What to build

`@capacitor-community/admob` **8.0.0** is already installed and ships the full UMP surface:
`requestConsentInfo()`, `showConsentForm()`, `showPrivacyOptionsForm()`, `resetConsentInfo()`, plus
`AdmobConsentStatus`, `PrivacyOptionsRequirementStatus` and `AdmobConsentDebugGeography`. Use it — do not add
another consent library.

1. **Gather consent before the first ad request.** In `web-sources/ads-native.mjs`, `showNativeBanner()`
   currently calls `AdMob.initialize()` then `AdMob.showBanner()`. Ahead of both, call `requestConsentInfo()`,
   and when `isConsentFormAvailable` is true and the status is `REQUIRED`, `showConsentForm()`. Only proceed
   to `initialize()` / `showBanner()` when the result says `canRequestAds` is true. If `canRequestAds` is
   false, show no banner at all and leave the layout as it is in the ad-free case — never fall back to
   serving an unconsented ad.
2. **Do the consent round-trip once per app start**, not per banner mount, and cache the result the way
   `cachedReleaseBuild` already is. `resumeNativeBanner()` must not re-run it.
3. **Skip it entirely when the user is ad-free.** If `NextTrainAdFree` says ads are off, we request no ads,
   so we must not show a consent form. Check this before the UMP call.
4. **Failure is fail-closed.** If the UMP call throws or times out (~5 s), show no banner and log a warning.
   A rider must never be blocked from train times by a consent failure — the app must render normally with no
   ad slot.
5. **Add a "Privacy options" entry to the Menu**, shown only when `privacyOptionsRequirementStatus` is
   `REQUIRED`, calling `showPrivacyOptionsForm()`. Google requires an ongoing way to change consent. Put it
   next to the existing About / Privacy links in `public/index.html` and keep the label exactly
   `Privacy options`.
6. **Do not touch the test-mode path.** `resolveEffectiveTestMode()` and the debug-build behaviour stay as
   they are.

## Acceptance

- With a debug build and `AdmobConsentDebugGeography.EEA`, a consent form appears before any ad request, and
  no banner shows until it is answered.
- Declining leaves the app fully usable with no ad slot and no console errors.
- With geography `DISABLED` (i.e. AU), behaviour is unchanged from today: banner as now, no form.
- An ad-free user sees no consent form in either geography.
- After consenting, `Menu → Privacy options` reopens the Google form.
- A forced UMP rejection (stub a throw) shows no banner and does not block the departure board.

## QA

- New `qa/ad-consent-gate.mjs`: with UMP stubbed, assert that (a) `showBanner` is never called when
  `canRequestAds` is false, (b) it is called once when true, (c) no UMP call is made on the ad-free path, and
  (d) a UMP throw leaves the board rendering. No live AdMob calls.
- Register it in `qa/run-all.mjs` in the smoke tier.
- `node qa/run-all.mjs --smoke`.

## Tim's side (not Jim)

AdMob console → Privacy & messaging → create and publish a **GDPR message** for the EEA/UK covering the
Next Train app. The form cannot render until that message is published, so publish it before the device test.

## Dispatch notes

Commit, push, and open a PR linking this brief and `docs/dwayne-security-review-play-3.0.0.md`. Leave no
background sleep or poll loops running when you finish.
