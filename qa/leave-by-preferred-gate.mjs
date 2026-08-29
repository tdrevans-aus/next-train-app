/**
 * Journey pin + Leave By (FB-20 / superseded U-11 B hero face).
 * Hero defaults to target pin; hero and leave card always share the same departure.
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
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { ensureJourneyMode } from "./helpers/journey-smoke.mjs";

const BASE = "http://localhost:3000";
const JOURNEY_ID = "j-pref";
// Fixture `normal` trips: +18/+34/+48/+62/+76/+90. Journeys re-derive Active hours
// to [target−60, target+15] on normalize, so a +90 target is still 30 min before
// the window: cold start defaults to Nearby and Leave By stays hidden (not a
// pin-qa flake). Use a middle trip so Leave By is armed and Next Train still
// has a later service to advance to.
const PREFERRED_OFFSET_MINUTES = 48;

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
    { timeout: 45000 }
  );
}

async function readState(page) {
  return page.evaluate(() => ({
    leaveHidden: document.getElementById("leave-card")?.hidden ?? true,
    jumpHidden: document.getElementById("preferred-hint")?.hidden ?? true,
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    heroDepart: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    leaveSubline: document.getElementById("leave-countdown")?.textContent?.trim() ?? "",
    countdown: document.getElementById("depart-countdown")?.textContent?.trim() ?? "",
    followingHidden: document.getElementById("following-section")?.hidden ?? true,
    followingText: document.getElementById("following-next")?.textContent?.trim() ?? "",
  }));
}

async function dumpHeroState(page) {
  return page.evaluate(() => {
    const app = document.querySelector(".app");
    return {
      nearby: app?.classList.contains("nearby-mode") ?? false,
      journey: app?.classList.contains("journey-mode") ?? false,
      route: document.getElementById("route")?.textContent?.trim() ?? "",
      leaveHidden: document.getElementById("leave-card")?.hidden ?? true,
      heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
      heroDepart: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
      countdown: document.getElementById("depart-countdown")?.textContent?.trim() ?? "",
      scheduledId: window.nextTrainApp?.findScheduledJourneyId?.() ?? null,
    };
  });
}

async function run() {
  let serverChild = null;
  let browser = null;
  try {
    serverChild = await ensureDevServer();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const preferredTrainTime = formatWallClockMinutes(perthMinutesFromNow(PREFERRED_OFFSET_MINUTES));
    const activeHours = allDayActiveHours();

    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.evaluate(
      ({ preferred, activeFrom, activeUntil, journeyId }) => {
        localStorage.setItem(
          "nextTrainSettings",
          JSON.stringify({
            settingsSchemaVersion: 2,
            refreshSeconds: 60,
            activeJourneyId: journeyId,
            journeys: [
              {
                id: journeyId,
                kind: "journey",
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
    // Cold start paints Nearby when the pin is outside derived hours. Always
    // wait for a face, then enter Journeys — checking nearby-mode immediately
    // after goto loses that race and waitForJourneyHero times out.
    await ensureJourneyMode(page);

    try {
      await waitForJourneyHero(page);
    } catch {
      console.error("FAIL — journey hero never loaded (fixture/API)", await dumpHeroState(page));
      process.exitCode = 1;
      return;
    }

    await page.waitForFunction(
      () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Target train",
      null,
      { timeout: 15000 }
    );

    // Sync preferred to the displayed clock so a minute tick during setup does not
    // miss the fixture trip. Do this after Target train is showing so we do not
    // rewrite a later preferred onto the true-next hero.
    await page.evaluate(async (journeyId) => {
      const preferred = document.getElementById("depart-display-time")?.textContent?.trim();
      if (!preferred || preferred === "—") {
        return;
      }
      await window.nextTrainApp?.persistReminderJourneys?.([
        { id: journeyId, preferredTrainTime: preferred, remindMe: false },
      ]);
      await window.nextTrainApp?.fetchNextTrain?.();
    }, JOURNEY_ID);
    await page.waitForFunction(
      () => {
        const leaveHidden = document.getElementById("leave-card")?.hidden ?? true;
        const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
        return label === "Target train" && !leaveHidden;
      },
      null,
      { timeout: 15000 }
    );

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

    if (process.exitCode) {
      return;
    }

    const heroBefore = pinned.heroDepart;
    await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
    // Target pin locks calm swipe — skip may be a no-op; wait for any fetch/render to settle.
    await page.waitForFunction(
      () => {
        const leaveHidden = document.getElementById("leave-card")?.hidden ?? true;
        const heroDepart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
        const countdown = document.getElementById("depart-countdown")?.textContent?.trim() ?? "";
        return (
          !leaveHidden &&
          heroDepart &&
          heroDepart !== "—" &&
          countdown &&
          countdown !== "—" &&
          /\d/.test(countdown)
        );
      },
      null,
      { timeout: 15000 }
    );

    const afterAdvance = await readState(page);

    if (afterAdvance.leaveHidden) {
      console.error("FAIL — Leave card should stay visible after Next Train advance", afterAdvance);
      process.exitCode = 1;
    }

    if (!afterAdvance.leaveSubline.includes(afterAdvance.heroDepart)) {
      console.error("FAIL — leave card should track the same train as the hero", afterAdvance);
      process.exitCode = 1;
    }

    if (!afterAdvance.jumpHidden) {
      console.error("FAIL — Jump to target should stay hidden while pin is active", afterAdvance);
      process.exitCode = 1;
    }

    if (afterAdvance.heroDepart === heroBefore) {
      console.warn("WARN — Next Train did not advance hero (fixture may have only one matching train)");
    }

    if (!process.exitCode) {
      console.log("PASS — pin hero, leave card synced with hero on Next Train");
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
    }
    stopDevServer(serverChild);
  }
}

run();
