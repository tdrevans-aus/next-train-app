function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function getWidgetSyncPlugin() {
  if (!window.Capacitor) {
    return null;
  }
  if (typeof window.Capacitor.registerPlugin === "function") {
    return window.Capacitor.registerPlugin("WidgetSync");
  }
  return window.Capacitor.Plugins?.WidgetSync ?? null;
}

async function syncWidgetSettings(settings = window.settings) {
  if (!isNativeApp()) {
    return;
  }

  const plugin = getWidgetSyncPlugin();
  if (!plugin?.syncSettings) {
    return;
  }

  try {
    const payload =
      settings ?? JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
    if (window.NextTrainPro?.mergeIntoSettings) {
      window.NextTrainPro.mergeIntoSettings(payload);
    }
    await plugin.syncSettings({ settingsJson: JSON.stringify(payload) });
  } catch (error) {
    console.warn("Could not sync widget settings", error);
  }
}

function parseWidgetDeepLink(uri) {
  if (!uri) {
    return null;
  }

  if (/^nexttrain:\/\/nearby\/?$/i.test(String(uri))) {
    return { type: "nearby" };
  }

  if (/^nexttrain:\/\/home\/?$/i.test(String(uri))) {
    return { type: "home" };
  }

  if (/^nexttrain:\/\/paywall\/?$/i.test(String(uri))) {
    return { type: "paywall" };
  }

  const match = String(uri).match(/^nexttrain:\/\/journey(\/.*)?$/i);
  if (!match) {
    return null;
  }

  const path = (match[1] ?? "").replace(/^\//, "");
  return { type: "journey", journeyId: path || "new" };
}

async function handleWidgetDeepLink(uri) {
  const target = parseWidgetDeepLink(uri);
  if (!target) {
    return;
  }

  if (target.type === "nearby") {
    await window.nextTrainApp?.enterNearbyMode?.();
    return;
  }

  if (target.type === "home") {
    await window.nextTrainApp?.openMainScreenFromWidget?.();
    return;
  }

  if (target.type === "paywall") {
    const openPaywall = () => window.NextTrainProPurchase?.openPaywallDialog?.();
    openPaywall();
    // Native boot can race script init — retry once shortly after.
    if (!document.getElementById("pro-paywall-dialog")?.open &&
        !document.getElementById("pro-paywall-dialog")?.hasAttribute("open")) {
      setTimeout(openPaywall, 250);
    }
    return;
  }

  if (target.journeyId === "new") {
    window.nextTrainApp?.enterJourneyMode?.();
    window.nextTrainApp?.openJourneys?.();
    return;
  }

  await window.nextTrainApp?.openMainScreenFromWidget?.();
  if (typeof window.nextTrainApp?.switchJourney === "function") {
    window.nextTrainApp.switchJourney(target.journeyId);
  }
}

async function consumeWidgetLaunchDeepLink() {
  const plugin = getWidgetSyncPlugin();
  if (!plugin?.getLaunchDeepLink) {
    return;
  }

  try {
    if (plugin.peekLaunchDeepLink) {
      const peek = await plugin.peekLaunchDeepLink();
      const peekUri = peek?.uri;
      if (peekUri && /^nexttrain:\/\/test\/seed/i.test(String(peekUri))) {
        return;
      }
    }

    const result = await plugin.getLaunchDeepLink();
    if (result?.uri) {
      await handleWidgetDeepLink(result.uri);
    }
  } catch (error) {
    console.warn("Could not read widget deep link", error);
  }
}

function hideWidgetCoach() {
  const coach = document.getElementById("widget-coach");
  if (coach) {
    coach.hidden = true;
  }
}

function isWidgetDebugEnabled() {
  return new URLSearchParams(window.location.search).get("widgetDebug") === "1";
}

function formatWidgetDebugAge(epochMs) {
  if (!epochMs) {
    return "never";
  }
  const minutes = Math.max(0, Math.floor((Date.now() - epochMs) / 60000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  return new Date(epochMs).toLocaleTimeString();
}

async function refreshWidgetDebugPanel() {
  const panel = document.getElementById("widget-debug-panel");
  if (!panel) {
    return;
  }

  if (!isWidgetDebugEnabled() || !isNativeApp()) {
    panel.hidden = true;
    panel.textContent = "";
    return;
  }

  const plugin = getWidgetSyncPlugin();
  if (!plugin?.getDebugState) {
    panel.hidden = false;
    panel.textContent = "Widget debug: rebuild APK with getDebugState support.";
    return;
  }

  try {
    const state = await plugin.getDebugState();
    panel.hidden = false;
    panel.textContent = [
      "Widget debug",
      `primary: ${state.primary ?? "—"}`,
      `secondary: ${state.secondary ?? ""}`,
      `stale: ${state.stale}`,
      `refreshed: ${formatWidgetDebugAge(state.refreshedAtMs)}`,
      `last refresh: ${formatWidgetDebugAge(state.lastRefreshMs)}`,
      `updating: ${state.updatingSinceMs ? formatWidgetDebugAge(state.updatingSinceMs) : "no"}`,
      `retry: ${state.updatingRetried}`,
      `following cached: ${state.followingDepartureIso ? "yes" : "no"}`,
      `updated line: ${state.updatedLine || "(hidden)"}`,
    ].join("\n");
  } catch (error) {
    panel.hidden = false;
    panel.textContent = `Widget debug error: ${error?.message ?? error}`;
  }
}

let widgetMenuHintToastTimer = null;

function ensureAppToast() {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  return toast;
}

function dismissWidgetMenuHintToast() {
  const toast = document.getElementById("app-toast");
  if (!toast) {
    return;
  }

  toast.classList.remove("app-toast--visible");
  toast.hidden = true;
  toast.style.top = "";
  toast.style.right = "";
  toast.style.left = "";
  if (widgetMenuHintToastTimer) {
    clearTimeout(widgetMenuHintToastTimer);
    widgetMenuHintToastTimer = null;
  }
}

function showMenuChromeHintToast(messageHtml) {
  const toast = ensureAppToast();
  toast.innerHTML = messageHtml;
  toast.hidden = false;

  const menuChrome = document.getElementById("menu-chrome-action");
  if (menuChrome) {
    const rect = menuChrome.getBoundingClientRect();
    const gap = 10;
    toast.style.top = `${Math.round(rect.bottom + gap)}px`;
    toast.style.right = `${Math.max(12, Math.round(window.innerWidth - rect.right))}px`;
    toast.style.left = "auto";
  }

  toast.classList.add("app-toast--visible");

  if (widgetMenuHintToastTimer) {
    clearTimeout(widgetMenuHintToastTimer);
  }

  const dismiss = () => {
    toast.removeEventListener("click", dismiss);
    dismissWidgetMenuHintToast();
  };

  toast.addEventListener("click", dismiss);

  widgetMenuHintToastTimer = window.setTimeout(() => {
    toast.removeEventListener("click", dismiss);
    dismissWidgetMenuHintToast();
  }, 3500);
}

function pulseMenuChrome() {
  const menuChrome = document.getElementById("menu-chrome-action");
  if (!menuChrome) {
    return;
  }

  menuChrome.classList.remove("chrome-action--pulse");
  // Restart animation if Not now is tapped again quickly.
  void menuChrome.offsetWidth;
  menuChrome.classList.add("chrome-action--pulse");
  window.setTimeout(() => {
    menuChrome.classList.remove("chrome-action--pulse");
  }, 2200);
}

function showMenuChromeHint(messageHtml) {
  showMenuChromeHintToast(messageHtml);
  pulseMenuChrome();
}

function showWidgetCoachNotNowHint() {
  showMenuChromeHint('You can add a widget anytime from <strong>Menu</strong>.');
}

function showReminderCoachNotNowHint() {
  showMenuChromeHint('You can turn on reminders anytime from <strong>Menu</strong>.');
}

async function showWidgetCoach() {
  if (!isNativeApp()) {
    return false;
  }

  if ((await getWidgetInstanceCount()) >= 1) {
    window.nextTrainStickinessCoaches?.markCoachDone?.("widget");
    hideWidgetCoach();
    return false;
  }

  const coach = document.getElementById("widget-coach");
  if (coach) {
    coach.hidden = false;
    return true;
  }

  return false;
}

function resetWidgetHelpDialog() {
  const manual = document.getElementById("widget-help-manual");
  if (manual) {
    manual.hidden = true;
  }
}

function setWidgetHelpMode(mode) {
  const pinFirst = document.getElementById("widget-help-pin-first");
  const alreadyHave = document.getElementById("widget-help-already-have");
  const title = document.getElementById("widget-help-title");
  const pinBtn = document.getElementById("widget-help-pin-btn");
  const addAnotherBtn = document.getElementById("widget-help-add-another-btn");
  const doneBtn = document.getElementById("widget-help-done-btn");

  const hasWidget = mode === "already-have";
  if (title) {
    title.textContent = hasWidget ? "Home screen widget" : "Add home screen widget";
  }
  if (pinFirst) {
    pinFirst.hidden = hasWidget;
  }
  if (alreadyHave) {
    alreadyHave.hidden = !hasWidget;
  }
  if (pinBtn) {
    pinBtn.hidden = hasWidget;
    pinBtn.className = "btn-primary";
  }
  if (addAnotherBtn) {
    addAnotherBtn.hidden = !hasWidget;
  }
  if (doneBtn) {
    doneBtn.className = hasWidget ? "btn-primary" : "btn-secondary";
  }
}

async function getWidgetInstanceCount() {
  const plugin = getWidgetSyncPlugin();
  if (!plugin?.getWidgetInstanceCount) {
    return 0;
  }

  try {
    const result = await plugin.getWidgetInstanceCount();
    return Number(result?.count) || 0;
  } catch (error) {
    console.warn("Could not read widget instance count", error);
    return 0;
  }
}

function showWidgetHelpManual() {
  const manual = document.getElementById("widget-help-manual");
  if (manual) {
    manual.hidden = false;
  }
}

async function openWidgetHelpDialog({ showManual = false } = {}) {
  hideWidgetCoach();
  const dialog = document.getElementById("widget-help-dialog");
  if (!dialog) {
    return;
  }

  resetWidgetHelpDialog();
  const count = await getWidgetInstanceCount();
  setWidgetHelpMode(count >= 1 ? "already-have" : "pin-first");
  if (showManual) {
    showWidgetHelpManual();
  }

  // Prefer app dialog opener — showModal is unreliable in Capacitor WebView.
  if (typeof window.nextTrainApp?.openAppDialog === "function") {
    window.nextTrainApp.openAppDialog(dialog);
    return;
  }

  try {
    dialog.showModal();
  } catch (error) {
    console.warn("widget help showModal failed", error);
    dialog.setAttribute("open", "");
  }
}

async function requestPinWidget() {
  const plugin = getWidgetSyncPlugin();
  const dialog = document.getElementById("widget-help-dialog");
  const dialogOpen = Boolean(dialog?.open);

  if (!plugin?.requestPinWidget) {
    if (!dialogOpen) {
      openWidgetHelpDialog({ showManual: true });
    } else {
      showWidgetHelpManual();
    }
    return;
  }

  try {
    const result = await plugin.requestPinWidget();
    if (!result?.requested) {
      if (!dialogOpen) {
        openWidgetHelpDialog({ showManual: true });
      } else {
        showWidgetHelpManual();
      }
      return;
    }

    window.nextTrainStickinessCoaches?.markCoachDone?.("widget");
    window.NextTrainAnalytics?.track?.("widget_pin_requested");
    if (typeof window.nextTrainApp?.closeAppDialog === "function") {
      window.nextTrainApp.closeAppDialog(dialog);
    } else {
      dialog?.close();
    }
    window.setTimeout(() => {
      window.NextTrainPro?.pollWidgetAdded?.();
    }, 1500);
  } catch (error) {
    console.warn("Could not request widget pin", error);
    if (!dialogOpen) {
      openWidgetHelpDialog({ showManual: true });
    } else {
      showWidgetHelpManual();
    }
  }
}

function initWidgetUi() {
  document.getElementById("widget-coach-how-btn")?.addEventListener("click", () => {
    window.nextTrainStickinessCoaches?.markCoachDone?.("widget");
    hideWidgetCoach();
    openWidgetHelpDialog();
  });

  document.getElementById("widget-coach-later-btn")?.addEventListener("click", () => {
    hideWidgetCoach();
    window.nextTrainStickinessCoaches?.markCoachNotNow?.("widget");
    showWidgetCoachNotNowHint();
  });

  document.getElementById("menu-widget-btn")?.addEventListener("click", () => {
    window.nextTrainApp?.closeMenuDialogOnly?.();
    window.nextTrainStickinessCoaches?.markCoachDone?.("widget");
    openWidgetHelpDialog();
  });

  document.getElementById("widget-help-pin-btn")?.addEventListener("click", requestPinWidget);
  document.getElementById("widget-help-add-another-btn")?.addEventListener("click", requestPinWidget);
  document.getElementById("widget-help-done-btn")?.addEventListener("click", () => {
    const dialog = document.getElementById("widget-help-dialog");
    if (typeof window.nextTrainApp?.closeAppDialog === "function") {
      window.nextTrainApp.closeAppDialog(dialog);
      return;
    }
    dialog?.close();
  });

  const menuWidgetBtn = document.getElementById("menu-widget-btn");
  if (menuWidgetBtn) {
    menuWidgetBtn.hidden = !isNativeApp();
  }
}

function initWidgetBridge() {
  initWidgetUi();
  syncWidgetSettings();
}

window.nextTrainWidget = {
  syncWidgetSettings,
  handleWidgetDeepLink,
  consumeLaunchDeepLink: consumeWidgetLaunchDeepLink,
  getWidgetInstanceCount,
  showWidgetCoach,
  openWidgetHelpDialog,
  requestPinWidget,
  showMenuChromeHint,
  showReminderCoachNotNowHint,
  refreshWidgetDebugPanel,
  isWidgetDebugEnabled,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWidgetBridge);
} else {
  initWidgetBridge();
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    consumeWidgetLaunchDeepLink();
    syncWidgetSettings();
  }
});
