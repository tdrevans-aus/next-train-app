const CONSENT_KEY = "nextTrainAdConsent";
const ADS_LOADED_KEY = "nextTrainAdsLoaded";

function getConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

function setConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
}

function isConfigured(config) {
  return Boolean(config.adsenseClient && config.adsenseSlot);
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

function showConsentBanner(onAccept, onDecline) {
  if (document.getElementById("consent-banner")) {
    return;
  }

  const banner = document.createElement("div");
  banner.id = "consent-banner";
  banner.className = "consent-banner";
  banner.innerHTML = `
    <p class="consent-text">
      We use cookies for ads (Google AdSense) to keep this app free.
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

async function initAds() {
  const container = document.getElementById("ad-container");
  if (!container) {
    return;
  }

  try {
    const response = await fetch("/site-config.json");
    const config = await response.json();

    if (!isConfigured(config)) {
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
      showConsentBanner(enableAds, disableAds);
    }
  } catch (error) {
    console.warn("Could not load ad config", error);
    container.hidden = true;
  }
}

initAds();
