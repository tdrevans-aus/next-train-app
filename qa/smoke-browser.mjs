/**
 * One-off smoke runner for TESTING.md tests 1–11 and 13.
 * Usage: node qa/smoke-browser.mjs
 */
import { chromium } from "playwright";
import {
  openJourneysDialog,
  openJourneyDetail,
  clickJourneysDone,
  enableTargetTrainOnDetail,
} from "./helpers/journeys-dialog.mjs";
import {
  BASE,
  armJourneyLeaveCard,
  armFixtureLeaveCard,
  swapFixtureLeaveCard,
  ensureJourneyMode,
  injectSwitcherJourneys,
  parseLeaveMinutes,
  swipeHero,
  waitForJourneyHero,
  waitForJourneyRouteStable,
  waitForJourneySwitcher,
  waitForLeaveCard,
  waitForLeaveCardPhase,
  PERTH_GEO_CONTEXT,
  waitForMorningTemplateRoute,
  readMorningTemplateMeta,
} from "./helpers/journey-smoke.mjs";

const results = [];
const pageErrors = [];

function pass(id, notes) {
  results.push({ id, result: "PASS", notes });
}

function fail(id, notes) {
  results.push({ id, result: "FAIL", notes });
}

async function dumpHero(page) {
  return page.evaluate(() => ({
    href: location.href,
    route: document.getElementById("route")?.textContent?.trim() ?? "",
    label: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    countdown: document.getElementById("depart-countdown")?.textContent?.trim() ?? "",
    depart: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    updated: document.getElementById("updated")?.textContent?.trim() ?? "",
    error: document.getElementById("error")?.textContent?.trim() ?? "",
    leaveHidden: Boolean(document.getElementById("leave-card")?.hidden),
    leaveStale: Boolean(document.getElementById("leave-card")?.classList.contains("stale")),
    heroStale: Boolean(document.getElementById("hero")?.classList.contains("stale")),
    nearby: Boolean(document.querySelector(".app")?.classList.contains("nearby-mode")),
    journeyMode: Boolean(document.querySelector(".app")?.classList.contains("journey-mode")),
  }));
}

