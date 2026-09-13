/**
 * D-01 (docs/dwayne-security-review-play-3.0.0.md,
 * docs/jim-brief-eu-ad-consent.md): EU/UK ad consent (Google UMP) must gate
 * every native ad request. Exercises web-sources/ads-native.mjs's
 * showNativeBanner() in-process with a stubbed AdMob plugin — no real UMP
 * network call, no real AdMob banner.
 *
 * Checks:
 *  a. showBanner is never called when requestConsentInfo resolves
 *     canRequestAds: false (consent required and declined).
 *  b. showBanner is called exactly once when canRequestAds: true.
 *  c. No UMP call at all (requestConsentInfo not called) on the ad-free
 *     path — window.NextTrainAdFree.isEntitled() === true.
 *  d. A UMP throw (requestConsentInfo rejects) leaves the board rendering:
 *     showNativeBanner resolves without throwing, and shows no banner.
 *
 * Usage: node qa/ad-consent-gate.mjs
 */

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

// web-sources/ads-native.mjs references bare `window.*` (it runs unbundled
// in the app's WebView, where window is global). Node has no window, so
// stand one up before importing.
globalThis.window = {
  Capacitor: { isNativePlatform: () => true },
  NextTrainAdFree: { isEntitled: () => false },
};

function makeAdmobStub({ consentInfo, consentThrows = false, formInfo } = {}) {
  const calls = { requestConsentInfo: 0, showConsentForm: 0, showBanner: 0, initialize: 0 };
  return {
    calls,
    async requestConsentInfo() {
      calls.requestConsentInfo += 1;
      if (consentThrows) {
        throw new Error("UMP unavailable (simulated)");
      }
      return consentInfo;
    },
    async showConsentForm() {
      calls.showConsentForm += 1;
      return formInfo ?? consentInfo;
    },
    async showPrivacyOptionsForm() {},
    async resetConsentInfo() {},
    async initialize() {
      calls.initialize += 1;
    },
    async showBanner() {
      calls.showBanner += 1;
    },
    async resumeBanner() {},
    async hideBanner() {},
    async removeBanner() {},
  };
}

async function run() {
  const ads = await import("../web-sources/ads-native.mjs");
  const config = { admobTestMode: false, admobBannerId: "ca-app-pub-test/1" };

  // --- (b) canRequestAds: true → showBanner called exactly once ---
  {
    globalThis.window.NextTrainAdFree.isEntitled = () => false;
    const stub = makeAdmobStub({
      consentInfo: {
        status: "REQUIRED",
        isConsentFormAvailable: true,
        canRequestAds: false,
        privacyOptionsRequirementStatus: "REQUIRED",
      },
      formInfo: {
        status: "OBTAINED",
        isConsentFormAvailable: true,
        canRequestAds: true,
        privacyOptionsRequirementStatus: "REQUIRED",
      },
    });
    ads.__setAdMobClientForTests(stub);
    await ads.showNativeBanner(config);
    assert(stub.calls.requestConsentInfo === 1, `(b) expected 1 requestConsentInfo call, got ${stub.calls.requestConsentInfo}`);
    assert(stub.calls.showConsentForm === 1, `(b) expected 1 showConsentForm call (status REQUIRED), got ${stub.calls.showConsentForm}`);
    assert(stub.calls.showBanner === 1, `(b) expected exactly 1 showBanner call when canRequestAds becomes true, got ${stub.calls.showBanner}`);

    const required = await ads.isPrivacyOptionsRequired();
    assert(required === true, "(b) Menu -> Privacy options should be required after an OBTAINED consent with privacyOptionsRequirementStatus REQUIRED");
  }

  // --- (a) canRequestAds: false (declined) → showBanner never called ---
  {
    globalThis.window.NextTrainAdFree.isEntitled = () => false;
    const stub = makeAdmobStub({
      consentInfo: {
        status: "REQUIRED",
        isConsentFormAvailable: true,
        canRequestAds: false,
        privacyOptionsRequirementStatus: "REQUIRED",
      },
      formInfo: {
        status: "OBTAINED", // form was shown and answered, but consent was declined
        isConsentFormAvailable: true,
        canRequestAds: false,
        privacyOptionsRequirementStatus: "REQUIRED",
      },
    });
    ads.__setAdMobClientForTests(stub);
    await ads.showNativeBanner(config);
    assert(stub.calls.showBanner === 0, `(a) expected 0 showBanner calls when canRequestAds is false, got ${stub.calls.showBanner}`);
    assert(stub.calls.initialize === 0, "(a) AdMob.initialize must not run when canRequestAds is false");
  }

  // --- (c) ad-free path → no UMP call at all ---
  {
    globalThis.window.NextTrainAdFree.isEntitled = () => true;
    const stub = makeAdmobStub({
      consentInfo: { status: "REQUIRED", isConsentFormAvailable: true, canRequestAds: true, privacyOptionsRequirementStatus: "REQUIRED" },
    });
    ads.__setAdMobClientForTests(stub);
    await ads.showNativeBanner(config);
    assert(stub.calls.requestConsentInfo === 0, `(c) expected 0 requestConsentInfo calls for an ad-free user, got ${stub.calls.requestConsentInfo}`);
    assert(stub.calls.showBanner === 0, "(c) ad-free user must never see a banner");

    const required = await ads.isPrivacyOptionsRequired();
    assert(required === false, "(c) ad-free user must never see the Privacy options menu entry either");
  }

  // --- (d) UMP throw → board keeps rendering (no throw), no banner ---
  {
    globalThis.window.NextTrainAdFree.isEntitled = () => false;
    const stub = makeAdmobStub({ consentThrows: true });
    ads.__setAdMobClientForTests(stub);
    let threw = false;
    try {
      await ads.showNativeBanner(config);
    } catch {
      threw = true;
    }
    assert(!threw, "(d) a UMP throw must not propagate out of showNativeBanner (would block the departure board)");
    assert(stub.calls.showBanner === 0, "(d) a UMP throw must leave no banner shown");
  }

  // --- geography DISABLED (e.g. AU): NOT_REQUIRED, canRequestAds already true → banner as normal ---
  {
    globalThis.window.NextTrainAdFree.isEntitled = () => false;
    const stub = makeAdmobStub({
      consentInfo: {
        status: "NOT_REQUIRED",
        isConsentFormAvailable: false,
        canRequestAds: true,
        privacyOptionsRequirementStatus: "NOT_REQUIRED",
      },
    });
    ads.__setAdMobClientForTests(stub);
    await ads.showNativeBanner(config);
    assert(stub.calls.showConsentForm === 0, "(AU) no consent form should be shown when status is NOT_REQUIRED");
    assert(stub.calls.showBanner === 1, "(AU) banner should still show once when consent is not required");
  }

  if (failures > 0) {
    console.error(`FAIL ad-consent-gate: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("PASS ad-consent-gate: UMP consent correctly gates every native ad request");
}

run();
