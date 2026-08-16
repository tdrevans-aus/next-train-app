const AD_FREE_CACHE_KEY = "nextTrainAdFreeCache";
const DEFAULT_PRODUCT_ID = "com.tdrevans.nexttrain.adfree";
const DEFAULT_LIST_PRICE = "A$7.99";
const NATIVE_BRIDGE_UNAVAILABLE_TOAST =
  "Purchases aren't available right now. Try updating the app.";

let productId = DEFAULT_PRODUCT_ID;
let listPrice = DEFAULT_LIST_PRICE;
let entitled = false;
let localizedPrice = null;
let billingAvailable = false;
let adFreeInitPromise = null;
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

function displayPrice() {
  return localizedPrice ?? listPrice;
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
  const removeLink = document.getElementById("ad-remove-link");
  if (!removeWrap) {
    return;
  }

  const adVisible = !document.getElementById("ad-container")?.hidden;
  const showLink = shouldShowPurchaseControls() && adVisible;
  removeWrap.hidden = !showLink;
  if (removeLink) {
    removeLink.textContent = "Remove ads";
  }
}

function formatOneTimeSubtitle(price) {
  if (price) {
    return `${price} · one-time`;
  }
  return "One-time purchase";
}

function setHidden(el, hidden) {
  if (!el) {
    return;
  }
  if (hidden) {
    el.setAttribute("hidden", "");
  } else {
    el.removeAttribute("hidden");
  }
}

function canRestorePurchases() {
  return Boolean(window.NextTrainAdFreeNative?.restoreInAppPurchases);
}

function renderMenuAdFree() {
  const section = document.getElementById("menu-ad-free-section");
  const ctaBtn = document.getElementById("menu-ad-free-cta-btn");
  const ctaTitle = document.getElementById("menu-ad-free-cta-title");
  const ctaSubtitle = document.getElementById("menu-ad-free-cta-subtitle");
  const statusRow = document.getElementById("menu-ad-free-status-row");
  const statusTitle = document.getElementById("menu-ad-free-status-title");
  const statusSubtitle = document.getElementById("menu-ad-free-status-subtitle");
  const restoreBtn = document.getElementById("menu-restore-purchase-btn");
  const webHint = document.getElementById("menu-ad-free-web-hint");
  const billingHint = document.getElementById("menu-ad-free-billing-hint");

  if (!section) {
    return;
  }

  setHidden(ctaBtn, true);
  setHidden(statusRow, true);
  setHidden(billingHint, true);

  if (!isNativeApp()) {
    setHidden(section, false);
    setHidden(webHint, false);
    setHidden(restoreBtn, true);
    syncPurchaseLinkVisibility();
    return;
  }

  setHidden(webHint, true);
  setHidden(section, false);

  if (entitled) {
    setHidden(statusRow, false);
    if (statusTitle) {
      statusTitle.textContent = "Ads removed";
    }
    if (statusSubtitle) {
      statusSubtitle.textContent = "Thanks for supporting Next Train";
    }
    setHidden(restoreBtn, !canRestorePurchases());
    syncPurchaseLinkVisibility();
    return;
  }

  setHidden(ctaBtn, false);
  if (ctaTitle) {
    ctaTitle.textContent = "Remove ads";
  }
  if (ctaSubtitle) {
    ctaSubtitle.textContent = formatOneTimeSubtitle(displayPrice());
  }
  // Restore lives on the purchase sheet — avoid duplicate in Menu while buying.
  setHidden(restoreBtn, true);
  setHidden(billingHint, billingAvailable && hasNativePurchaseBridge());
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
    console.warn("Could not load remove-ads product price", error);
  }
}

/** @returns {Promise<boolean|null>} */
async function queryStoreEntitlement() {
  const native = await ensureNativeBridge();
  if (!native?.getInAppPurchases || !native?.purchaseIncludesProduct) {
    return null;
  }

  try {
    const purchases = await native.getInAppPurchases();
    return native.purchaseIncludesProduct(purchases, productId);
  } catch (error) {
    console.warn("Could not query remove-ads entitlement", error);
    return null;
  }
}

async function refreshEntitlement({ silent = false } = {}) {
  if (!isNativeApp()) {
    applyEntitlement(false, { notifyAds: false });
    return false;
  }

  const owned = await queryStoreEntitlement();
  if (owned === null) {
    renderMenuAdFree();
    return entitled;
  }

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
    if (config.adFreeListPrice) {
      listPrice = config.adFreeListPrice;
    }
  } catch {
    productId = DEFAULT_PRODUCT_ID;
    listPrice = DEFAULT_LIST_PRICE;
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
  if (!adFreeInitPromise) {
    adFreeInitPromise = initAdFreePurchase();
  }
  return adFreeInitPromise;
}

function hideOrphanDialogBackdrops() {
  document.querySelectorAll(".app-dialog-backdrop:not([hidden])").forEach((backdrop) => {
    backdrop.hidden = true;
  });
}

function openNativeStyleDialog(dialog) {
  if (!dialog) {
    return;
  }

  if (typeof window.nextTrainApp?.openAppDialog === "function") {
    window.nextTrainApp.openAppDialog(dialog);
    return;
  }

  if (isNativeApp()) {
    dialog.classList.add("app-native-dialog");
    dialog.setAttribute("open", "");
    document.body.classList.add("app-dialog-open");
    window.NextTrainAds?.syncOverlaySuppression?.();
    return;
  }

  try {
    dialog.showModal();
  } catch (error) {
    console.warn("showModal failed, using open attribute fallback", error);
    dialog.setAttribute("open", "");
  }
}

