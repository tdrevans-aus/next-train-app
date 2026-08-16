/**
 * Widget appearance setup — hero preview smoke.
 * Usage: node qa/widget-appearance-setup.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

async function runWebSmoke() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.waitForTimeout(800);

  const initial = await page.evaluate(() => ({
    setupHidden: Boolean(document.getElementById("widget-appearance-setup")?.hidden),
    hasHero: Boolean(document.getElementById("widget-appearance-hero-mock")),
    canOpenSetup: typeof window.nextTrainWidget?.openWidgetAppearanceSetup === "function",
    hasWallpaperSwitcher: Boolean(document.getElementById("widget-wallpaper-switcher")),
  }));

  await page.evaluate(() => {
    window.Capacitor = window.Capacitor ?? {};
    window.Capacitor.isNativePlatform = () => true;
    window.nextTrainWidget?.openWidgetAppearanceSetup?.({ source: "pin" });
  });
  await page.waitForTimeout(200);

  const setup = await page.evaluate(() => {
    const setupEl = document.getElementById("widget-appearance-setup");
    const card = document.getElementById("widget-hero-mock-card");
    return {
      setupVisible: setupEl && !setupEl.hidden,
      bodyActive: document.body.classList.contains("widget-setup-active"),
      heroBg: card ? getComputedStyle(card).backgroundColor : "",
    };
  });

  await page.evaluate(() => {
    const slider = document.getElementById("widget-bg-opacity-input");
    if (slider) {
      slider.value = "40";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await page.waitForTimeout(100);

  const opacityPreview = await page.evaluate(() => {
    const card = document.getElementById("widget-hero-mock-card");
    const bg = card ? getComputedStyle(card).backgroundColor : "";
    return {
      usesAlpha: bg.includes("rgba") || bg.includes("0."),
      legibility: card?.classList.contains("widget-hero-legibility"),
    };
  });

  await page.evaluate(async () => {
    await window.nextTrainWidget?.applyWidgetAppearanceModeSelection?.("brand");
  });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const slider = document.getElementById("widget-bg-opacity-input");
    if (slider) {
      slider.value = "40";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await page.waitForTimeout(400);

  const brandAt40 = await page.evaluate(() => {
    const card = document.getElementById("widget-hero-mock-card");
    const style = card ? getComputedStyle(card) : null;
    const colourBlock = document.getElementById("widget-appearance-colour-block");
    return {
      cardBg: style?.backgroundColor ?? "",
      borderStyle: style?.borderStyle ?? "",
      colourRowHidden: Boolean(colourBlock?.hidden),
    };
  });

  await page.evaluate(async () => {
    await window.nextTrainWidget?.applyWidgetAppearanceModeSelection?.("blend");
  });
  await page.waitForTimeout(300);

  const blendAt40 = await page.evaluate(() => {
    const card = document.getElementById("widget-hero-mock-card");
    const style = card ? getComputedStyle(card) : null;
    const colourBlock = document.getElementById("widget-appearance-colour-block");
    const settings = window.settings ?? JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
    return {
      cardBg: style?.backgroundColor ?? "",
      borderStyle: style?.borderStyle ?? "",
      mode: settings.widgetAppearanceMode,
      opacity: settings.widgetBgOpacity,
      colourRowVisible: colourBlock && !colourBlock.hidden,
      colourCount:
        document.getElementById("widget-appearance-colour-grid")?.querySelectorAll(
          ".widget-colour-swatch"
        ).length ?? 0,
    };
  });

  await page.evaluate(async () => {
    await window.nextTrainWidget?.applyWidgetColourSelection?.("midnight");
  });
  await page.waitForTimeout(300);

  const midnightBlend = await page.evaluate(() => {
    const card = document.getElementById("widget-hero-mock-card");
    const style = card ? getComputedStyle(card) : null;
    const settings = window.settings ?? JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
    const selected = document.querySelector(
      "#widget-appearance-colour-grid .widget-colour-swatch[aria-checked='true']"
    );
    return {
      themeId: settings.widgetThemeId,
      cardBg: style?.backgroundColor ?? "",
      selectedLabel: selected?.getAttribute("aria-label") ?? "",
    };
  });

  await page.evaluate(async () => {
    await window.nextTrainWidget?.applyWidgetColourSelection?.("ocean");
  });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const slider = document.getElementById("widget-bg-opacity-input");
    if (slider) {
      slider.value = "100";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await page.waitForTimeout(400);

  const oceanSolid = await page.evaluate(() => {
    const card = document.getElementById("widget-hero-mock-card");
    const style = card ? getComputedStyle(card) : null;
    return {
      cardBg: style?.backgroundColor ?? "",
      borderStyle: style?.borderStyle ?? "",
    };
  });

  await page.evaluate(() => {
    document.getElementById("widget-appearance-setup-cancel-btn")?.click();
  });
  await page.waitForTimeout(150);

  const dismissed = await page.evaluate(() => ({
    setupHidden: Boolean(document.getElementById("widget-appearance-setup")?.hidden),
    bodyActive: document.body.classList.contains("widget-setup-active"),
    cancelLabel: document.getElementById("widget-appearance-setup-cancel-btn")?.textContent?.trim(),
    primaryLabel: document.getElementById("widget-appearance-setup-primary-btn")?.textContent?.trim(),
    hasBackButton: Boolean(document.getElementById("widget-appearance-setup-back-btn")),
  }));

  await browser.close();

  return { initial, setup, opacityPreview, brandAt40, blendAt40, midnightBlend, oceanSolid, dismissed };
}

async function run() {
  const devChild = await ensureDevServer();
  try {
    const web = await runWebSmoke();
    const pass =
      web.initial.setupHidden &&
      web.initial.hasHero &&
      web.initial.canOpenSetup &&
      !web.initial.hasWallpaperSwitcher &&
      web.setup.setupVisible &&
      web.setup.bodyActive &&
      web.opacityPreview.legibility &&
      web.brandAt40.borderStyle === "solid" &&
      web.brandAt40.cardBg.includes("255") &&
      web.brandAt40.colourRowHidden &&
      web.blendAt40.mode === "blend" &&
      web.blendAt40.opacity === 40 &&
      web.blendAt40.colourRowVisible &&
      web.blendAt40.colourCount === 7 &&
      web.blendAt40.cardBg !== web.brandAt40.cardBg &&
      web.midnightBlend.themeId === "midnight" &&
      web.midnightBlend.selectedLabel === "Midnight" &&
      web.midnightBlend.cardBg.includes("27") &&
      web.oceanSolid.cardBg.includes("232") &&
      web.oceanSolid.borderStyle === "solid" &&
      web.dismissed.setupHidden &&
      !web.dismissed.bodyActive &&
      web.dismissed.cancelLabel === "Skip" &&
      web.dismissed.primaryLabel === "Done" &&
      web.dismissed.hasBackButton;

    console.log("Web smoke:", JSON.stringify(web, null, 2));
    console.log(pass ? "\nPASS  widget appearance setup\n" : "\nFAIL  widget appearance setup\n");
    process.exit(pass ? 0 : 1);
  } finally {
    stopDevServer(devChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
