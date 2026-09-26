/**
 * About / Privacy — native AdMob banner persists across in-app navigation.
 * Apply the same scroll padding class as the main app when ads are active.
 */
(function () {
  function isNativeApp() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function isAdFreeEntitled() {
    if (window.NextTrainAdFree?.isEntitled?.()) {
      return true;
    }
    return localStorage.getItem("nextTrainAdFreeCache") === "1";
  }

  function syncNativeAdPadding() {
    const nativeActive = isNativeApp() && !isAdFreeEntitled();
    const hasClass = document.body.classList.contains("native-ad-banner");

    if (nativeActive === hasClass) {
      return;
    }

    if (nativeActive) {
      document.body.classList.add("native-ad-banner");
      if (window.Capacitor?.getPlatform?.() === "ios") {
        document.body.classList.add("native-ad-banner-ios");
      }
    } else {
      document.body.classList.remove("native-ad-banner");
      document.body.classList.remove("native-ad-banner-ios");
    }
  }

  syncNativeAdPadding();
  document.addEventListener("nexttrain:adfree-changed", syncNativeAdPadding);
})();
