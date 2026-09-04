/**
 * Got it on step 1 (Near Me) of the wizard must advance to step 2 (Routes) and stay
 * there — it must not silently no-op (card stuck on step 1) and must not revert back
 * to step 1 after the onboarding quiet-period timer fires again.
 * Usage: node qa/onboarding-got-it-no-loop.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(6000);

  if (!(await page.locator("#onboarding-step-1").isVisible())) {
    await browser.close();
    console.error("FAIL onboarding-got-it-no-loop — step 1 never appeared");
    process.exit(1);
  }

  const hit = await page.evaluate(() => {
    const btn = document.getElementById("onboarding-got-it-btn");
    const rect = btn.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      topId: top?.id || top?.className || "",
      isButton: Boolean(top?.closest("#onboarding-got-it-btn")),
    };
  });
  if (!hit.isButton) {
    await browser.close();
    console.error("FAIL onboarding-got-it-no-loop — Got it is covered", hit);
    process.exit(1);
  }

  await page.locator("#onboarding-got-it-btn").click();
  await page.waitForTimeout(300);

  const afterGotIt = await page.evaluate(() => ({
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    step1Visible: document.getElementById("onboarding-step-1")?.hidden === false,
    step2Visible: document.getElementById("onboarding-step-2")?.hidden === false,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  if (!afterGotIt.coachVisible || afterGotIt.step1Visible || !afterGotIt.step2Visible || afterGotIt.done) {
    await browser.close();
    console.error("FAIL onboarding-got-it-no-loop — Got it did not advance step 1 to step 2", afterGotIt);
    process.exit(1);
  }

  await page.waitForTimeout(8500);

  const afterWait = await page.evaluate(() => ({
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    step1Visible:
      document.getElementById("onboarding-coach")?.hidden === false &&
      document.getElementById("onboarding-step-1")?.hidden === false,
    step2Visible: document.getElementById("onboarding-step-2")?.hidden === false,
    done: Boolean(localStorage.getItem("nextTrainOnboardingDone")),
  }));

  await browser.close();

  if (!afterWait.coachVisible || afterWait.step1Visible || !afterWait.step2Visible || afterWait.done) {
    console.error("FAIL onboarding-got-it-no-loop — step 2 reverted to step 1 (or wizard vanished/completed) after the quiet-period timer", afterWait);
    process.exit(1);
  }

  console.log("PASS onboarding-got-it-no-loop — Got it advanced to step 2 and stayed there");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
