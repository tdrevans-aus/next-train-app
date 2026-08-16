/**
 * Widget colour presets — contrast + web picker smoke.
 * Usage: node qa/widget-theme-palettes.mjs
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.resolve(__dirname, "..", "android");
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

const PRESETS = [
  { id: "default", bg: "#FFFFFF", text: "#1A2F2C", accent: "#0B6E6A" },
  { id: "ocean", bg: "#E8F4FC", text: "#0F2942", accent: "#0369A1" },
  { id: "midnight", bg: "#1B3D6B", text: "#E8EDF4", accent: "#93C5FD" },
  { id: "slate", bg: "#5A5A63", text: "#F4F4F5", accent: "#E2E8F0" },
  { id: "lavender", bg: "#F3EEFA", text: "#2D2640", accent: "#7C3AED" },
  { id: "rose", bg: "#FDF2F4", text: "#3D1F28", accent: "#D41D6F" },
  { id: "amoled", bg: "#000000", text: "#F5F5F5", accent: "#14B8A6" },
];

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  const value =
    raw.length === 8 ? raw.slice(2) : raw.length === 6 ? raw : raw.padStart(6, "0");
  const num = Number.parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function linearChannel(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lr = linearChannel(r);
  const lg = linearChannel(g);
  const lb = linearChannel(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(foreground, background) {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function runJvmContrastTests() {
  const javaProbe = spawnSync("java", ["-version"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  if (javaProbe.error || javaProbe.status !== 0) {
    console.log("SKIP — Widget JVM tests (Java not installed locally).");
    return true;
  }

  const paletteResult = spawnSync(
    gradle,
    [
      ":app:testDebugUnitTest",
      "--no-daemon",
      "--tests",
      "com.tdrevans.nexttrain.WidgetThemePaletteTest",
      "--tests",
      "com.tdrevans.nexttrain.WidgetThemePaletteApi30Test",
    ],
    {
      cwd: androidDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );
  const appearanceResult = spawnSync(
    gradle,
    [":app:testDebugUnitTest", "--no-daemon", "--tests", "com.tdrevans.nexttrain.WidgetAppearanceSettingsTest"],
    {
      cwd: androidDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );
  return paletteResult.status === 0 && appearanceResult.status === 0;
}

async function runWebSmoke() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.waitForTimeout(800);

  const web = await page.evaluate(() => {
    const menuBlock = document.getElementById("menu-widget-block");
    const setup = document.getElementById("widget-appearance-setup");
    const opacitySlider = document.getElementById("widget-bg-opacity-input");
    const transparentToggle = document.getElementById("widget-transparent-bg");
    return {
      menuHidden: Boolean(menuBlock?.hidden),
      hasSetupPanel: Boolean(setup),
      hasHeroPreview: Boolean(document.getElementById("widget-appearance-hero")),
      presetCount:
        document.getElementById("widget-appearance-mode-grid")?.querySelectorAll(
          ".widget-appearance-mode-card"
        ).length ?? 0,
      hasOpacitySlider: Boolean(opacitySlider),
      hasTransparentToggle: Boolean(transparentToggle),
      hasColourGrid: Boolean(document.getElementById("widget-appearance-colour-grid")),
      canSetTheme:
        typeof window.nextTrainWidget?.getWidgetThemeId === "function" &&
        typeof window.nextTrainWidget?.applyWidgetColourSelection === "function" &&
        typeof window.nextTrainWidget?.openWidgetAppearanceDialog === "function",
      canReadOpacity: typeof window.nextTrainWidget?.getWidgetBgOpacity === "function",
    };
  });

  await page.evaluate(() => {
    window.nextTrainWidget?.openWidgetAppearanceDialog?.();
  });
  await page.waitForTimeout(200);

  const opened = await page.evaluate(() => {
    const setup = document.getElementById("widget-appearance-setup");
    return {
      setupVisible: setup && !setup.hidden,
      bodyActive: document.body.classList.contains("widget-setup-active"),
      title: document.getElementById("widget-appearance-setup-title")?.textContent?.trim(),
    };
  });

  const opacityInteraction = await page.evaluate(() => {
    const slider = document.getElementById("widget-bg-opacity-input");
    const toggle = document.getElementById("widget-transparent-bg");
    if (!slider || !toggle) {
      return { ok: false };
    }
    slider.value = "40";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    const card = document.getElementById("widget-hero-mock-card");
    const previewBg = card ? getComputedStyle(card).backgroundColor : "";
    let storedOpacity = null;
    try {
      const settings = JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
      storedOpacity = settings.widgetBgOpacity;
    } catch (error) {
      storedOpacity = null;
    }
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      ok: true,
      previewUsesAlpha: previewBg.includes("rgba") || previewBg.includes("0."),
      storedOpacity,
    };
  });

  await page.waitForFunction(() => {
    const toggle = document.getElementById("widget-transparent-bg");
    return Boolean(toggle?.checked);
  });

  const transparentState = await page.evaluate(() => ({
    transparentOn: Boolean(document.getElementById("widget-transparent-bg")?.checked),
    sliderDisabled: Boolean(document.getElementById("widget-bg-opacity-input")?.disabled),
  }));

  const colourRow = await page.evaluate(async () => {
    await window.nextTrainWidget?.applyWidgetAppearanceModeSelection?.("blend");
    const block = document.getElementById("widget-appearance-colour-block");
    const count =
      document.getElementById("widget-appearance-colour-grid")?.querySelectorAll(
        ".widget-colour-swatch"
      ).length ?? 0;
    await window.nextTrainWidget?.applyWidgetColourSelection?.("rose");
    const settings = window.settings ?? JSON.parse(localStorage.getItem("nextTrainSettings") ?? "{}");
    return {
      visible: block && !block.hidden,
      count,
      themeId: settings.widgetThemeId,
    };
  });
  await page.waitForTimeout(300);

  await browser.close();
  return { ...web, opened, opacityInteraction: { ...opacityInteraction, ...transparentState }, colourRow };
}

function assertJsContrast() {
  const aa = 4.5;
  for (const preset of PRESETS) {
    const textRatio = contrastRatio(preset.text, preset.bg);
    const accentRatio = contrastRatio(preset.accent, preset.bg);
    if (textRatio < aa || accentRatio < aa) {
      console.error(
        `FAIL contrast ${preset.id}: text=${textRatio.toFixed(2)} accent=${accentRatio.toFixed(2)}`
      );
      return false;
    }
  }
  return true;
}

async function run() {
  const devChild = await ensureDevServer();
  try {
    const jsContrastOk = assertJsContrast();
    const jvmOk = runJvmContrastTests();
    const web = await runWebSmoke();

    const webOk =
      web.menuHidden &&
      web.hasSetupPanel &&
      web.hasHeroPreview &&
      web.opened?.setupVisible &&
      web.opened?.bodyActive &&
      web.opened?.title === "Widget appearance" &&
      web.presetCount === 3 &&
      web.hasOpacitySlider &&
      web.hasTransparentToggle &&
      web.hasColourGrid &&
      web.canSetTheme &&
      web.canReadOpacity &&
      web.colourRow?.visible &&
      web.colourRow?.count === 7 &&
      web.colourRow?.themeId === "rose" &&
      web.opacityInteraction?.ok &&
      web.opacityInteraction?.previewUsesAlpha &&
      web.opacityInteraction?.transparentOn &&
      !web.opacityInteraction?.sliderDisabled;

    console.log("JS contrast:", jsContrastOk ? "PASS" : "FAIL");
    console.log("Web smoke:", JSON.stringify(web, null, 2));

    const pass = jsContrastOk && jvmOk && webOk;
    console.log(pass ? "\nPASS  widget theme palettes\n" : "\nFAIL  widget theme palettes\n");
    process.exit(pass ? 0 : 1);
  } finally {
    stopDevServer(devChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
