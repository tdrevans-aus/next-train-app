import { AdMob } from "@capacitor-community/admob";

const GOOGLE_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";

export async function showNativeBanner(config) {
  await AdMob.initialize({
    initializeForTesting: Boolean(config.admobTestMode),
  });

  const adId = config.admobTestMode ? GOOGLE_TEST_BANNER_ID : config.admobBannerId;

  await AdMob.showBanner({
    adId,
    adSize: "ADAPTIVE_BANNER",
    position: "BOTTOM_CENTER",
    margin: 72,
    isTesting: Boolean(config.admobTestMode),
  });
}

export async function hideNativeBanner() {
  await AdMob.hideBanner();
}