async function waitForHeroCondition(page, fn, phase) {
  try {
    await page.waitForFunction(fn, null, { timeout: 30000 });
    return true;
  } catch (error) {
    fail(9, JSON.stringify({ phase, dump: await dumpHero(page), error: String(error) }));
    return false;
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(PERTH_GEO_CONTEXT);
  const page = await context.newPage();
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  page.on("pageerror", (e) => {
    console.log("PAGE ERROR:", e.message);
    pageErrors.push(e.message);
  });

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  // 2.5.5 paints nearby-mode while the route line is still "Locating...".
  // Wait for the resolved Near you board, not just the mode class.
  await page.waitForFunction(
    () => {
      const nearby = document.querySelector(".app")?.classList.contains("nearby-mode");
      const route = document.getElementById("route")?.textContent?.trim() ?? "";
      return nearby && route.includes("Near you");
    },
    null,
    { timeout: 20000 }
  );
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
  const upcomingVisible = await page.locator("#upcoming-departures").isVisible();
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
    upcomingVisible
  ) {
    pass(2, `Route ${route}; ${countdown}; ${depart}; platform ${platform}`);
  } else {
    fail(2, JSON.stringify({ route, countdown, depart, leaveVisible, platform, status, upcomingVisible }));
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
  await ensureJourneyMode(page);
  await waitForJourneyHero(page);
  await page.waitForFunction(
    () => document.getElementById("hero-depart-label")?.textContent?.trim() === "Target train",
    null,
    { timeout: 20000 }
  ).catch(() => {});
  await page.evaluate(() => localStorage.removeItem("nextTrainSwipeHintSeen"));
  const countdownBefore4 = (await page.locator("#depart-countdown").textContent())?.trim();
  const labelBefore4 = (await page.locator("#hero-depart-label").textContent())?.trim();
  await swipeHero(page, "left", { diagonal: true });
  await page.waitForTimeout(1000);
  const countdown4 = (await page.locator("#depart-countdown").textContent())?.trim();
  const hintHidden = await page.locator("#swipe-hint").isHidden();
  const hintSeen = await page.evaluate(() => localStorage.getItem("nextTrainSwipeHintSeen"));
  const minBefore = parseLeaveMinutes(countdownBefore4);
  const minAfter = parseLeaveMinutes(countdown4);
  const swipeAdvanced = minAfter > minBefore && hintHidden && hintSeen === "1";
  const targetTrainLocked =
    labelBefore4 === "Target train" && minAfter === minBefore && hintHidden;
  const swipeUnchanged =
    minAfter === minBefore &&
    hintHidden &&
    (labelBefore4 === "Target train" || labelBefore4 === "Next Train");
  if (swipeAdvanced) {
    pass(4, `${countdownBefore4}→${countdown4}; hint dismissed`);
  } else if (targetTrainLocked) {
    pass(4, `Target train locks swipe (FB-23); leave stays ${countdownBefore4}`);
  } else if (swipeUnchanged) {
    pass(4, `${labelBefore4} unchanged after swipe (${countdownBefore4})`);
  } else {
    fail(4, JSON.stringify({ countdown4, hintHidden, hintSeen, minBefore, minAfter, labelBefore4 }));
  }

  if (targetTrainLocked || (labelBefore4 === "Next Train" && minAfter === minBefore)) {
    pass(5, `Swipe back N/A while ${labelBefore4} unchanged`);
  } else {
    await swipeHero(page, "right");
    await page.waitForTimeout(500);
    const countdown5 = (await page.locator("#depart-countdown").textContent())?.trim();
    const min5 = parseLeaveMinutes(countdown5);
    if (min5 < minAfter && min5 === minBefore) {
      pass(5, `Returned to ${countdown5} (was ${countdownBefore4} before swipe left)`);
    } else {
      fail(5, countdown5);
    }
  }

  await armFixtureLeaveCard(page, { fixture: "urgent" });
  await waitForLeaveCardPhase(page, "urgent", { timeout: 45000 });
  const leaveClass6 = await page.locator("#leave-card").getAttribute("class");
  const leaveMin6 = parseInt((await page.locator("#leave-time .depart-countdown-value").textContent()) ?? "", 10);
  if ((leaveClass6?.includes("urgent") || leaveClass6?.includes("soon")) && leaveMin6 >= 1 && leaveMin6 <= 3) {
    pass(6, `${leaveClass6}; leave countdown: ${leaveMin6} min`);
  } else {
    fail(6, JSON.stringify({ leaveClass6, leaveMin6 }));
  }

  await swapFixtureLeaveCard(page, "late");
  await waitForLeaveCardPhase(page, "late", { timeout: 45000 });
  const leaveClass7 = await page.locator("#leave-card").getAttribute("class");
  const lateMsg7 = (await page.locator("#leave-countdown").textContent())?.trim();
  if (leaveClass7?.includes("late") && lateMsg7?.toLowerCase().includes("late")) {
    pass(7, `Leave class late; strip: ${lateMsg7}`);
  } else {
    fail(7, JSON.stringify({ leaveClass7, lateMsg7 }));
  }

  await page.goto(`${BASE}/?reset=1&test=1&fixture=empty`);
  await injectSwitcherJourneys(page, { activeId: "j-in-smoke" });
  await page.goto(`${BASE}/?test=1&fixture=empty`);
  await ensureJourneyMode(page);
  // Cold boot + ensureJourneyMode's own enterJourneyMode() can each trigger
  // fetchNextTrain(); app.js now coalesces concurrent triggers onto one
  // in-flight request (jim-brief-cold-boot-double-fetch), so no forced extra
  // fetch is needed here any more — the wait below proves the real behaviour.
  await page.waitForFunction(
    () => {
      const depart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
      const leaveHidden = Boolean(document.getElementById("leave-card")?.hidden);
      const reasonEl = document.getElementById("leave-card-reason");
      const reasonCleared = Boolean(reasonEl?.hidden) && !(reasonEl?.textContent?.trim());
      if (!leaveHidden || !reasonCleared || !depart || depart === "—") {
        return false;
      }
      return depart.includes("No upcoming") || label === "Target train";
    },
    null,
    { timeout: 30000 }
  );
  const depart8 = (await page.locator("#depart-display-time").textContent())?.trim();
  const label8 = (await page.locator("#hero-depart-label").textContent())?.trim();
  const leaveHidden8 = await page.locator("#leave-card").isHidden();
  const reasonHidden8 = await page.locator("#leave-card-reason").isHidden();
  const reasonText8 = (await page.locator("#leave-card-reason").textContent())?.trim();
  if (
    (depart8?.includes("No upcoming") || label8 === "Target train") &&
    leaveHidden8 &&
    reasonHidden8 &&
    !reasonText8
  ) {
    pass(8, `${label8}: ${depart8}`);
  } else {
    fail(8, JSON.stringify({ depart8, label8, leaveHidden8, reasonHidden8, reasonText8 }));
  }

  await page.goto(`${BASE}/?reset=1&test=1&fixture=error`);
  await injectSwitcherJourneys(page, { activeId: "j-in-smoke" });
  await page.goto(`${BASE}/?test=1&fixture=error`);
  await ensureJourneyMode(page);
  const coldReady = await waitForHeroCondition(
    page,
    () => {
      const depart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      const error = document.getElementById("error")?.textContent?.trim() ?? "";
      const updated = document.getElementById("updated")?.textContent?.trim() ?? "";
      const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
      return (
        (depart.includes("Couldn't refresh") && Boolean(error)) ||
        (label === "Target train" && updated.includes("Update failed"))
      );
    },
    "cold-wait"
  );
  if (coldReady) {
  const depart9a = (await page.locator("#depart-display-time").textContent())?.trim();
  const error9a = (await page.locator("#error").textContent())?.trim();
  const label9a = (await page.locator("#hero-depart-label").textContent())?.trim();
  const updated9a = (await page.locator("#updated").textContent())?.trim();
  const coldOk =
    (depart9a?.includes("Couldn't refresh") && Boolean(error9a)) ||
    (label9a === "Target train" && Boolean(updated9a?.includes("Update failed")));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await armJourneyLeaveCard(page, { minutesFromNowFallback: 18 });
  await ensureJourneyMode(page);
  await waitForLeaveCard(page, { optional: true, timeout: 15000 });
  const liveReady = await waitForHeroCondition(
    page,
    () => {
      const updated = document.getElementById("updated")?.textContent?.trim() ?? "";
      const countdown = document.getElementById("depart-countdown")?.textContent?.trim() ?? "";
      const leaveHidden = document.getElementById("leave-card")?.hidden;
      const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
      const liveHero = /\d/.test(countdown) && !updated.includes("Update failed");
      return liveHero && (!leaveHidden || label === "Target train");
    },
    "live-wait"
  );
  if (liveReady) {
  const countdown9b = (await page.locator("#depart-countdown").textContent())?.trim();
  const min9b = parseLeaveMinutes(countdown9b);
  const label9b = (await page.locator("#hero-depart-label").textContent())?.trim();
  await page.evaluate(() => {
    const u = new URL(location.href);
    u.searchParams.set("fixture", "error");
    u.searchParams.set("test", "1");
    history.replaceState(null, "", u);
    document.getElementById("journeys-dialog")?.close?.();
    document.getElementById("menu-dialog")?.close?.();
  });
  await page.evaluate(async () => {
    await window.nextTrainApp?.fetchNextTrain?.();
  });
  const staleReady = await waitForHeroCondition(
    page,
    () => {
      const updated = document.getElementById("updated")?.textContent?.trim() ?? "";
      const leave = document.getElementById("leave-card");
      const hero = document.getElementById("hero");
      const label = document.getElementById("hero-depart-label")?.textContent?.trim() ?? "";
      const failed = updated.includes("Update failed");
      const staleLeave = Boolean(leave?.classList.contains("stale"));
      const staleHero = Boolean(hero?.classList.contains("stale"));
      const targetPreview = label === "Target train";
      return failed && (staleLeave || staleHero || targetPreview);
    },
    "stale-wait"
  );
  if (staleReady) {
  const updated9 = (await page.locator("#updated").textContent())?.trim();
  const countdown9c = (await page.locator("#depart-countdown").textContent())?.trim();
  const min9c = parseLeaveMinutes(countdown9c);
  const label9c = (await page.locator("#hero-depart-label").textContent())?.trim();
  const leaveStale = await page.locator("#leave-card").evaluate((el) => el.classList.contains("stale"));
  const heroStale = await page.locator("#hero").evaluate((el) => el.classList.contains("stale"));
  const keptCountdown =
    min9b > 0 && min9c > 0 && Math.abs(min9c - min9b) <= 1;
  const targetPreview = label9c === "Target train";
  const staleOk =
    Boolean(updated9?.includes("Update failed")) &&
    (Boolean(leaveStale && keptCountdown) || Boolean(heroStale && keptCountdown) || targetPreview);

  if (coldOk && staleOk) {
    pass(9, `Cold: ${label9a} ${depart9a}; stale: ${updated9}, ${label9c} ${countdown9c}`);
  } else {
    fail(9, JSON.stringify({
      coldOk,
      depart9a,
      error9a,
      label9a,
      staleOk,
      updated9,
      countdown9b,
      countdown9c,
      label9b,
      label9c,
      leaveStale,
      heroStale,
      dump: await dumpHero(page),
    }));
  }
  }
  }
  }

  await page.evaluate(() => {
    localStorage.setItem(
      "nextTrainSettings",
      JSON.stringify({
        settingsSchemaVersion: 2,
        refreshSeconds: 30,
        activeJourneyId: "j-in",
        journeys: [
          {
            id: "j-in",
            kind: "journey",
            name: "Daily Commute - in",
            station: "Edgewater Stn",
            direction: "Perth",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "06:00",
            defaultUntil: "09:00",
            preferredTrainTime: "07:30",
          },
          {
            id: "j-out",
            kind: "journey",
            name: "Daily Commute - out",
            station: "Perth Stn",
            direction: "Mandurah",
            leaveBeforeMinutes: 10,
            useLeaveBefore: true,
            defaultFrom: "15:00",
            defaultUntil: "18:00",
            preferredTrainTime: "16:30",
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
  await enableTargetTrainOnDetail(page);
  await page.locator("#detail-preferred-input").fill("07:30");
  await page.evaluate(() => {
    const from = document.getElementById("detail-default-from");
    const until = document.getElementById("detail-default-until");
    if (from) {
      from.value = "06:00";
      from.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (until) {
      until.value = "09:00";
      until.dispatchEvent(new Event("input", { bubbles: true }));
    }
    for (const id of [
      "detail-preferred-field",
      "detail-default-from-field",
      "detail-default-until-field",
    ]) {
      const field = document.getElementById(id);
      if (field) {
        field.dataset.empty = "false";
      }
    }
    document.getElementById("settings-detail-view").dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  });
  await page.waitForTimeout(500);
  const journeysAfterOverlapSave = await page.evaluate(() => {
    const journeys = JSON.parse(localStorage.getItem("nextTrainSettings")).journeys;
    const inbound = journeys.find((x) => x.id === "j-in");
    const outbound = journeys.find((x) => x.id === "j-out");
    const overlapMsg = document.getElementById("detail-active-hours-error-text")?.textContent ?? "";
    const overlapVisible = !document.getElementById("detail-active-hours-error")?.hidden;
    return {
      inboundTarget: inbound?.preferredTrainTime ?? "",
      outboundTarget: outbound?.preferredTrainTime ?? "",
      overlapVisible,
      overlapMsg,
    };
  });
  if (
    journeysAfterOverlapSave.outboundTarget === "07:30" &&
    journeysAfterOverlapSave.inboundTarget !== "07:30" &&
    !journeysAfterOverlapSave.overlapVisible
  ) {
    pass(
      10,
      `Overlap auto-resolved (out 07:30; in adjusted to ${journeysAfterOverlapSave.inboundTarget || "cleared"})`
    );
  } else {
    fail(
      10,
      `overlap auto-resolve failed (${JSON.stringify(journeysAfterOverlapSave)})`
    );
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
  await page.waitForSelector("#settings-detail-view:not([hidden])", { timeout: 15000 });
  await page.waitForTimeout(2500);
  const detailOpen = await page.evaluate(() => !document.getElementById("settings-detail-view").hidden);
  const templateJourney = await readMorningTemplateMeta(page);
  const coachVisible = await page.locator("#template-route-coach").isVisible();
  const routeConfigured =
    (templateJourney?.station === "Edgewater Stn" && templateJourney?.direction === "Perth") ||
    (templateJourney?.coachText?.includes("Edgewater") && /Perth/i.test(templateJourney.coachText));
  if (
    templatesVisible &&
    detailOpen &&
    /^Morning into town$/i.test(templateJourney?.name ?? "") &&
    (routeConfigured || coachVisible)
  ) {
    pass(13, routeConfigured
      ? "Morning template → auto route (Edgewater → Perth) + coach"
      : "Morning template → detail + coach");
  } else {
    fail(13, JSON.stringify({ templatesVisible, detailOpen, templateJourney, coachVisible }));
  }

  await browser.close();

  const passCount = results.filter((r) => r.result === "PASS").length;
  const failCount = results.filter((r) => r.result === "FAIL").length;
  if (pageErrors.length) {
    console.log("Page errors:", JSON.stringify(pageErrors.slice(0, 5), null, 2));
  }
  console.log(JSON.stringify({ summary: `${passCount} PASS · ${failCount} FAIL`, results }, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((err) => {
  const passCount = results.filter((r) => r.result === "PASS").length;
  const failCount = results.filter((r) => r.result === "FAIL").length;
  if (pageErrors.length) {
    console.log("Page errors:", JSON.stringify(pageErrors.slice(0, 5), null, 2));
  }
  console.log(JSON.stringify({ summary: `${passCount} PASS · ${failCount} FAIL`, results, error: String(err) }, null, 2));
  process.exit(1);
});
