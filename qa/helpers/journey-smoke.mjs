/**
 * Shared Playwright helpers for journey-mode smoke tests.
 */
export const BASE = "http://localhost:3000";

export const PERTH_GEO_CONTEXT = {
  geolocation: { latitude: -31.77, longitude: 115.99 },
  permissions: ["geolocation"],
};

export async function waitForMorningTemplateRoute(page, { timeout = 20000 } = {}) {
  await page.waitForFunction(
    () => {
      const coach = document.getElementById("template-route-coach-body")?.textContent?.trim() ?? "";
      if (coach.length > 0) {
        return true;
      }
      const journey = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.[0];
      return journey?.station === "Edgewater Stn" && journey?.direction === "Perth";
    },
    null,
    { timeout }
  );
}

export async function readMorningTemplateMeta(page) {
  return page.evaluate(() => {
    const journey = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.[0];
    if (journey?.station) {
      return {
        name: journey.name,
        station: journey.station,
        direction: journey.direction,
        defaultFrom: journey.defaultFrom,
        defaultUntil: journey.defaultUntil,
        coachText: document.getElementById("template-route-coach-body")?.textContent?.trim() ?? "",
      };
    }

    const coachText = document.getElementById("template-route-coach-body")?.textContent?.trim() ?? "";
    return {
      name: "Morning into town",
      station: /Edgewater/i.test(coachText) ? "Edgewater Stn" : "",
      direction: /Perth/i.test(coachText) ? "Perth" : "",
      defaultFrom: document.getElementById("detail-default-from")?.value ?? "",
      defaultUntil: document.getElementById("detail-default-until")?.value ?? "",
      coachText,
    };
  });
}

