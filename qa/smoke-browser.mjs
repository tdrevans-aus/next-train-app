/**
 * One-off smoke runner for TESTING.md tests 1–11 and 13.
 * Usage: node qa/smoke-browser.mjs
 */
import { chromium } from "playwright";
import {
  openJourneysDialog,
  openJourneyDetail,
  clickJourneysDone,
  clickMenuDone,
  enableTargetTrainOnDetail,
} from "./helpers/journeys-dialog.mjs";
import {
  BASE,
  armJourneyLeaveCard,
  armFixtureLeaveCard,
  ensureJourneyMode,
  injectSwitcherJourneys,
  parseLeaveMinutes,
  swipeHero,
  waitForDepartText,
  waitForJourneyRouteStable,
  waitForJourneySwitcher,
  waitForLeaveCard,
  waitForLeaveCardPhase,
} from "./helpers/journey-smoke.mjs";

const results = [];

function pass(id, notes) {
  results.push({ id, result: "PASS", notes });
}

function fail(id, notes) {
  results.push({ id, result: "FAIL", notes });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(2500);
  const nearbyMode = await page.evaluate(() => document.querySelector(".app")?.classList.contains("nearby-mode"));
  const heroSetup = await page.locator("#hero").evaluate((el) => el.classList.contains("hero-setup"));
  const route1 = (await page.locator("#route").textContent())?.trim();
  const leaveHidden = await page.locator("#leave-card").isHidden();
  const switcherHidden = await page.locator("#journey-switcher").isHidden();
  const journeysOpen = await page.locator("#journeys-dialog").evaluate((el) => el.open);
  const nearbyPressed = await page.locator("#nearby-btn").getAttribute("aria-pressed");
  if (
    nearbyMode &&
    !heroSetup &&
    route1?.includes("Near you") &&
    leaveHidden &&
    switcherHidden &&
    !journeysOpen &&
    nearbyPressed === "true"
  ) {
    pass(1, `Nearby board: ${route1}; no setup hero; journeys not auto-opened`);
  } else {
    fail(1, JSON.stringify({ nearbyMode, heroSetup, route1, leaveHidden, switcherHidden, journeysOpen, nearbyPressed }));
  }

  await page.goto(`${BASE}/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await armJourneyLeaveCard(page, { minutesFromNowFallback: 18 });
  const route = (await page.locator("#route").textContent())?.trim();
  const countdown = (await page.locator("#depart-countdown").textContent())?.trim();
  const depart = (await page.locator("#depart-display-time").textContent())?.trim();
  const leaveVisible = !(await page.locator("#leave-card").isHidden());
  const platform = (await page.locator("#platform").textContent())?.trim();
  const status = (await page.locator("#status").textContent())?.trim();
  const leaveTime = (await page.locator("#leave-time").textContent())?.trim();
  const thenVisible = await page.locator("#following-section").isVisible();
  const countdownMin = parseLeaveMinutes(countdown);
  if (
    route?.includes("Edgewater") &&
    route?.includes("Perth") &&
    countdownMin >= 5 &&
    countdownMin <= 25 &&
    depart &&
    depart !== "—" &&
    leaveVisible &&
    leaveTime &&
    leaveTime !== "—" &&
    platform !== "—" &&
    status &&
    thenVisible
  ) {
    pass(2, `Route ${route}; ${countdown}; ${depart}; platform ${platform}`);
  } else {
    fail(2, JSON.stringify({ route, countdown, depart, leaveVisible, platform, status, thenVisible }));
  }

  await injectSwitcherJourneys(page);
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await ensureJourneyMode(page);
  await waitForJourneySwitcher(page);
  await page.locator("#journey-switcher").click();
  await page.locator("#journey-switcher-menu button").filter({ hasText: "Daily Commute - out" }).click();
  await page.waitForFunction(
    () => (document.getElementById("route")?.textContent?.trim() ?? "").includes("Mandurah"),
    null,
    { timeout: 10000 }
  );
  const switcher = (await page.locator("#journey-switcher-name").textContent())?.trim();
  const route3 = (await page.locator("#route").textContent())?.trim();
  const stable = await waitForJourneyRouteStable(page, {
    switcherIncludes: "out",
    routeIncludes: "Mandurah",
    stableMs: 3000,
    timeoutMs: 45000,
  });
  if (
    switcher?.includes("out") &&
    route3?.includes("Mandurah") &&
    stable.switcher.includes("out") &&
    stable.route.includes("Mandurah")
  ) {
    pass(3, `Switched to out; stable after poll ${stable.switcher} / ${stable.route}`);
  } else {
    fail(3, JSON.stringify({ switcher, route3, stable }));
  }

  await page.goto(`${BASE}/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await armJourneyLeaveCard(page, { minutesFromNowFallback: 18 });
  const countdownBefore4 = (await page.locator("#depart-countdown").textContent())?.trim();
  await swipeHero(page, "left", { diagonal: true });
  await page.waitForTimeout(500);
  const countdown4 = (await page.locator("#depart-countdown").textContent())?.trim();
  const hintHidden = await page.locator("#swipe-hint").isHidden();
  const hintSeen = await page.evaluate(() => localStorage.getItem("nextTrainSwipeHintSeen"));
  const minBefore = parseLeaveMinutes(countdownBefore4);
  const minAfter = parseLeaveMinutes(countdown4);
  if (minAfter > minBefore && hintHidden && hintSeen === "1") {
    pass(4, `${countdownBefore4}→${countdown4}; hint dismissed`);
  } else {
    fail(4, JSON.stringify({ countdown4, hintHidden, hintSeen, minBefore, minAfter }));
  }

  await swipeHero(page, "right");
  await page.waitForTimeout(500);
  const countdown5 = (await page.locator("#depart-countdown").textContent())?.trim();
  const min5 = parseLeaveMinutes(countdown5);
  if (min5 < minAfter && min5 === minBefore) {
    pass(5, `Returned to ${countdown5} (was ${countdownBefore4} before swipe left)`);
  } else {
    fail(5, countdown5);
  }

  await armFixtureLeaveCard(page, { fixture: "urgent" });
  await waitForLeaveCardPhase(page, "urgent", { timeout: 30000 });
  const leaveClass6 = await page.locator("#leave-card").getAttribute("class");
  const leaveMin6 = parseInt((await page.locator("#leave-time .depart-countdown-value").textContent()) ?? "", 10);
  if (leaveClass6?.includes("urgent") && leaveMin6 === 2) {
    pass(6, `${leaveClass6}; leave countdown: ${leaveMin6} min`);
  } else {
    fail(6, JSON.stringify({ leaveClass6, leaveMin6 }));
  }

  await armFixtureLeaveCard(page, { fixture: "late" });
  await waitForLeaveCardPhase(page, "late", { timeout: 30000 });
  const leaveClass7 = await page.locator("#leave-card").getAttribute("class");
  const lateMsg7 = (await page.locator("#leave-countdown").textContent())?.trim();
  if (leaveClass7?.includes("late") && lateMsg7?.toLowerCase().includes("late")) {
    pass(7, `Leave class late; strip: ${lateMsg7}`);
  } else {
    fail(7, JSON.stringify({ leaveClass7, lateMsg7 }));
  }

  await page.goto(`${BASE}/?reset=1&fixture=empty&station=Edgewater%20Stn&direction=Perth`);
  await ensureJourneyMode(page);
  await waitForDepartText(page, "No upcoming", { timeout: 15000 });
  const depart8 = (await page.locator("#depart-display-time").textContent())?.trim();
  const leaveHidden8 = await page.locator("#leave-card").isHidden();
  if (depart8?.includes("No upcoming") && leaveHidden8) {
    pass(8, depart8);
  } else {
    fail(8, JSON.stringify({ depart8, leaveHidden8 }));
  }

  await page.goto(`${BASE}/?reset=1&fixture=error&station=Edgewater%20Stn&direction=Perth`);
  await ensureJourneyMode(page);
  await page.waitForFunction(
    () => {
      const depart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      const error = document.getElementById("error")?.textContent?.trim() ?? "";
      return depart.includes("Couldn't refresh") && Boolean(error);
    },
    null,
    { timeout: 15000 }
  );
  const depart9a = (await page.locator("#depart-display-time").textContent())?.trim();
  const error9a = (await page.locator("#error").textContent())?.trim();
  const coldOk = depart9a?.includes("Couldn't refresh") && error9a;

  await page.goto(`${BASE}/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await armJourneyLeaveCard(page, { minutesFromNowFallback: 18 });
  const countdown9b = (await page.locator("#depart-countdown").textContent())?.trim();
  const min9b = parseLeaveMinutes(countdown9b);
  await page.evaluate(() => {
    const u = new URL(location.href);
    u.searchParams.set("fixture", "error");
    history.replaceState(null, "", u);
  });
  await page.locator("#menu-btn").click();
  await page.waitForTimeout(1500);
  await clickMenuDone(page);
  const updated9 = (await page.locator("#updated").textContent())?.trim();
  const countdown9c = (await page.locator("#depart-countdown").textContent())?.trim();
  const min9c = parseLeaveMinutes(countdown9c);
  const leaveStale = await page.locator("#leave-card").evaluate((el) => el.classList.contains("stale"));
  const staleOk = updated9?.includes("Update failed") && min9c === min9b && min9b > 0 && leaveStale;

  if (coldOk && staleOk) {
    pass(9, `Cold: ${depart9a}; stale: ${updated9}, hero kept ${countdown9c}`);
  } else {
    fail(9, JSON.stringify({ coldOk, depart9a, error9a, staleOk, updated9, countdown9c, leaveStale }));
  }

  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        refreshSeconds: 30,
        activeJourneyId: "j-in",
        journeys: [
          {
            id: "j-in",
            name: "Daily Commute - in",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
          },
          {
            id: "j-out",
            name: "Daily Commute - out",
            station: "Perth Stn",
            direction: "Mandurah",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "15:00",
            defaultUntil: "18:00",
          },
        ],
      })
    );
  });
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await ensureJourneyMode(page);
  await page.waitForTimeout(1000);
  page.on("dialog", (d) => d.accept());
  await openJourneyDetail(page, "j-out");
  await page.evaluate(() => {
    document.getElementById("detail-default-from").value = "06:00";
    document.getElementById("detail-default-until").value = "09:00";
    document.getElementById("detail-default-from-field").dataset.empty = "false";
    document.getElementById("detail-default-until-field").dataset.empty = "false";
    document.getElementById("settings-detail-view").dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  });
  await page.waitForTimeout(500);
  const outWindow = await page.evaluate(() => {
    const j = JSON.parse(localStorage.getItem("nextTrainSettings")).journeys.find((x) => x.id === "j-out");
    return `${j.defaultFrom}-${j.defaultUntil}`;
  });
  if (outWindow === "15:00-18:00") {
    const overlapMsg = await page.evaluate(() => document.getElementById("detail-active-hours-error-text")?.textContent ?? "");
    const overlapVisible = await page.evaluate(() => !document.getElementById("detail-active-hours-error")?.hidden);
    if (overlapVisible && overlapMsg.includes("Only one journey can be active")) {
      pass(10, `Overlap blocked (${overlapMsg.slice(0, 48)}…); out window stayed 15:00-18:00`);
    } else {
      fail(10, `overlap UI missing (${overlapMsg || "hidden"})`);
    }
  } else {
    fail(10, `out window ${outWindow}`);
  }
  await page.keyboard.press("Escape");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await openJourneyDetail(page, "j-in");
  await enableTargetTrainOnDetail(page);
  await page.locator("#detail-leave-before-input").fill("15");
  await page.locator("#settings-back").click();
  await page.waitForTimeout(300);
  await clickJourneysDone(page);
  let lb = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nextTrainSettings")).journeys[0].leaveBeforeMinutes
  );
  const doneOk = lb === 10;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await openJourneyDetail(page, "j-in");
  await enableTargetTrainOnDetail(page);
  await page.locator("#detail-leave-before-input").fill("15");
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(500);
  await clickJourneysDone(page);
  lb = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nextTrainSettings")).journeys[0].leaveBeforeMinutes
  );
  if (doneOk && lb === 15) {
    pass(11, "Done without save kept 10; detail Done persisted 15");
  } else {
    fail(11, JSON.stringify({ doneOk, lb }));
  }

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1500);
  await openJourneysDialog(page);
  const templatesVisible = await page.locator("#journey-templates").isVisible();
  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(3000);
  const detailOpen = await page.evaluate(() => !document.getElementById("settings-detail-view").hidden);
  const templateJourney = await page.evaluate(() => {
    const journey = JSON.parse(localStorage.getItem("nextTrainSettings"))?.journeys?.[0];
    return journey
      ? {
          name: journey.name,
          station: journey.station,
          direction: journey.direction,
          defaultFrom: journey.defaultFrom,
          defaultUntil: journey.defaultUntil,
        }
      : null;
  });
  const coachVisible = await page.locator("#template-route-coach").isVisible();
  if (
    templatesVisible &&
    detailOpen &&
    templateJourney?.name === "Morning into town" &&
    templateJourney?.defaultFrom === "06:00" &&
    templateJourney?.defaultUntil === "09:00" &&
    templateJourney?.station === "Edgewater Stn" &&
    templateJourney?.direction === "Perth" &&
    coachVisible
  ) {
    pass(13, "Morning template → auto route (Edgewater → Perth) + coach");
  } else {
    fail(13, JSON.stringify({ templatesVisible, detailOpen, templateJourney, coachVisible }));
  }

  await browser.close();

  const passCount = results.filter((r) => r.result === "PASS").length;
  const failCount = results.filter((r) => r.result === "FAIL").length;
  console.log(JSON.stringify({ summary: `${passCount} PASS · ${failCount} FAIL`, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  const passCount = results.filter((r) => r.result === "PASS").length;
  const failCount = results.filter((r) => r.result === "FAIL").length;
  console.log(JSON.stringify({ summary: `${passCount} PASS · ${failCount} FAIL`, results, error: String(err) }, null, 2));
  process.exit(1);
});
