const CONSENT_KEY = "nextTrainAdConsent";
const ADS_LOADED_KEY = "nextTrainAdsLoaded";

const GOOGLE_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";

function getConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
}

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function isAdSenseConfigured(config) {
  return Boolean(config.adsenseClient && config.adsenseSlot);
}

function isAdMobConfigured(config) {
  return Boolean(config.admobAppId && config.admobBannerId);
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
    localStorage.setItem(ADS_LOADED_KEY, "1");
  } catch (error) {
    console.warn("AdSense failed to load", error);
  }
}

function showConsentBanner({ onAccept, onDecline, adNetwork }) {
  if (document.getElementById("consent-banner")) {
    return;
  }

  const banner = document.createElement("div");
  banner.id = "consent-banner";
  banner.className = "consent-banner";
  banner.innerHTML = `
    <p class="consent-text">
      We use ads (${adNetwork}) to keep this app free.
      <a href="/privacy.html">Privacy policy</a>
    </p>
    <div class="consent-actions">
      <button type="button" class="btn-secondary consent-decline">No thanks</button>
      <button type="button" class="btn-primary consent-accept">Accept</button>
    </div>
  `;

  document.body.appendChild(banner);

  banner.querySelector(".consent-accept").addEventListener("click", () => {
    banner.remove();
    onAccept();
  });

  banner.querySelector(".consent-decline").addEventListener("click", () => {
    banner.remove();
    onDecline();
  });
}

async function showNativeBanner(config) {
  const AdMob = window.Capacitor?.Plugins?.AdMob;
  if (!AdMob) {
    throw new Error("AdMob plugin not available");
  }

  await AdMob.initialize({
    initializeForTesting: Boolean(config.admobTestMode),
  });

  const adId = config.admobTestMode ? GOOGLE_TEST_BANNER_ID : config.admobBannerId;

  await AdMob.showBanner({
    adId,
    adSize: "ADAPTIVE_BANNER",
    position: "BOTTOM_CENTER",
    margin: 0,
    isTesting: Boolean(config.admobTestMode),
  });

  localStorage.setItem(ADS_LOADED_KEY, "1");
}

async function initWebAds(container, config) {
  if (!isAdSenseConfigured(config)) {
    renderPlaceholderAd(container);
    return;
  }

  const enableAds = () => {
    setConsent("accepted");
    loadAdSenseScript(config.adsenseClient);
    renderAdUnit(container, config);
  };

  const disableAds = () => {
    setConsent("declined");
    container.hidden = true;
  };

  const consent = getConsent();
  if (consent === "accepted") {
    enableAds();
  } else if (consent === "declined") {
    disableAds();
  } else {
    showConsentBanner({
      onAccept: enableAds,
      onDecline: disableAds,
      adNetwork: "Google AdSense",
    });
  }
}

async function initNativeAds(container, config) {
  if (!isAdMobConfigured(config)) {
    renderPlaceholderAd(container);
    return;
  }

  container.hidden = true;

  const enableAds = async () => {
    setConsent("accepted");
    try {
      await showNativeBanner(config);
    } catch (error) {
      console.warn("AdMob failed to load", error);
      renderPlaceholderAd(container);
    }
  };

  const disableAds = async () => {
    setConsent("declined");
    const AdMob = window.Capacitor?.Plugins?.AdMob;
    if (AdMob?.hideBanner) {
      await AdMob.hideBanner();
    }
    container.hidden = true;
  };

  const consent = getConsent();
  if (consent === "accepted") {
    await enableAds();
  } else if (consent === "declined") {
    await disableAds();
  } else {
    showConsentBanner({
      onAccept: () => {
        enableAds();
      },
      onDecline: () => {
        disableAds();
      },
      adNetwork: "Google AdMob",
    });
  }
}

async function initAds() {
  const container = document.getElementById("ad-container");
  if (!container) {
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
    container.hidden = true;
  }
}

initAds();
