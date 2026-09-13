/**
 * FB-01 — app theme System / Light / Dark.
 * Usage: node qa/app-theme.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

import { BASE } from "./helpers/dev-server.mjs";
const SETTINGS_KEY = "nextTrainSettings";

async function run() {
  let spawned;
  try {
    spawned = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({ settingsSchemaVersion: 2, journeys: [], appTheme: "system" })
    );
  });
  await page.goto(`${BASE}/?test=1`);
  await page.waitForTimeout(400);

  const defaults = await page.evaluate(() => {
    const api = window.nextTrainAppTheme;
    const jm = window.nextTrainJourneyModel;
    return {
      stored: api.readStoredAppTheme(),
      resolved: api.resolveAppTheme("system"),
      htmlTheme: document.documentElement.dataset.theme,
      bg: getComputedStyle(document.body).backgroundColor,
      migrated: jm.migrateSettings({ settingsSchemaVersion: 2, journeys: [] }).appTheme,
      bad: jm.migrateSettings({ settingsSchemaVersion: 2, journeys: [], appTheme: "neon" }).appTheme,
      kept: jm.migrateSettings({ settingsSchemaVersion: 2, journeys: [], appTheme: "dark" }).appTheme,
    };
  });

  await page.locator("#menu-btn").click();
  await page.locator('[data-app-theme="dark"]').click();
  await page.waitForTimeout(50);
  const afterDark = await page.evaluate(() => {
    function lin(c) {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }
    function lum(r, g, b) {
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    }
    function parseRgb(value) {
      const m = String(value).match(/(\d+)/g);
      return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
    }
    function contrast(a, b) {
      const L1 = lum(...a);
      const L2 = lum(...b);
      const hi = Math.max(L1, L2);
      const lo = Math.min(L1, L2);
      return (hi + 0.05) / (lo + 0.05);
    }
    function parseHex(value) {
      const h = String(value).trim().replace("#", "");
      if (h.length !== 6) {
        return null;
      }
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const hero = document.getElementById("hero");
    const cs = getComputedStyle(hero);
    const heroBg = parseHex(cs.getPropertyValue("--hero-bg")) || parseRgb(cs.backgroundColor);
    const muted = parseHex(cs.getPropertyValue("--muted"));
    const accent = parseHex(cs.getPropertyValue("--accent"));
    return {
      stored: window.nextTrainAppTheme.readStoredAppTheme(),
      htmlTheme: document.documentElement.dataset.theme,
      bg: getComputedStyle(document.body).backgroundColor,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
      chip: document.querySelector('[data-app-theme="dark"]')?.getAttribute("aria-checked"),
      heroToken: cs.getPropertyValue("--hero-bg").trim(),
      heroBg: heroBg.join(","),
      labelContrast: contrast(muted, heroBg),
      countdownContrast: contrast(accent, heroBg),
    };
  });

  await page.locator('[data-app-theme="light"]').click();
  const afterLight = await page.evaluate(() => ({
    stored: window.nextTrainAppTheme.readStoredAppTheme(),
    htmlTheme: document.documentElement.dataset.theme,
    themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
  }));

  await page.locator('[data-app-theme="system"]').click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => window.nextTrainAppTheme.applyAppTheme("system"));
  const systemDark = await page.evaluate(() => ({
    stored: window.nextTrainAppTheme.readStoredAppTheme(),
    htmlTheme: document.documentElement.dataset.theme,
  }));

    await browser.close();

    const rgb = (value) => value.replace(/\s/g, "");
  const pass =
    defaults.stored === "system" &&
    defaults.resolved === "light" &&
    defaults.htmlTheme === "light" &&
    defaults.migrated === "system" &&
    defaults.bad === "system" &&
    defaults.kept === "dark" &&
    afterDark.stored === "dark" &&
    afterDark.htmlTheme === "dark" &&
    afterDark.themeColor === "#1a2422" &&
    afterDark.chip === "true" &&
    afterDark.heroBg === "36,48,46" &&
    afterDark.heroToken === "#24302e" &&
    afterDark.labelContrast >= 4.5 &&
    afterDark.countdownContrast >= 4.5 &&
    rgb(afterDark.bg) !== rgb(defaults.bg) &&
    afterLight.stored === "light" &&
    afterLight.htmlTheme === "light" &&
    afterLight.themeColor === "#eef3f2" &&
    systemDark.stored === "system" &&
    systemDark.htmlTheme === "dark";

  if (!pass) {
    console.error("FAIL", { defaults, afterDark, afterLight, systemDark, key: SETTINGS_KEY });
    process.exit(1);
  }
    console.log("PASS app-theme System/Light/Dark + Menu chips + OS follow");
  } finally {
    await stopDevServer(spawned);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