async function openRemoveAdsDialog() {
  await ensureInit();

  if (entitled) {
    showToast("Ads are already removed");
    return;
  }

  const dialog = document.getElementById("ad-free-dialog");
  const priceEl = document.getElementById("ad-free-price");
  const purchaseBtn = document.getElementById("ad-free-purchase-btn");

  if (!dialog) {
    return;
  }

  if (priceEl) {
    priceEl.textContent = displayPrice();
  }
  if (purchaseBtn) {
    purchaseBtn.textContent = "Remove ads";
    purchaseBtn.disabled = !shouldShowPurchaseControls();
  }

  // Close Menu via app helper so its backdrop is torn down (raw .close() leaves grey scrim).
  window.nextTrainApp?.closeMenuDialogOnly?.();

  for (const id of ["journeys-dialog", "help-dialog", "feedback-dialog"]) {
    const open = document.getElementById(id);
    if (open?.open || open?.hasAttribute("open")) {
      if (typeof window.nextTrainApp?.closeAppDialog === "function") {
        window.nextTrainApp.closeAppDialog(open);
      } else {
        open.removeAttribute("open");
        open.classList.remove("app-native-dialog");
      }
    }
  }

  const showSheet = () => {
    hideOrphanDialogBackdrops();
    openNativeStyleDialog(dialog);
    if (!shouldShowPurchaseControls()) {
      showToast(
        isNativeApp()
          ? "Purchases aren't available on this install. Install from Play and try again."
          : "Remove ads is available in the Android app."
      );
    }
  };

  window.setTimeout(showSheet, 0);
}

function closeNativeStyleDialog(dialog) {
  if (!dialog) {
    return;
  }
  if (typeof window.nextTrainApp?.closeAppDialog === "function") {
    window.nextTrainApp.closeAppDialog(dialog);
    hideOrphanDialogBackdrops();
    if (!document.querySelector("dialog[open], .app-native-dialog[open]")) {
      document.body.classList.remove("app-dialog-open");
      window.NextTrainAds?.syncOverlaySuppression?.();
    }
    return;
  }
  try {
    if (dialog.open) {
      dialog.close();
    }
  } catch {
    // ignore
  }
  dialog.removeAttribute("open");
  dialog.classList.remove("app-native-dialog");
  if (!document.querySelector("dialog.app-native-dialog[open], dialog[open]")) {
    document.body.classList.remove("app-dialog-open");
    window.NextTrainAds?.syncOverlaySuppression?.();
  }
}

async function purchaseAdFree() {
  await ensureInit();

  if (entitled) {
    showToast("Ads are already removed");
    return;
  }

  if (!isNativeApp()) {
    showToast("Remove ads is available in the Android app.");
    return;
  }

  const native = await ensureNativeBridge();
  if (!native?.purchaseInAppProduct) {
    showToast(NATIVE_BRIDGE_UNAVAILABLE_TOAST);
    return;
  }

  if (!billingAvailable) {
    showToast("Couldn't connect to Google Play billing. Try again from a Play install.");
    return;
  }

  try {
    await native.purchaseInAppProduct(productId);
    applyEntitlement(true);
    window.NextTrainAnalytics?.track?.("iap_purchase_success");
    closeNativeStyleDialog(document.getElementById("ad-free-dialog"));
    showToast("Ads removed");
  } catch (error) {
    if (isUserCancelled(error)) {
      return;
    }

    const alreadyOwned = await queryStoreEntitlement();
    if (alreadyOwned === true) {
      applyEntitlement(true);
      showToast("Ads are already removed");
      return;
    }

    console.warn("Remove ads purchase failed", error);
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
      window.NextTrainAnalytics?.track?.("iap_restore_success");
      showToast("Purchase restored");
      return;
    }

    applyEntitlement(false);
    showToast("No purchase found for this account");
  } catch (error) {
    console.warn("Remove ads restore failed", error);
    showToast("Couldn't complete purchase. Try again.");
  }
}

function wireUi() {
  document.getElementById("menu-ad-free-cta-btn")?.addEventListener("click", () => {
    openRemoveAdsDialog();
  });

  document.getElementById("menu-restore-purchase-btn")?.addEventListener("click", () => {
    restoreAdFreePurchase();
  });

  document.getElementById("ad-remove-link")?.addEventListener("click", () => {
    openRemoveAdsDialog();
  });

  document.getElementById("ad-free-purchase-btn")?.addEventListener("click", () => {
    purchaseAdFree();
  });

  document.getElementById("ad-free-restore-btn")?.addEventListener("click", () => {
    restoreAdFreePurchase();
  });

  document.getElementById("ad-free-close-btn")?.addEventListener("click", () => {
    closeNativeStyleDialog(document.getElementById("ad-free-dialog"));
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshEntitlement({ silent: true });
    }
  });
}

window.NextTrainAdFree = {
  isPurchased() {
    return entitled;
  },
  isEntitled() {
    return entitled;
  },
  ensureInit,
  ensureNativeBridge,
  refreshEntitlement,
  purchaseAdFree,
  restoreAdFreePurchase,
  openRemoveAdsDialog,
  renderMenuAdFree,
  syncPurchaseLinkVisibility,
  shouldShowPurchaseControls,
  getLocalizedPrice() {
    return localizedPrice ?? listPrice;
  },
};

window.NextTrainScripts = {
  loadScriptOnce,
  waitForCapacitor,
};

wireUi();
ensureInit();
