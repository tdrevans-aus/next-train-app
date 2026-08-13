/**
 * While Menu/Help/Feedback are open, native ad padding is cleared so sheets are
 * not artificially shortened for a hidden banner. Footers stay inside the sheet.
 * Usage: node qa/dialog-above-ad.mjs
 */
import { chromium } from "playwright";
import {
  hideNativeAdSimulatorOverlay,
  installNativeAdSimulator,
  NATIVE_AD_GAP_PX,
  removeNativeAdPaddingClass,
} from "./helpers/native-ad-sim.mjs";

const BASE = "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };

async function auditDialogFooter(page, { dialogSelector, footerId, scrollBodySelector }) {
  return page.evaluate(
    ({ dialogSelector, footerId, scrollBodySelector, gap }) => {
      const dialog = document.querySelector(dialogSelector);
      const footer = document.getElementById(footerId);

      if (!dialog || !footer) {
        return { ok: false, error: `missing ${dialogSelector} or ${footerId}` };
      }

      const scrollBody = scrollBodySelector
        ? dialog.querySelector(scrollBodySelector)
        : null;
      if (scrollBody) {
        scrollBody.scrollTop = scrollBody.scrollHeight;
      }

      const dialogRect = dialog.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();

      const inDialog =
        footerRect.top >= dialogRect.top - gap &&
        footerRect.bottom <= dialogRect.bottom + gap &&
        footerRect.left >= dialogRect.left - gap &&
        footerRect.right <= dialogRect.right + gap;

      const adPaddingCleared = !document.body.classList.contains("native-ad-banner");

      return {
        ok:
          inDialog &&
          adPaddingCleared &&
          document.body.classList.contains("app-dialog-open"),
        inDialog,
        adPaddingCleared,
        footerBottom: Math.round(footerRect.bottom),
        dialogBottom: Math.round(dialogRect.bottom),
        dialogOpen: document.body.classList.contains("app-dialog-open"),
      };
    },
    {
      dialogSelector,
      footerId,
      scrollBodySelector,
      gap: NATIVE_AD_GAP_PX,
    }
  );
}

async function suppressAdForOpenDialog(page) {
  await hideNativeAdSimulatorOverlay(page);
  await removeNativeAdPaddingClass(page);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.body.classList.add("native-app"));
  await installNativeAdSimulator(page);

  await page.locator("#menu-btn").click();
  await page.waitForTimeout(500);
  await suppressAdForOpenDialog(page);

  const menu = await auditDialogFooter(page, {
    dialogSelector: "#menu-dialog",
    footerId: "menu-done-btn",
    scrollBodySelector: ".menu-dialog-body",
  });

  await page.locator("#menu-help-btn").click();
  await page.waitForTimeout(500);
  await suppressAdForOpenDialog(page);

  const help = await auditDialogFooter(page, {
    dialogSelector: "#help-dialog",
    footerId: "help-close-btn",
    scrollBodySelector: ".help-dialog-body",
  });

  await page.locator("#help-close-btn").click();
  await page.waitForTimeout(300);
  // Help opened from menu reopens menu on close — chrome menu btn sits under the sheet.
  await page.locator("#menu-dialog[open] #menu-feedback-btn").click();
  await page.waitForTimeout(500);
  await suppressAdForOpenDialog(page);

  const feedback = await page.evaluate(({ gap }) => {
    const title = document.getElementById("feedback-dialog-title");
    if (!title) {
      return { ok: false, error: "feedback title missing" };
    }
    const titleRect = title.getBoundingClientRect();
    return {
      ok:
        document.body.classList.contains("app-dialog-open") &&
        !document.body.classList.contains("native-ad-banner") &&
        titleRect.top > gap,
      dialogOpen: document.body.classList.contains("app-dialog-open"),
      titleTop: Math.round(titleRect.top),
      adPaddingCleared: !document.body.classList.contains("native-ad-banner"),
    };
  }, { gap: NATIVE_AD_GAP_PX });

  await browser.close();

  const failures = [];
  if (!menu.ok) {
    failures.push(`menu: ${menu.error ?? JSON.stringify(menu)}`);
  }
  if (!help.ok) {
    failures.push(`help: ${help.error ?? JSON.stringify(help)}`);
  }
  if (!feedback.ok) {
    failures.push(`feedback: ${feedback.error ?? JSON.stringify(feedback)}`);
  }

  if (failures.length) {
    console.error("FAIL dialog-above-ad");
    for (const failure of failures) {
      console.error(`  ${failure}`);
    }
    process.exit(1);
  }

  console.log("PASS dialog-above-ad");
  console.log(
    `  menu + help + feedback; ad padding cleared while open (feedback title top ${feedback.titleTop}px)`
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
