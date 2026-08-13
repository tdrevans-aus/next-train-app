/**
 * Founding Pro entitlement — states, trial, widget access sync.
 * @see docs/jim-brief-founding-pro.md · public/design/founding-pro.html
 */

/**
 * Ship kill-switch for Pro monetization (trial / Try Pro / widget lock / founding sheets).
 * false = closed-test / 2.1.1: widget free, ads normal, no Pro Menu CTA.
 * Flip to true for the following Play release when Pro is ready for testers.
 */
const PRO_MONETIZATION_SHIPPED = false;

const TRIAL_STARTED_KEY = "nextTrainProTrialStartedAt";
const FOUNDING_KEY = "nextTrainFoundingPro";
const WIDGET_ADDED_KEY = "nextTrainWidgetEverAdded";
const FOUNDING_SHEET_KEY = "nextTrainFoundingUnlockShown";
const TRIAL_SHEET_KEY = "nextTrainTrialStartedShown";
const NUDGE_DISMISS_KEY = "nextTrainProTrialNudgeDismissedAt";

const DEFAULT_TRIAL_DAYS = 30;
/** Show firm Menu nudge when ≤ this many days remain (≈ day 21–25 of a 30-day trial). */
const NUDGE_DAYS_LEFT = 9;
/** Soft nudge once elapsed day reaches this (day 21 of 30). */
const SOFT_NUDGE_DAY = 21;

let trialDays = DEFAULT_TRIAL_DAYS;
let foundingFull = false;

function isProMonetizationShipped() {
  return PRO_MONETIZATION_SHIPPED === true;
}

