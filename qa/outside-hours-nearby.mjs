/**
 * Outside Active hours → Near me (outside-hours brief).
 * Usage: node qa/outside-hours-nearby.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 60,
        activeJourneyId: "j-evening",
        journeys: [
          {
            id: "j-morning",
            name: "Morning into town",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
            preferredTrainTime: "",
            remindDays: [1, 2, 3, 4, 5],
            remindMe: false,
          },
          {
            id: "j-evening",
            name: "Evening home",
            station: "Perth Underground Stn",
            direction: "Mandurah",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "15:00",
            defaultUntil: "18:00",
            preferredTrainTime: "",
            remindDays: [1, 2, 3, 4, 5],
            remindMe: false,
          },
        ],
      })
    );
    localStorage.setItem("nextTrainOnboardingDone", "1");
    sessionStorage.setItem(
      "nextTrainManualJourneyOverride",
      JSON.stringify({ journeyId: "j-evening", matchingWindowIds: ["j-morning"] })
    );
  });
  await page.reload();
  await page.waitForTimeout(1500);

  const scheduleChecks = await page.evaluate(() => {
    const noon = 12 * 60;
    const morning = {
      id: "j-morning",
      defaultFrom: "06:00",
      defaultUntil: "09:00",
      remindDays: [1, 2, 3, 4, 5],
      station: "Edgewater Stn",
      direction: "Perth",
    };
    const evening = {
      id: "j-evening",
      defaultFrom: "15:00",
      defaultUntil: "18:00",
      remindDays: [1, 2, 3, 4, 5],
      station: "Perth Underground Stn",
      direction: "Mandurah",
    };
    const soleNoWindow = {
      id: "j-custom",
      defaultFrom: "",
      defaultUntil: "",
      remindDays: [1],
      station: "Edgewater Stn",
      direction: "Perth",
    };

    return {
      morningInWindowAtNoon: window.nextTrainApp.journeyMatchesSchedule(morning, noon),
      eveningInWindowAtNoon: window.nextTrainApp.journeyMatchesSchedule(evening, noon),
      soleNoWindowAtNoon: window.nextTrainApp.journeyMatchesSchedule(soleNoWindow, noon),
      scheduledNow: window.nextTrainApp.findScheduledJourneyId(),
      shouldNearbyNow: window.nextTrainApp.shouldDefaultToNearby(),
      overrideAfterCheck: sessionStorage.getItem("nextTrainManualJourneyOverride"),
    };
  });

  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 60,
        activeJourneyId: "j-custom",
        journeys: [
          {
            id: "j-custom",
            name: "Custom",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "",
            defaultUntil: "",
            preferredTrainTime: "",
            remindDays: [1],
            remindMe: false,
          },
        ],
      })
    );
  });
  await page.reload();
  await page.waitForTimeout(1500);

  const soleChecks = await page.evaluate(() => ({
    soleScheduled: window.nextTrainApp.findScheduledJourneyId(),
    soleShouldNearby: window.nextTrainApp.shouldDefaultToNearby(),
  }));

  const middayOutsideWindows =
    !scheduleChecks.morningInWindowAtNoon && !scheduleChecks.eveningInWindowAtNoon;
  const solePass = soleChecks.soleScheduled === null && soleChecks.soleShouldNearby;
  const overridePass =
    scheduleChecks.scheduledNow !== null ||
    (scheduleChecks.shouldNearbyNow && !scheduleChecks.overrideAfterCheck);

  if (middayOutsideWindows && solePass && overridePass) {
    console.log("PASS — outside Active hours scheduling + sole no-window → Near me");
  } else {
    console.error("FAIL — outside hours nearby", { ...scheduleChecks, ...soleChecks });
    process.exitCode = 1;
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
