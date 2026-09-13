/**
 * Mixed-city regression:
 * 1) A saved Perth route must still refresh after switching the session to Sydney.
 * 2) Adding a Sydney route from Banksia must load Trains to chips.
 *
 * Usage: node qa/sydney-banksia-perth-route.mjs
 */
import { chromium } from "playwright";
import { pickStationCombobox } from "./helpers/station-combobox.mjs";
import {
  dismissTemplateWizardCoach,
  openRouteCreate,
  seedPersistedJourneys,
} from "./helpers/travel-library.mjs";

import { BASE } from "./helpers/dev-server.mjs";

function isClockTime(text) {
  return /^\d{1,2}:\d{2}/.test(String(text || "").trim());
}

async function waitForHeroClock(page, timeout = 20000) {
  await page.waitForFunction(
    () => {
      const text = document.getElementById("depart-display-time")?.textContent?.trim();
      return /^\d{1,2}:\d{2}/.test(text || "");
    },
    null,
    { timeout }
  );
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const nextTrainUrls = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/next-train?")) {
      nextTrainUrls.push(url);
    }
  });

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);
  await seedPersistedJourneys(page, [
    {
      id: "perth-route",
      kind: "route",
      name: "Edgewater",
      station: "Edgewater Stn",
      direction: "Perth",
      cityId: "perth",
    },
  ]);
  await page.evaluate(() => {
    window.nextTrainApp.enterRouteMode();
  });
  await waitForHeroClock(page);

  nextTrainUrls.length = 0;
  await page.evaluate(async () => {
    await window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
    window.nextTrainApp.switchJourney("perth-route");
  });
  await waitForHeroClock(page);

  const afterSwitch = await page.evaluate(() => ({
    time: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    city: window.NextTrainCitySession.readSavedCity(),
    error: document.getElementById("error")?.textContent?.trim() ?? "",
  }));

  const leakedSydneyCity = nextTrainUrls.filter((url) => {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("station") === "Edgewater Stn" &&
      parsed.searchParams.get("city") === "sydney"
    );
  });

  if (
    afterSwitch.city !== "sydney" ||
    !isClockTime(afterSwitch.time) ||
    afterSwitch.time === "Couldn't refresh times" ||
    leakedSydneyCity.length
  ) {
    console.error("FAIL — Perth route after Sydney switch", {
      afterSwitch,
      leakedSydneyCity,
      nextTrainUrls,
    });
    process.exitCode = 1;
    await browser.close();
    return;
  }
  console.log(`PASS — Perth route still refreshes after Sydney switch (${afterSwitch.time})`);

  await openRouteCreate(page);
  await dismissTemplateWizardCoach(page);
  await pickStationCombobox(page, {
    rootSelector: "#detail-station-combobox",
    inputSelector: "#detail-station-input",
    listboxSelector: "#detail-station-listbox",
    station: "Banksia",
  });

  const directions = await page.evaluate(() =>
    [...(document.getElementById("detail-direction-select")?.options ?? [])]
      .map((option) => option.value)
      .filter(Boolean)
  );

  if (!directions.includes("T4 Bondi Junction") || !directions.includes("T4 Waterfall")) {
    console.error("FAIL — Banksia Trains to did not load", directions);
    process.exitCode = 1;
    await browser.close();
    return;
  }
  console.log("PASS — Banksia Trains to loaded", directions.join(", "));

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
