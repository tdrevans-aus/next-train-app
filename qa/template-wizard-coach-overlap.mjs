/**
 * Template wizard — coach card must not overlap the highlighted active area on any step.
 * Usage: node qa/template-wizard-coach-overlap.mjs
 */
import { chromium } from "playwright";
import { openJourneysLibrary } from "./helpers/travel-library.mjs";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";

const BASE = "http://localhost:3000";
const PHONE_VIEWPORT = { width: 412, height: 915 };

function evaluateCoachOverlap() {
  const card = document.querySelector("#template-route-coach .onboarding-coach-card");
  const target = document.querySelector(".template-wizard-highlight");
  const visibleStep = document.querySelector(
    "#template-route-coach .template-wizard-step:not([hidden]) h2"
  );

  if (!card || !target) {
    return {
      ok: false,
      error: "missing coach card or highlight target",
      visibleTitle: visibleStep?.textContent?.trim() ?? "",
    };
  }

  const gap = 4;
  const cardRect = card.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const overlap =
    cardRect.left < targetRect.right - gap &&
    cardRect.right > targetRect.left + gap &&
    cardRect.top < targetRect.bottom - gap &&
    cardRect.bottom > targetRect.top + gap;

  return {
    ok: !overlap,
    overlap,
    visibleTitle: visibleStep?.textContent?.trim() ?? "",
    targetId: target.id || target.className?.slice?.(0, 48),
    cardTop: Math.round(cardRect.top),
    targetTop: Math.round(targetRect.top),
    cardBottom: Math.round(cardRect.bottom),
    targetBottom: Math.round(targetRect.bottom),
  };
}

async function openMorningWizard(page) {
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(10000);
  await openJourneysLibrary(page);
  await page.locator('[data-template="morning"]').click();
  await page.waitForSelector("#template-route-coach", { state: "visible", timeout: 15000 });
  await page.waitForTimeout(3500);
}

async function openCustomWizard(page) {
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(10000);
  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 30,
        activeJourneyId: "j-seed-evening",
        journeys: [
          {
            id: "j-seed-evening",
            kind: "journey",
            name: "Evening home",
            station: "Perth Underground Stn",
            direction: "Mandurah",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            templateKey: "evening",
            defaultFrom: "15:00",
            defaultUntil: "18:00",
            preferredTrainTime: "17:30",
            remindDays: [1, 2, 3, 4, 5],
            remindMe: false,
          },
        ],
      })
    );
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.setItem("nextTrainTemplateWizardSeen", "0");
    localStorage.setItem("nextTrainTemplateWizardSkipped", "0");
    localStorage.removeItem("nextTrainTemplateWizardSkipped");
  });
  await page.reload();
  await page.waitForTimeout(10000);
  await openJourneysLibrary(page);
  await openCustomJourneyCreate(page);
  await page.waitForSelector("#template-route-coach", { state: "visible", timeout: 15000 });
  await page.waitForTimeout(3500);
}

async function walkWizardSteps(page, maxStep) {
  const failures = [];

  for (let step = 1; step <= maxStep; step += 1) {
    await page.waitForTimeout(450);
    const result = await page.evaluate(evaluateCoachOverlap);

    if (!result.ok) {
      failures.push({ templateStep: step, ...result });
    }

    if (step < maxStep) {
      const btn = page.locator("#template-wizard-primary-btn");
      try {
        await btn.waitFor({ state: "visible", timeout: 15000 });
      } catch (e) {
        const state = await page.evaluate(() => {
          const coach = document.getElementById("template-route-coach");
          const btn = document.getElementById("template-wizard-primary-btn");
          return {
            coachHidden: coach?.hidden,
            coachDisplay: coach ? getComputedStyle(coach).display : "null",
            btnHidden: btn?.hidden,
            btnDisplay: btn ? getComputedStyle(btn).display : "null",
            btnOuter: btn?.outerHTML,
            dialogOpen: document.getElementById("journeys-dialog")?.classList.contains("template-wizard-active"),
          };
        });
        console.error("FAIL — Button not visible. State:", state);
        throw e;
      }
      await btn.click();
      await page.waitForTimeout(750);
    }
  }

  return failures;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: PHONE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  let exitCode = 0;

  await openMorningWizard(page);
  const morningFailures = await walkWizardSteps(page, 5);
  if (morningFailures.length === 0) {
    console.log("PASS — Morning template: coach clear on all 5 wizard steps");
  } else {
    console.error("FAIL — Morning template coach overlaps highlight", morningFailures);
    exitCode = 1;
  }

  await openCustomWizard(page);
  const customFailures = await walkWizardSteps(page, 4);
  if (customFailures.length === 0) {
    console.log("PASS — Custom template: coach clear on all 4 wizard steps");
  } else {
    console.error("FAIL — Custom template coach overlaps highlight", customFailures);
    exitCode = 1;
  }

  await browser.close();
  if (exitCode) {
    process.exitCode = exitCode;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
