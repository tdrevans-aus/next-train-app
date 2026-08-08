const CONSENT_KEY = "nextTrainAdConsent";

const ADS_LOADED_KEY = "nextTrainAdsLoaded";



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



function showAdNoticeBanner({ onContinue, adNetwork }) {

  if (document.getElementById("consent-banner")) {

    return;

  }



  const banner = document.createElement("div");

  banner.id = "consent-banner";

  banner.className = "consent-banner";

  banner.innerHTML = `

    <p class="consent-text">

      <strong>Ads support this app</strong>

      The free version shows a small banner ad (${adNetwork}).

      An ad-free upgrade will be available later.

      <a href="/privacy.html">Privacy policy</a>

    </p>

    <div class="consent-actions">

      <button type="button" class="btn-primary consent-continue">Continue</button>

    </div>

  `;



  document.body.appendChild(banner);



  banner.querySelector(".consent-continue").addEventListener("click", () => {

    banner.remove();

    onContinue();

  });

}



async function showNativeBanner(config) {

  if (!window.NextTrainAds?.showNativeBanner) {

    throw new Error("AdMob bundle not loaded");

  }



  await window.NextTrainAds.showNativeBanner(config);

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



  if (getConsent() === "accepted") {

    enableAds();

    return;

  }



  showAdNoticeBanner({

    onContinue: enableAds,

    adNetwork: "Google AdSense",

  });

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

      container.hidden = false;

      const detail =
        config.admobTestMode && error.message === "AdMob bundle not loaded"
          ? "Restart the app after rebuilding. Test ads use Google’s sample banner ID."
          : (error.message ?? "Try restarting the app");

      container.innerHTML = `

        <div class="ad-placeholder" aria-label="Advertisement">

          <span class="ad-placeholder-badge">Ad</span>

          <p class="ad-placeholder-title">Ad could not load</p>

          <p class="ad-placeholder-sub">${detail}</p>

        </div>

      `;

    }

  };



  if (getConsent() === "accepted") {

    await enableAds();

    return;

  }



  showAdNoticeBanner({

    onContinue: () => {

      enableAds();

    },

    adNetwork: "Google AdMob",

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



function waitForCapacitor(maxMs = 5000) {

  return new Promise((resolve) => {

    if (window.Capacitor) {

      resolve();

      return;

    }



    const started = Date.now();

    const timer = setInterval(() => {

      if (window.Capacitor || Date.now() - started >= maxMs) {

        clearInterval(timer);

        resolve();

      }

    }, 50);

  });

}



window.addEventListener("load", () => {

  waitForCapacitor().then(initAds);

});