export function perthMinutesFromNow(offsetMinutes) {
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

export function formatWallClockMinutes(totalMinutes) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export async function waitForJourneyHero(page, { timeout = 30000 } = {}) {
  await page.waitForFunction(
    () => {
      const countdown = document.getElementById("depart-countdown")?.textContent?.trim() ?? "";
      const depart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
      return (
        countdown &&
        countdown !== "—" &&
        /\d/.test(countdown) &&
        depart &&
        depart !== "—" &&
        label.length > 0
      );
    },
    null,
    { timeout }
  );
}

export async function ensureJourneyMode(page) {
  await page.waitForFunction(() => Boolean(window.nextTrainApp?.enterJourneyMode), null, {
    timeout: 15000,
  });
  await page.evaluate(() => {
    const app = document.querySelector(".app");
    if (app?.classList.contains("nearby-mode") || !app?.classList.contains("journey-mode")) {
      window.nextTrainApp.enterJourneyMode();
    }
  });
  await page.waitForFunction(
    () => !document.querySelector(".app")?.classList.contains("nearby-mode"),
    null,
    { timeout: 10000 }
  );
}

export async function armJourneyLeaveCard(page, { minutesFromNowFallback = 18 } = {}) {
  const url = new URL(page.url());
  const fixture = url.searchParams.get("fixture") || "normal";
  const station = url.searchParams.get("station") || "Edgewater Stn";
  const direction = url.searchParams.get("direction") || "Perth";
  const journeyId = "j-smoke";
  const placeholderPreferred = formatWallClockMinutes(
    perthMinutesFromNow(Math.max(1, minutesFromNowFallback - 5))
  );

  await page.evaluate(
    ({ preferred, stationName, directionName, jId }) => {
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          settingsSchemaVersion: 2,
          refreshSeconds: 30,
          activeJourneyId: jId,
          journeys: [
            {
              id: jId,
              kind: "commute",
              name: "Morning commute",
              station: stationName,
              direction: directionName,
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
      sessionStorage.removeItem(`nextTrainSkip:${jId}`);
      sessionStorage.setItem(
        "nextTrainManualJourneyOverride",
        JSON.stringify({ journeyId: jId, matchingWindowIds: [jId] })
      );
    },
    { preferred: placeholderPreferred, stationName: station, directionName: direction, jId: journeyId }
  );

  const query = new URLSearchParams({
    test: "1",
    fixture,
  });
  await page.goto(`${BASE}/?${query}`);
  if (await page.evaluate(() => document.querySelector(".app")?.classList.contains("nearby-mode"))) {
    await ensureJourneyMode(page);
  }
  await waitForJourneyHero(page);

  await page.evaluate(async (jId) => {
    const preferred = document.getElementById("depart-display-time")?.textContent?.trim();
    if (!preferred || preferred === "—") {
      return;
    }
    await window.nextTrainApp?.persistReminderJourneys?.([
      { id: jId, preferredTrainTime: preferred, remindMe: false },
    ]);
    await window.nextTrainApp?.fetchNextTrain?.();
  }, journeyId);

  await waitForLeaveCard(page, { optional: true, timeout: 15000 });
}

export async function armFixtureLeaveCard(
  page,
  { fixture, station = "Edgewater Stn", direction = "Perth" } = {}
) {
  const FIXTURE_MINUTES = { urgent: 12, late: 7, normal: 18 };
  const trainMinutes = FIXTURE_MINUTES[fixture] ?? 18;
  const journeyId = "j-smoke";
  const preferredTrainTime = formatWallClockMinutes(
    perthMinutesFromNow(Math.max(1, trainMinutes - 5))
  );
  // Omit station/direction from the URL — init() readUrlSettings() would overwrite seeded journeys.
  const fixtureUrlReset = `${BASE}/?reset=1&test=1&fixture=${fixture}`;
  const fixtureUrl = `${BASE}/?test=1&fixture=${fixture}`;

  await page.goto(fixtureUrlReset);
  await page.evaluate(
    ({ preferred, stationName, directionName, jId }) => {
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          settingsSchemaVersion: 2,
          refreshSeconds: 30,
          activeJourneyId: jId,
          journeys: [
            {
              id: jId,
              kind: "commute",
              name: "Morning commute",
              station: stationName,
              direction: directionName,
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
      sessionStorage.removeItem(`nextTrainSkip:${jId}`);
      sessionStorage.setItem(
        "nextTrainManualJourneyOverride",
        JSON.stringify({ journeyId: jId, matchingWindowIds: [jId] })
      );
    },
    { preferred: preferredTrainTime, stationName: station, directionName: direction, jId: journeyId }
  );

  await page.goto(fixtureUrl);
  await ensureJourneyMode(page);
  await waitForJourneyHero(page);

  await page.evaluate(async (jId) => {
    const preferred = document.getElementById("depart-display-time")?.textContent?.trim();
    if (!preferred || preferred === "—") {
      return;
    }
    await window.nextTrainApp?.persistReminderJourneys?.([
      { id: jId, preferredTrainTime: preferred, remindMe: false },
    ]);
    await window.nextTrainApp?.fetchNextTrain?.();
  }, journeyId);

  await page.waitForFunction(
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Target train",
    null,
    { timeout: 30000 }
  ).catch(() => {});
  await waitForLeaveCard(page, { optional: false, timeout: 30000 });
}

export async function waitForJourneySwitcher(page, { timeout = 15000 } = {}) {
  await page.waitForFunction(
    () => {
      const switcher = document.getElementById("journey-switcher");
      return Boolean(switcher && !switcher.hidden);
    },
    null,
    { timeout }
  );
}

export async function injectSwitcherJourneys(page, { activeId = "j-in-smoke" } = {}) {
  const preferredIn = formatWallClockMinutes(perthMinutesFromNow(90));
  const preferredOut = formatWallClockMinutes(perthMinutesFromNow(270));
  await page.evaluate(({ activeJourneyId, preferredInTime, preferredOutTime }) => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 30,
        activeJourneyId,
        journeys: [
          {
            id: "j-in-smoke",
            kind: "commute",
            name: "Daily Commute - in",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "00:00",
            defaultUntil: "00:00",
            preferredTrainTime: preferredInTime,
            remindDays: [1, 2, 3, 4, 5, 6, 7],
          },
          {
            id: "j-out-smoke",
            kind: "commute",
            name: "Daily Commute - out",
            station: "Perth Stn",
            direction: "Mandurah",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "00:00",
            defaultUntil: "00:00",
            preferredTrainTime: preferredOutTime,
            remindDays: [1, 2, 3, 4, 5, 6, 7],
          },
        ],
      })
    );
    localStorage.setItem("nextTrainOnboardingDone", "1");
    sessionStorage.removeItem(`nextTrainSkip:${activeJourneyId}`);
    sessionStorage.setItem(
      "nextTrainManualJourneyOverride",
      JSON.stringify({ journeyId: activeJourneyId, matchingWindowIds: [activeJourneyId] })
    );
  }, { activeJourneyId: activeId, preferredInTime: preferredIn, preferredOutTime: preferredOut });
}

export async function waitForDepartCountdown(page, { timeout = 15000 } = {}) {
  await page.waitForFunction(
    () => {
      const t = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      return t && t !== "—" && !t.includes("No upcoming");
    },
    null,
    { timeout }
  );
}

export async function waitForDepartText(page, includes, { timeout = 15000 } = {}) {
  await page.waitForFunction(
    (needle) => {
      const t = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      return t.includes(needle);
    },
    includes,
    { timeout }
  );
}

export async function waitForLeaveCard(page, { optional = true, timeout = 5000 } = {}) {
  try {
    await page.waitForSelector("#leave-card:not([hidden])", { timeout });
    return true;
  } catch (error) {
    if (optional) {
      return false;
    }
    throw error;
  }
}

export async function waitForLeaveCardPhase(page, phase, { timeout = 15000 } = {}) {
  await page.waitForFunction(
    (expected) => {
      const card = document.getElementById("leave-card");
      const msg = document.getElementById("leave-countdown")?.textContent?.toLowerCase() ?? "";
      const leaveMin = parseInt(
        document.querySelector("#leave-time .depart-countdown-value")?.textContent ?? "",
        10
      );
      if (!card || card.hidden) {
        return false;
      }
      if (expected === "late") {
        return card.classList.contains("late") && msg.includes("late");
      }
      if (expected === "urgent") {
        return (
          (card.classList.contains("urgent") || card.classList.contains("soon")) &&
          leaveMin >= 1 &&
          leaveMin <= 3
        );
      }
      return card.classList.contains(expected);
    },
    phase,
    { timeout }
  );
}

export function parseLeaveMinutes(text) {
  return parseInt(text?.match(/\d+/)?.[0] ?? "0", 10);
}

export async function waitForJourneyRouteStable(
  page,
  { switcherIncludes = "", routeIncludes = "", stableMs = 3000, pollMs = 500, timeoutMs = 45000 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  let stableSince = null;
  let lastSnapshot = { switcher: "", route: "" };

  while (Date.now() < deadline) {
    lastSnapshot = await page.evaluate(() => ({
      switcher: document.getElementById("journey-switcher-name")?.textContent?.trim() ?? "",
      route: document.getElementById("route")?.textContent?.trim() ?? "",
    }));

    const matches =
      (!switcherIncludes || lastSnapshot.switcher.includes(switcherIncludes)) &&
      (!routeIncludes || lastSnapshot.route.includes(routeIncludes));

    if (matches) {
      stableSince = stableSince ?? Date.now();
      if (Date.now() - stableSince >= stableMs) {
        return lastSnapshot;
      }
    } else {
      stableSince = null;
    }

    await page.waitForTimeout(pollMs);
  }

  throw new Error(
    `Journey route not stable (${JSON.stringify({ switcherIncludes, routeIncludes, lastSnapshot })})`
  );
}

export async function swipeHero(page, direction, { diagonal = false, attempts = 6 } = {}) {
  const result = await page.evaluate(
    ({ direction, diagonal, attempts }) => {
      const hero = document.getElementById("hero");
      if (!hero) {
        throw new Error("hero not found");
      }

      const rect = hero.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const deltaX = direction === "left" ? (diagonal ? -75 : -80) : diagonal ? 75 : 80;
      const deltaY = diagonal ? 35 : 0;
      const endX = startX + deltaX;
      const endY = startY + deltaY;
      const countdownEl = document.getElementById("depart-countdown");
      const before = countdownEl?.textContent?.trim() ?? "";

      const dispatchSwipe = () => {
        hero.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: startX,
            clientY: startY,
            bubbles: true,
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
          })
        );
        hero.dispatchEvent(
          new PointerEvent("pointerup", {
            clientX: endX,
            clientY: endY,
            bubbles: true,
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
          })
        );
      };

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        dispatchSwipe();
        const after = countdownEl?.textContent?.trim() ?? "";
        if (after !== before) {
          return { before, after, changed: true, attempts: attempt + 1 };
        }
      }

      return {
        before,
        after: countdownEl?.textContent?.trim() ?? "",
        changed: false,
        attempts,
      };
    },
    { direction, diagonal, attempts }
  );

  if (!result.changed) {
    return result;
  }

  return result;
}
