/**
 * Region/Country selection and geolocation auto-switching tests.
 * Usage: node qa/region-selection.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "http://localhost:3000";
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
    await page.waitForTimeout(2000);
    // Region mismatch only matters for My Routes / My Journeys — Near me (the default cold-start
    // view) doesn't care which region you're in, so the prompt is gated on journey mode being
    // active. Enter it explicitly so this test reflects that, not the old unconditional behavior.
    await page.evaluate(() => window.nextTrainApp?.enterJourneyMode?.());
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

  // 2b. Mismatch prompt must NOT trigger while Near me is the active view
  {
    console.log("  Test 2b: Mismatch prompt stays silent in Near me...");
    const context = await browser.newContext({ geolocation: SYDNEY, permissions: ["geolocation"] });
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
    });
    await page.waitForTimeout(2000);

    await context.setGeolocation(LONDON);
    await page.evaluate(() => localStorage.removeItem('nextTrainRegionMismatchDismissed'));
    await page.goto(`${BASE}/?test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Deliberately stay on the default Near me view — never call enterJourneyMode here.
    await page.waitForTimeout(10000);

    const dialogOpenInNearby = await page.evaluate(() => {
      const dialog = document.getElementById("region-mismatch-dialog");
      return dialog && dialog.hasAttribute("open");
    });

    if (!dialogOpenInNearby) {
      console.log("    PASS — Region mismatch prompt stayed silent in Near me");
    } else {
      console.error("    FAIL — Region mismatch prompt appeared while Near me was active");
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
      const citySelect = document.querySelector('[data-region-city]');
      const city = citySelect?.value;
      const label = citySelect?.selectedOptions?.[0]?.textContent?.trim() ?? "";
      return { country, city, label };
    });

    if (selection.country === "gb" && selection.city === "uk-london-tfl" && selection.label === "London") {
      console.log("    PASS — Selector UI correctly shows England/London");
    } else {
      console.error("    FAIL — Selector UI incorrect", selection);
      process.exitCode = 1;
    }
    await context.close();
  }

  // 4. Netherlands / Canada persist (allowlist used to strip savedCity)
  {
    console.log("    Test 4: Amsterdam and Vancouver persist...");
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForTimeout(4000);

    for (const { city, country, station } of [
      { city: "amsterdam", country: "nl", station: "Centraal Station" },
      { city: "rotterdam", country: "nl", station: "Beurs" },
      { city: "vancouver", country: "ca", station: "Waterfront" },
      { city: "newcastle", country: "au", station: "Newcastle Interchange" },
      { city: "gold-coast", country: "au", station: "Helensvale" },
      { city: "auckland", country: "nz", station: "Waitematā Station" },
    ]) {
      await page.evaluate(async (id) => {
        await window.NextTrainCitySession.applyCity(id, { persist: true, explicit: true });
      }, city);
      await page.waitForTimeout(1500);

      const state = await page.evaluate((stop) => {
        const raw = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
        const stations = window.NextTrainBrisbaneDogfood?.getStations?.() ?? [];
        return {
          savedCity: window.NextTrainCitySession.readSavedCity(),
          savedCountry: window.NextTrainCitySession.readSavedCountry(),
          storedCity: raw.savedCity,
          storedCountry: raw.savedCountry,
          hasStop: stations.includes(stop),
          stationCount: stations.length,
        };
      }, station);

      if (state.savedCity !== city || state.storedCity !== city || state.savedCountry !== country) {
        console.error(`    FAIL — ${city} did not persist`, state);
        process.exitCode = 1;
      } else if (!state.hasStop) {
        console.error(`    FAIL — ${city} catalog missing ${station}`, state);
        process.exitCode = 1;
      } else {
        console.log(`    PASS — ${city} persisted (${state.stationCount} stops)`);
      }
    }
    await context.close();
  }

  // 5. Stockholm and Göteborg are both tester-live
  {
    console.log("  Test 5: Sweden picker (Stockholm + Göteborg live)...");
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForTimeout(4000);

    await page.evaluate(() => window.NextTrainCitySession.openRegionScreen());
    await page.waitForTimeout(500);

    const picker = await page.evaluate(() => {
      const countrySelect = document.querySelector("[data-region-country]");
      const sweden = [...(countrySelect?.options ?? [])].find((option) => option.value === "se");
      countrySelect.value = "se";
      countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
      const citySelect = document.querySelector("[data-region-city]");
      const stockholm = [...(citySelect?.options ?? [])].find((option) => option.value === "stockholm");
      const goteborg = [...(citySelect?.options ?? [])].find((option) => option.value === "goteborg");
      return {
        swedenLabel: sweden?.textContent?.trim() ?? "",
        stockholmLabel: stockholm?.textContent?.trim() ?? "",
        goteborgLabel: goteborg?.textContent?.trim() ?? "",
        cityValue: citySelect?.value ?? "",
        savedCity: window.NextTrainCitySession.readSavedCity(),
      };
    });

    const applied = await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("stockholm", { persist: true, explicit: true });
      const afterStockholm = window.NextTrainCitySession.readSavedCity();
      await window.NextTrainCitySession.applyCity("goteborg", { persist: true, explicit: true });
      return {
        afterStockholm,
        afterGoteborg: window.NextTrainCitySession.readSavedCity(),
      };
    });

    if (
      picker.swedenLabel === "Sweden" &&
      picker.stockholmLabel === "Stockholm" &&
      picker.goteborgLabel === "Göteborg" &&
      picker.cityValue === "stockholm" &&
      applied.afterStockholm === "stockholm" &&
      applied.afterGoteborg === "goteborg"
    ) {
      console.log("    PASS — Stockholm and Göteborg both live in Sweden picker");
    } else {
      console.error("    FAIL — Sweden picker / applyCity", { picker, applied });
      process.exitCode = 1;
    }
    await context.close();
  }

  // 6. Melbourne stays Coming Soon — no live board (Osaka / Hong Kong rows removed from the picker 4 Sep 2026)
  {
    console.log("  Test 6: Melbourne picker Coming Soon...");
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForTimeout(4000);

    await page.evaluate(() => window.NextTrainCitySession.openRegionScreen());
    await page.waitForTimeout(500);

    const picker = await page.evaluate(() => {
      const countrySelect = document.querySelector("[data-region-country]");
      countrySelect.value = "au";
      countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
      const citySelect = document.querySelector("[data-region-city]");
      const melbourne = [...(citySelect?.options ?? [])].find((option) => option.value === "melbourne");
      const countryValues = [...(countrySelect?.options ?? [])].map((option) => option.value);
      return {
        melbourneLabel: melbourne?.textContent?.trim() ?? "",
        hasJapan: countryValues.includes("jp"),
        hasHongKong: countryValues.includes("hk"),
      };
    });

    const applied = await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("melbourne", { persist: true, explicit: true });
      return { savedCity: window.NextTrainCitySession.readSavedCity() };
    });

    if (
      picker.melbourneLabel === "Melbourne (Coming Soon)" &&
      !picker.hasJapan &&
      !picker.hasHongKong &&
      applied.savedCity !== "melbourne" &&
      (applied.savedCity === "perth" || applied.savedCity === "")
    ) {
      console.log("    PASS — Melbourne Coming Soon, Japan/Hong Kong absent; applyCity does not persist (falls back to Perth)");
    } else {
      console.error("    FAIL — Melbourne picker / applyCity", { picker, applied });
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
