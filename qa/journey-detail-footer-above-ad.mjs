/**
 * Journey detail: content-sized sheet (no stretched white card), ad suppressed
 * while open, footer tight under form, Cancel | Save row with Delete stacked below.
 * Usage: node qa/journey-detail-footer-above-ad.mjs
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
const FOOTER_BUTTON_IDS = [
  "detail-cancel-btn",
  "detail-done-btn",
];
const REMIND_TOGGLE_IDS = [
  "detail-reminder-section",
];
/** Max gap between last form content and footer top (px). */
const MAX_FORM_TO_FOOTER_GAP_PX = 28;
/** Footer is Cancel | Save only (delete lives in header). */
const MAX_FOOTER_ROW_HEIGHT_PX = 72;

async function seedJourney(page) {
  await page.evaluate(() => {
    window.nextTrainJourneyModel.persistSettings({
      settingsSchemaVersion: 2,
      refreshSeconds: 60,
      activeJourneyId: "j-a",
      journeys: [
        {
          id: "j-a",
          kind: "commute",
          name: "Morning into town",
          station: "Armadale",
          direction: "Byford",
          leaveBeforeMinutes: 10,
          useLeaveBefore: true,
          preferredTrainTime: "07:30",
          defaultFrom: "06:00",
          defaultUntil: "09:00",
          remindDays: [1, 2, 3, 4, 5],
          remindMe: true,
        },
      ],
    });
  });
}

async function openJourneyDetail(page) {
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(300);
  const dialogOpen = await page.evaluate(
    () => document.getElementById("journeys-dialog")?.hidden === false
  );
  if (!dialogOpen) {
    await page.locator("#journeys-btn").click();
    await page.waitForTimeout(500);
  }
  await page.locator(".journey-list-open-btn").first().click();
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const coach = document.getElementById("template-route-coach");
    if (coach) {
      coach.hidden = true;
    }
  });
  await page.waitForTimeout(300);
}

