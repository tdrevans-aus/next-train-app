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
    const payload = settings ?? JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
    await plugin.syncSettings({ settingsJson: JSON.stringify(payload) });
  } catch (error) {
    console.warn("Could not sync widget settings", error);
  }
}

function parseWidgetDeepLink(uri) {
  if (!uri) {
    return null;
  }

  const match = String(uri).match(/^nexttrain:\/\/journey(\/.*)?$/i);
  if (!match) {
    return null;
  }

  const path = (match[1] ?? "").replace(/^\//, "");
  return path || "new";
}

async function handleWidgetDeepLink(uri) {
  const target = parseWidgetDeepLink(uri);
  if (!target) {
    return;
  }

  if (target === "new") {
    window.nextTrainApp?.enterJourneyMode?.();
    window.nextTrainApp?.openJourneys?.();
    return;
  }

  window.nextTrainApp?.enterJourneyMode?.();
  if (typeof window.nextTrainApp?.switchJourney === "function") {
    window.nextTrainApp.switchJourney(target);
  }
  window.nextTrainApp?.fetchNextTrain?.();
}

async function consumeWidgetLaunchDeepLink() {
  const plugin = getWidgetSyncPlugin();
  if (!plugin?.getLaunchDeepLink) {
    return;
  }

  try {
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
  if (widgetMenuHintToastTimer) {
    clearTimeout(widgetMenuHintToastTimer);
    widgetMenuHintToastTimer = null;
  }
}

function showWidgetMenuHintToast() {
  const toast = ensureAppToast();
  toast.innerHTML = 'You can add a widget anytime from <strong>Menu</strong>.';
  toast.hidden = false;
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
  }, 3000);
}

function pulseMenuChrome() {
  const menuChrome = document.getElementById("menu-chrome-action");
  if (!menuChrome) {
    return;
  }

  menuChrome.classList.add("chrome-action--pulse");
  window.setTimeout(() => {
    menuChrome.classList.remove("chrome-action--pulse");
  }, 1400);
}

function showWidgetCoachNotNowHint() {
  showWidgetMenuHintToast();
  pulseMenuChrome();
}

function showWidgetCoach() {
  if (!isNativeApp()) {
    return;
  }

  const coach = document.getElementById("widget-coach");
  if (coach) {
    coach.hidden = false;
  }
}

function resetWidgetHelpDialog() {
  const manual = document.getElementById("widget-help-manual");
  if (manual) {
    manual.hidden = true;
  }
}

function showWidgetHelpManual() {
  const manual = document.getElementById("widget-help-manual");
  if (manual) {
    manual.hidden = false;
  }
}

function openWidgetHelpDialog({ showManual = false } = {}) {
  hideWidgetCoach();
  const dialog = document.getElementById("widget-help-dialog");
  if (!dialog) {
    return;
  }

  resetWidgetHelpDialog();
  if (showManual) {
    showWidgetHelpManual();
  }

  dialog.showModal();
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
    dialog?.close();
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
  document.getElementById("widget-help-done-btn")?.addEventListener("click", () => {
    document.getElementById("widget-help-dialog")?.close();
  });

  const menuWidgetBtn = document.getElementById("menu-widget-btn");
  if (menuWidgetBtn) {
    menuWidgetBtn.hidden = !isNativeApp();
  }
}

function initWidgetBridge() {
  initWidgetUi();
  consumeWidgetLaunchDeepLink();
  syncWidgetSettings();
}

window.nextTrainWidget = {
  syncWidgetSettings,
  handleWidgetDeepLink,
  consumeLaunchDeepLink: consumeWidgetLaunchDeepLink,
  showWidgetCoach,
  openWidgetHelpDialog,
  requestPinWidget,
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
