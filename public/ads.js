function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function isAdSenseConfigured(config) {
  return Boolean(config.adsenseClient && config.adsenseSlot);
}

function isAdMobConfigured(config) {
  return Boolean(config.admobAppId && config.admobBannerId);
}

function hideAdSlotCompletely(container) {
  if (!container) {
    return;
  }

  container.hidden = true;
  container.innerHTML = "";
  syncAdBannerScrollPadding();
  window.NextTrainAdFree?.syncPurchaseLinkVisibility?.();
}

function renderPlaceholderAd(container) {
  container.hidden = false;
  container.innerHTML = `
    <div class="ad-placeholder" aria-label="Advertisement preview">
      <span class="ad-placeholder-badge">Ad preview</span>
      <p class="ad-placeholder-title">Your ad appears here</p>
      <p class="ad-placeholder-sub">Typical mobile banner · below train details</p>
    </div>
  `;
  syncAdRemoveLink();
}

function syncAdRemoveLink() {
  window.NextTrainAdFree?.syncPurchaseLinkVisibility?.();
}

function loadAdSenseScript(clientId) {
  if (document.querySelector("script[data-adsense]")) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  script.crossOrigin = "anonymous";
  script.dataset.adsense = "true";
  document.head.appendChild(script);
}

function renderAdUnit(container, config) {
  container.innerHTML = "";
  container.hidden = false;

  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.dataset.adClient = config.adsenseClient;
  ins.dataset.adSlot = config.adsenseSlot;
  ins.dataset.adFormat = "auto";
  ins.dataset.fullWidthResponsive = "true";

  container.appendChild(ins);

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (error) {
    console.warn("AdSense failed to load", error);
  }

  syncAdRemoveLink();
}

async function ensureNativeAdsBridge() {
  if (!isNativeApp()) {
    return;
  }

  if (window.NextTrainAdsNative?.showNativeBanner) {
    return;
  }

  const { loadScriptOnce, waitForCapacitor } = window.NextTrainScripts ?? {};
  if (waitForCapacitor) {
    await waitForCapacitor();
  }

  if (window.NextTrainAdsNative?.showNativeBanner) {
    return;
  }

  if (!loadScriptOnce) {
    return;
  }

  try {
    await loadScriptOnce("ads-bundle.js");
  } catch (error) {
    console.warn("Could not load AdMob native bridge", error);
  }
}

let adsInitInFlight = null;
let cachedAdConfig = null;
let nativeBannerPrepared = false;
let nativeBannerShown = false;
let overlaySuppressed = false;
let overlaySuppressionSyncInFlight = null;
let bannerOpChain = Promise.resolve();

function queueBannerOp(label, fn) {
  bannerOpChain = bannerOpChain
    .then(() => fn())
    .catch((error) => {
      console.warn(`Native banner op failed (${label})`, error);
    });
  return bannerOpChain;
}

function isOverlaySuppressedByClass() {
  return (
    document.body.classList.contains("app-dialog-open") ||
    document.body.classList.contains("widget-setup-active") ||
    document.body.classList.contains("region-setup-active")
  );
}

function syncAdBannerScrollPadding() {
  const entitled = window.NextTrainAdFree?.isEntitled?.();
  const suppressed = isOverlaySuppressedByClass();
  const nativeActive =
    isNativeApp() && nativeBannerShown && !suppressed && !entitled;
  const hasClass = document.body.classList.contains("native-ad-banner");

  if (nativeActive === hasClass) {
    return;
  }

  if (nativeActive) {
    document.body.classList.add("native-ad-banner");
  } else {
    document.body.classList.remove("native-ad-banner");
  }
}

async function hideNativeBannerSafe(options = {}) {
  const force = Boolean(options.force);
  await ensureNativeAdsBridge();
  const native = window.NextTrainAdsNative;
  if (
    !native?.hideNativeBanner ||
    (!force && (!nativeBannerPrepared || !nativeBannerShown))
  ) {
    syncAdBannerScrollPadding();
    return bannerOpChain;
  }

  return queueBannerOp("hide", async () => {
    if (!force && !nativeBannerShown) {
      return;
    }

    try {
      // force → removeBanner (hideBanner still jumps over the keyboard on Android).
      await native.hideNativeBanner({ force });
      nativeBannerShown = false;
      if (force) {
        nativeBannerPrepared = false;
      }
    } catch (error) {
      console.warn("Could not hide native banner", error);
    }

    syncAdBannerScrollPadding();
  });
}

