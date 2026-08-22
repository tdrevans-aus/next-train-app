(function (global) {
  const SETTINGS_KEY = "nextTrainSettings";
  const LIGHT_BG = "#eef3f2";
  const DARK_BG = "#1a2422";
  const THEMES = new Set(["system", "light", "dark"]);

  let mediaQuery = null;

  function normalizeAppTheme(value) {
    const mode = String(value ?? "").trim();
    return THEMES.has(mode) ? mode : "system";
  }

  function osPrefersDark() {
    return Boolean(global.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  }

  function resolveAppTheme(stored) {
    const mode = normalizeAppTheme(stored);
    if (mode === "light") {
      return "light";
    }
    if (mode === "dark") {
      return "dark";
    }
    return osPrefersDark() ? "dark" : "light";
  }

  function readStoredAppTheme() {
    try {
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return normalizeAppTheme(raw.appTheme);
    } catch {
      return "system";
    }
  }

  function applyResolvedTheme(resolved) {
    const theme = resolved === "dark" ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const color = theme === "dark" ? DARK_BG : LIGHT_BG;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", color);
    }
    const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (apple) {
      apple.setAttribute("content", theme === "dark" ? "black-translucent" : "default");
    }
    syncMenuChips(readStoredAppTheme());
  }

  function applyAppTheme(stored = readStoredAppTheme()) {
    applyResolvedTheme(resolveAppTheme(stored));
  }

  function syncMenuChips(stored) {
    const mode = normalizeAppTheme(stored);
    document.querySelectorAll("[data-app-theme]").forEach((btn) => {
      const selected = btn.getAttribute("data-app-theme") === mode;
      btn.classList.toggle("remind-day-chip--active", selected);
      btn.setAttribute("aria-checked", selected ? "true" : "false");
    });
  }

  function persistAppTheme(next) {
    const appTheme = normalizeAppTheme(next);
    const persist = global.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist({ appTheme });
    } else {
      try {
        const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...raw, appTheme }));
      } catch {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ appTheme }));
      }
    }
    applyAppTheme(appTheme);
  }

  function onChipClick(event) {
    const btn = event.currentTarget;
    const next = btn.getAttribute("data-app-theme");
    persistAppTheme(next);
  }

  function bindMenu() {
    document.querySelectorAll("[data-app-theme]").forEach((btn) => {
      btn.addEventListener("click", onChipClick);
    });
  }

  function bindSystemListener() {
    mediaQuery = global.matchMedia?.("(prefers-color-scheme: dark)") || null;
    if (!mediaQuery) {
      return;
    }
    const onChange = () => {
      if (readStoredAppTheme() === "system") {
        applyAppTheme("system");
      }
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(onChange);
    }
  }

  function init() {
    applyAppTheme();
    bindMenu();
    bindSystemListener();
    document.addEventListener("nexttrain:settings-persisted", () => applyAppTheme());
    document.addEventListener("nexttrain:menu-open", () => syncMenuChips(readStoredAppTheme()));
  }

  global.nextTrainAppTheme = {
    normalizeAppTheme,
    resolveAppTheme,
    readStoredAppTheme,
    applyAppTheme,
    persistAppTheme,
    init,
    LIGHT_BG,
    DARK_BG,
  };
})(window);
