/**
 * Journey pin + Leave By (FB-20 / superseded U-11 B hero face).
 * Hero defaults to preferred pin; swipe previews later trains; Leave By follows pin.
 *
 * Nearby pin leave-card NEXT TRAIN (late/missed): manual QA — pin a Near me train,
 * wait until leave card shows late/missed, tap NEXT TRAIN on leave card; pin should
 * advance to the following train (window.nextTrainApp.shouldAdvancePinOnNextTrain /
 * advanceNearbyPinToNextTrain). Hero swipe while pinned should still advance pin when
 * canSkipToNextTrain() (not blocked by isHeroPinLockingSwipe).
 *
 * Usage: node qa/leave-by-preferred-gate.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const JOURNEY_ID = "j-pref";

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

function formatWallClockMinutes(totalMinutes) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function allDayActiveHours() {
  return { defaultFrom: "00:00", defaultUntil: "00:00" };
}

async function waitForJourneyHero(page) {
  await page.waitForFunction(
    () => {
      const journeyMode = document.querySelector(".app")?.classList.contains("journey-mode");
      const countdown = document.getElementById("depart-countdown")?.textContent?.trim() ?? "";
      const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
      return journeyMode && countdown && countdown !== "—" && /\d/.test(countdown) && label.length > 0;
    },
    null,
    { timeout: 30000 }
  );
}

async function readState(page) {
  return page.evaluate(() => ({
    leaveHidden: document.getElementById("leave-card")?.hidden ?? true,
    jumpHidden: document.getElementById("preferred-hint")?.hidden ?? true,
    jumpText: document.getElementById("preferred-hint")?.textContent?.trim() ?? "",
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    countdown: document.getElementById("depart-countdown")?.textContent?.trim() ?? "",
    followingHidden: document.getElementById("following-section")?.hidden ?? true,
    followingText: document.getElementById("following-next")?.textContent?.trim() ?? "",
  }));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const preferredTrainTime = formatWallClockMinutes(perthMinutesFromNow(90));
  const activeHours = allDayActiveHours();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.evaluate(
    ({ preferred, activeFrom, activeUntil, journeyId }) => {
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          refreshSeconds: 60,
          activeJourneyId: journeyId,
          journeys: [
            {
              id: journeyId,
              name: "Morning commute",
              station: "Edgewater Stn",
              direction: "Perth",
              leaveBeforeMinutes: 10,
              useLeaveBefore: true,
              defaultFrom: activeFrom,
              defaultUntil: activeUntil,
              preferredTrainTime: preferred,
              remindDays: [1, 2, 3, 4, 5, 6, 7],
              remindMe: false,
            },
          ],
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
      sessionStorage.removeItem(`nextTrainSkip:${journeyId}`);
      sessionStorage.setItem(
        "nextTrainManualJourneyOverride",
        JSON.stringify({ journeyId, matchingWindowIds: [journeyId] })
      );
    },
    {
      preferred: preferredTrainTime,
      activeFrom: activeHours.defaultFrom,
      activeUntil: activeHours.defaultUntil,
      journeyId: JOURNEY_ID,
    }
  );
  await page.goto(`${BASE}/?test=1&fixture=normal`);

  try {
    await waitForJourneyHero(page);
  } catch {
    console.error("FAIL — journey hero never loaded (fixture/API)");
    await browser.close();
    process.exitCode = 1;
    return;
  }

  const pinned = await readState(page);

  if (pinned.heroLabel !== "Target train") {
    console.error("FAIL — hero should show preferred pin as Target train", pinned);
    process.exitCode = 1;
  }

  if (pinned.leaveHidden) {
    console.error("FAIL — Leave By should follow today’s pin", pinned);
    process.exitCode = 1;
  }

  if (!pinned.jumpHidden) {
    console.error("FAIL — Jump to target should hide while hero is on pin", pinned);
    process.exitCode = 1;
  }

  if (pinned.followingHidden) {
    console.error("FAIL — secondary Next line should show when true next ≠ pin", pinned);
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
  await page.waitForFunction(
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Later train",
    null,
    { timeout: 8000 }
  );

  const afterSwipe = await readState(page);

  if (afterSwipe.leaveHidden) {
    console.error("FAIL — Leave By should stay on pin after swipe preview", afterSwipe);
    process.exitCode = 1;
  }

  if (afterSwipe.jumpHidden || !afterSwipe.jumpText.includes("Jump to target")) {
    console.error("FAIL — Jump to target should appear when hero preview ≠ pin", afterSwipe);
    process.exitCode = 1;
  }

  await page.evaluate(() => window.nextTrainApp.skipToEarlierTrain());
  await page.waitForFunction(
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Target train",
    null,
    { timeout: 8000 }
  );

  const afterBack = await readState(page);

  if (afterBack.leaveHidden) {
    console.error("FAIL — Leave By should still follow pin after swipe back", afterBack);
    process.exitCode = 1;
  }

  if (afterBack.heroLabel !== "Target train") {
    console.error("FAIL — swipe back should restore Target train hero", afterBack);
    process.exitCode = 1;
  }

  if (!afterBack.jumpHidden) {
    console.error("FAIL — Jump to target should hide after swipe back to pin", afterBack);
    process.exitCode = 1;
  }

  if (process.exitCode) {
    await browser.close();
    return;
  }

  console.log("PASS — pin hero, Leave By on pin, jump hint on swipe preview");
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