function isAdOverlaySuppressed() {
  return isOverlaySuppressedByClass();
}

async function restoreNativeBannerSafe() {
  if (nativeBannerShown) {
    syncAdBannerScrollPadding();
    return bannerOpChain;
  }

  if (isAdOverlaySuppressed()) {
    syncAdBannerScrollPadding();
    return bannerOpChain;
  }

  if (!cachedAdConfig || !isAdMobConfigured(cachedAdConfig)) {
    return bannerOpChain;
  }

  await ensureNativeAdsBridge();
  const native = window.NextTrainAdsNative;
  if (!native?.showNativeBanner) {
    throw new Error("AdMob bundle not loaded");
  }

  return queueBannerOp("restore", async () => {
    if (nativeBannerShown || isAdOverlaySuppressed()) {
      return;
    }

    try {
      if (nativeBannerPrepared && native.resumeNativeBanner) {
        await native.resumeNativeBanner();
      } else {
        await native.showNativeBanner(cachedAdConfig);
        nativeBannerPrepared = true;
      }

      if (isAdOverlaySuppressed()) {
        try {
          await native.hideNativeBanner?.({ force: true });
        } catch {
          // Dialog won the race — leave banner off.
        }
        nativeBannerShown = false;
        nativeBannerPrepared = false;
        syncAdBannerScrollPadding();
        return;
      }

      nativeBannerShown = true;
      syncAdRemoveLink();
      syncAdBannerScrollPadding();
    } catch (error) {
      console.warn("Could not restore native banner", error);
      throw error;
    }
  });
}

async function showNativeBanner(config) {
  await ensureNativeAdsBridge();

  const native = window.NextTrainAdsNative;
  if (!native?.showNativeBanner) {
    throw new Error("AdMob bundle not loaded");
  }

  if (nativeBannerShown) {
    syncAdBannerScrollPadding();
    return bannerOpChain;
  }

  if (isAdOverlaySuppressed()) {
    syncAdBannerScrollPadding();
    return bannerOpChain;
  }

  return queueBannerOp("show", async () => {
    if (nativeBannerShown || isAdOverlaySuppressed()) {
      return;
    }

    await native.showNativeBanner(config);

    if (isAdOverlaySuppressed()) {
      try {
        await native.hideNativeBanner?.({ force: true });
      } catch {
        // Dialog won the race — leave banner off.
      }
      nativeBannerShown = false;
      nativeBannerPrepared = false;
      syncAdBannerScrollPadding();
      return;
    }

    nativeBannerPrepared = true;
    nativeBannerShown = true;
    syncAdBannerScrollPadding();
    syncAdRemoveLink();
  });
}

async function initWebAds(container, config) {
  if (!isAdSenseConfigured(config)) {
    renderPlaceholderAd(container);
    return;
  }

  loadAdSenseScript(config.adsenseClient);
  renderAdUnit(container, config);
}

async function initNativeAds(container, config) {
  if (!isAdMobConfigured(config)) {
    renderPlaceholderAd(container);
    return;
  }

  container.hidden = true;

  let effectiveTestMode = Boolean(config.admobTestMode);
  if (window.NextTrainAdsNative?.resolveEffectiveTestMode) {
    effectiveTestMode = await window.NextTrainAdsNative.resolveEffectiveTestMode(config);
  }

  const effectiveConfig = { ...config, admobTestMode: effectiveTestMode };

  try {
    await showNativeBanner(effectiveConfig);
  } catch (error) {
    console.warn("AdMob failed to load", error);
    container.hidden = false;
    const detail =
      effectiveTestMode && error.message === "AdMob bundle not loaded"
        ? "Restart the app after rebuilding. Test ads use Google’s sample banner ID."
        : (error.message ?? "Try restarting the app");

    container.replaceChildren();
    const placeholder = document.createElement("div");
    placeholder.className = "ad-placeholder";
    placeholder.setAttribute("aria-label", "Advertisement");

    const badge = document.createElement("span");
    badge.className = "ad-placeholder-badge";
    badge.textContent = "Ad";

    const title = document.createElement("p");
    title.className = "ad-placeholder-title";
    title.textContent = "Ad could not load";

    const sub = document.createElement("p");
    sub.className = "ad-placeholder-sub";
    sub.textContent = detail;

    placeholder.append(badge, title, sub);
    container.appendChild(placeholder);
    syncAdRemoveLink();
  }
}

