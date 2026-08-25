/**
 * Region/Country selection and geolocation auto-switching tests.
 * Usage: node qa/region-selection.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };
const PERTH = { latitude: -31.9505, longitude: 115.8605 };

async function run() {
  console.log("region-selection: starting Playwright suite...");
  const browser = await chromium.launch({ headless: true });

  // 1. Explicit pick persistence
  {
    console.log("  Test 1: Explicit pick persistence...");
    const context = await browser.newContext({ geolocation: LONDON, permissions: ["geolocation"] });
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForTimeout(4000);

    // Switch to Sydney explicitly
    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
    });
    // Give it time to persist to localStorage
    await page.waitForTimeout(2000);

    let city = await page.evaluate(() => window.NextTrainCitySession.readSavedCity());
    if (city !== "sydney") {
      console.error(`    FAIL — Should have switched to sydney explicitly, got ${city}`);
      process.exitCode = 1;
    }

    // Reload with Perth geolocation — should NOT silent switch because of explicit=true
    await context.setGeolocation(PERTH);
    await page.reload();
    await page.waitForTimeout(6000);

    city = await page.evaluate(() => window.NextTrainCitySession.readSavedCity());
    if (city === "sydney") {
      console.log("    PASS — Sydney stayed persistent despite Perth geolocation");
    } else {
      const explicit = await page.evaluate(() => window.NextTrainCitySession.readRegionExplicit());
      console.error(`    FAIL — Sydney should have stayed persistent (explicit=${explicit}), but got city=${city}`);
      process.exitCode = 1;
    }
    await context.close();
  }

  // 2. Mismatch prompt triggers after explicit pick
  {
    console.log("  Test 2: Mismatch prompt triggers...");
    const context = await browser.newContext({ geolocation: SYDNEY, permissions: ["geolocation"] });
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    // Pick Sydney explicitly
    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
    });
    await page.waitForTimeout(2000);
    
    // Change location to London and reload
    await context.setGeolocation(LONDON);
    // Explicitly set the "dismissed" pair key to something else to ensure it can trigger
    await page.evaluate(() => localStorage.removeItem('nextTrainRegionMismatchDismissed'));
    await page.goto(`${BASE}/?test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    // App has a 2s delay for prompt in scheduleRegionMismatchPrompt
    await page.waitForTimeout(10000);

    const dialogOpen = await page.evaluate(() => {
      const dialog = document.getElementById("region-mismatch-dialog");
      return dialog && dialog.hasAttribute("open");
    });

    if (dialogOpen) {
      console.log("    PASS — Region mismatch prompt appeared");
    } else {
      console.error("    FAIL — Region mismatch prompt did not appear");
      process.exitCode = 1;
    }
    await context.close();
  }

  // 3. Country/Region selector UI
  {
    console.log("  Test 3: Selector UI reflects current choice...");
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForTimeout(5000);

    // Set to London
    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("uk-london-tfl", { persist: true, explicit: true });
    });
    
    // Open region setup
    await page.evaluate(() => window.NextTrainCitySession.openRegionScreen());
    await page.waitForTimeout(1000);

    const selection = await page.evaluate(() => {
      const country = document.querySelector('[data-region-country]')?.value;
      const city = document.querySelector('[data-region-city]')?.value;
      return { country, city };
    });

    if (selection.country === "gb" && selection.city === "uk-london-tfl") {
      console.log("    PASS — Selector UI correctly shows England/London");
    } else {
      console.error("    FAIL — Selector UI incorrect", selection);
      process.exitCode = 1;
    }
    await context.close();
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
