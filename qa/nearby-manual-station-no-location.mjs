/**
 * Location denied — manual station pick + Show departures must load the board.
 * Usage: node qa/nearby-manual-station-no-location.mjs
 */
import { chromium } from "playwright";
import { pickStationCombobox } from "./helpers/station-combobox.mjs";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 1, message: "User denied Geolocation" });
    };
    navigator.geolocation.watchPosition = (_success, error) => {
      error?.({ code: 1, message: "User denied Geolocation" });
      return 0;
    };
  });

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    localStorage.setItem("nextTrainOnboardingDone", "1");
    document.getElementById("onboarding-coach")?.remove();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  await page.locator("#nearby-btn").click();

  // Location denied — wait for manual station picker (may take until GPS timeout path).
  await page.waitForFunction(
    () => {
      const fallback = document.getElementById("nearby-fallback");
      const picker = document.getElementById("nearby-station-combobox");
      return (
        (fallback && fallback.hidden === false) ||
        (picker && !document.getElementById("nearby-directions")?.hidden)
      );
    },
    null,
    { timeout: 20000 }
  );

  await pickStationCombobox(page, {
    rootSelector: "#nearby-station-combobox",
    inputSelector: "#nearby-station-input",
    listboxSelector: "#nearby-station-listbox",
    station: "Edgewater Stn",
    waitForDirections: false,
  });

  await page.waitForFunction(
    () => {
      const route = document.getElementById("route")?.textContent?.trim() ?? "";
      const depart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      return (
        route.includes("Edgewater") &&
        route.includes("Near you") &&
        depart !== "Loading departures…" &&
        depart !== "Location needed" &&
        depart !== "Choose a station below"
      );
    },
    null,
    { timeout: 20000 }
  );

  const state = await page.evaluate(() => ({
    route: document.getElementById("route")?.textContent?.trim() ?? "",
    fallbackHidden: document.getElementById("nearby-fallback")?.hidden === true,
    departures:
      document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
  }));

  await browser.close();

  const ok =
    state.route.includes("Edgewater") &&
    state.fallbackHidden &&
    state.departures !== "Location needed" &&
    state.departures !== "Choose a station below";

  if (!ok) {
    console.error("FAIL nearby-manual-station-no-location", state);
    process.exit(1);
  }

  console.log("PASS nearby-manual-station-no-location");
  console.log(`  route=${state.route} depart=${state.departures}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
