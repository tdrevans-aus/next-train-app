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
  if (!isNativeApp()) {
    return false;
  }
  if (window.NextTrainPro?.hasNoAds?.()) {
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
  const removeLink = document.getElementById("ad-remove-link");
  if (!removeWrap) {
    return;
  }

  const adVisible = !document.getElementById("ad-container")?.hidden;
  const showLink = shouldShowPurchaseControls() && adVisible;
  removeWrap.hidden = !showLink;
  if (removeLink) {
    removeLink.textContent = "Unlock Pro";
  }
}

function formatOneTimeSubtitle(price) {
  if (price) {
    return `One-time · ${price}`;
  }
  return "One-time · keep widget + no ads";
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

function renderMenuPro() {
  const section = document.getElementById("menu-pro-section");
  const ctaBtn = document.getElementById("menu-pro-cta-btn");
  const ctaTitle = document.getElementById("menu-pro-cta-title");
  const ctaSubtitle = document.getElementById("menu-pro-cta-subtitle");
  const statusRow = document.getElementById("menu-pro-status-row");
  const statusTitle = document.getElementById("menu-pro-status-title");
  const statusSubtitle = document.getElementById("menu-pro-status-subtitle");
  const nudgeDismiss = document.getElementById("menu-pro-nudge-dismiss");
  const restoreBtn = document.getElementById("menu-restore-purchase-btn");
  const webHint = document.getElementById("menu-pro-web-hint");
  const billingHint = document.getElementById("menu-pro-billing-hint");

  if (!section) {
    return;
  }

  setHidden(section, false);
  setHidden(ctaBtn, true);
  setHidden(statusRow, true);
  setHidden(nudgeDismiss, true);

  if (!isNativeApp()) {
    setHidden(webHint, false);
    setHidden(billingHint, true);
    setHidden(restoreBtn, true);
    syncPurchaseLinkVisibility();
    return;
  }

  setHidden(webHint, true);

  const state = window.NextTrainPro?.getStateId?.() ?? "free_no_trial";
  const showRestore = canRestorePurchases();
  setHidden(restoreBtn, !showRestore);

  if (state === "free_no_trial") {
    // v7: hide free Try Pro CTA (broken open path). Restore in v8 — FB-13.
    setHidden(ctaBtn, true);
    setHidden(statusRow, true);
    setHidden(nudgeDismiss, true);
    setHidden(billingHint, true);
    setHidden(section, !canRestorePurchases());
    setHidden(restoreBtn, !canRestorePurchases());
    syncPurchaseLinkVisibility();
    return;
  }

  if (state === "trial_nudge") {
    const daysLeft = window.NextTrainPro?.getTrialDaysLeft?.() ?? 0;
    setHidden(ctaBtn, false);
    ctaBtn?.classList.add("menu-purchase-row--cta");
    if (ctaTitle) {
      ctaTitle.textContent = `${daysLeft} days left on Pro trial`;
    }
    if (ctaSubtitle) {
      ctaSubtitle.textContent = "Unlock Pro — one-time · keep widget + no ads";
    }
    setHidden(nudgeDismiss, false);
    setHidden(billingHint, !billingAvailable || !hasNativePurchaseBridge());
    syncPurchaseLinkVisibility();
    return;
  }

  if (state === "trial_expired") {
    setHidden(ctaBtn, false);
    ctaBtn?.classList.add("menu-purchase-row--cta");
    if (ctaTitle) {
      ctaTitle.textContent = "Unlock Pro";
    }
    if (ctaSubtitle) {
      ctaSubtitle.textContent = formatOneTimeSubtitle(localizedPrice);
    }
    setHidden(billingHint, billingAvailable && hasNativePurchaseBridge());
    syncPurchaseLinkVisibility();
    return;
  }

  setHidden(statusRow, false);
  statusRow?.classList.remove("menu-purchase-row--cta");
  setHidden(billingHint, true);

  if (state === "founding") {
    if (statusTitle) {
      statusTitle.textContent = "Founding 200 · Pro";
    }
    if (statusSubtitle) {
      statusSubtitle.textContent = "Widget + ads off · forever";
    }
  } else if (state === "trial_active") {
    const daysLeft = window.NextTrainPro?.getTrialDaysLeft?.() ?? 0;
    if (statusTitle) {
      statusTitle.textContent = `Pro trial · ${daysLeft} days left`;
    }
    if (statusSubtitle) {
      statusSubtitle.textContent = "Unlock Pro anytime — one-time";
    }
  } else if (state === "pro_paid") {
    if (statusTitle) {
      statusTitle.textContent = "Pro";
    }
    if (statusSubtitle) {
      statusSubtitle.textContent = "Ads off · widget unlocked";
    }
  }

  syncPurchaseLinkVisibility();
}

function renderMenuAdFree() {
  renderMenuPro();
}

function applyEntitlement(nextEntitled, { notifyAds = true } = {}) {
  const next = Boolean(nextEntitled);
  const changed = next !== entitled;
  entitled = next;
  writeCache(entitled);
  renderMenuPro();

  if (changed) {
    window.NextTrainPro?.onPurchaseEntitlementChanged?.();
  }

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
    console.warn("Could not load Pro product price", error);
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
    console.warn("Could not query Pro entitlement", error);
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
    renderMenuPro();
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
  } catch {
    productId = DEFAULT_PRODUCT_ID;
  }

  if (!isNativeApp()) {
    billingAvailable = false;
    renderMenuPro();
    return { entitled: false, billingAvailable: false };
  }

  const native = await ensureNativeBridge();
  if (!native?.isBillingSupported) {
    billingAvailable = false;
    renderMenuPro();
    await refreshEntitlement({ silent: true });
    return { entitled, billingAvailable };
  }

  billingAvailable = await native.isBillingSupported();
  await loadProductPrice();
  renderMenuPro();
  await refreshEntitlement({ silent: true });
  return { entitled, billingAvailable };
}