async function auditJourneyDetailLayout(page) {
  return page.evaluate(
    ({ buttonIds, remindIds, gap, maxFormGap, maxFooterHeight }) => {
      const dialog = document.getElementById("journeys-dialog");
      const scroll = document.querySelector(
        "#settings-detail-view .settings-detail-scroll"
      );
      const formCard = document.querySelector(
        ".journeys-dialog--detail .journeys-dialog-body"
      );
      const footer = document.querySelector(
        ".journeys-detail-chrome .settings-detail-footer"
      );
      const remindControls = document.getElementById("detail-remind-controls");
      const issues = [];

      if (!dialog || dialog.hidden) {
        return { ok: false, error: "journeys-dialog not open" };
      }

      if (!scroll || !footer || !formCard) {
        return { ok: false, error: "detail scroll, form card, or footer missing" };
      }

      if (document.body.classList.contains("native-ad-banner")) {
        issues.push({
          id: "native-ad-banner",
          error: "ad padding class should be cleared while dialog open",
        });
      }

      scroll.scrollTop = scroll.scrollHeight;

      const dialogRect = dialog.getBoundingClientRect();
      const formRect = formCard.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();

      // Empty band inside the white form card below scrolled content.
      const emptyInForm = Math.max(0, formRect.bottom - scrollRect.bottom);
      if (emptyInForm > 40) {
        issues.push({
          id: "empty-in-form-card",
          emptyInForm: Math.round(emptyInForm),
        });
      }

      const formToFooterGap = Math.max(0, footerRect.top - formRect.bottom);
      if (formToFooterGap > maxFormGap) {
        issues.push({
          id: "form-to-footer-gap",
          formToFooterGap: Math.round(formToFooterGap),
          maxFormGap,
        });
      }

      if (footerRect.height > maxFooterHeight) {
        issues.push({
          id: "footer-too-tall",
          footerHeight: Math.round(footerRect.height),
          maxFooterHeight,
        });
      }

      if (remindControls?.hidden) {
        issues.push({ id: "detail-remind-controls", error: "remind controls hidden" });
      }

      let lowestRemindBottom = 0;
      for (const id of remindIds) {
        const row = document.getElementById(id);
        if (!row || row.hidden) {
          issues.push({ id, error: "remind toggle missing or hidden" });
          continue;
        }
        const rowRect = row.getBoundingClientRect();
        lowestRemindBottom = Math.max(lowestRemindBottom, rowRect.bottom);
        if (rowRect.bottom > footerRect.top - gap) {
          issues.push({
            id,
            overlapsFooter: true,
            rowBottom: Math.round(rowRect.bottom),
            footerTop: Math.round(footerRect.top),
          });
        }
      }

      if (lowestRemindBottom > 0) {
        const contentBottom = Math.max(scrollRect.bottom, lowestRemindBottom);
        const contentToFooter = footerRect.top - contentBottom;
        if (contentToFooter > 120) {
          issues.push({
            id: "content-to-footer-gap",
            contentToFooter: Math.round(contentToFooter),
          });
        }
      }

      const deleteBtn = document.getElementById("delete-journey-btn");
      const cancelBtn = document.getElementById("detail-cancel-btn");
      const saveBtn = document.getElementById("detail-done-btn");
      const header = document.querySelector(".settings-detail-header");
      if (deleteBtn && !deleteBtn.hidden && cancelBtn && saveBtn && header) {
        const d = deleteBtn.getBoundingClientRect();
        const h = header.getBoundingClientRect();
        const c = cancelBtn.getBoundingClientRect();
        const s = saveBtn.getBoundingClientRect();
        const deleteInHeader =
          d.top >= h.top - 4 && d.bottom <= h.bottom + 4 && d.top < c.top - 20;
        const cancelSaveSameRow =
          Math.abs(c.top - s.top) < 12 && c.left < s.left;
        if (!deleteInHeader || !cancelSaveSameRow) {
          issues.push({
            id: "delete-in-header",
            deleteTop: Math.round(d.top),
            headerTop: Math.round(h.top),
            headerBottom: Math.round(h.bottom),
            cancelTop: Math.round(c.top),
          });
        }
      }

      for (const id of buttonIds) {
        const button = document.getElementById(id);
        if (!button || button.hidden) {
          issues.push({ id, error: "button missing or hidden" });
          continue;
        }

        const buttonRect = button.getBoundingClientRect();
        const outsideDialog =
          buttonRect.top < dialogRect.top - gap ||
          buttonRect.bottom > dialogRect.bottom + gap;

        if (outsideDialog) {
          issues.push({
            id,
            outsideDialog: true,
            buttonBottom: Math.round(buttonRect.bottom),
            dialogBottom: Math.round(dialogRect.bottom),
          });
        }
      }

      return {
        ok: issues.length === 0,
        issues,
        dialogBottom: Math.round(dialogRect.bottom),
        formBottom: Math.round(formRect.bottom),
        footerTop: Math.round(footerRect.top),
        footerHeight: Math.round(footerRect.height),
        emptyInForm: Math.round(emptyInForm),
        viewportHeight: window.innerHeight,
      };
    },
    {
      buttonIds: FOOTER_BUTTON_IDS,
      remindIds: REMIND_TOGGLE_IDS,
      gap: NATIVE_AD_GAP_PX,
      maxFormGap: MAX_FORM_TO_FOOTER_GAP_PX,
      maxFooterHeight: MAX_FOOTER_ROW_HEIGHT_PX,
    }
  );
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(1200);
  await seedJourney(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  await page.evaluate(() => document.body.classList.add("native-app"));
  await installNativeAdSimulator(page);

  await openJourneyDetail(page);
  await hideNativeAdSimulatorOverlay(page);
  await removeNativeAdPaddingClass(page);
  await page.waitForTimeout(200);

  const layout = await auditJourneyDetailLayout(page);

  await browser.close();

  if (layout.error) {
    console.error("FAIL journey-detail-footer-above-ad");
    console.error(" ", layout.error);
    process.exit(1);
  }

  if (!layout.ok) {
    console.error("FAIL journey-detail-footer-above-ad");
    console.error(" ", JSON.stringify(layout.issues));
    process.exit(1);
  }

  console.log("PASS journey-detail-footer-above-ad");
  console.log(
    `  content-sized sheet (empty-in-form ${layout.emptyInForm}px, footer h ${layout.footerHeight}px)`
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
