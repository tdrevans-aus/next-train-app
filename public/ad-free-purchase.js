const AD_FREE_CACHE_KEY = "nextTrainAdFreeCache";
const DEFAULT_PRODUCT_ID = "com.tdrevans.nexttrain.adfree";
const NATIVE_BRIDGE_UNAVAILABLE_TOAST =
  "Purchases aren't available right now. Try updating the app.";

let productId = DEFAULT_PRODUCT_ID;
let entitled = false;
let localizedPrice = null;
let billingAvailable = false;
let initPromise = null;
let nativeBridgePromise = null;
let toastTimer = null;

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function hasNativePurchaseBridge() {
  return Boolean(window.NextTrainAdFreeNative?.purchaseInAppProduct);
}

function shouldShowPurchaseControls() {
  if (!isNativeApp() || entitled) {
    return false;
  }

  return hasNativePurchaseBridge() || billingAvailable;
}

function readCache() {
  return localStorage.getItem(AD_FREE_CACHE_KEY) === "1";
}

function writeCache(isEntitled) {
  if (isEntitled) {
    localStorage.setItem(AD_FREE_CACHE_KEY, "1");
  } else {
    localStorage.removeItem(AD_FREE_CACHE_KEY);
  }
}

function isUserCancelled(error) {
  const code = String(error?.code ?? "").toUpperCase();
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code.includes("CANCEL") ||
    code.includes("USER_DENIED") ||
    message.includes("cancel") ||
    message.includes("user denied")
  );
}

function showToast(message) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add("app-toast--visible");

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("app-toast--visible");
    toast.hidden = true;
  }, 3200);
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

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-dynamic-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.dataset.dynamicSrc = src;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadNativePurchaseBridge() {
  await waitForCapacitor();

  if (!window.Capacitor) {
    return null;
  }

  if (hasNativePurchaseBridge()) {
    return window.NextTrainAdFreeNative;
  }

  try {
    await loadScriptOnce("ad-free-bundle.js");
  } catch (error) {
    console.warn("Could not load ad-free native bridge", error);
    return null;
  }

  return window.NextTrainAdFreeNative ?? null;
}

async function ensureNativeBridge() {
  if (!isNativeApp()) {
    return null;
  }

  if (hasNativePurchaseBridge()) {
    return window.NextTrainAdFreeNative;
  }

  if (!nativeBridgePromise) {
    nativeBridgePromise = loadNativePurchaseBridge().catch((error) => {
      nativeBridgePromise = null;
      throw error;
    });
  }

  try {
    return await nativeBridgePromise;
  } catch {
    return null;
  }
}

function hideAdUi() {
  const container = document.getElementById("ad-container");
  const removeWrap = document.getElementById("ad-remove-link-wrap");

  if (container) {
    container.hidden = true;
    container.innerHTML = "";
  }
  if (removeWrap) {
    removeWrap.hidden = true;
  }

  if (window.NextTrainAds?.hideNativeBanner) {
    window.NextTrainAds.hideNativeBanner().catch(() => {});
  }
}

function syncPurchaseLinkVisibility() {
  const removeWrap = document.getElementById("ad-remove-link-wrap");
  if (!removeWrap) {
    return;
  }

  const adVisible = !document.getElementById("ad-container")?.hidden;
  removeWrap.hidden = !(shouldShowPurchaseControls() && adVisible);
}

function formatOneTimeSubtitle(price) {
  if (price) {
    return `One-time · ${price}`;
  }
  return "One-time purchase";
}

function setMenuPurchaseVisibility(removeBtn, statusRow, restoreBtn, { showPurchase }) {
  if (removeBtn) {
    if (showPurchase) {
      removeBtn.removeAttribute("hidden");
    } else {
      removeBtn.setAttribute("hidden", "");
    }
  }

  if (statusRow) {
    statusRow.setAttribute("hidden", "");
  }

  if (restoreBtn) {
    if (showPurchase && hasNativePurchaseBridge()) {
      restoreBtn.removeAttribute("hidden");
    } else {
      restoreBtn.setAttribute("hidden", "");
    }
  }
}

function renderMenuAdFree() {
  const removeBtn = document.getElementById("menu-remove-ads-btn");
  const removeSubtitle = document.getElementById("menu-remove-ads-subtitle");
  const statusRow = document.getElementById("menu-ad-free-status");
  const restoreBtn = document.getElementById("menu-restore-purchase-btn");
  const webHint = document.getElementById("menu-ad-free-web-hint");
  const section = document.getElementById("menu-ad-free-section");

  if (!removeBtn || !statusRow || !restoreBtn) {
    return;
  }

  if (!isNativeApp()) {
    setMenuPurchaseVisibility(removeBtn, statusRow, restoreBtn, { showPurchase: false });
    if (webHint) {
      webHint.hidden = false;
    }
    if (section) {
      section.hidden = false;
    }
    syncPurchaseLinkVisibility();
    return;
  }

  if (webHint) {
    webHint.hidden = true;
  }

  if (entitled) {
    setMenuPurchaseVisibility(removeBtn, statusRow, restoreBtn, { showPurchase: false });
    if (section) {
      section.hidden = true;
    }
    syncPurchaseLinkVisibility();
    return;
  }

  if (section) {
    section.hidden = false;
  }

  const showPurchase = billingAvailable && hasNativePurchaseBridge();
  setMenuPurchaseVisibility(removeBtn, statusRow, restoreBtn, { showPurchase });
  if (removeSubtitle) {
    removeSubtitle.textContent = formatOneTimeSubtitle(localizedPrice);
  }
  syncPurchaseLinkVisibility();
}

