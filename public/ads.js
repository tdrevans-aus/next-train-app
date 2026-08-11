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

  if (window.NextTrainAds?.showNativeBanner) {
    return;
  }

  const { loadScriptOnce, waitForCapacitor } = window.NextTrainScripts ?? {};
  if (!loadScriptOnce || !waitForCapacitor) {
    return;
  }

  await waitForCapacitor();
  if (!window.Capacitor) {
    return;
  }

  const reload = window.NextTrainAds?.reload;
  try {
    await loadScriptOnce("ads-bundle.js");
  } catch (error) {
    console.warn("Could not load AdMob native bridge", error);
    return;
  }

  if (reload) {
    window.NextTrainAds = {
      ...window.NextTrainAds,
      reload,
    };
  }
}

async function showNativeBanner(config) {
  await ensureNativeAdsBridge();

  if (!window.NextTrainAds?.showNativeBanner) {
    throw new Error("AdMob bundle not loaded");
  }

  await window.NextTrainAds.showNativeBanner(config);
  syncAdRemoveLink();
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
  if (window.NextTrainAds?.resolveEffectiveTestMode) {
    effectiveTestMode = await window.NextTrainAds.resolveEffectiveTestMode(config);
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

let adsInitInFlight = null;

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

    if (isNativeApp()) {
      await initNativeAds(container, config);
      return;
    }

    await initWebAds(container, config);
  } catch (error) {
    console.warn("Could not load ad config", error);
    hideAdSlotCompletely(container);
  }
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
};

window.addEventListener("load", () => {
  const { waitForCapacitor } = window.NextTrainScripts ?? {};
  if (waitForCapacitor) {
    waitForCapacitor().then(initAds);
    return;
  }

  initAds();
});

document.addEventListener("nexttrain:adfree-changed", (event) => {
  if (event.detail?.entitled) {
    const container = document.getElementById("ad-container");
    hideAdSlotCompletely(container);
    return;
  }

  initAds();
});
