/**
 * London Nearby chips logic regression.
 * Usage: node qa/london-nearby-chips.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  console.log("london-nearby-chips: starting Playwright suite...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Baker Street: Check that Bakerloo Elephant & Castle is not empty if it exists in raw board
  {
    console.log("  Test 1: Baker Street chips check...");
    await page.goto(`${BASE}/?reset=1&fixture=normal`);
    
    // Switch to London
    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("uk-london-tfl", { persist: true, explicit: true });
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // Enter Nearby and select Baker Street
    console.log("    Entering Nearby mode...");
    await page.evaluate(() => window.nextTrainApp.enterNearbyMode());
    await page.waitForTimeout(2000);
    
    console.log("    Selecting Baker Street...");
    await page.evaluate(async () => {
      await window.nextTrainApp.applyNearbyManualStation("Baker Street");
    });
    
    // Wait for the board to load and render
    console.log("    Waiting for board to render...");
    await page.waitForSelector('.nearby-direction-row', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const chips = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.nearby-direction-row');
      return Array.from(buttons).map(button => {
        const text = button.textContent?.trim() || "";
        const parts = text.split(' · ');
        const title = parts[0]?.replace(/^to /, "") || "";
        const countdown = parts[1] || "";
        return { title, countdown };
      });
    });

    console.log("    Found chips:", JSON.stringify(chips));

    // Requirement: Hide it if zero upcoming trips (unless ALL are empty)
    const emptyChips = chips.filter(c => c.countdown === "—" || c.countdown === "" || c.countdown === "Times unavailable");
    if (emptyChips.length > 0 && chips.length > emptyChips.length) {
      console.error("    FAIL — Found empty chips in Nearby while other chips have trains:", emptyChips);
      process.exitCode = 1;
    } else if (chips.length === 0) {
      console.log("    WARN — No chips found at all. Is it late at night?");
    } else {
      console.log("    PASS — No empty chips found in Nearby list (or all are empty/late night)");
    }

    // After normalization, chips will have "and" instead of "&"
    const hasBakerlooEC = chips.some(c => c.title === "Bakerloo Elephant and Castle");
    if (hasBakerlooEC) {
      console.log("    PASS — Found Bakerloo Elephant and Castle chip");
    } else {
      console.log("    NOTE: Bakerloo Elephant and Castle not found. Checking if other Bakerloo chips exist...");
      const bakerlooChips = chips.filter(c => c.title.startsWith("Bakerloo "));
      if (bakerlooChips.length > 0) {
         console.error("    FAIL — Other Bakerloo chips found but not Elephant and Castle:", bakerlooChips);
         process.exitCode = 1;
      }
    }
  }

  // 2. Spot-check King's Cross and Paddington
  for (const station of ["King's Cross St. Pancras", "Paddington"]) {
    console.log(`  Test 2: ${station} chips check...`);
    await page.evaluate(async (s) => {
      await window.nextTrainApp.applyNearbyManualStation(s);
    }, station);
    await page.waitForSelector('.nearby-direction-row', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const chips = await page.evaluate(() => {
      const buttons = document.querySelectorAll('.nearby-direction-row');
      return Array.from(buttons).map(button => {
        const text = button.textContent?.trim() || "";
        const parts = text.split(' · ');
        return parts[0]?.replace(/^to /, "") || "";
      });
    });

    console.log(`    ${station} chips:`, chips.join(", "));
    
    if (chips.length === 0) {
      console.log("    WARN — No chips found");
      continue;
    }

    // Check for Circle terminus chips (should not exist)
    const circleTermini = chips.filter(c => c.startsWith("Circle "));
    if (circleTermini.length > 0) {
      console.error(`    FAIL — ${station} has Circle terminus chips:`, circleTermini);
      process.exitCode = 1;
    } else {
      console.log(`    PASS — ${station} has no Circle terminus chips`);
    }
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
