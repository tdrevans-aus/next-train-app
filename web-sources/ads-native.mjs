import { AdMob, AdmobConsentStatus } from "@capacitor-community/admob";

const GOOGLE_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
const CONSENT_TIMEOUT_MS = 5_000;
// The plugin's dist/esm/consent barrel doesn't re-export
// PrivacyOptionsRequirementStatus (deep-path-only in v8.0.0); it's a plain
// string enum, so use the literal value rather than a fragile deep import.
const PRIVACY_OPTIONS_REQUIRED = "REQUIRED";

// Test-only seam (qa/ad-consent-gate.mjs): swap the real AdMob plugin for a
// stub, and reset the once-per-app-start consent cache, without touching
// production behaviour (default is always the real plugin instance).
let admobClient = AdMob;
export function __setAdMobClientForTests(client) {
  admobClient = client ?? AdMob;
  consentInfo = null;
  consentRoundTripDone = false;
  consentRoundTripPromise = null;
  bannerMounted = false;
  bannerVisible = false;
  cachedReleaseBuild = null;
}

let cachedReleaseBuild = null;
let bannerMounted = false;
let bannerVisible = false;

// D-01 (docs/dwayne-security-review-play-3.0.0.md, docs/jim-brief-eu-ad-consent.md):
// Google's UMP consent round-trip runs at most once per app start and is
// cached here, the same way cachedReleaseBuild is. resumeNativeBanner() must
// never re-run it.
let consentInfo = null; // last AdmobConsentInfo from requestConsentInfo/showConsentForm
let consentRoundTripDone = false;
let consentRoundTripPromise = null;

function isAdFreeUser() {
  try {
    return Boolean(window.NextTrainAdFree?.isEntitled?.());
  } catch {
    return false;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("UMP consent timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Gather EU/UK ad consent before the first ad request. Fail-closed: any
 * throw or timeout here must leave the banner unshown, never block the
 * departure board, and never fall back to an unconsented ad request.
 * Returns `{ canRequestAds, privacyOptionsRequired }`.
 */
async function ensureConsent() {
  if (isAdFreeUser()) {
    // Ad-free users request no ads at all, so no consent form either.
    return { canRequestAds: false, privacyOptionsRequired: false };
  }

  if (consentRoundTripDone) {
    return {
      canRequestAds: Boolean(consentInfo?.canRequestAds),
      privacyOptionsRequired:
        consentInfo?.privacyOptionsRequirementStatus === PRIVACY_OPTIONS_REQUIRED,
    };
  }

  if (consentRoundTripPromise) {
    return consentRoundTripPromise;
  }

  consentRoundTripPromise = (async () => {
    try {
      let info = await withTimeout(admobClient.requestConsentInfo(), CONSENT_TIMEOUT_MS);

      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await withTimeout(admobClient.showConsentForm(), CONSENT_TIMEOUT_MS);
      }

      consentInfo = info;
      consentRoundTripDone = true;

      return {
        canRequestAds: Boolean(info.canRequestAds),
        privacyOptionsRequired:
          info.privacyOptionsRequirementStatus === PRIVACY_OPTIONS_REQUIRED,
      };
    } catch (error) {
      console.warn("UMP consent gathering failed; showing no banner", error);
      // Fail-closed, but don't cache the failure as "done" — a later app
      // resume (or the Menu → Privacy options path) may succeed.
      return { canRequestAds: false, privacyOptionsRequired: false };
    } finally {
      consentRoundTripPromise = null;
    }
  })();

  return consentRoundTripPromise;
}

/** Menu → Privacy options (only shown when required). Reopens Google's form. */
export async function showPrivacyOptionsForm() {
  await admobClient.showPrivacyOptionsForm();
}

export async function isPrivacyOptionsRequired() {
  if (isAdFreeUser()) {
    return false;
  }
  const { privacyOptionsRequired } = await ensureConsent();
  return privacyOptionsRequired;
}

async function isNativeReleaseBuild() {
  if (!window.Capacitor?.isNativePlatform?.()) {
    return false;
  }

  if (cachedReleaseBuild !== null) {
    return cachedReleaseBuild;
  }

  try {
    const plugin =
      window.Capacitor.Plugins?.WidgetSync ??
      window.Capacitor.registerPlugin?.("WidgetSync");
    const result = await plugin?.isDebugBuild?.();
    cachedReleaseBuild = result ? !result.debug : false;
  } catch {
    cachedReleaseBuild = false;
  }

  return cachedReleaseBuild;
}

export async function resolveEffectiveTestMode(config) {
  const fromConfig = Boolean(config.admobTestMode);

  if (!window.Capacitor?.isNativePlatform?.()) {
    return fromConfig;
  }

  if (await isNativeReleaseBuild()) {
    return false;
  }

  // Debug APK keeps test ads even when prod site-config has admobTestMode: false.
  return true;
}

export async function showNativeBanner(config) {
  if (bannerVisible) {
    return;
  }

  if (bannerMounted) {
    await admobClient.resumeBanner();
    bannerVisible = true;
    return;
  }

  const { canRequestAds } = await ensureConsent();
  if (!canRequestAds) {
    // No consent (or none needed to be asked for, e.g. ad-free) → no ad
    // request at all. Leave bannerMounted/bannerVisible false so a later
    // call (e.g. after Menu → Privacy options grants consent) can retry.
    return;
  }

  const admobTestMode = await resolveEffectiveTestMode(config);
  const bannerConfig = { ...config, admobTestMode };

  await admobClient.initialize({
    initializeForTesting: admobTestMode,
  });

  const adId = admobTestMode ? GOOGLE_TEST_BANNER_ID : bannerConfig.admobBannerId;

  await admobClient.showBanner({
    adId,
    adSize: "ADAPTIVE_BANNER",
    position: "BOTTOM_CENTER",
    margin: 72,
    isTesting: admobTestMode,
  });

  bannerMounted = true;
  bannerVisible = true;
}

export async function resumeNativeBanner() {
  if (!bannerMounted || bannerVisible) {
    return;
  }

  await admobClient.resumeBanner();
  bannerVisible = true;
}

/**
 * Tear the banner out of the Activity. Prefer this over hideBanner when the
 * keyboard may open — Android keyboard resize can yank a "hidden" AdMob view
 * to the top of the WebView and cover the sheet.
 */
export async function removeNativeBanner() {
  if (!bannerMounted) {
    bannerVisible = false;
    return;
  }

  try {
    await admobClient.removeBanner();
  } catch (error) {
    try {
      await admobClient.hideBanner();
    } catch {
      // Best-effort — banner may already be gone.
    }
    console.warn("AdMob removeBanner failed; fell back to hide", error);
  }

  bannerMounted = false;
  bannerVisible = false;
}

export async function hideNativeBanner(options = {}) {
  const force = Boolean(options.force);
  if (!bannerMounted) {
    return;
  }
  if (!force && !bannerVisible) {
    return;
  }

  if (force) {
    await removeNativeBanner();
    return;
  }

  await admobClient.hideBanner();
  bannerVisible = false;
}
