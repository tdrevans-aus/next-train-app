/**
 * Regression: interactive controls must be fully visible inside their screen/dialog.
 * Usage: node qa/button-visibility.mjs
 *
 * Journey detail is scrollable — audits required controls (TESTING.md §16) after
 * scrolling them into view, not every chip in the long form.
 */
import { chromium } from "playwright";
import {
  dismissTemplateCoach,
  openJourneyDetail,
  openJourneysLibraryDialog,
} from "./helpers/journeys-dialog.mjs";
import { seedPersistedJourneys } from "./helpers/travel-library.mjs";

const BASE = "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };
const TOLERANCE_PX = 2;

const results = [];

function record(screen, pass, notes) {
  results.push({ screen, pass, notes });
}

async function auditButtons(page, rootSelector, containerMode = "dialog", options = {}) {
  const { onlyIds = null } = options;
  return page.evaluate(
    ({ rootSelector, containerMode, tolerance, onlyIds }) => {
      const root = document.querySelector(rootSelector);
      if (!root) {
        return { error: `root not found: ${rootSelector}` };
      }

      let containerRect;
      if (containerMode === "viewport") {
        containerRect = {
          top: 0,
          left: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
        };
      } else if (containerMode === "dialog") {
        const journeysSheet = root.closest("#journeys-dialog");
        if (journeysSheet && !journeysSheet.hidden) {
          containerRect = journeysSheet.getBoundingClientRect();
        } else {
          const dialog = root.closest("dialog[open]") ?? document.querySelector("dialog[open]");
          if (!dialog) {
            return { error: "no open dialog" };
          }
          containerRect = dialog.getBoundingClientRect();
        }
      } else {
        containerRect = root.getBoundingClientRect();
      }

      const issues = [];
      const checked = [];
      const nodes = root.querySelectorAll(
        "button, [role='button'], input[type='submit'], a.btn-link, a.menu-purchase-row, a.menu-dialog-link"
      );

      for (const el of nodes) {
        if (onlyIds && !onlyIds.includes(el.id)) {
          continue;
        }
        if (el.hidden) continue;
        if (el.getAttribute("aria-hidden") === "true") continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const rect = el.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;

        const label =
          el.id ||
          el.getAttribute("aria-label") ||
          el.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) ||
          "unknown";

        const inBounds =
          rect.top >= containerRect.top - tolerance &&
          rect.bottom <= containerRect.bottom + tolerance &&
          rect.left >= containerRect.left - tolerance &&
          rect.right <= containerRect.right + tolerance;

        checked.push(label);
        if (!inBounds) {
          issues.push({
            id: el.id || null,
            label,
            overflowBottom: Math.round(rect.bottom - containerRect.bottom),
            overflowTop: Math.round(containerRect.top - rect.top),
          });
        }
      }

      return { issues, checked, containerBottom: Math.round(containerRect.bottom) };
    },
    { rootSelector, containerMode, tolerance: TOLERANCE_PX, onlyIds }
  );
}

async function closeAllDialogs(page) {
  await page.evaluate(() => {
    const journeys = document.getElementById("journeys-dialog");
    if (journeys) {
      journeys.hidden = true;
    }
    const journeysBackdrop = document.getElementById("journeys-dialog-backdrop");
    if (journeysBackdrop) {
      journeysBackdrop.hidden = true;
    }
    for (const id of ["menu-dialog", "help-dialog"]) {
      const d = document.getElementById(id);
      if (d?.open) d.close();
      d?.removeAttribute("open");
    }
    document.body.classList.remove("app-dialog-open");
    const coach = document.getElementById("template-route-coach");
    if (coach) coach.hidden = true;
  });
  await page.waitForTimeout(300);
}

