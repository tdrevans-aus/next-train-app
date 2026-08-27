/**
 * FB-23 §4 — journey auto-selection with deterministic test clock.
 * Usage: node qa/fb-23-auto-selection.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const QA_DAY = 1; // Monday

function journeyItem(id, { from, until, target, name = "Journey" }) {
  return {
    id,
    kind: "journey",
    name,
    station: "Edgewater Stn",
    direction: "Perth",
    leaveBeforeMinutes: 10,
    useLeaveBefore: true,
    defaultFrom: from,
    defaultUntil: until,
    preferredTrainTime: target ?? "",
    remindDays: [1, 2, 3, 4, 5],
    remindMe: false,
  };
}

function route(id, { station = "Edgewater Stn", direction = "Perth", name = "Route" } = {}) {
  return {
    id,
    kind: "route",
    name,
    station,
    direction,
    leaveBeforeMinutes: 10,
    useLeaveBefore: false,
    defaultFrom: "",
    defaultUntil: "",
    preferredTrainTime: "",
    remindDays: [1, 2, 3, 4, 5],
    remindMe: false,
  };
}

async function openWithClock(page, clock, seedSettings) {
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal&clock=${clock}&day=${QA_DAY}`);
  await page.waitForTimeout(1200);
  await page.evaluate((settings) => {
    window.nextTrainJourneyModel.persistSettings(settings);
    localStorage.setItem("nextTrainOnboardingDone", "1");
    sessionStorage.removeItem("nextTrainManualJourneyOverride");
  }, seedSettings);
  await page.waitForTimeout(400);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const failures = [];

  try {
  function assert(name, pass, detail) {
    if (!pass) {
      failures.push({ name, detail });
    }
  }

  // §4.1 Midday, no journey in window — do not auto-select a route.
  await openWithClock(page, "12:00", {
    settingsSchemaVersion: 2,
    refreshSeconds: 60,
    activeJourneyId: "route-a",
    journeys: [
      route("route-a"),
      journeyItem("journey-morning", { from: "06:00", until: "09:00", target: "07:00" }),
      journeyItem("journey-evening", { from: "15:00", until: "18:00", target: "17:00", name: "Evening" }),
    ],
  });

  const midday = await page.evaluate(() => ({
    minutes: window.nextTrainApp.getPerthMinutesSinceMidnight(),
    scheduled: window.nextTrainApp.findScheduledJourneyId(),
    shouldNearby: window.nextTrainApp.shouldDefaultToNearby(),
    activeBefore: window.nextTrainJourneyModel.readStoredSettings().activeJourneyId,
  }));
  const middayAfter = await page.evaluate(() => {
    window.nextTrainApp.maybeAutoSelectJourney();
    return {
      activeAfter: window.nextTrainJourneyModel.readStoredSettings().activeJourneyId,
    };
  });

  assert("midday no scheduled journey", midday.scheduled === null, midday);
  assert("midday defaults to Near me", midday.shouldNearby === true, midday);
  assert("midday does not auto-select route", middayAfter.activeAfter === "route-a", {
    ...midday,
    ...middayAfter,
  });

  // §4.2 Journey in active window — auto-select that journey.
  // Derived band is target −60 / +15, so 07:00 is in-window for a 07:00 target (07:30 is not).
  await openWithClock(page, "07:00", {
    settingsSchemaVersion: 2,
    refreshSeconds: 60,
    activeJourneyId: "route-a",
    journeys: [
      route("route-a"),
      journeyItem("journey-morning", { from: "06:00", until: "09:00", target: "07:00" }),
    ],
  });

  const inWindow = await page.evaluate(() => {
    window.nextTrainApp.maybeAutoSelectJourney();
    return {
      scheduled: window.nextTrainApp.findScheduledJourneyId(),
      active: window.nextTrainJourneyModel.readStoredSettings().activeJourneyId,
    };
  });

  assert("journey in window is scheduled", inWindow.scheduled === "journey-morning", inWindow);
  assert("journey in window auto-selected", inWindow.active === "journey-morning", inWindow);

  // §4.3 Two journeys with targets — switch at midpoint (07:30).
  await openWithClock(page, "07:10", {
    settingsSchemaVersion: 2,
    refreshSeconds: 60,
    activeJourneyId: "journey-early",
    journeys: [
      journeyItem("journey-early", { from: "06:00", until: "09:00", target: "07:00", name: "Early" }),
      journeyItem("journey-late", { from: "06:00", until: "09:00", target: "08:00", name: "Late" }),
    ],
  });

  const beforeMidpoint = await page.evaluate(() => ({
    scheduled: window.nextTrainApp.findScheduledJourneyId(),
    pick: window.nextTrainApp.pickScheduledJourney(
      window.nextTrainApp.getJourneysMatchingSchedule(),
    )?.id ?? null,
  }));

  await page.goto(`${BASE}/?test=1&fixture=normal&clock=07:40&day=${QA_DAY}`);
  await page.waitForTimeout(1200);

  const afterMidpoint = await page.evaluate(() => ({
    scheduled: window.nextTrainApp.findScheduledJourneyId(),
    pick: window.nextTrainApp.pickScheduledJourney(
      window.nextTrainApp.getJourneysMatchingSchedule(),
    )?.id ?? null,
  }));

  assert("before midpoint picks early journey", beforeMidpoint.scheduled === "journey-early", beforeMidpoint);
  assert("after midpoint picks late journey", afterMidpoint.scheduled === "journey-late", afterMidpoint);

  // §4.4 Route only — no auto-schedule.
  await openWithClock(page, "07:30", {
    settingsSchemaVersion: 2,
    refreshSeconds: 60,
    activeJourneyId: "route-only",
    journeys: [route("route-only", { name: "Solo route" })],
  });

  const routeOnly = await page.evaluate(() => {
    window.nextTrainApp.maybeAutoSelectJourney();
    return {
      scheduled: window.nextTrainApp.findScheduledJourneyId(),
      shouldNearby: window.nextTrainApp.shouldDefaultToNearby(),
      active: window.nextTrainJourneyModel.readStoredSettings().activeJourneyId,
    };
  });

  assert("route-only has no scheduled journey", routeOnly.scheduled === null, routeOnly);
  assert("route-only stays on manual route", routeOnly.active === "route-only", routeOnly);
  assert("route-only does not imply journey schedule", routeOnly.shouldNearby === true, routeOnly);
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error("FAIL — FB-23 auto-selection §4", failures);
    process.exitCode = 1;
    return;
  }

  console.log("PASS — FB-23 auto-selection §4 (clock fixture)");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
