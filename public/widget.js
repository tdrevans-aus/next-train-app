// Classic <script> re-entry in the same WebView throws on top-level `let`/`const`
// (CAPACITOR-11: Identifier 'widgetMenuHintToastTimer' has already been declared).
(function () {
  if (window.nextTrainWidget) {
    return;
  }

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

function resolveSettingsForWidgetSync(settings) {
  if (settings && typeof settings === "object") {
    return settings;
  }
  const fromApp = window.nextTrainApp?.getSettings?.();
  if (fromApp && typeof fromApp === "object") {
    return fromApp;
  }
  try {
    return JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
  } catch {
    return {};
  }
}

async function syncWidgetSettings(settings) {
  if (!isNativeApp()) {
    return;
  }

  const plugin = getWidgetSyncPlugin();
  if (!plugin?.syncSettings) {
    return;
  }

  try {
    const payload = resolveSettingsForWidgetSync(settings);
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

  const raw = String(uri);
  if (/^nexttrain:\/\/nearby/i.test(raw)) {
    let departureIso = "";
    try {
      departureIso = new URL(raw).searchParams.get("departure") || "";
    } catch {
      const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
      departureIso = new URLSearchParams(query).get("departure") || "";
    }
    return { type: "nearby", departureIso };
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
    await window.nextTrainApp?.enterNearbyMode?.({
      departureIso: target.departureIso || undefined,
    });
    return;
  }

  if (target.type === "home") {
    await window.nextTrainApp?.openMainScreenFromWidget?.();
    return;
  }

  if (target.type === "paywall") {
    const openPaywall = () => window.NextTrainAdFree?.openRemoveAdsDialog?.();
    openPaywall();
    if (!document.getElementById("ad-free-dialog")?.open &&
        !document.getElementById("ad-free-dialog")?.hasAttribute("open")) {
      setTimeout(openPaywall, 250);
    }
    return;
  }

  if (target.journeyId === "new") {
    window.nextTrainApp?.enterJourneyMode?.();
    window.nextTrainApp?.openJourneys?.();
    return;
  }

  if (target.journeyId === "nearby-pin") {
    window.nextTrainApp?.prepareMainScreenFromDeepLink?.();
    await window.nextTrainApp?.enterNearbyMode?.({
      departureIso: target.departureIso || undefined,
    });
    return;
  }

  window.nextTrainApp?.prepareMainScreenFromDeepLink?.();
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
    const lines = [
      "Widget debug",
      `settings synced: ${state.hasSettings ? "yes" : "no"}`,
      `configured journeys: ${state.configuredJourneyCount ?? "—"}`,
      `has snapshot: ${state.hasSnapshot ? "yes" : "no"}`,
    ];
    if (state.hasSnapshot) {
      lines.push(
        `label: ${state.label || "—"}`,
        `primary: ${state.primary ?? "—"}`,
        `secondary: ${state.secondary ?? ""}`,
        `empty: ${state.empty}`,
        `outside hours idle: ${state.outsideHoursIdle}`,
        `nearby fallback: ${state.nearbyFallback}`,
        `journey id: ${state.journeyId || "—"}`,
        `stale empty cache: ${state.staleEmptyCache ? "yes" : "no"}`,
        `stale: ${state.stale}`,
        `refreshed: ${formatWidgetDebugAge(state.refreshedAtMs)}`,
        `last refresh: ${formatWidgetDebugAge(state.lastRefreshMs)}`,
        `departure iso: ${state.departureIso || "—"}`,
        `updated line: ${state.updatedLine || "(hidden)"}`,
      );
    }
    if (state.updatingSinceMs) {
      lines.push(`updating: ${formatWidgetDebugAge(state.updatingSinceMs)}`);
    }
    if (state.updatingRetried) {
      lines.push(`retry: ${state.updatingRetried}`);
    }
    if (state.followingDepartureIso) {
      lines.push(`following cached: yes`);
    }
    panel.textContent = lines.join("\n");
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

    if (!sessionStorage.getItem(WIDGET_SETUP_PIN_SESSION_KEY)) {
      sessionStorage.setItem(WIDGET_SETUP_PIN_SESSION_KEY, "1");
      window.setTimeout(() => {
        openWidgetAppearanceSetup({ source: "pin" });
      }, 400);
    }
  } catch (error) {
    console.warn("Could not request widget pin", error);
    if (!dialogOpen) {
      openWidgetHelpDialog({ showManual: true });
    } else {
      showWidgetHelpManual();
    }
  }
}

const WIDGET_APPEARANCE_MODES = [
  {
    id: "blend",
    label: "Blend in",
    description: "Transparent card; your wallpaper shows through.",
  },
  {
    id: "wallpaper",
    label: "Match wallpaper",
    description: "Colours from your wallpaper on Android 12+.",
    wallpaper: true,
  },
  {
    id: "brand",
    label: "Brand teal",
    description: "White card, Next Train teal — the classic look.",
    bg: "#FFFFFF",
    text: "#1A2F2C",
    muted: "#5C726D",
    accent: "#0B6E6A",
    border: "#1A132523",
  },
];

const WIDGET_BLEND_THEME_DEFAULT = "ocean";

const WIDGET_COLOUR_PRESETS = [
  {
    id: "ocean",
    label: "Ocean",
    bg: "#E8F4FC",
    text: "#0F2942",
    muted: "#4A6B85",
    accent: "#0369A1",
    border: "#1A0F2942",
  },
  {
    id: "midnight",
    label: "Midnight",
    bg: "#1B3D6B",
    text: "#E8EDF4",
    muted: "#8B9CB3",
    accent: "#93C5FD",
    border: "#33E8EDF4",
  },
  {
    id: "slate",
    label: "Slate",
    bg: "#5A5A63",
    text: "#F4F4F5",
    muted: "#A1A1AA",
    accent: "#E2E8F0",
    border: "#33F4F4F5",
  },
  {
    id: "lavender",
    label: "Lavender",
    bg: "#F3EEFA",
    text: "#2D2640",
    muted: "#6B6280",
    accent: "#7C3AED",
    border: "#1A2D2640",
  },
  {
    id: "rose",
    label: "Rose",
    bg: "#FDF2F4",
    text: "#3D1F28",
    muted: "#8B6570",
    accent: "#D41D6F",
    border: "#1A3D1F28",
  },
  {
    id: "amoled",
    label: "AMOLED",
    bg: "#000000",
    text: "#F5F5F5",
    muted: "#A3A3A3",
    accent: "#14B8A6",
    border: "#26F5F5F5",
  },
  {
    id: "default",
    label: "Light",
    bg: "#FFFFFF",
    text: "#1A2F2C",
    muted: "#5C726D",
    accent: "#0B6E6A",
    border: "#1A132523",
  },
];

function migrateWidgetThemeId(settings = {}) {
  const raw = String(settings.widgetThemeId ?? "").trim();
  if (raw === "forest") {
    return "default";
  }
  if (!raw || raw === "system") {
    return WIDGET_BLEND_THEME_DEFAULT;
  }
  if (WIDGET_COLOUR_PRESETS.some((preset) => preset.id === raw)) {
    return raw;
  }
  return WIDGET_BLEND_THEME_DEFAULT;
}

function resolveColourPresetForId(themeId) {
  const normalized = migrateWidgetThemeId({ widgetThemeId: themeId });
  return WIDGET_COLOUR_PRESETS.find((preset) => preset.id === normalized) ?? WIDGET_COLOUR_PRESETS[0];
}

function migrateWidgetAppearanceMode(settings = {}) {
  const mode = String(settings.widgetAppearanceMode ?? "").trim();
  if (mode === "blend" || mode === "wallpaper" || mode === "brand") {
    return mode;
  }
  const legacy = String(settings.widgetThemeId ?? "").trim();
  if (legacy === "system") {
    return "wallpaper";
  }
  if (legacy === "default") {
    return "brand";
  }
  if (legacy) {
    return "blend";
  }
  return "blend";
}

function readSettingsObject() {
  if (window.settings && typeof window.settings === "object") {
    return { ...window.settings };
  }
  try {
    return JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
  } catch (error) {
    return {};
  }
}

const WIDGET_OPACITY_SYNC_DEBOUNCE_MS = 300;
const WIDGET_SETUP_PIN_SESSION_KEY = "nextTrainWidgetSetupPinShown";
let widgetOpacitySyncTimer = null;
let widgetAppearancePendingPatch = null;
let systemWidgetPaletteCache = null;
let systemWidgetPalettePromise = null;
const widgetSetupState = {
  active: false,
  source: null,
  appWidgetId: null,
};

function getWidgetAppearanceMode() {
  return migrateWidgetAppearanceMode(readSettingsObject());
}

function getWidgetThemeId() {
  const mode = getWidgetAppearanceMode();
  if (mode === "brand") {
    return "default";
  }
  if (mode === "wallpaper") {
    return "system";
  }
  return migrateWidgetThemeId(readSettingsObject());
}

function getWidgetBgOpacity() {
  const settings = readSettingsObject();
  const mode = migrateWidgetAppearanceMode(settings);
  if (mode === "blend" && settings.widgetTransparentBg) {
    return 0;
  }
  const opacity = Number(settings.widgetBgOpacity);
  if (!Number.isFinite(opacity)) {
    return mode === "blend" ? 0 : 100;
  }
  return Math.max(0, Math.min(100, Math.round(opacity)));
}

function getWidgetTransparentBg() {
  const settings = readSettingsObject();
  const mode = migrateWidgetAppearanceMode(settings);
  if (mode !== "blend") {
    return false;
  }
  return Boolean(settings.widgetTransparentBg);
}

function resolveEffectiveBgOpacity(opacityOverride) {
  if (opacityOverride !== undefined && opacityOverride !== null) {
    return Math.max(0, Math.min(100, Number(opacityOverride) || 0));
  }
  if (getWidgetTransparentBg()) {
    return 0;
  }
  return getWidgetBgOpacity();
}

function hexRgb(hex) {
  const raw = String(hex ?? "").replace("#", "");
  const value = raw.length === 8 ? raw.slice(2) : raw.length === 6 ? raw : raw.padStart(6, "0");
  const num = Number.parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbaFromHex(hex, opacityPct) {
  const { r, g, b } = hexRgb(hex);
  const alpha = Math.max(0, Math.min(100, opacityPct)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function argbHexToCss(hex) {
  const raw = String(hex ?? "").replace("#", "");
  if (raw.length === 8) {
    const a = Number.parseInt(raw.slice(0, 2), 16) / 255;
    const r = Number.parseInt(raw.slice(2, 4), 16);
    const g = Number.parseInt(raw.slice(4, 6), 16);
    const b = Number.parseInt(raw.slice(6, 8), 16);
    if (a <= 0) {
      return "transparent";
    }
    if (a >= 0.999) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  if (raw.length === 6) {
    return `#${raw}`;
  }
  return hex ?? "transparent";
}

async function fetchSystemWidgetPalette(force = false) {
  if (!force && systemWidgetPaletteCache) {
    return systemWidgetPaletteCache;
  }
  if (!isNativeApp()) {
    return { available: false, api31: false };
  }
  const plugin = getWidgetSyncPlugin();
  if (!plugin?.getSystemWidgetPalette) {
    return { available: false, api31: false };
  }
  if (!force && systemWidgetPalettePromise) {
    return systemWidgetPalettePromise;
  }
  systemWidgetPalettePromise = plugin
    .getSystemWidgetPalette()
    .then((data) => {
      systemWidgetPaletteCache = data ?? { available: false };
      systemWidgetPalettePromise = null;
      return systemWidgetPaletteCache;
    })
    .catch((error) => {
      console.warn("getSystemWidgetPalette failed", error);
      systemWidgetPalettePromise = null;
      return { available: false };
    });
  return systemWidgetPalettePromise;
}

function applySystemPreviewOpacity(preview, palette, opacityPct) {
  if (!preview || !palette) {
    return;
  }
  if (opacityPct <= 0) {
    preview.style.background = "transparent";
    preview.style.borderColor = "transparent";
    return;
  }
  preview.style.background = rgbaFromHex(palette.bg, opacityPct);
  preview.style.borderColor = argbHexToCss(palette.border);
}

function buildWidgetAppearanceModePatch(mode, priorMode = getWidgetAppearanceMode()) {
  const normalized = migrateWidgetAppearanceMode({ widgetAppearanceMode: mode });
  const patch = {
    widgetAppearanceMode: normalized,
    widgetTransparentBg: false,
  };

  if (mode === "blend" && priorMode !== "blend") {
    const opacity = getWidgetBgOpacity();
    if (getWidgetTransparentBg() || opacity <= 0) {
      patch.widgetBgOpacity = 0;
      patch.widgetTransparentBg = true;
    } else {
      patch.widgetBgOpacity = opacity;
    }
    const settings = readSettingsObject();
    const storedTheme = String(settings.widgetThemeId ?? "").trim();
    if (!storedTheme || storedTheme === "system" || storedTheme === "forest") {
      patch.widgetThemeId = migrateWidgetThemeId(settings);
    }
  } else if (mode !== "blend" && (getWidgetTransparentBg() || getWidgetBgOpacity() <= 0)) {
    patch.widgetBgOpacity = 100;
  } else {
    const opacity = getWidgetBgOpacity();
    if (opacity > 0) {
      patch.widgetBgOpacity = opacity;
    }
  }

  return patch;
}

function previewOpacityFromPatch(patch) {
  if (patch.widgetTransparentBg) {
    return 0;
  }
  if ("widgetBgOpacity" in patch) {
    return patch.widgetBgOpacity;
  }
  return getWidgetTransparentBg() ? 0 : getWidgetBgOpacity();
}

async function refreshWallpaperModePreviews() {
  const data = await fetchSystemWidgetPalette();
  const fallback = resolveWallpaperPreviewPalette();
  const previewPalette = data?.available ? data : fallback;
  for (const grid of getWidgetAppearanceModeGrids()) {
    const button = grid.querySelector('[data-appearance-mode="wallpaper"]');
    if (!button) {
      continue;
    }
    const swatch = button.querySelector(".widget-mode-swatch");
    if (!swatch) {
      continue;
    }
    swatch.style.background = argbHexToCss(previewPalette.bg);
    swatch.style.borderColor = argbHexToCss(previewPalette.border);
    const digit = swatch.querySelector(".widget-mode-swatch-digit");
    const unit = swatch.querySelector(".widget-mode-swatch-unit");
    if (digit) {
      digit.style.color = argbHexToCss(previewPalette.accent);
    }
    if (unit) {
      unit.style.color = argbHexToCss(previewPalette.muted);
    }
  }
  if (getWidgetAppearanceMode() === "wallpaper") {
    updateHeroPreview();
  }
}

const WALLPAPER_PREVIEW_PALETTE_FALLBACK = {
  bg: "#1A2332",
  text: "#E8EDF4",
  muted: "#8B9CB3",
  accent: "#60A5FA",
  border: "#33E8EDF4",
};

function resolveWallpaperPreviewPalette() {
  const live = systemWidgetPaletteCache;
  if (live?.available) {
    return live;
  }
  return WALLPAPER_PREVIEW_PALETTE_FALLBACK;
}

function shouldShowHeroPreviewBorder(mode, effectiveOpacity) {
  if (effectiveOpacity <= 0) {
    return false;
  }
  if (mode === "blend") {
    return effectiveOpacity >= 100;
  }
  return true;
}

function applyHeroCardChrome(card, mode, effectiveOpacity, solidBorderColor) {
  if (effectiveOpacity <= 0) {
    card.style.borderWidth = "1px";
    card.style.borderStyle = "solid";
    card.style.borderColor = "transparent";
    card.style.boxShadow = "none";
    return;
  }

  if (mode === "blend") {
    if (effectiveOpacity >= 100) {
      card.style.borderWidth = "2px";
      card.style.borderStyle = "solid";
      card.style.borderColor = solidBorderColor ?? "rgba(19, 37, 35, 0.14)";
      card.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.2)";
      return;
    }
    card.style.borderWidth = "1px";
    card.style.borderStyle = "solid";
    card.style.borderColor = "transparent";
    card.style.boxShadow = "none";
    return;
  }

  card.style.borderWidth = "2px";
  card.style.borderStyle = "solid";
  card.style.borderColor = solidBorderColor ?? "rgba(19, 37, 35, 0.14)";
  card.style.boxShadow = "0 10px 28px rgba(19, 37, 35, 0.3)";
}

function applyHeroPreviewFromArgbPalette(palette, effectiveOpacity, mode = getWidgetAppearanceMode()) {
  const card = document.getElementById("widget-hero-mock-card");
  if (!card || !palette) {
    return;
  }
  card.style.color = argbHexToCss(palette.text);
  if (effectiveOpacity <= 0) {
    card.style.background = "transparent";
    applyHeroCardChrome(card, mode, 0);
  } else {
    card.style.background = rgbaFromHex(palette.bg, effectiveOpacity);
    const borderColor = shouldShowHeroPreviewBorder(mode, effectiveOpacity)
      ? argbHexToCss(palette.border)
      : argbHexToCss(palette.border);
    applyHeroCardChrome(card, mode, effectiveOpacity, borderColor);
  }
  document.getElementById("widget-hero-mock-primary-value").style.color = argbHexToCss(
    palette.accent
  );
  document.getElementById("widget-hero-mock-primary-unit").style.color = argbHexToCss(
    palette.muted
  );
  document.getElementById("widget-hero-mock-clock").style.color = argbHexToCss(palette.text);
  document.querySelectorAll(".widget-hero-mock-label").forEach((node) => {
    node.style.color = argbHexToCss(palette.muted);
  });
  document.querySelectorAll(".widget-hero-mock-leave").forEach((node) => {
    node.style.color = "#E8841A";
  });
}

function applyHeroPreviewFromPreset(preset, effectiveOpacity, mode = getWidgetAppearanceMode()) {
  const card = document.getElementById("widget-hero-mock-card");
  if (!card || !preset) {
    return;
  }
  card.style.color = preset.text;
  if (effectiveOpacity <= 0) {
    card.style.background = "transparent";
    applyHeroCardChrome(card, mode, 0);
  } else {
    card.style.background = rgbaFromHex(preset.bg, effectiveOpacity);
    applyHeroCardChrome(card, mode, effectiveOpacity, preset.border ?? "rgba(19, 37, 35, 0.14)");
  }
  document.getElementById("widget-hero-mock-primary-value").style.color = preset.accent;
  document.getElementById("widget-hero-mock-primary-unit").style.color = preset.muted;
  document.getElementById("widget-hero-mock-clock").style.color = preset.text;
  document.querySelectorAll(".widget-hero-mock-label").forEach((node) => {
    node.style.color = preset.muted;
  });
  document.querySelectorAll(".widget-hero-mock-leave").forEach((node) => {
    node.style.color = "#E8841A";
  });
}

function applyOpacityToThemePreview(preview, preset, opacityPct) {
  if (!preview || preset.system) {
    return;
  }
  if (opacityPct <= 0) {
    preview.style.background = "transparent";
    preview.style.borderColor = "transparent";
    return;
  }
  preview.style.background = rgbaFromHex(preset.bg, opacityPct);
  if (preset.border) {
    preview.style.borderColor = preset.border;
  }
}

function resolveModeForId(modeId) {
  const normalized = migrateWidgetAppearanceMode({ widgetAppearanceMode: modeId });
  return WIDGET_APPEARANCE_MODES.find((entry) => entry.id === normalized) ?? WIDGET_APPEARANCE_MODES[0];
}

function getWidgetAppearanceModeGrids() {
  return document.querySelectorAll(".widget-appearance-mode-grid");
}

function getWidgetOpacitySliders() {
  return document.querySelectorAll(".widget-bg-opacity-slider");
}

function getWidgetOpacityValueLabels() {
  return document.querySelectorAll("#widget-bg-opacity-value");
}

function getWidgetTransparentToggles() {
  return document.querySelectorAll(".widget-transparent-toggle");
}

function updateHeroPreview(opacityOverride, modeOverride, themeIdOverride) {
  const card = document.getElementById("widget-hero-mock-card");
  if (!card) {
    return;
  }

  const mode = modeOverride ?? getWidgetAppearanceMode();
  const effectiveOpacity = resolveEffectiveBgOpacity(opacityOverride);

  if (mode === "wallpaper") {
    applyHeroPreviewFromArgbPalette(resolveWallpaperPreviewPalette(), effectiveOpacity, mode);
  } else if (mode === "brand") {
    applyHeroPreviewFromPreset(resolveColourPresetForId("default"), effectiveOpacity, mode);
  } else {
    const themeId = themeIdOverride ?? getWidgetThemeId();
    applyHeroPreviewFromPreset(resolveColourPresetForId(themeId), effectiveOpacity, mode);
  }

  card.classList.toggle("widget-hero-mock-card--blend", mode === "blend");
  card.classList.toggle("widget-hero-mock-card--brand", mode === "brand");
  card.classList.toggle("widget-hero-mock-card--wallpaper", mode === "wallpaper");
  card.classList.toggle("widget-hero-has-fill", effectiveOpacity > 0);
  card.classList.toggle("widget-hero-fully-opaque", effectiveOpacity >= 100);
  card.classList.toggle("widget-hero-low-opacity", effectiveOpacity > 0 && effectiveOpacity < 100);
  card.classList.toggle(
    "widget-hero-legibility",
    effectiveOpacity > 0 && effectiveOpacity < 50
  );
}

function updateWidgetModePreviewOpacity(opacityPct) {
  updateHeroPreview(opacityPct);
}

function refreshWidgetAppearanceControls() {
  const mode = getWidgetAppearanceMode();
  const opacity = getWidgetBgOpacity();
  const transparent = getWidgetTransparentBg();
  const displayOpacity = transparent ? 0 : opacity;
  const showOpacityControls = mode === "blend" || mode === "wallpaper" || mode === "brand";
  const showTransparentToggle = mode === "blend";

  for (const block of document.querySelectorAll(".widget-appearance-opacity-block")) {
    block.hidden = !showOpacityControls;
  }

  for (const slider of getWidgetOpacitySliders()) {
    slider.value = String(displayOpacity);
    slider.disabled = !showOpacityControls;
    syncWidgetBgOpacitySliderFill(displayOpacity, slider);
  }

  for (const valueLabel of getWidgetOpacityValueLabels()) {
    valueLabel.textContent = transparent || opacity <= 0 ? "0%" : `${opacity}%`;
  }

  for (const toggle of getWidgetTransparentToggles()) {
    toggle.checked = transparent;
    toggle.disabled = !showTransparentToggle;
  }

  for (const row of document.querySelectorAll(".widget-transparent-row")) {
    row.hidden = !showTransparentToggle;
  }

  const colourBlock = document.getElementById("widget-appearance-colour-block");
  if (colourBlock) {
    colourBlock.hidden = mode !== "blend";
  }
  if (mode === "blend") {
    renderWidgetColourGrid(getWidgetThemeId());
  }

  updateWidgetModePreviewOpacity(transparent ? 0 : opacity);
}

function syncWidgetBgOpacitySliderFill(opacity, slider = null) {
  const sliders = slider ? [slider] : getWidgetOpacitySliders();
  for (const input of sliders) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(opacity);
    const clamped = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : max;
    const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
    input.style.setProperty("--leave-before-pct", `${pct}%`);
  }
}

function normalizeWidgetAppearancePatch(patch = {}) {
  const next = { ...patch };
  if (next.widgetTransparentBg) {
    next.widgetBgOpacity = 0;
    next.widgetTransparentBg = true;
    return next;
  }
  if ("widgetBgOpacity" in next) {
    const opacity = Math.max(0, Math.min(100, Math.round(Number(next.widgetBgOpacity) || 0)));
    if (opacity <= 0) {
      next.widgetBgOpacity = 0;
      next.widgetTransparentBg = true;
      return next;
    }
    next.widgetBgOpacity = opacity;
    next.widgetTransparentBg = false;
  }
  return next;
}

async function applyWidgetAppearancePatch(patch) {
  const mode = patch.widgetAppearanceMode ?? getWidgetAppearanceMode();
  const normalized = normalizeWidgetAppearancePatch(patch);

  if ("widgetThemeId" in normalized) {
    if (mode !== "blend") {
      delete normalized.widgetThemeId;
    } else {
      normalized.widgetThemeId = migrateWidgetThemeId({
        widgetThemeId: normalized.widgetThemeId,
      });
    }
  }

  if (typeof window.nextTrainApp?.persistSettings === "function") {
    const settings = window.nextTrainApp.persistSettings(normalized);
    await syncWidgetSettings(settings);
    refreshWidgetAppearanceControls();
    return;
  }

  const settings = readSettingsObject();
  if ("widgetAppearanceMode" in normalized) {
    settings.widgetAppearanceMode = normalized.widgetAppearanceMode;
  }
  if ("widgetBgOpacity" in normalized) {
    settings.widgetBgOpacity = normalized.widgetBgOpacity;
  }
  if (normalized.widgetTransparentBg) {
    settings.widgetTransparentBg = true;
    settings.widgetBgOpacity = 0;
  } else if ("widgetBgOpacity" in normalized) {
    delete settings.widgetTransparentBg;
  }
  if ("widgetThemeId" in normalized) {
    settings.widgetThemeId = normalized.widgetThemeId;
  }
  localStorage.setItem("nextTrainSettings", JSON.stringify(settings));
  if (window.settings && typeof window.settings === "object") {
    if ("widgetAppearanceMode" in normalized) {
      window.settings.widgetAppearanceMode = normalized.widgetAppearanceMode;
    }
    if ("widgetBgOpacity" in normalized) {
      window.settings.widgetBgOpacity = normalized.widgetBgOpacity;
    }
    if (normalized.widgetTransparentBg) {
      window.settings.widgetTransparentBg = true;
      window.settings.widgetBgOpacity = 0;
    } else if ("widgetBgOpacity" in normalized) {
      delete window.settings.widgetTransparentBg;
    }
    if ("widgetThemeId" in normalized) {
      window.settings.widgetThemeId = normalized.widgetThemeId;
    }
  }
  await syncWidgetSettings(settings);
  refreshWidgetAppearanceControls();
}

function scheduleWidgetAppearanceSync(patch) {
  widgetAppearancePendingPatch = normalizeWidgetAppearancePatch({
    ...widgetAppearancePendingPatch,
    ...patch,
  });
  clearTimeout(widgetOpacitySyncTimer);
  widgetOpacitySyncTimer = setTimeout(() => {
    const toApply = normalizeWidgetAppearancePatch({
      ...widgetAppearancePendingPatch,
      widgetAppearanceMode: getWidgetAppearanceMode(),
    });
    widgetAppearancePendingPatch = null;
    widgetOpacitySyncTimer = null;
    if (toApply) {
      applyWidgetAppearancePatch(toApply);
    }
  }, WIDGET_OPACITY_SYNC_DEBOUNCE_MS);
}

async function flushWidgetAppearanceSync() {
  if (widgetOpacitySyncTimer) {
    clearTimeout(widgetOpacitySyncTimer);
    widgetOpacitySyncTimer = null;
  }
  if (widgetAppearancePendingPatch) {
    const toApply = normalizeWidgetAppearancePatch({
      ...widgetAppearancePendingPatch,
      widgetAppearanceMode: getWidgetAppearanceMode(),
    });
    widgetAppearancePendingPatch = null;
    await applyWidgetAppearancePatch(toApply);
    return;
  }

  const slider = getWidgetOpacitySliders()[0];
  if (!slider || slider.disabled) {
    return;
  }

  const mode = getWidgetAppearanceMode();
  const opacity = Math.max(0, Math.min(100, Number(slider.value) || 0));
  const storedOpacity = getWidgetBgOpacity();
  const storedTransparent = getWidgetTransparentBg();
  const displayOpacity = storedTransparent ? 0 : storedOpacity;
  if (opacity === displayOpacity) {
    return;
  }

  await applyWidgetAppearancePatch({
    widgetAppearanceMode: mode,
    widgetBgOpacity: opacity,
    widgetTransparentBg: opacity <= 0 && mode === "blend",
  });
}

async function setWidgetAppearanceMode(mode) {
  await applyWidgetAppearancePatch({
    widgetAppearanceMode: migrateWidgetAppearanceMode({ widgetAppearanceMode: mode }),
  });
}

function buildColourSwatch(preset) {
  const swatch = document.createElement("div");
  swatch.className = "widget-colour-swatch-preview";
  swatch.style.background = preset.bg;
  swatch.style.borderColor = preset.border ? argbHexToCss(preset.border) : "transparent";
  const digit = document.createElement("span");
  digit.className = "widget-colour-swatch-digit";
  digit.style.color = preset.accent;
  digit.textContent = "3";
  const unit = document.createElement("span");
  unit.className = "widget-colour-swatch-unit";
  unit.style.color = preset.muted;
  unit.textContent = "min";
  swatch.append(digit, unit);
  return swatch;
}

function renderWidgetColourGrid(selectedThemeId = getWidgetThemeId()) {
  const grid = document.getElementById("widget-appearance-colour-grid");
  if (!grid) {
    return;
  }
  const selected = migrateWidgetThemeId({ widgetThemeId: selectedThemeId });
  grid.replaceChildren();
  for (const preset of WIDGET_COLOUR_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "widget-colour-swatch";
    button.role = "radio";
    button.dataset.widgetThemeId = preset.id;
    button.setAttribute("aria-label", preset.label);
    button.setAttribute("aria-checked", preset.id === selected ? "true" : "false");
    button.append(buildColourSwatch(preset));
    const label = document.createElement("span");
    label.className = "widget-colour-swatch-label";
    label.textContent = preset.label;
    button.append(label);
    button.addEventListener("click", () => {
      void applyWidgetColourSelection(preset.id);
    });
    grid.append(button);
  }
}

async function applyWidgetColourSelection(themeId) {
  const normalized = migrateWidgetThemeId({ widgetThemeId: themeId });
  const transparent = getWidgetTransparentBg();
  const storedOpacity = getWidgetBgOpacity();
  let patch = { widgetThemeId: normalized };

  if (getWidgetAppearanceMode() === "blend" && (transparent || storedOpacity <= 0)) {
    patch = {
      widgetThemeId: normalized,
      widgetBgOpacity: 100,
      widgetTransparentBg: false,
    };
  }

  updateHeroPreview(
    patch.widgetBgOpacity ?? (transparent ? 0 : storedOpacity),
    "blend",
    normalized
  );
  await applyWidgetAppearancePatch(patch);
  renderWidgetColourGrid(normalized);
}

function buildModeSwatch(mode) {
  const swatch = document.createElement("div");
  swatch.className = "widget-mode-swatch";
  if (mode.id === "blend") {
    swatch.classList.add("widget-mode-swatch-blend");
    swatch.style.background = "transparent";
    swatch.style.borderWidth = "2px";
    swatch.style.borderStyle = "dashed";
    swatch.style.borderColor = "rgba(255, 255, 255, 0.55)";
  } else if (mode.wallpaper) {
    swatch.classList.add("widget-mode-swatch-wallpaper");
    swatch.style.background = "var(--mist-mid)";
    swatch.style.borderColor = "var(--mist-border)";
  } else {
    swatch.style.background = mode.bg;
    swatch.style.borderColor = mode.border;
  }
  const digit = document.createElement("span");
  digit.className = "widget-mode-swatch-digit";
  digit.style.color = mode.accent ?? "var(--teal)";
  digit.textContent = "3";
  const unit = document.createElement("span");
  unit.className = "widget-mode-swatch-unit";
  unit.style.color = mode.muted ?? "var(--mist)";
  unit.textContent = "min";
  swatch.append(digit, unit);
  return swatch;
}

function renderWidgetAppearanceGridInto(grid, selectedMode) {
  if (!grid) {
    return;
  }
  grid.replaceChildren();
  for (const mode of WIDGET_APPEARANCE_MODES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "widget-appearance-mode-card";
    button.role = "radio";
    button.dataset.appearanceMode = mode.id;
    button.setAttribute("aria-label", mode.label);
    button.setAttribute("aria-checked", mode.id === selectedMode ? "true" : "false");
    button.append(buildModeSwatch(mode));
    const label = document.createElement("span");
    label.className = "widget-appearance-mode-label";
    label.textContent = mode.label;
    button.append(label);
    const desc = document.createElement("span");
    desc.className = "widget-appearance-mode-desc";
    desc.textContent = mode.description;
    button.append(desc);
    button.addEventListener("click", async () => {
      await applyWidgetAppearanceModeSelection(mode.id);
    });
    grid.append(button);
  }
}

function renderWidgetAppearanceGrids(selectedMode) {
  for (const grid of getWidgetAppearanceModeGrids()) {
    renderWidgetAppearanceGridInto(grid, selectedMode);
  }
  void refreshWallpaperModePreviews();
}

async function applyWidgetAppearanceModeSelection(mode) {
  clearTimeout(widgetOpacitySyncTimer);
  widgetOpacitySyncTimer = null;
  widgetAppearancePendingPatch = null;

  const priorMode = getWidgetAppearanceMode();
  const normalized = migrateWidgetAppearanceMode({ widgetAppearanceMode: mode });
  const patch = buildWidgetAppearanceModePatch(mode, priorMode);
  const previewOpacity = previewOpacityFromPatch(patch);

  updateHeroPreview(previewOpacity, normalized);

  if (mode === "wallpaper") {
    systemWidgetPaletteCache = null;
    await fetchSystemWidgetPalette(true);
    updateHeroPreview(previewOpacity, normalized);
  }

  await applyWidgetAppearancePatch(patch);
  renderWidgetAppearanceGrids(normalized);
  await refreshWallpaperModePreviews();
  refreshWidgetAppearanceControls();
}

async function setWidgetThemeId(themeId) {
  await applyWidgetColourSelection(themeId);
}

function configureWidgetAppearanceChrome(source) {
  const title = document.getElementById("widget-appearance-setup-title");
  const hint = document.getElementById("widget-appearance-setup-hint");
  const legibility = document.getElementById("widget-appearance-legibility-hint");
  const primary = document.getElementById("widget-appearance-setup-primary-btn");
  const cancel = document.getElementById("widget-appearance-setup-cancel-btn");
  const back = document.getElementById("widget-appearance-setup-back-btn");
  const footer = document.querySelector(".widget-appearance-setup-footer");

  if (source === "menu") {
    if (title) {
      title.textContent = "Widget appearance";
    }
    if (hint) {
      hint.textContent =
        "Choose how your home screen widget blends with your wallpaper. The app stays the same.";
    }
    if (legibility) {
      legibility.hidden = false;
    }
    if (primary) {
      primary.textContent = "Done";
    }
    if (cancel) {
      cancel.hidden = true;
    }
    if (back) {
      back.hidden = false;
      back.setAttribute("aria-label", "Close widget appearance");
    }
    if (footer) {
      footer.dataset.layout = "single";
    }
    return;
  }

  if (legibility) {
    legibility.hidden = true;
  }
  if (title) {
    title.textContent = "Set up your widget";
  }
  if (primary) {
    primary.textContent = "Done";
  }
  if (cancel) {
    cancel.hidden = false;
    cancel.textContent = source === "configure" ? "Cancel" : "Skip";
  }
  if (back) {
    back.hidden = false;
    back.setAttribute(
      "aria-label",
      source === "configure" ? "Cancel widget setup" : "Skip widget setup"
    );
  }
  if (footer) {
    delete footer.dataset.layout;
  }
  if (hint) {
    hint.textContent =
      source === "configure"
        ? "Choose how your widget looks. Tap Done to place it on your home screen, or Cancel to go back without adding."
        : "Choose how your widget looks. Tap Done when you're finished, or Skip to return to the app.";
  }
}

function openWidgetAppearanceDialog() {
  openWidgetAppearanceSetup({ source: "menu" });
}

function notifyWidgetSetupOverlayActive(active) {
  if (!isNativeApp()) {
    return;
  }
  const plugin = getWidgetSyncPlugin();
  if (!plugin?.setWidgetSetupOverlayActive) {
    return;
  }
  plugin.setWidgetSetupOverlayActive({ active }).catch((error) => {
    console.warn("setWidgetSetupOverlayActive failed", error);
  });
}

function closeWidgetAppearanceSetup() {
  const setup = document.getElementById("widget-appearance-setup");
  if (!setup) {
    return;
  }
  setup.hidden = true;
  document.body.classList.remove("widget-setup-active");
  widgetSetupState.active = false;
  widgetSetupState.source = null;
  widgetSetupState.appWidgetId = null;
  notifyWidgetSetupOverlayActive(false);
  window.NextTrainAds?.syncOverlaySuppression?.();
}

function openWidgetAppearanceSetup({ appWidgetId = null, source = "pin" } = {}) {
  if (source !== "menu" && !isNativeApp()) {
    return;
  }

  const setup = document.getElementById("widget-appearance-setup");
  if (!setup) {
    return;
  }

  widgetSetupState.active = true;
  widgetSetupState.source = source;
  widgetSetupState.appWidgetId = appWidgetId;

  configureWidgetAppearanceChrome(source);

  renderWidgetAppearanceGrids(getWidgetAppearanceMode());
  refreshWidgetAppearanceControls();

  const mode = getWidgetAppearanceMode();
  const transparent = getWidgetTransparentBg();
  const opacity = transparent ? 0 : getWidgetBgOpacity();
  updateHeroPreview(opacity, mode, getWidgetThemeId());

  setup.hidden = false;
  document.body.classList.add("widget-setup-active");
  notifyWidgetSetupOverlayActive(true);
  window.NextTrainAds?.syncOverlaySuppression?.();
}

async function finishWidgetAppearanceSetup(ok = true) {
  if (!widgetSetupState.active) {
    return;
  }

  await flushWidgetAppearanceSync();

  if (widgetSetupState.source === "configure") {
    const plugin = getWidgetSyncPlugin();
    if (plugin?.finishWidgetConfigure) {
      try {
        await plugin.finishWidgetConfigure({ ok });
      } catch (error) {
        console.warn("finishWidgetConfigure failed", error);
      }
    }
  }

  closeWidgetAppearanceSetup();
}

async function maybeOpenWidgetConfigureSetup() {
  if (!isNativeApp() || widgetSetupState.active) {
    return;
  }

  const plugin = getWidgetSyncPlugin();
  if (!plugin?.getWidgetConfigureContext) {
    return;
  }

  try {
    const context = await plugin.getWidgetConfigureContext();
    if (context?.active) {
      openWidgetAppearanceSetup({
        appWidgetId: context.appWidgetId,
        source: "configure",
      });
    }
  } catch (error) {
    console.warn("getWidgetConfigureContext failed", error);
  }
}

function handleWidgetAppearanceSetupDismiss() {
  const ok = widgetSetupState.source === "menu";
  finishWidgetAppearanceSetup(ok);
}

function initWidgetConfigureListener() {
  const handleConfigureFinished = () => {
    if (!widgetSetupState.active) {
      return;
    }
    const ok = widgetSetupState.source === "menu";
    void finishWidgetAppearanceSetup(ok);
  };

  const handleConfigurePending = () => {
    void maybeOpenWidgetConfigureSetup();
  };

  window.addEventListener("widgetConfigureFinished", handleConfigureFinished);
  document.addEventListener("widgetConfigureFinished", handleConfigureFinished);
  window.addEventListener("widgetConfigurePending", handleConfigurePending);
  document.addEventListener("widgetConfigurePending", handleConfigurePending);
}

function handleWidgetOpacityInput(event) {
  const opacity = Math.max(0, Math.min(100, Number(event.target.value) || 0));
  if (opacity > 0) {
    for (const toggle of getWidgetTransparentToggles()) {
      toggle.checked = false;
    }
  }
  for (const slider of getWidgetOpacitySliders()) {
    if (slider !== event.target) {
      slider.value = String(opacity);
    }
    syncWidgetBgOpacitySliderFill(opacity, slider);
  }
  for (const valueLabel of getWidgetOpacityValueLabels()) {
    valueLabel.textContent = opacity <= 0 ? "0%" : `${opacity}%`;
  }
  updateWidgetModePreviewOpacity(opacity);
  if (opacity <= 0) {
    scheduleWidgetAppearanceSync({ widgetBgOpacity: 0, widgetTransparentBg: true });
    return;
  }
  scheduleWidgetAppearanceSync({ widgetBgOpacity: opacity, widgetTransparentBg: false });
}

function handleWidgetTransparentToggle(event) {
  const transparent = Boolean(event.target.checked);
  const mode = getWidgetAppearanceMode();
  const showOpacityControls = mode === "blend" || mode === "wallpaper" || mode === "brand";
  for (const toggle of getWidgetTransparentToggles()) {
    if (toggle !== event.target) {
      toggle.checked = transparent;
    }
  }

  for (const slider of getWidgetOpacitySliders()) {
    slider.disabled = !showOpacityControls || (transparent && mode === "blend");
    if (transparent) {
      slider.value = "0";
      syncWidgetBgOpacitySliderFill(0, slider);
    }
  }

  for (const valueLabel of getWidgetOpacityValueLabels()) {
    if (transparent) {
      valueLabel.textContent = "0%";
    }
  }

  if (transparent) {
    updateWidgetModePreviewOpacity(0);
    applyWidgetAppearancePatch({ widgetBgOpacity: 0, widgetTransparentBg: true });
    return;
  }

  const slider = getWidgetOpacitySliders()[0];
  let opacity = Math.max(1, Math.min(100, Number(slider?.value) || 50));
  if (opacity <= 0) {
    opacity = 50;
  }

  for (const input of getWidgetOpacitySliders()) {
    input.value = String(opacity);
    syncWidgetBgOpacitySliderFill(opacity, input);
  }
  for (const valueLabel of getWidgetOpacityValueLabels()) {
    valueLabel.textContent = `${opacity}%`;
  }
  updateWidgetModePreviewOpacity(opacity);
  applyWidgetAppearancePatch({ widgetBgOpacity: opacity, widgetTransparentBg: false });
}

function refreshNativeWidgetMenuItems() {
  const block = document.getElementById("menu-widget-block");
  if (block) {
    block.hidden = !isNativeApp();
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

  document.getElementById("menu-widget-appearance-btn")?.addEventListener("click", () => {
    window.nextTrainApp?.closeMenuDialogOnly?.();
    openWidgetAppearanceSetup({ source: "menu" });
  });

  for (const slider of getWidgetOpacitySliders()) {
    slider.addEventListener("input", handleWidgetOpacityInput);
  }

  for (const toggle of getWidgetTransparentToggles()) {
    toggle.addEventListener("change", handleWidgetTransparentToggle);
  }

  document.getElementById("widget-appearance-setup-primary-btn")?.addEventListener("click", () => {
    finishWidgetAppearanceSetup(true);
  });

  document.getElementById("widget-appearance-setup-cancel-btn")?.addEventListener("click", () => {
    handleWidgetAppearanceSetupDismiss();
  });

  document.getElementById("widget-appearance-setup-back-btn")?.addEventListener("click", () => {
    handleWidgetAppearanceSetupDismiss();
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

  refreshNativeWidgetMenuItems();
  document.addEventListener("nexttrain:menu-open", refreshNativeWidgetMenuItems);
}

function initWidgetBridge() {
  initWidgetUi();
  initWidgetConfigureListener();
  renderWidgetAppearanceGrids(getWidgetAppearanceMode());
  refreshWidgetAppearanceControls();
  syncWidgetSettings();

  if (isWidgetDebugEnabled()) {
    void refreshWidgetDebugPanel();
  }

  if (isNativeApp()) {
    void refreshWallpaperModePreviews();
  }

  const waitForCapacitor = window.NextTrainScripts?.waitForCapacitor;
  if (typeof waitForCapacitor === "function") {
    waitForCapacitor().then(() => maybeOpenWidgetConfigureSetup());
  } else {
    maybeOpenWidgetConfigureSetup();
  }
}

window.nextTrainWidget = {
  syncWidgetSettings,
  handleWidgetDeepLink,
  consumeLaunchDeepLink: consumeWidgetLaunchDeepLink,
  getWidgetInstanceCount,
  showWidgetCoach,
  openWidgetHelpDialog,
  openWidgetAppearanceDialog,
  openWidgetAppearanceSetup,
  maybeOpenWidgetConfigureSetup,
  applyWidgetAppearanceModeSelection,
  applyWidgetColourSelection,
  getWidgetAppearanceMode,
  getWidgetThemeId,
  getWidgetBgOpacity,
  getWidgetTransparentBg,
  refreshNativeWidgetMenuItems,
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
    refreshNativeWidgetMenuItems();
    syncWidgetSettings();
    if (isNativeApp()) {
      systemWidgetPaletteCache = null;
      fetchSystemWidgetPalette(true).then(() => {
        refreshWallpaperModePreviews();
      });
    }
  }
});

})();