async function ensureInit() {
  if (!initPromise) {
    initPromise = initAdFreePurchase();
  }
  return initPromise;
}

function openNativeStyleDialog(dialog) {
  if (!dialog) {
    return;
  }

  // Match Menu / Journeys: Capacitor WebView is unreliable with showModal.
  if (typeof window.nextTrainApp?.openAppDialog === "function") {
    window.nextTrainApp.openAppDialog(dialog);
    return;
  }

  if (isNativeApp()) {
    dialog.classList.add("app-native-dialog");
    dialog.setAttribute("open", "");
    document.body.classList.add("app-dialog-open");
    return;
  }

  try {
    dialog.showModal();
  } catch (error) {
    console.warn("showModal failed, using open attribute fallback", error);
    dialog.setAttribute("open", "");
  }
}

function openPaywallDialog() {
  const dialog = document.getElementById("pro-paywall-dialog");
  const priceEl = document.getElementById("pro-paywall-price");
  const foundingNote = document.getElementById("pro-paywall-founding-note");

  if (!dialog) {
    return;
  }

  if (priceEl) {
    priceEl.textContent = localizedPrice ?? "A$X.XX";
  }
  if (foundingNote) {
    const showNote =
      window.NextTrainPro?.isFoundingFull?.() &&
      !window.NextTrainPro?.isFounding?.() &&
      !window.NextTrainPro?.hasProAccess?.();
    setHidden(foundingNote, !showNote);
  }

  // Widget → paywall: close competing sheets so this isn't buried.
  for (const id of ["menu-dialog", "journeys-dialog", "help-dialog"]) {
    const open = document.getElementById(id);
    if (open?.open || open?.hasAttribute("open")) {
      try {
        open.close?.();
      } catch {
        open.removeAttribute("open");
      }
      open.classList.remove("app-native-dialog");
    }
  }

  openNativeStyleDialog(dialog);
}

function showFoundingUnlockSheet() {
  if (localStorage.getItem("nextTrainFoundingUnlockShown") === "1") {
    return;
  }
  const sheet = document.getElementById("pro-founding-sheet");
  if (!sheet) {
    return;
  }
  localStorage.setItem("nextTrainFoundingUnlockShown", "1");
  openNativeStyleDialog(sheet);
}

function showTrialStartedSheet() {
  if (localStorage.getItem("nextTrainTrialStartedShown") === "1") {
    return;
  }
  const sheet = document.getElementById("pro-trial-started-sheet");
  if (!sheet) {
    return;
  }
  localStorage.setItem("nextTrainTrialStartedShown", "1");
  openNativeStyleDialog(sheet);
}

