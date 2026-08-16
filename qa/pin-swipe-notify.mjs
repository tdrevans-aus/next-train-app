/**
 * Pin + swipe + Next Train / notify matrix (FB-24 Phase 1.4).
 *
 * Covers:
 * 1. Journey pin override + late/missed → Leave card Next Train advances pin
 * 2. Journey swipe preview (skipTrains > 0) → single pin tap pins hero (not unpin)
 * 3. Nearby pin holding → Next Train advances pin when skippable
 * 4. isHeroPinLockingSwipe does not block shouldAdvancePinOnNextTrain path
 *
 * Usage: node qa/pin-swipe-notify.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { ensureJourneyMode } from "./helpers/journey-smoke.mjs";

const BASE = "http://localhost:3000";
const JOURNEY_ID = "j-pin-swipe";
const HERO_TIMEOUT_MS = process.env.CI === "true" ? 90_000 : 45_000;

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

async function waitForJourneyHero(page) {
  await page.waitForFunction(
    () => {
      const journeyMode = document.querySelector(".app")?.classList.contains("journey-mode");
      const countdown = document.getElementById("depart-countdown")?.textContent?.trim() ?? "";
      const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
      return journeyMode && countdown && countdown !== "—" && /\d/.test(countdown) && label.length > 0;
    },
    null,
    { timeout: HERO_TIMEOUT_MS }
  );
}

async function armPinnedJourneyOnce(page, { fixture = "normal" } = {}) {
  const preferredTrainTime = formatWallClockMinutes(perthMinutesFromNow(90));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=${fixture}`);
  await page.evaluate(
    ({ preferred, journeyId }) => {
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          settingsSchemaVersion: 2,
          refreshSeconds: 60,
          activeJourneyId: journeyId,
          journeys: [
            {
              id: journeyId,
              kind: "commute",
              name: "Morning commute",
              station: "Edgewater Stn",
              direction: "Perth",
              leaveBeforeMinutes: 10,
              useLeaveBefore: true,
              defaultFrom: "00:00",
              defaultUntil: "00:00",
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
    { preferred: preferredTrainTime, journeyId: JOURNEY_ID }
  );
  await page.goto(`${BASE}/?test=1&fixture=${fixture}`);
  if (await page.evaluate(() => document.querySelector(".app")?.classList.contains("nearby-mode"))) {
    await ensureJourneyMode(page);
  }
  await waitForJourneyHero(page);

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
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Target train",
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(500);
}

async function armPinnedJourney(page, options = {}) {
  const attempts = process.env.CI === "true" ? 3 : 2;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await armPinnedJourneyOnce(page, options);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await page.waitForTimeout(800);
      }
    }
  }
  throw lastError;
}

async function armJourneyPinOverride(page, { fixture = "normal" } = {}) {
  await armPinnedJourney(page, { fixture });
  await page.locator("#hero-pin-btn").click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
  await page.waitForFunction(
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Later train",
    null,
    { timeout: 8000 }
  );
  await page.locator("#hero-pin-btn").click();
  await page.waitForTimeout(800);

  const overrideIso = await readJourneyPinIso(page);
  if (!overrideIso) {
    throw new Error("journey pin override not persisted");
  }
}

async function readJourneyPinIso(page) {
  return page.evaluate((journeyId) => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journey = settings.journeys?.find((j) => j.id === journeyId);
    return journey?.journeyPinOverrideIso || "";
  }, JOURNEY_ID);
}

async function readSkipCount(page) {
  return page.evaluate((journeyId) => {
    const raw = sessionStorage.getItem(`nextTrainSkip:${journeyId}`);
    if (!raw) {
      return 0;
    }
    try {
      return Math.max(0, Number(JSON.parse(raw).count) || 0);
    } catch {
      return 0;
    }
  }, JOURNEY_ID);
}

async function readNearbyPinIso(page) {
  return page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    return settings.nearbyPin?.departureIso || "";
  });
}

async function testJourneyLateNextTrainAdvancesPin(page) {
  await armPinnedJourney(page, { fixture: "late" });

  await page.waitForSelector("#leave-card.late, #leave-card-actions:not([hidden])", {
    timeout: 15000,
  }).catch(() => {});

  const pre = await page.evaluate(() => ({
    shouldAdvance: window.nextTrainApp.shouldAdvancePinOnNextTrain(),
    leaveLate: document.getElementById("leave-card")?.classList.contains("late"),
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
  }));

  if (!pre.shouldAdvance) {
    return { ok: false, label: "journey late Next Train advance", detail: pre };
  }

  const pinBefore = await readJourneyPinIso(page);
  const heroBefore = await page.evaluate(
    () => document.getElementById("depart-display-time")?.textContent?.trim() ?? ""
  );

  await page.locator("#leave-next-train-btn").click();
  await page.waitForTimeout(1500);

  const post = await page.evaluate(() => ({
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    heroTime: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    skipCount: (() => {
      try {
        const raw = sessionStorage.getItem("nextTrainSkip:j-pin-swipe");
        return raw ? Number(JSON.parse(raw).count) || 0 : 0;
      } catch {
        return 0;
      }
    })(),
  }));
  const pinAfter = await readJourneyPinIso(page);

  const advanced =
    (Boolean(pinAfter && pinAfter !== pinBefore) || post.heroTime !== heroBefore) &&
    post.skipCount === 0;

  if (!advanced) {
    return {
      ok: false,
      label: "journey late Next Train advance",
      detail: { pre, pinBefore, pinAfter, heroBefore, post },
    };
  }

  return { ok: true, label: "journey late Next Train advance" };
}

async function testJourneyPinTapAfterSwipePreview(page) {
  await armPinnedJourney(page, { fixture: "normal" });

  const pinned = await page.evaluate(() => ({
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
  }));

  if (pinned.heroLabel !== "Target train" || pinned.pinPressed !== "true") {
    return { ok: false, label: "journey pin tap after swipe", detail: { step: "initial pin", pinned } };
  }

  await page.locator("#hero-pin-btn").click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
  await page.waitForFunction(
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Later train",
    null,
    { timeout: 8000 }
  );

  const afterSwipe = await page.evaluate(() => ({
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
    skipCount: (() => {
      try {
        const raw = sessionStorage.getItem("nextTrainSkip:j-pin-swipe");
        return raw ? Number(JSON.parse(raw).count) || 0 : 0;
      } catch {
        return 0;
      }
    })(),
  }));

  if (afterSwipe.skipCount <= 0) {
    return { ok: false, label: "journey pin tap after swipe", detail: { step: "swipe", afterSwipe } };
  }

  await page.locator("#hero-pin-btn").click();
  await page.waitForTimeout(800);

  const afterPin = await page.evaluate(() => ({
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
    skipCount: (() => {
      try {
        const raw = sessionStorage.getItem("nextTrainSkip:j-pin-swipe");
        return raw ? Number(JSON.parse(raw).count) || 0 : 0;
      } catch {
        return 0;
      }
    })(),
  }));

  if (
    afterPin.heroLabel !== "Pinned Train" ||
    afterPin.pinPressed !== "true" ||
    afterPin.skipCount !== 0
  ) {
    return { ok: false, label: "journey pin tap after swipe", detail: { afterSwipe, afterPin } };
  }

  return { ok: true, label: "journey pin tap after swipe" };
}

async function testNearbyPinNextTrainAdvance(page) {
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.evaluate(async () => {
    await window.nextTrainApp.enterNearbyMode();
  });

  await page.waitForFunction(
    () => {
      const t = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      return t && t !== "—" && !t.includes("No upcoming");
    },
    null,
    { timeout: 25000 }
  );

  const pinBtn = page.locator("#hero-pin-btn");
  await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });

  await pinBtn.click();
  await page.waitForTimeout(800);

  const pinned = await page.evaluate(() => ({
    pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
    shouldAdvance: window.nextTrainApp.shouldAdvancePinOnNextTrain(),
  }));

  if (pinned.pinPressed !== "true") {
    return { ok: false, label: "nearby pin Next Train advance", detail: { step: "pin", pinned } };
  }

  if (!pinned.shouldAdvance) {
    return { ok: true, label: "nearby pin Next Train advance (skip — cannot advance)" };
  }

  const pinBefore = await readNearbyPinIso(page);
  await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
  await page.waitForTimeout(1200);

  const pinAfter = await readNearbyPinIso(page);
  if (!pinAfter || pinAfter === pinBefore) {
    return {
      ok: false,
      label: "nearby pin Next Train advance",
      detail: { pinBefore, pinAfter, pinned },
    };
  }

  return { ok: true, label: "nearby pin Next Train advance" };
}

async function testJourneyUnpinOverrideKeepsLaterTrain(page) {
  await armJourneyPinOverride(page, { fixture: "normal" });

  const pinned = await page.evaluate(() => ({
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
    heroTime: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
  }));

  if (pinned.heroLabel !== "Pinned Train" || pinned.pinPressed !== "true") {
    return { ok: false, label: "journey unpin override", detail: { step: "pinned", pinned } };
  }

  await page.locator("#hero-pin-btn").click();
  await page.waitForFunction(
    () => document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") === "false",
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(400);

  const afterUnpin = await page.evaluate((journeyId) => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journey = settings.journeys?.find((j) => j.id === journeyId);
    return {
      heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
      pinPressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
      heroTime: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
      overrideIso: journey?.journeyPinOverrideIso || "",
      dismissed: journey?.journeyPinDismissedDate || "",
    };
  }, JOURNEY_ID);

  if (
    afterUnpin.pinPressed !== "false" ||
    afterUnpin.heroLabel === "Target train" ||
    afterUnpin.heroLabel === "Pinned Train" ||
    afterUnpin.overrideIso ||
    !afterUnpin.dismissed ||
    afterUnpin.heroTime !== pinned.heroTime
  ) {
    return { ok: false, label: "journey unpin override", detail: { pinned, afterUnpin } };
  }

  return { ok: true, label: "journey unpin override keeps later train" };
}

async function testPinLockDoesNotBlockAdvancePath(page) {
  await armJourneyPinOverride(page, { fixture: "normal" });

  const calm = await page.evaluate(() => ({
    shouldAdvance: window.nextTrainApp.shouldAdvancePinOnNextTrain(),
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    hasOverride: (() => {
      const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
      const journey = settings.journeys?.find((j) => j.id === "j-pin-swipe");
      return Boolean(journey?.journeyPinOverrideIso);
    })(),
  }));

  await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
  await page.waitForTimeout(600);

  const afterBlockedSkip = await page.evaluate(() => ({
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    skipCount: (() => {
      try {
        const raw = sessionStorage.getItem("nextTrainSkip:j-pin-swipe");
        return raw ? Number(JSON.parse(raw).count) || 0 : 0;
      } catch {
        return 0;
      }
    })(),
  }));

  if (
    !calm.hasOverride ||
    calm.shouldAdvance ||
    afterBlockedSkip.skipCount !== 0
  ) {
    return {
      ok: false,
      label: "pin lock vs advance path",
      detail: { step: "calm pin lock", calm, afterBlockedSkip },
    };
  }

  await armPinnedJourney(page, { fixture: "late" });
  await page.waitForSelector("#leave-card.late, #leave-card-actions:not([hidden])", {
    timeout: 15000,
  }).catch(() => {});

  const late = await page.evaluate(() => ({
    shouldAdvance: window.nextTrainApp.shouldAdvancePinOnNextTrain(),
    heroLabel: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
  }));

  if (!late.shouldAdvance) {
    return { ok: false, label: "pin lock vs advance path", detail: { step: "late gate", late } };
  }

  const pinBefore = await readJourneyPinIso(page);
  await page.evaluate(() => window.nextTrainApp.skipToNextTrain());
  await page.waitForTimeout(1200);

  const pinAfter = await readJourneyPinIso(page);
  if (!pinAfter || pinAfter === pinBefore) {
    return {
      ok: false,
      label: "pin lock vs advance path",
      detail: { step: "late advance", late, pinBefore, pinAfter },
    };
  }

  return { ok: true, label: "pin lock vs advance path" };
}

async function run() {
  let serverChild = null;
  try {
    serverChild = await ensureDevServer();
    const browser = await chromium.launch({ headless: true });

    const results = [];
    for (const testFn of [
      testJourneyLateNextTrainAdvancesPin,
      testJourneyPinTapAfterSwipePreview,
      testJourneyUnpinOverrideKeepsLaterTrain,
      testNearbyPinNextTrainAdvance,
      testPinLockDoesNotBlockAdvancePath,
    ]) {
      const page = await browser.newPage();
      try {
        results.push(await testFn(page));
      } catch (error) {
        results.push({ ok: false, label: testFn.name, detail: String(error) });
      } finally {
        await page.close();
      }
      // Brief pause so sequential scenarios do not stampede the dev-server fixture API.
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    await browser.close();

    let failed = 0;
    for (const result of results) {
      if (result.ok) {
        console.log(`PASS — ${result.label}`);
      } else {
        failed += 1;
        console.error(`FAIL — ${result.label}`, result.detail ?? "");
      }
    }

    if (failed > 0) {
      process.exitCode = 1;
      console.error(`\nFAIL — ${failed} scenario(s)`);
      return;
    }

    console.log(`\nPASS — ${results.length} pin/swipe/notify scenarios`);
  } finally {
    stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