async function clickChrome(page, selector) {
  await closeAllDialogs(page);
  await page.evaluate((sel) => document.querySelector(sel)?.click(), selector);
  await page.waitForTimeout(400);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await page.waitForTimeout(2000);

  // Main chrome
  const main = await auditButtons(page, "main", "viewport");
  if (main.error) {
    record("main chrome", false, main.error);
  } else if (main.issues.length) {
    record("main chrome", false, JSON.stringify(main.issues));
  } else {
    record("main chrome", true, `${main.checked.length} controls in viewport`);
  }

  // Journeys library
  await openJourneysLibraryDialog(page);
  const list = await auditButtons(page, "#settings-list-view", "dialog");
  if (list.error) {
    record("journeys list", false, list.error);
  } else if (list.issues.length) {
    record("journeys list", false, JSON.stringify(list.issues));
  } else {
    record("journeys list", true, `${list.checked.length} controls in dialog`);
  }

  // Journey detail — sticky footer: Cancel/Save visible; back + chips may scroll
  await closeAllDialogs(page);
  await seedPersistedJourneys(page, [
    {
      id: "j-a",
      kind: "journey",
      name: "Morning into town",
      station: "Burswood",
      direction: "Perth",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      defaultFrom: "06:00",
      defaultUntil: "09:00",
      preferredTrainTime: "07:30",
      remindDays: [1, 2, 3, 4, 5],
      remindMe: false,
    },
    {
      id: "j-b",
      kind: "journey",
      name: "Evening home",
      station: "Perth Stn",
      direction: "Mandurah",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      defaultFrom: "15:00",
      defaultUntil: "18:00",
      preferredTrainTime: "17:30",
      remindDays: [1, 2, 3, 4, 5],
      remindMe: false,
    },
  ]);
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(1500);
  await openJourneyDetail(page, "j-a");
  await page.waitForTimeout(800);
  await dismissTemplateCoach(page);

  const deleteVisible = await page.evaluate(
    () => !document.getElementById("delete-journey-btn").hidden
  );
  const footer = await auditButtons(page, ".settings-detail-footer", "dialog");
  await page.evaluate(() => {
    document.getElementById("settings-back")?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(200);
  const back = await auditButtons(page, "#settings-detail-view", "dialog", {
    onlyIds: ["settings-back"],
  });
  const detail = {
    issues: [...(footer.issues || []), ...(back.issues || [])],
    checked: [...(footer.checked || []), ...(back.checked || [])],
    error: footer.error || back.error,
  };
  if (detail.error) {
    record("journey detail", false, detail.error);
  } else if (!deleteVisible) {
    record("journey detail", false, "delete-journey-btn still hidden with 2 journeys");
  } else if (detail.issues.length) {
    record("journey detail", false, JSON.stringify(detail.issues));
  } else {
    record(
      "journey detail",
      true,
      `Back + Delete + Save + Cancel visible (${detail.checked.length} controls)`
    );
  }

  // Menu
  await closeAllDialogs(page);
  await clickChrome(page, "#menu-btn");
  await page.waitForTimeout(600);
  const menu = await auditButtons(page, "#menu-dialog", "dialog");
  if (menu.error) {
    record("menu", false, menu.error);
  } else if (menu.issues.length) {
    record("menu", false, JSON.stringify(menu.issues));
  } else {
    record("menu", true, `${menu.checked.length} controls in dialog`);
  }

  // Help (How it works)
  await page.evaluate(() => document.getElementById("menu-help-btn")?.click());
  await page.waitForTimeout(500);
  const help = await auditButtons(page, "#help-dialog", "dialog");
  if (help.error) {
    record("help", false, help.error);
  } else if (help.issues.length) {
    record("help", false, JSON.stringify(help.issues));
  } else {
    record("help", true, `${help.checked.length} controls in dialog`);
  }

  // Widget help
  await page.evaluate(() => {
    document.getElementById("help-dialog")?.close();
    document.getElementById("widget-help-dialog")?.showModal();
  });
  await page.waitForTimeout(400);
  const widgetHelp = await auditButtons(page, "#widget-help-dialog", "dialog");
  const widgetHelpState = await page.evaluate(() => {
    const manual = document.getElementById("widget-help-manual");
    const pinBtn = document.getElementById("widget-help-pin-btn");
    const doneBtn = document.getElementById("widget-help-done-btn");
    const lead = document.querySelector(".widget-help-lead");
    if (!manual || !pinBtn || !doneBtn || !lead) {
      return { error: "missing widget help elements" };
    }
    return {
      manualHidden: manual.hidden,
      pinLabel: pinBtn.textContent?.trim(),
      pinPrimary: pinBtn.classList.contains("btn-primary"),
      doneSecondary: doneBtn.classList.contains("btn-secondary"),
      leadText: lead.textContent?.trim() ?? "",
    };
  });
  if (widgetHelp.error) {
    record("widget help", false, widgetHelp.error);
  } else if (widgetHelp.issues.length) {
    record("widget help", false, JSON.stringify(widgetHelp.issues));
  } else if (widgetHelpState.error) {
    record("widget help", false, widgetHelpState.error);
  } else if (!widgetHelpState.manualHidden) {
    record("widget help", false, "manual block should be hidden on first open");
  } else if (widgetHelpState.pinLabel !== "Add widget" || !widgetHelpState.pinPrimary) {
    record("widget help", false, `pin button: ${JSON.stringify(widgetHelpState)}`);
  } else if (!widgetHelpState.doneSecondary) {
    record("widget help", false, "Done should be secondary");
  } else if (
    !widgetHelpState.leadText.includes("puts your next train") ||
    widgetHelpState.leadText.toLowerCase().includes("tap ")
  ) {
    record("widget help", false, `lead copy: ${JSON.stringify(widgetHelpState.leadText)}`);
  } else {
    record("widget help", true, `${widgetHelp.checked.length} controls; pin-first layout`);
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log("\nButton visibility regression (390×844)\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.screen} — ${r.notes}`);
  }
  console.log(`\n${results.length - failed.length} PASS · ${failed.length} FAIL\n`);
  process.exit(failed.length ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
