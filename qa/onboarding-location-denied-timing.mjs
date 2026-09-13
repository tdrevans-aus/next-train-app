/**
 * Location denied — onboarding waits 4s after fallback UI, not during locate spinner.
 * Usage: node qa/onboarding-location-denied-timing.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";
const QUIET_MS = 4000;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 1, message: "User denied Geolocation" });
    };
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForFunction(
    () => {
      const fallback = document.getElementById("nearby-fallback");
      const depart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      return fallback?.hidden === false && depart.includes("Location");
    },
    null,
    { timeout: 20000 }
  );

  const early = await page.evaluate(() => ({
    coachVisible: document.getElementById("onboarding-coach")?.hidden === false,
    locating: document.getElementById("hero")?.classList.contains("locating"),
  }));

  if (early.coachVisible) {
    console.error("FAIL onboarding-location-denied-timing — coach visible before quiet period", early);
    await browser.close();
    process.exit(1);
  }

  await page.waitForFunction(
    () => document.getElementById("onboarding-step-1")?.hidden === false,
    null,
    { timeout: QUIET_MS + 3000 }
  );

  const late = await page.evaluate(() => ({
    step1Visible: document.getElementById("onboarding-step-1")?.hidden === false,
    fallbackVisible: document.getElementById("nearby-fallback")?.hidden === false,
  }));

  await browser.close();

  if (!late.step1Visible || !late.fallbackVisible) {
    console.error("FAIL onboarding-location-denied-timing — coach did not appear after quiet period", late);
    process.exit(1);
  }

  console.log("PASS onboarding-location-denied-timing");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
