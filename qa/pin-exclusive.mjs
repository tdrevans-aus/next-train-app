/**
 * Only one train can be pinned at a time across modes.
 * Usage: node qa/pin-exclusive.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

function perthTodayKey() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const todayKey = perthTodayKey();

  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.evaluate((dateKey) => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 60,
        activeJourneyId: "j-a",
        nearbyPin: {
          station: "Edgewater Stn",
          direction: "Perth",
          departureIso: "2026-08-17T07:30:00+08:00",
          notifyMe: false,
          holdingUntilMs: Date.now() + 60_000,
          displayTime: "7:30 am",
          platform: "1",
          status: "On Time",
        },
        journeys: [
          {
            id: "j-a",
            kind: "journey",
            name: "Morning",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "00:00",
            defaultUntil: "23:59",
            preferredTrainTime: "07:30",
            remindDays: [1, 2, 3, 4, 5, 6, 7],
            remindMe: false,
          },
          {
            id: "j-b",
            kind: "route",
            name: "Evening route",
            station: "Perth Underground Stn",
            direction: "Joondalup",
            leaveBeforeMinutes: 10,
            journeyPinOverrideIso: "2026-08-17T17:00:00+08:00",
            journeyPinOverrideDate: dateKey,
          },
        ],
      })
    );
  }, todayKey);

  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.clearOtherPinnedTrains === "function"
  );

  const exclusiveOk = await page.evaluate((dateKey) => {
    window.nextTrainApp.clearOtherPinnedTrains({ type: "journey", journeyId: "j-a" });

    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const nearbyCleared = settings.nearbyPin == null;
    const routeB = settings.journeys.find((journey) => journey.id === "j-b");
    const routeOverrideCleared =
      !routeB.journeyPinOverrideIso && !routeB.journeyPinOverrideDate;
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    const journeyAStillConfigured = Boolean(journeyA?.station && journeyA?.direction);

    return nearbyCleared && routeOverrideCleared && journeyAStillConfigured;
  }, todayKey);

  if (exclusiveOk) {
    console.log("PASS — pinning clears other nearby/route pins; keeps kept journey");
  } else {
    console.error("FAIL — pin-exclusive");
    process.exitCode = 1;
  }

  await page.evaluate((dateKey) => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 60,
        activeJourneyId: "j-b",
        journeys: [
          {
            id: "j-a",
            kind: "journey",
            name: "Morning",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "00:00",
            defaultUntil: "23:59",
            preferredTrainTime: "07:30",
            remindDays: [1, 2, 3, 4, 5, 6, 7],
            remindMe: false,
            journeyPinDismissedDate: "",
          },
          {
            id: "j-b",
            kind: "route",
            name: "Evening route",
            station: "Perth Underground Stn",
            direction: "Joondalup",
            leaveBeforeMinutes: 10,
          },
        ],
      })
    );
  }, todayKey);

  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.clearOtherPinnedTrains === "function"
  );

  const routeOverCommuteOk = await page.evaluate((dateKey) => {
    window.nextTrainApp.clearOtherPinnedTrains({ type: "journey", journeyId: "j-b" });

    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return journeyA.journeyPinDismissedDate === dateKey;
  }, todayKey);

  if (routeOverCommuteOk) {
    console.log("PASS — route pin clears target-train pin on commute journey");
  } else {
    console.error("FAIL — pin-exclusive route vs target train");
    process.exitCode = 1;
  }

  await page.evaluate((dateKey) => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 60,
        activeJourneyId: "j-a",
        nearbyPin: {
          station: "Edgewater Stn",
          direction: "Perth",
          departureIso: "2026-08-17T07:30:00+08:00",
          notifyMe: false,
          holdingUntilMs: Date.now() + 60_000,
          displayTime: "7:30 am",
          platform: "1",
          status: "On Time",
        },
        journeys: [
          {
            id: "j-a",
            kind: "journey",
            name: "Morning",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "00:00",
            defaultUntil: "23:59",
            preferredTrainTime: "07:30",
            remindDays: [1, 2, 3, 4, 5, 6, 7],
            remindMe: false,
            journeyPinDismissedDate: "",
          },
        ],
      })
    );
  }, todayKey);

  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.clearOtherPinnedTrains === "function"
  );

  const nearbyOverTargetOk = await page.evaluate((dateKey) => {
    window.nextTrainApp.clearOtherPinnedTrains({ type: "nearby" });
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return settings.nearbyPin != null && journeyA.journeyPinDismissedDate === dateKey;
  }, todayKey);

  if (nearbyOverTargetOk) {
    console.log("PASS — nearby pin clears target-train pin on commute journey");
  } else {
    console.error("FAIL — pin-exclusive nearby vs target train");
    process.exitCode = 1;
  }

  await page.evaluate((dateKey) => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 60,
        activeJourneyId: "j-a",
        nearbyPin: {
          station: "Edgewater Stn",
          direction: "Perth",
          departureIso: "2026-08-17T07:30:00+08:00",
          notifyMe: false,
          holdingUntilMs: Date.now() + 60_000,
          displayTime: "7:30 am",
          platform: "1",
          status: "On Time",
        },
        journeys: [
          {
            id: "j-a",
            kind: "journey",
            name: "Morning",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "00:00",
            defaultUntil: "23:59",
            preferredTrainTime: "07:30",
            remindDays: [1, 2, 3, 4, 5, 6, 7],
            remindMe: false,
            journeyPinDismissedDate: dateKey,
          },
        ],
      })
    );
  }, todayKey);

  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.enterJourneyMode === "function"
  );

  const stayUnpinnedOk = await page.evaluate((dateKey) => {
    window.nextTrainApp.enterJourneyMode();
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return journeyA.journeyPinDismissedDate === dateKey;
  }, todayKey);

  if (stayUnpinnedOk) {
    console.log("PASS — returning to journeys does not re-pin dismissed target train");
  } else {
    console.error("FAIL — pin-exclusive journeys restore");
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