async function waitForAdFreeInit() {
  if (window.NextTrainAdFree?.ensureInit) {
    await window.NextTrainAdFree.ensureInit();
  }
}

async function syncAdOverlaySuppression() {
  const suppressed = isOverlaySuppressedByClass();
  const container = document.getElementById("ad-container");

  if (!container || window.NextTrainAdFree?.isEntitled?.()) {
    overlaySuppressed = suppressed;
    syncAdBannerScrollPadding();
    return;
  }

  if (suppressed) {
    overlaySuppressed = true;
    if (isNativeApp()) {
      await hideNativeBannerSafe({ force: true });
    }
    if (!container.hidden && container.innerHTML.trim()) {
      container.dataset.overlaySuppressed = "1";
      container.hidden = true;
    }
    syncAdBannerScrollPadding();
    return;
  }

  overlaySuppressed = false;

  if (container.dataset.overlaySuppressed === "1") {
    delete container.dataset.overlaySuppressed;
    container.hidden = false;
  }

  if (isNativeApp() && cachedAdConfig && isAdMobConfigured(cachedAdConfig)) {
    try {
      await restoreNativeBannerSafe();
    } catch (error) {
      console.warn("Could not restore native banner", error);
    }
  }

  syncAdBannerScrollPadding();
}

function queueAdOverlaySuppressionSync() {
  if (overlaySuppressionSyncInFlight) {
    return overlaySuppressionSyncInFlight;
  }

  overlaySuppressionSyncInFlight = syncAdOverlaySuppression().finally(() => {
    overlaySuppressionSyncInFlight = null;
  });
  return overlaySuppressionSyncInFlight;
}

function installOverlayAdGuard() {
  const rehideForOverlay = () => {
    if (!isOverlaySuppressedByClass()) {
      return;
    }
    queueAdOverlaySuppressionSync();
    if (isNativeApp()) {
      void hideNativeBannerSafe({ force: true });
    }
  };

  window.addEventListener("resize", rehideForOverlay);
  window.visualViewport?.addEventListener("resize", rehideForOverlay);
  window.visualViewport?.addEventListener("scroll", rehideForOverlay);
}

async function initAdsWork() {
  const container = document.getElementById("ad-container");
  if (!container) {
    return;
  }

  await waitForAdFreeInit();

  if (window.NextTrainAdFree?.isEntitled?.()) {
    hideAdSlotCompletely(container);
    return;
  }

  try {
    const response = await fetch("/site-config.json");
    const config = await response.json();
    cachedAdConfig = config;

    if (isNativeApp()) {
      await initNativeAds(container, config);
      return;
    }

    await initWebAds(container, config);
  } catch (error) {
    console.warn("Could not load ad config", error);
    hideAdSlotCompletely(container);
  }

  syncAdBannerScrollPadding();
}

function initAds() {
  if (adsInitInFlight) {
    return adsInitInFlight;
  }

  adsInitInFlight = initAdsWork().finally(() => {
    adsInitInFlight = null;
  });
  return adsInitInFlight;
}

window.NextTrainAds = {
  ...(window.NextTrainAds ?? {}),
  reload: initAds,
  hideNativeBanner: hideNativeBannerSafe,
  syncOverlaySuppression: queueAdOverlaySuppressionSync,
  // Exposed so Menu → Privacy options (public/app.js) can check
  // NextTrainAdsNative.isPrivacyOptionsRequired() without duplicating the
  // lazy-load-on-first-use logic that already lives here.
  ensureNativeAdsBridge,
};

function bootAds() {
  installOverlayAdGuard();
  const { waitForCapacitor } = window.NextTrainScripts ?? {};
  if (waitForCapacitor) {
    waitForCapacitor().then(initAds);
    return;
  }

  initAds();
}

// ads.js is loaded deferred, after first train paint (public/index.html's
// NextTrainDeferred.load()) — by then document.readyState is already
// "complete" and a bare "load" listener never fires. Run immediately in
// that case; otherwise fall back to the listener for the (non-deferred/test)
// case where ads.js loads before the window has finished loading.
if (document.readyState === "complete") {
  bootAds();
} else {
  window.addEventListener("load", bootAds, { once: true });
}

document.addEventListener("nexttrain:adfree-changed", (event) => {
  if (event.detail?.entitled) {
    const container = document.getElementById("ad-container");
    hideAdSlotCompletely(container);
    syncAdBannerScrollPadding();
    return;
  }

  initAds();
});
