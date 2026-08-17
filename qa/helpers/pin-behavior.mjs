/**
 * Shared helpers for pin behaviour regression tests.
 */

export const BASE = "http://localhost:3000";

export function perthTodayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** defaultFrom === defaultUntil matches any time of day (journeyMatchesTime). */
export function commuteJourney(overrides = {}) {
  return {
    id: "j-a",
    kind: "journey",
    name: "Morning",
    station: "Edgewater Stn",
    direction: "Perth",
    leaveBeforeMinutes: 10,
    useLeaveBefore: true,
    defaultFrom: "00:00",
    defaultUntil: "00:00",
    preferredTrainTime: "07:30",
    remindDays: [1, 2, 3, 4, 5, 6, 7],
    remindMe: false,
    journeyPinDismissedDate: "",
    ...overrides,
  };
}

export function routeJourney(overrides = {}) {
  return {
    id: "j-b",
    kind: "route",
    name: "Evening route",
    station: "Perth Underground Stn",
    direction: "Joondalup",
    leaveBeforeMinutes: 10,
    ...overrides,
  };
}

export function nearbyPinSnapshot(overrides = {}) {
  return {
    station: "Edgewater Stn",
    direction: "Perth",
    departureIso: `${perthTodayKey()}T07:30:00+08:00`,
    notifyMe: false,
    holdingUntilMs: Date.now() + 600_000,
    displayTime: "7:30 am",
    platform: "1",
    status: "On Time",
    ...overrides,
  };
}

export function buildSettings({ journeys, nearbyPin = null, activeJourneyId = "j-a" } = {}) {
  return {
    settingsSchemaVersion: 2,
    refreshSeconds: 60,
    activeJourneyId,
    nearbyPin,
    journeys,
  };
}

export async function seedSettings(page, settings) {
  await page.goto(`${BASE}/?reset=1&test=1`);
  await page.evaluate((payload) => {
    localStorage.setItem("nextTrainSettings", JSON.stringify(payload));
  }, settings);
}

export async function loadApp(page) {
  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(
    () =>
      typeof window.nextTrainApp?.clearOtherPinnedTrains === "function" &&
      typeof window.nextTrainApp?.enterJourneyMode === "function"
  );
}

export function readSettings(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("nextTrainSettings")));
}
