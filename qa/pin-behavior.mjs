/**
 * Pin behaviour regression — global exclusivity, tab transitions, hold semantics.
 *
 * Usage: node qa/pin-behavior.mjs
 *
 * See docs/pin-behavior.md for product rules.
 */
import { chromium } from "playwright";
import {
  BASE,
  buildSettings,
  commuteJourney,
  loadApp,
  nearbyPinSnapshot,
  perthTodayKey,
  readSettings,
  routeJourney,
  seedSettings,
} from "./helpers/pin-behavior.mjs";

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (ok) {
    console.log(`PASS — ${name}`);
  } else {
    console.error(`FAIL — ${name}${detail ? `: ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const todayKey = perthTodayKey();

  // --- Exclusivity: journey pin clears nearby + route override ---
  await seedSettings(
    page,
    buildSettings({
      journeys: [
        commuteJourney(),
        routeJourney({
          journeyPinOverrideIso: `${todayKey}T17:00:00+08:00`,
          journeyPinOverrideDate: todayKey,
        }),
      ],
      nearbyPin: nearbyPinSnapshot(),
    })
  );
  await loadApp(page);

  const journeyWins = await page.evaluate(() => {
    window.nextTrainApp.clearOtherPinnedTrains({ type: "journey", journeyId: "j-a" });
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const routeB = settings.journeys.find((journey) => journey.id === "j-b");
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return {
      nearbyCleared: settings.nearbyPin == null,
      routeCleared: !routeB.journeyPinOverrideIso && !routeB.journeyPinOverrideDate,
      journeyIntact: Boolean(journeyA?.station && journeyA?.direction),
    };
  });
  record(
    "journey pin clears nearby and route override",
    journeyWins.nearbyCleared && journeyWins.routeCleared && journeyWins.journeyIntact
  );

  // --- Exclusivity: route pin dismisses commute target ---
  await seedSettings(
    page,
    buildSettings({
      activeJourneyId: "j-b",
      journeys: [commuteJourney({ journeyPinDismissedDate: "" }), routeJourney()],
    })
  );
  await loadApp(page);

  const routeOverCommute = await page.evaluate((dateKey) => {
    window.nextTrainApp.clearOtherPinnedTrains({ type: "journey", journeyId: "j-b" });
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return journeyA.journeyPinDismissedDate === dateKey;
  }, todayKey);
  record("route pin dismisses commute target", routeOverCommute);

  // --- Exclusivity: nearby pin dismisses commute target ---
  await seedSettings(
    page,
    buildSettings({
      journeys: [commuteJourney({ journeyPinDismissedDate: "" })],
      nearbyPin: nearbyPinSnapshot(),
    })
  );
  await loadApp(page);

  const nearbyOverTarget = await page.evaluate((dateKey) => {
    window.nextTrainApp.clearOtherPinnedTrains({ type: "nearby" });
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return settings.nearbyPin != null && journeyA.journeyPinDismissedDate === dateKey;
  }, todayKey);
  record("nearby pin dismisses commute target", nearbyOverTarget);

  // --- Tab return: enterJourneyMode must not re-pin dismissed target ---
  await seedSettings(
    page,
    buildSettings({
      journeys: [commuteJourney({ journeyPinDismissedDate: todayKey })],
      nearbyPin: nearbyPinSnapshot(),
    })
  );
  await loadApp(page);

  const stayUnpinned = await page.evaluate((dateKey) => {
    window.nextTrainApp.enterJourneyMode();
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return journeyA.journeyPinDismissedDate === dateKey;
  }, todayKey);
  record("enterJourneyMode keeps dismissed target unpinned", stayUnpinned);

  // --- Nearby pin survives enterJourneyMode when user dismissed target manually ---
  await seedSettings(
    page,
    buildSettings({
      journeys: [commuteJourney({ journeyPinDismissedDate: todayKey })],
      nearbyPin: nearbyPinSnapshot(),
    })
  );
  await loadApp(page);

  const nearbySurvivesTab = await page.evaluate((dateKey) => {
    window.nextTrainApp.enterJourneyMode();
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    return (
      settings.nearbyPin != null &&
      journeyA.journeyPinDismissedDate === dateKey &&
      !journeyA.journeyPinOverrideIso
    );
  }, todayKey);
  record("enterJourneyMode keeps nearby pin when target dismissed", nearbySurvivesTab);

  // --- exitNearbyMode without session must not wipe persisted nearby pin ---
  await seedSettings(
    page,
    buildSettings({
      journeys: [commuteJourney()],
      nearbyPin: nearbyPinSnapshot(),
    })
  );
  await loadApp(page);

  const exitPreserves = await page.evaluate(() => {
    window.nextTrainApp.enterJourneyMode();
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    return settings.nearbyPin != null;
  });
  record("exitNearbyMode preserves persisted nearby pin", exitPreserves);

  // --- Page load must not clear valid holdingUntilMs nearby pin ---
  await seedSettings(
    page,
    buildSettings({
      journeys: [commuteJourney({ journeyPinDismissedDate: "" })],
      nearbyPin: nearbyPinSnapshot({ holdingUntilMs: Date.now() + 600_000 }),
    })
  );
  await loadApp(page);

  const afterLoad = await readSettings(page);
  const journeyA = afterLoad.journeys.find((journey) => journey.id === "j-a");
  record(
    "page load keeps holding nearby pin",
    afterLoad.nearbyPin != null,
    afterLoad.nearbyPin ? "" : "nearbyPin cleared on init"
  );
  record(
    "page load reconciles target when nearby pin active",
    journeyA?.journeyPinDismissedDate === todayKey,
    `dismiss=${journeyA?.journeyPinDismissedDate}`
  );

  // --- reconcileExclusivePinState picks nearby when told ---
  await seedSettings(
    page,
    buildSettings({
      journeys: [
        commuteJourney({ journeyPinDismissedDate: "" }),
        routeJourney({
          journeyPinOverrideIso: `${todayKey}T17:00:00+08:00`,
          journeyPinOverrideDate: todayKey,
        }),
      ],
      nearbyPin: nearbyPinSnapshot(),
    })
  );
  await loadApp(page);

  const reconcileNearby = await page.evaluate((dateKey) => {
    window.nextTrainApp.reconcileExclusivePinState({ type: "nearby" });
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    const journeyA = settings.journeys.find((journey) => journey.id === "j-a");
    const routeB = settings.journeys.find((journey) => journey.id === "j-b");
    return (
      settings.nearbyPin != null &&
      journeyA.journeyPinDismissedDate === dateKey &&
      !routeB.journeyPinOverrideIso
    );
  }, todayKey);
  record("reconcile with nearby keep wins over journey pins", reconcileNearby);

  // --- Dismissed target: label/chrome only when hero is on preferred slot ---
  await loadApp(page);
  const targetChrome = await page.evaluate((dateKey) => {
    const journey = {
      id: "j-a",
      kind: "journey",
      station: "Edgewater Stn",
      direction: "Perth",
      preferredTrainTime: "07:30",
      defaultFrom: "00:00",
      defaultUntil: "23:59",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      journeyPinDismissedDate: dateKey,
    };
    const payload = {
      next: { departure: `${dateKey}T06:30:00+08:00`, displayTime: "6:30 am", platform: "1" },
      upcoming: [
        { departure: `${dateKey}T06:30:00+08:00`, displayTime: "6:30 am", platform: "1" },
        { departure: `${dateKey}T07:30:00+08:00`, displayTime: "7:30 am", platform: "1" },
      ],
    };
    const onTrueNext = window.nextTrainPinState.resolvePinState({
      mode: "journey",
      payload,
      journey,
      skipTrains: 0,
    });
    const onTarget = window.nextTrainPinState.resolvePinState({
      mode: "journey",
      payload,
      journey,
      skipTrains: 1,
    });
    return {
      trueNextLabel: onTrueNext.heroLabel,
      targetLabel: onTarget.heroLabel,
      targetChrome: onTarget.showsTargetTrain,
      targetPinned: onTarget.isPinnedToday,
    };
  }, todayKey);
  record(
    "dismissed target on true next stays Next Train",
    targetChrome.trueNextLabel === "Next Train"
  );
  record(
    "dismissed target on preferred slot shows Target train chrome",
    targetChrome.targetLabel === "Target train" && targetChrome.targetChrome && !targetChrome.targetPinned
  );

  const pinnedPreferred = await page.evaluate((dateKey) => {
    const journey = {
      id: "j-a",
      kind: "journey",
      station: "Edgewater Stn",
      direction: "Perth",
      preferredTrainTime: "07:30",
      defaultFrom: "00:00",
      defaultUntil: "23:59",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      journeyPinDismissedDate: "",
    };
    const payload = {
      next: { departure: `${dateKey}T07:30:00+08:00`, displayTime: "7:30 am", platform: "1" },
      upcoming: [
        { departure: `${dateKey}T06:30:00+08:00`, displayTime: "6:30 am", platform: "1" },
        { departure: `${dateKey}T07:30:00+08:00`, displayTime: "7:30 am", platform: "1" },
      ],
    };
    const state = window.nextTrainPinState.resolvePinState({
      mode: "journey",
      payload,
      journey,
      skipTrains: 1,
    });
    return {
      heroLabel: state.heroLabel,
      pinnedToday: state.isPinnedToday,
      pinnedChrome: state.pinnedChrome,
      showsTargetTrain: state.showsTargetTrain,
    };
  }, todayKey);
  record(
    "pinned preferred target keeps Target train label",
    pinnedPreferred.heroLabel === "Target train" &&
      pinnedPreferred.pinnedToday &&
      !pinnedPreferred.pinnedChrome &&
      pinnedPreferred.showsTargetTrain
  );

  await seedSettings(
    page,
    buildSettings({
      journeys: [
        commuteJourney({
          id: "j-morning",
          name: "Morning",
          journeyPinDismissedDate: todayKey,
        }),
        commuteJourney({
          id: "j-evening",
          name: "Evening",
          preferredTrainTime: "17:00",
          defaultFrom: "15:00",
          defaultUntil: "18:00",
          journeyPinDismissedDate: "",
        }),
      ],
      activeJourneyId: "j-morning",
    })
  );
  await loadApp(page);
  await page.evaluate(() => {
    window.nextTrainApp.enterJourneyMode();
  });
  const pinnedJourneySelected = await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings"));
    return settings.activeJourneyId;
  });
  record("enterJourneyMode opens pinned commute journey", pinnedJourneySelected === "j-evening");

  // --- Re-pin target train: hero pin pressed immediately when skip index > 0 ---
  const preferredTrainTime = (() => {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Perth",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(Date.now() + 90 * 60_000));
    const hour = String(
      Number(parts.find((part) => part.type === "hour")?.value ?? 0)
    ).padStart(2, "0");
    const minute = String(
      Number(parts.find((part) => part.type === "minute")?.value ?? 0)
    ).padStart(2, "0");
    return `${hour}:${minute}`;
  })();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.evaluate(
    ({ preferred }) => {
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
              defaultUntil: "00:00",
              preferredTrainTime: preferred,
              remindDays: [1, 2, 3, 4, 5, 6, 7],
              remindMe: false,
              journeyPinDismissedDate: "",
            },
            {
              id: "j-b",
              kind: "route",
              name: "Evening route",
              station: "Edgewater Stn",
              direction: "Perth",
              leaveBeforeMinutes: 10,
            },
          ],
        })
      );
      localStorage.setItem("nextTrainOnboardingDone", "1");
    },
    { preferred: preferredTrainTime }
  );
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForFunction(
    () => typeof window.nextTrainApp?.enterRouteMode === "function",
    null,
    { timeout: 15000 }
  );

  await page.evaluate(() => window.nextTrainApp.enterRouteMode());
  await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
  await page.locator("#hero-pin-btn").click();
  await page.waitForTimeout(500);

  await page.evaluate(async () => {
    await window.nextTrainApp.enterJourneyMode();
  });
  await page.waitForSelector("#hero-pin-btn:not([hidden])", { timeout: 25000 });
  await page.evaluate(async () => {
    const preferred = document.getElementById("depart-display-time")?.textContent?.trim();
    if (preferred && preferred !== "—") {
      await window.nextTrainApp?.persistReminderJourneys?.([
        { id: "j-a", preferredTrainTime: preferred, remindMe: false },
      ]);
      await window.nextTrainApp?.fetchNextTrain?.();
    }
  });
  await page.waitForFunction(
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Target train",
    null,
    { timeout: 20000 }
  );

  await page.locator("#hero-pin-btn").click();
  await page.waitForTimeout(400);

  const targetPinUi = await page.evaluate((dateKey) => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journeyA = settings.journeys?.find((journey) => journey.id === "j-a");
    const journeyB = settings.journeys?.find((journey) => journey.id === "j-b");
    let skipCount = 0;
    try {
      skipCount = Math.max(0, Number(JSON.parse(sessionStorage.getItem("nextTrainSkip:j-a") || "{}").count) || 0);
    } catch {
      skipCount = 0;
    }
    return {
      pressed: document.getElementById("hero-pin-btn")?.getAttribute("aria-pressed") ?? "",
      active: document.getElementById("hero-pin-btn")?.classList.contains("hero-pin-btn--active"),
      skipCount,
      dismissed: journeyA?.journeyPinDismissedDate ?? "",
      routeOverride: journeyB?.journeyPinOverrideIso ?? "",
      leaveVisible: !document.getElementById("leave-card")?.hidden,
    };
  }, todayKey);
  record(
    "re-pin target train shows pressed pin immediately",
    targetPinUi.pressed === "true" &&
      targetPinUi.active &&
      !targetPinUi.routeOverride &&
      targetPinUi.dismissed !== todayKey &&
      targetPinUi.skipCount > 0,
    JSON.stringify(targetPinUi)
  );

  await browser.close();

  const failed = results.filter((row) => !row.ok).length;
  if (failed === 0) {
    console.log(`\n${results.length} pin behaviour checks passed.`);
  } else {
    console.error(`\n${failed} of ${results.length} pin behaviour checks failed.`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