function applyEntitlement(nextEntitled, { notifyAds = true } = {}) {
  const next = Boolean(nextEntitled);
  const changed = next !== entitled;
  entitled = next;
  writeCache(entitled);
  renderMenuAdFree();

  if (!changed) {
    return;
  }

  if (entitled) {
    hideAdUi();
    document.dispatchEvent(
      new CustomEvent("nexttrain:adfree-changed", { detail: { entitled: true } })
    );
    return;
  }

  if (notifyAds) {
    document.dispatchEvent(
      new CustomEvent("nexttrain:adfree-changed", { detail: { entitled: false } })
    );
  }
}

async function loadProductPrice() {
  const native = await ensureNativeBridge();
  if (!native?.getInAppProduct) {
    return;
  }

  try {
    const product = await native.getInAppProduct(productId);
    localizedPrice = product?.priceString ?? product?.localizedPrice ?? null;
  } catch (error) {
    console.warn("Could not load ad-free product", error);
  }
}

async function queryStoreEntitlement() {
  const native = await ensureNativeBridge();
  if (!native?.getInAppPurchases || !native?.purchaseIncludesProduct) {
    return readCache();
  }

  try {
    const purchases = await native.getInAppPurchases();
    return native.purchaseIncludesProduct(purchases, productId);
  } catch (error) {
    console.warn("Could not query ad-free entitlement", error);
    return readCache();
  }
}

async function refreshEntitlement({ silent = false } = {}) {
  if (!isNativeApp()) {
    applyEntitlement(false, { notifyAds: false });
    return false;
  }

  const owned = await queryStoreEntitlement();
  applyEntitlement(owned, { notifyAds: !silent });
  return owned;
}

async function initAdFreePurchase() {
  entitled = readCache();
  applyEntitlement(entitled, { notifyAds: false });

  try {
    const response = await fetch("/site-config.json");
    const config = await response.json();
    productId = config.adFreeProductId || DEFAULT_PRODUCT_ID;
  } catch {
    productId = DEFAULT_PRODUCT_ID;
  }

  if (!isNativeApp()) {
    billingAvailable = false;
    renderMenuAdFree();
    return { entitled: false, billingAvailable: false };
  }

  const native = await ensureNativeBridge();
  if (!native?.isBillingSupported) {
    billingAvailable = false;
    renderMenuAdFree();
    await refreshEntitlement({ silent: true });
    return { entitled, billingAvailable };
  }

  billingAvailable = await native.isBillingSupported();
  await loadProductPrice();
  renderMenuAdFree();
  await refreshEntitlement({ silent: true });
  return { entitled, billingAvailable };
}

async function ensureInit() {
  if (!initPromise) {
    initPromise = initAdFreePurchase();
  }
  return initPromise;
}

async function purchaseAdFree() {
  await ensureInit();

  if (entitled) {
    showToast("You're already ad-free");
    return;
  }

  if (!isNativeApp()) {
    return;
  }

  const native = await ensureNativeBridge();
  if (!native?.purchaseInAppProduct) {
    showToast(NATIVE_BRIDGE_UNAVAILABLE_TOAST);
    return;
  }

  if (!billingAvailable) {
    showToast("Couldn't complete purchase. Try again.");
    return;
  }

  try {
    await native.purchaseInAppProduct(productId);
    applyEntitlement(true);
    showToast("Ads removed — thank you");
  } catch (error) {
    if (isUserCancelled(error)) {
      return;
    }

    const alreadyOwned = await queryStoreEntitlement();
    if (alreadyOwned) {
      applyEntitlement(true);
      showToast("You're already ad-free");
      return;
    }

    console.warn("Ad-free purchase failed", error);
    showToast("Couldn't complete purchase. Try again.");
  }
}

async function restoreAdFreePurchase() {
  await ensureInit();

  if (!isNativeApp()) {
    return;
  }

  const native = await ensureNativeBridge();
  if (!native?.restoreInAppPurchases) {
    showToast(NATIVE_BRIDGE_UNAVAILABLE_TOAST);
    return;
  }

  try {
    const purchases = await native.restoreInAppPurchases();
    const owned = native.purchaseIncludesProduct(purchases, productId);
    if (owned) {
      applyEntitlement(true);
      showToast("Purchase restored");
      return;
    }

    applyEntitlement(false);
    showToast("No purchase found for this account");
  } catch (error) {
    console.warn("Ad-free restore failed", error);
    showToast("Couldn't complete purchase. Try again.");
  }
}

function wireUi() {
  document.getElementById("menu-remove-ads-btn")?.addEventListener("click", () => {
    purchaseAdFree();
  });
  document.getElementById("menu-restore-purchase-btn")?.addEventListener("click", () => {
    restoreAdFreePurchase();
  });
  document.getElementById("ad-remove-link")?.addEventListener("click", () => {
    purchaseAdFree();
  });
  document.getElementById("menu-ad-free-status")?.addEventListener("click", () => {
    showToast("Restored on this device");
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshEntitlement({ silent: true });
    }
  });
}

window.NextTrainAdFree = {
  isEntitled() {
    return entitled;
  },
  ensureInit,
  ensureNativeBridge,
  refreshEntitlement,
  purchaseAdFree,
  restoreAdFreePurchase,
  renderMenuAdFree,
  syncPurchaseLinkVisibility,
  shouldShowPurchaseControls,
  getLocalizedPrice() {
    return localizedPrice;
  },
};

window.NextTrainScripts = {
  loadScriptOnce,
  waitForCapacitor,
};

wireUi();
ensureInit();
