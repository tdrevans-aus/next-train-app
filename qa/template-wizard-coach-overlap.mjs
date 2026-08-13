/**
 * Template wizard — coach card must not overlap the highlighted active area on any step.
 * Usage: node qa/template-wizard-coach-overlap.mjs
 */
import { chromium } from "playwright";

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
  await page.waitForTimeout(800);
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(200);
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(400);
  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(2200);
}

async function openCustomWizard(page) {
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    localStorage.setItem("nextTrainTemplateWizardSeen", "0");
    localStorage.removeItem("nextTrainTemplateWizardSkipped");
  });
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(200);
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(400);
  await page.locator('[data-template="custom"]').click();
  await page.waitForTimeout(2200);
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
      await page.locator("#template-wizard-primary-btn").click();
      await page.waitForTimeout(550);
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
