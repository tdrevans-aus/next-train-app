/**
 * Near me stays GPS-local when the saved region differs.
 * Perth GPS + London selected should still show a Perth nearby board.
 *
 * Usage: node qa/nearby-region-preference.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const PERTH = { latitude: -31.9505, longitude: 115.8605 };

function isClockTime(text) {
  return /^\d{1,2}:\d{2}/.test(String(text || "").trim());
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: PERTH,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  const boardUrls = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/board?")) {
      boardUrls.push(url);
    }
  });

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(3500);

  const beforeSwitch = await page.evaluate(() => ({
    nearbyMode: document.querySelector(".app")?.classList.contains("nearby-mode"),
    savedCity: window.NextTrainCitySession?.readSavedCity?.(),
    hero: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    unsupported: document.querySelector(".hero-empty-title")?.textContent?.trim() ?? "",
  }));

  if (!beforeSwitch.nearbyMode) {
    console.error("FAIL — expected nearby mode on cold start", beforeSwitch);
    process.exitCode = 1;
    await browser.close();
    return;
  }

  boardUrls.length = 0;
  await page.evaluate(async () => {
    await window.NextTrainCitySession.applyCity("uk-london-tfl", {
      persist: true,
      explicit: true,
    });
  });
  await page.waitForTimeout(3500);

  const afterSwitch = await page.evaluate(() => ({
    nearbyMode: document.querySelector(".app")?.classList.contains("nearby-mode"),
    savedCity: window.NextTrainCitySession?.readSavedCity?.(),
    preferenceCity: window.nextTrainApp?.readPreferenceCity?.(),
    nearbyCity: window.nextTrainNearby?.getNearbySession?.()?.city ?? null,
    hero: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    unsupported: document.querySelector(".hero-empty-title")?.textContent?.trim() ?? "",
    directionsHidden: document.getElementById("nearby-directions")?.hidden ?? true,
  }));

  const londonBoardLeak = boardUrls.some((url) => {
    const parsed = new URL(url);
    return parsed.searchParams.get("city") === "uk-london-tfl";
  });

  if (afterSwitch.savedCity !== "uk-london-tfl") {
    console.error("FAIL — saved region should be London", afterSwitch);
    process.exitCode = 1;
  } else if (!afterSwitch.nearbyMode) {
    console.error("FAIL — Near me should stay open after region change", afterSwitch);
    process.exitCode = 1;
  } else if (afterSwitch.unsupported === "Perth rail only" || afterSwitch.unsupported === "London rail only") {
    console.error("FAIL — unsupported empty state after London switch in Perth", afterSwitch);
    process.exitCode = 1;
  } else if (!isClockTime(afterSwitch.hero) && afterSwitch.directionsHidden) {
    console.error("FAIL — expected Perth nearby board after London switch", afterSwitch);
    process.exitCode = 1;
  } else if (londonBoardLeak) {
    console.error("FAIL — board fetch used London city while GPS is in Perth", boardUrls);
    process.exitCode = 1;
  } else {
    console.log(
      "PASS — London selected, Perth GPS: Near me stays active with local board",
      {
        nearbyCity: afterSwitch.nearbyCity,
        hero: afterSwitch.hero,
      }
    );
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
