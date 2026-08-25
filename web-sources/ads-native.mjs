import { AdMob } from "@capacitor-community/admob";

const GOOGLE_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";

let cachedReleaseBuild = null;
let bannerMounted = false;
let bannerVisible = false;
let admobAvailability = null;

function isAdMobNativeLinked() {
  if (admobAvailability !== null) {
    return admobAvailability;
  }

  const Cap = window.Capacitor;
  if (!Cap?.isNativePlatform?.()) {
    admobAvailability = false;
    return admobAvailability;
  }

  if (Cap.PluginHeaders?.some?.((header) => header?.name === "AdMob")) {
    admobAvailability = true;
    return admobAvailability;
  }

  // Capacitor plugin JS injection installs plain stubs with own methods.
  // Our @capacitor/core require shim may place a Proxy on Plugins.AdMob — that
  // is not a linked native plugin (CAPACITOR-15).
  const stub = Cap.Plugins?.AdMob;
  admobAvailability = Boolean(
    stub &&
      typeof stub === "object" &&
      Object.prototype.hasOwnProperty.call(stub, "initialize") &&
      typeof stub.initialize === "function"
  );
  return admobAvailability;
}

function assertAdMobUsable() {
  if (!window.Capacitor?.isNativePlatform?.()) {
    return;
  }
  if (isAdMobNativeLinked()) {
    return;
  }
  throw new Error("AdMob native plugin is not linked in this build");
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

  assertAdMobUsable();

  if (bannerMounted) {
    await AdMob.resumeBanner();
    bannerVisible = true;
    return;
  }

  const admobTestMode = await resolveEffectiveTestMode(config);
  const bannerConfig = { ...config, admobTestMode };

  await AdMob.initialize({
    initializeForTesting: admobTestMode,
  });

  const adId = admobTestMode ? GOOGLE_TEST_BANNER_ID : bannerConfig.admobBannerId;

  await AdMob.showBanner({
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

  await AdMob.resumeBanner();
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
    await AdMob.removeBanner();
  } catch (error) {
    try {
      await AdMob.hideBanner();
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

  await AdMob.hideBanner();
  bannerVisible = false;
}