function readTrialStartedAt() {
  const raw = localStorage.getItem(TRIAL_STARTED_KEY);
  if (!raw) {
    return null;
  }
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

function isFounding() {
  return localStorage.getItem(FOUNDING_KEY) === "1";
}

function isPaid() {
  if (window.NextTrainAdFree?.isPurchased?.()) {
    return true;
  }
  return localStorage.getItem("nextTrainAdFreeCache") === "1";
}

function hasWidgetEverAdded() {
  return localStorage.getItem(WIDGET_ADDED_KEY) === "1";
}

function getTrialDaysLeft() {
  const startedMs = readTrialStartedAt();
  if (!startedMs) {
    return trialDays;
  }
  const elapsedDays = Math.floor((Date.now() - startedMs) / 86400000);
  return Math.max(0, trialDays - elapsedDays);
}

function getTrialDaysElapsed() {
  const startedMs = readTrialStartedAt();
  if (!startedMs) {
    return 0;
  }
  return Math.floor((Date.now() - startedMs) / 86400000);
}

function isTrialActive() {
  if (!readTrialStartedAt()) {
    return false;
  }
  return getTrialDaysLeft() > 0;
}

function hasProAccess() {
  if (!isProMonetizationShipped()) {
    // Parked: only a completed ad-free / Pro purchase counts — no trial lock-in for testers.
    return isPaid();
  }
  if (isPaid()) {
    return true;
  }
  if (isFounding()) {
    return true;
  }
  return isTrialActive();
}

function hasWidgetAccess() {
  if (hasProAccess()) {
    return true;
  }
  if (readTrialStartedAt() && !isTrialActive()) {
    return false;
  }
  if (!isProMonetizationShipped()) {
    return true;
  }
  // Trial never started → not expired. First widget add starts the 30-day trial.
  return !readTrialStartedAt();
}

function hasNoAds() {
  if (!isProMonetizationShipped()) {
    return isPaid();
  }
  return hasProAccess();
}

/**
 * Named UI state id from Jim brief §2.
 */
function getStateId() {
  if (isPaid()) {
    return "pro_paid";
  }
  if (isFounding()) {
    return "founding";
  }
  if (isTrialActive()) {
    if (shouldShowTrialNudge()) {
      return "trial_nudge";
    }
    return "trial_active";
  }
  if (readTrialStartedAt()) {
    return "trial_expired";
  }
  return "free_no_trial";
}

function shouldShowTrialNudge() {
  if (!isTrialActive()) {
    return false;
  }
  if (localStorage.getItem(NUDGE_DISMISS_KEY)) {
    return false;
  }
  const daysLeft = getTrialDaysLeft();
  const elapsed = getTrialDaysElapsed();
  return daysLeft <= NUDGE_DAYS_LEFT || elapsed >= SOFT_NUDGE_DAY;
}

function mergeIntoSettings(settings) {
  if (!settings || typeof settings !== "object") {
    return settings;
  }
  settings.pro = {
    state: getStateId(),
    hasWidgetAccess: hasWidgetAccess(),
    hasNoAds: hasNoAds(),
    founding: isFounding(),
    paid: isPaid(),
    trialStartedAt: readTrialStartedAt()
      ? new Date(readTrialStartedAt()).toISOString()
      : null,
    trialDaysLeft: getTrialDaysLeft(),
  };
  return settings;
}

async function syncWidgetProState() {
  try {
    const raw = localStorage.getItem("nextTrainSettings") ?? "{}";
    const settings = JSON.parse(raw);
    mergeIntoSettings(settings);
    localStorage.setItem("nextTrainSettings", JSON.stringify(settings));
    await window.nextTrainWidget?.syncWidgetSettings?.(settings);
  } catch (error) {
    console.warn("Could not sync Pro widget state", error);
  }
}

async function loadSiteConfig() {
  try {
    const response = await fetch("/site-config.json");
    const config = await response.json();
    trialDays = Number(config.proTrialDays) || DEFAULT_TRIAL_DAYS;
  } catch {
    trialDays = DEFAULT_TRIAL_DAYS;
  }

  try {
    const statusRes = await fetch("/api/founding-status");
    if (statusRes.ok) {
      const status = await statusRes.json();
      foundingFull = Boolean(status.foundingFull);
    }
  } catch {
    foundingFull = false;
  }
}

async function tryClaimFounding() {
  try {
    const response = await fetch("/api/founding-claim", { method: "POST" });
    if (!response.ok) {
      return { granted: false };
    }
    return await response.json();
  } catch {
    return { granted: false };
  }
}

function markWidgetEverAdded() {
  localStorage.setItem(WIDGET_ADDED_KEY, "1");
}

function startTrial() {
  if (!isProMonetizationShipped()) {
    return;
  }
  if (!readTrialStartedAt()) {
    localStorage.setItem(TRIAL_STARTED_KEY, new Date().toISOString());
  }
}

function grantFounding() {
  if (!isProMonetizationShipped()) {
    return;
  }
  localStorage.setItem(FOUNDING_KEY, "1");
}

async function onWidgetFirstAdded() {
  if (hasWidgetEverAdded()) {
    return { alreadyHandled: true };
  }

  markWidgetEverAdded();

  // Pro parked for this Play release — widget stays free; no trial / founding sheets.
  if (!isProMonetizationShipped()) {
    await syncWidgetProState();
    return { state: "pro_parked", parked: true };
  }

  if (isPaid() || isFounding()) {
    await syncWidgetProState();
    return { state: getStateId() };
  }

  const claim = await tryClaimFounding();
  if (claim.granted) {
    grantFounding();
    foundingFull = Boolean(claim.foundingFull);
    await syncWidgetProState();
    window.NextTrainProPurchase?.showFoundingUnlockSheet?.();
    document.dispatchEvent(new CustomEvent("nexttrain:pro-changed"));
    return { state: "founding", foundingUnlock: true };
  }

  foundingFull = Boolean(claim.foundingFull);
  startTrial();
  await syncWidgetProState();
  window.NextTrainProPurchase?.showTrialStartedSheet?.();
  document.dispatchEvent(new CustomEvent("nexttrain:pro-changed"));
  return { state: "trial_started", trialStarted: true };
}

async function pollWidgetAdded() {
  if (!window.Capacitor?.isNativePlatform?.()) {
    return;
  }

  const count = await window.nextTrainWidget?.getWidgetInstanceCount?.() ?? 0;
  if (count > 0 && !hasWidgetEverAdded()) {
    await onWidgetFirstAdded();
  }
}

function dismissTrialNudge() {
  localStorage.setItem(NUDGE_DISMISS_KEY, new Date().toISOString());
  window.NextTrainProPurchase?.renderMenuPro?.();
}

function onSettingsCleared() {
  // Purchases kept; Pro local flags cleared with other nextTrain* keys.
  syncWidgetProState();
}

function onPurchaseEntitlementChanged() {
  syncWidgetProState();
  window.NextTrainProPurchase?.renderMenuPro?.();
  document.dispatchEvent(new CustomEvent("nexttrain:pro-changed"));
}

let initPromise = null;

async function ensureInit() {
  if (!initPromise) {
    initPromise = loadSiteConfig().then(() => {
      syncWidgetProState();
      pollWidgetAdded();
    });
  }
  return initPromise;
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    pollWidgetAdded();
    syncWidgetProState();
    window.NextTrainProPurchase?.renderMenuPro?.();
  }
});

window.NextTrainPro = {
  TRIAL_DAYS: DEFAULT_TRIAL_DAYS,
  ensureInit,
  getStateId,
  getTrialDaysLeft,
  getTrialDaysElapsed,
  hasProAccess,
  hasWidgetAccess,
  hasNoAds,
  isProMonetizationShipped,
  isFounding,
  isPaid,
  isTrialActive,
  shouldShowTrialNudge,
  isFoundingFull: () => foundingFull,
  mergeIntoSettings,
  syncWidgetProState,
  onWidgetFirstAdded,
  pollWidgetAdded,
  dismissTrialNudge,
  onSettingsCleared,
  onPurchaseEntitlementChanged,
  markWidgetEverAdded,
  startTrial,
  grantFounding,
};

ensureInit();
