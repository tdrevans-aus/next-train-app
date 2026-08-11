/**
 * Leave By gated to preferred / swipe-chosen train (U-11 B).
 * Usage: node qa/leave-by-preferred-gate.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

function perthMinutesFromNow(offsetMinutes) {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(Date.now() + offsetMinutes * 60_000));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function formatTimeField(totalMinutes) {
  const wrapped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

function activeHoursAroundNow() {
  const now = perthMinutesFromNow(0);
  return {
    defaultFrom: formatTimeField(now - 60),
    defaultUntil: formatTimeField(now + 180),
  };
}

function formatClock(totalMinutes) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const preferredMinutes = perthMinutesFromNow(90);
  const preferredTrainTime = formatTimeField(preferredMinutes);
  const preferredLabel = `Target Train ${formatClock(preferredMinutes)}`;
  const activeHours = activeHoursAroundNow();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(({ preferred, activeFrom, activeUntil }) => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 60,
        activeJourneyId: "j-pref",
        journeys: [
          {
            id: "j-pref",
            name: "Morning commute",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: activeFrom,
            defaultUntil: activeUntil,
            preferredTrainTime: preferred,
            remindDays: [1, 2, 3, 4, 5],
            remindMe: false,
          },
        ],
      })
    );
    localStorage.setItem("nextTrainOnboardingDone", "1");
    sessionStorage.removeItem("nextTrainSkip:j-pref");
  }, { preferred: preferredTrainTime, activeFrom: activeHours.defaultFrom, activeUntil: activeHours.defaultUntil });
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(2000);

  const gated = await page.evaluate((expectedPreferred) => {
    const leaveCard = document.getElementById("leave-card");
    const preferredHint = document.getElementById("preferred-hint");
    return {
      leaveHidden: leaveCard?.hidden ?? true,
      preferredHidden: preferredHint?.hidden ?? true,
      preferredText: preferredHint?.textContent?.trim() ?? "",
      countdown: document.getElementById("depart-countdown")?.textContent?.trim() ?? "",
      journeyMode: document.querySelector(".app")?.classList.contains("journey-mode") ?? false,
      expectedPreferred,
    };
  }, preferredLabel);

  if (!gated.journeyMode) {
    console.error("FAIL — expected journey mode for leave gate test", gated);
    process.exitCode = 1;
  }

  if (!gated.leaveHidden) {
    console.error("FAIL — Leave By should be hidden before target train");
    process.exitCode = 1;
  }

  if (gated.preferredHidden || !gated.preferredText.startsWith("Target ")) {
    console.error("FAIL — target hint missing", gated);
    process.exitCode = 1;
  }

  if (!gated.countdown || gated.countdown === "—") {
    console.error("FAIL — hero should still show true next train");
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
  await page.waitForTimeout(600);

  const afterSwipe = await page.evaluate(() => ({
    leaveHidden: document.getElementById("leave-card")?.hidden ?? true,
    preferredHidden: document.getElementById("preferred-hint")?.hidden ?? true,
  }));

  if (afterSwipe.leaveHidden) {
    console.error("FAIL — Leave By should appear after swipe Next");
    process.exitCode = 1;
  }

  if (!afterSwipe.preferredHidden) {
    console.error("FAIL — target hint should hide when Leave By shows");
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.skipToEarlierTrain());
  await page.waitForTimeout(600);

  const afterBack = await page.evaluate(() => ({
    leaveHidden: document.getElementById("leave-card")?.hidden ?? true,
    preferredHidden: document.getElementById("preferred-hint")?.hidden ?? true,
  }));

  if (!afterBack.leaveHidden || afterBack.preferredHidden) {
    console.error("FAIL — swipe back should hide Leave By and restore target hint", afterBack);
    process.exitCode = 1;
  }

  if (process.exitCode) {
    await browser.close();
    return;
  }

  console.log("PASS — Leave By gated to target; swipe arms leave; swipe back restores hint");
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
