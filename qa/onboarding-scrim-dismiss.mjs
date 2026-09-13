/**
 * Stuck onboarding scrim (card off-screen) must dismiss on scrim tap and unblock UI.
 * Usage: node qa/onboarding-scrim-dismiss.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.95, longitude: 115.86 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    localStorage.removeItem("nextTrainOnboardingDone");
    sessionStorage.removeItem("nextTrainOnboardingDefer");
    const coach = document.getElementById("onboarding-coach");
    coach.hidden = false;
    coach.classList.add("onboarding-coach--step-1");
    const card = coach.querySelector(".onboarding-coach-card");
    card.style.top = "9999px";
  });

  await page.locator("#onboarding-coach .onboarding-coach-scrim").click({ position: { x: 12, y: 400 } });
  await page.waitForTimeout(300);

  const afterScrim = await page.evaluate(() => document.getElementById("onboarding-coach").hidden);
  if (!afterScrim) {
    await browser.close();
    console.error("FAIL onboarding-scrim-dismiss — coach still visible after scrim tap");
    process.exit(1);
  }

  await page.locator("#menu-btn").click();
  await page.waitForTimeout(300);

  const menuOpen = await page.evaluate(
    () =>
      Boolean(document.getElementById("menu-dialog")?.open) ||
      document.getElementById("menu-dialog")?.hasAttribute("open")
  );

  await browser.close();

  if (!menuOpen) {
    console.error("FAIL onboarding-scrim-dismiss — menu did not open after dismiss");
    process.exit(1);
  }

  console.log("PASS onboarding-scrim-dismiss");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