function closeNativeStyleDialog(dialog) {
  if (!dialog) {
    return;
  }
  if (typeof window.nextTrainApp?.closeAppDialog === "function") {
    window.nextTrainApp.closeAppDialog(dialog);
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
  }
}

async function purchasePro() {
  await ensureInit();

  if (window.NextTrainPro?.hasProAccess?.() && entitled) {
    showToast("You already have Pro");
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
    window.NextTrainAnalytics?.track?.("iap_purchase_success");
    closeNativeStyleDialog(document.getElementById("pro-paywall-dialog"));
    showToast("Pro unlocked — thank you");
  } catch (error) {
    if (isUserCancelled(error)) {
      return;
    }

    const alreadyOwned = await queryStoreEntitlement();
    if (alreadyOwned === true) {
      applyEntitlement(true);
      showToast("You already have Pro");
      return;
    }

    console.warn("Pro purchase failed", error);
    showToast("Couldn't complete purchase. Try again.");
  }
}

async function restoreProPurchase() {
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
    console.warn("Pro restore failed", error);
    showToast("Couldn't complete purchase. Try again.");
  }
}

function wireUi() {
  document.getElementById("menu-pro-cta-btn")?.addEventListener("click", () => {
    const state = window.NextTrainPro?.getStateId?.();
    if (state === "free_no_trial") {
      // Same as Menu → Add home screen widget: close Menu first or the
      // widget sheet never appears (nested dialogs fail in Capacitor WebView).
      window.nextTrainApp?.closeMenuDialogOnly?.();
      window.nextTrainStickinessCoaches?.markCoachDone?.("widget");
      window.nextTrainWidget?.openWidgetHelpDialog?.();
      return;
    }
    openPaywallDialog();
  });

  document.getElementById("menu-pro-nudge-dismiss")?.addEventListener("click", () => {
    window.NextTrainPro?.dismissTrialNudge?.();
  });

  document.getElementById("menu-pro-status-row")?.addEventListener("click", () => {
    const state = window.NextTrainPro?.getStateId?.();
    if (state === "trial_active") {
      openPaywallDialog();
    } else if (state === "pro_paid" || state === "founding") {
      showToast("You're on Pro");
    }
  });

  document.getElementById("menu-restore-purchase-btn")?.addEventListener("click", () => {
    restoreProPurchase();
  });

  document.getElementById("ad-remove-link")?.addEventListener("click", () => {
    openPaywallDialog();
  });

  document.getElementById("pro-paywall-unlock-btn")?.addEventListener("click", () => {
    purchasePro();
  });

  document.getElementById("pro-paywall-restore-btn")?.addEventListener("click", () => {
    restoreProPurchase();
  });

  document.getElementById("pro-paywall-close-btn")?.addEventListener("click", () => {
    closeNativeStyleDialog(document.getElementById("pro-paywall-dialog"));
  });

  document.getElementById("pro-founding-got-it-btn")?.addEventListener("click", () => {
    closeNativeStyleDialog(document.getElementById("pro-founding-sheet"));
  });

  document.getElementById("pro-founding-add-widget-btn")?.addEventListener("click", () => {
    closeNativeStyleDialog(document.getElementById("pro-founding-sheet"));
    window.nextTrainWidget?.openWidgetHelpDialog?.();
  });

  document.getElementById("pro-trial-got-it-btn")?.addEventListener("click", () => {
    closeNativeStyleDialog(document.getElementById("pro-trial-started-sheet"));
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshEntitlement({ silent: true });
    }
  });
}

window.NextTrainProPurchase = {
  openPaywallDialog,
  showFoundingUnlockSheet,
  showTrialStartedSheet,
  renderMenuPro,
  purchasePro,
  restoreProPurchase,
};

window.NextTrainAdFree = {
  isPurchased() {
    return entitled;
  },
  isEntitled() {
    if (entitled) {
      return true;
    }
    return window.NextTrainPro?.hasProAccess?.() ?? false;
  },
  ensureInit,
  ensureNativeBridge,
  refreshEntitlement,
  purchaseAdFree: purchasePro,
  restoreAdFreePurchase: restoreProPurchase,
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
