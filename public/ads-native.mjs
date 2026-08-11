import { AdMob } from "@capacitor-community/admob";

const GOOGLE_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";

let cachedReleaseBuild = null;

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
}

export async function hideNativeBanner() {
  await AdMob.hideBanner();
}
