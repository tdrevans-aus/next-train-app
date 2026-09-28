/**
 * docs/jim-brief-dublin-honest-empty-state.md — a LIVE city's `/api/board` returning a
 * well-formed board with zero trips in EVERY direction, where the provider says service should
 * genuinely be running (additive `emptyReason: "no-live-predictions"` on each direction's
 * data — set by a live-only GTFS-RT provider, e.g. lib/providers/dublin.js, when NTA's feed
 * intermittently omits a stop's stopTimeUpdate rows for a few minutes while Luas is running),
 * must read as "the feed has a gap right now", never as a bare blank board indistinguishable
 * from broken. A second reason code, `"not-currently-served"` (docs/jim-brief-prague-line-c-closure.md),
 * covers the opposite static signal — today's schedule itself expects nothing here at all (a
 * section closure, a station under reconstruction) — and carries its own `emptyReasonMessage`
 * (a ready-to-render, station-specific replacement-transport sentence) rendered verbatim instead
 * of the generic live-gap copy, which would be actively misleading (retrying can't help; the fix
 * is the named replacement transport, not a refresh).
 *
 * Part 1 (offline, no server): buildNextTrainResponse's additive `emptyReason` field — present
 * only when `upcoming` resolves empty and a reason was passed, absent (byte-identical to every
 * existing caller) otherwise.
 *
 * Part 2 (browser, via lib/fixtures.js's "live-gap"/"live-gap-partial"/"empty"/"error"
 * fixtures over Perth's /api/board — city-agnostic, since the honest empty state is shared
 * rider-facing UI, not Dublin-specific code): the title/body render for the all-directions-empty
 * live-gap case, and do NOT render for a feed error or a station with no scheduled service (the
 * existing "empty" fixture, no emptyReason). docs/jim-brief-per-direction-honest-empty.md extends
 * "live-gap-partial" to three directions and checks each one on its own: a gapped direction gets
 * its own honest copy even while a sibling direction still has a train, a direction with a train
 * renders unaffected, and a direction with no reason at all keeps the plain generic copy.
 *
 * Usage: node qa/honest-empty-state.mjs — assumes a dev server is already reachable at BASE
 * (qa/run-all.mjs's own harness when run under the smoke suite; a hand-started
 * `node dev-server.js` on :3000, or QA_BASE pointed at one, when run standalone — same
 * convention as every other browser gate in qa/, e.g. qa/reminders-dialog.mjs).
 */
import { chromium } from "playwright";
import { buildNextTrainResponse } from "../lib/train-times-core.js";
import { BASE, PERTH_GEO_CONTEXT } from "./helpers/journey-smoke.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testEmptyReasonAdditive() {
  const now = new Date("2026-09-27T11:15:00+01:00");

  const withReason = buildNextTrainResponse({
    station: "Red Cow",
    destination: "Red + Tallaght",
    destinationLabel: "Red + Tallaght",
    leaveBeforeMinutes: 0,
    refreshSeconds: 30,
    now,
    lastUpdated: now,
    upcomingTrips: [],
    timeZone: "Europe/Dublin",
    emptyReason: "no-live-predictions",
  });
  assert(withReason.next === null, "empty upcoming must still resolve next: null");
  assert(
    withReason.emptyReason === "no-live-predictions",
    `expected emptyReason to be set on a genuinely empty board, got ${JSON.stringify(withReason.emptyReason)}`
  );

  const withoutReason = buildNextTrainResponse({
    station: "Red Cow",
    destination: "Red + Tallaght",
    destinationLabel: "Red + Tallaght",
    leaveBeforeMinutes: 0,
    refreshSeconds: 30,
    now,
    lastUpdated: now,
    upcomingTrips: [],
    timeZone: "Europe/Dublin",
  });
  assert(
    !("emptyReason" in withoutReason),
    "every existing caller (no emptyReason passed) must get byte-identical output — the field must be absent, not null"
  );

  const nonEmptyBoardIgnoresReason = buildNextTrainResponse({
    station: "Abbey Street",
    destination: "Red + Tallaght",
    destinationLabel: "Red + Tallaght",
    leaveBeforeMinutes: 0,
    refreshSeconds: 30,
    now,
    lastUpdated: now,
    upcomingTrips: [
      {
        liveDeparture: new Date(now.getTime() + 5 * 60_000),
        scheduledDeparture: new Date(now.getTime() + 5 * 60_000),
        displayTime: "11:20",
        scheduledDisplayTime: "11:20",
        platform: "1",
        destination: "Red + Tallaght",
      },
    ],
    timeZone: "Europe/Dublin",
    emptyReason: "no-live-predictions",
  });
  assert(
    !("emptyReason" in nonEmptyBoardIgnoresReason),
    "a non-empty board must never carry emptyReason, even if a caller passed one"
  );

  // docs/jim-brief-prague-line-c-closure.md — a second, distinct reason code carrying its own
  // rider-facing message (emptyReasonMessage), additive/optional the same way.
  const withNotServedReason = buildNextTrainResponse({
    station: "Kačerov",
    destination: "C + Háje",
    destinationLabel: "C + Háje",
    leaveBeforeMinutes: 0,
    refreshSeconds: 30,
    now,
    lastUpdated: now,
    upcomingTrips: [],
    timeZone: "Europe/Prague",
    emptyReason: "not-currently-served",
    emptyReasonMessage:
      "No metro service at this station at the moment — line closure for track repair; replacement bus XC runs.",
  });
  assert(
    withNotServedReason.emptyReason === "not-currently-served",
    `expected emptyReason to be set on a genuinely not-served board, got ${JSON.stringify(withNotServedReason.emptyReason)}`
  );
  assert(
    withNotServedReason.emptyReasonMessage ===
      "No metro service at this station at the moment — line closure for track repair; replacement bus XC runs.",
    `expected emptyReasonMessage to be carried through verbatim, got ${JSON.stringify(withNotServedReason.emptyReasonMessage)}`
  );

  const notServedWithoutMessage = buildNextTrainResponse({
    station: "Kačerov",
    destination: "C + Háje",
    destinationLabel: "C + Háje",
    leaveBeforeMinutes: 0,
    refreshSeconds: 30,
    now,
    lastUpdated: now,
    upcomingTrips: [],
    timeZone: "Europe/Prague",
    emptyReason: "not-currently-served",
  });
  assert(
    !("emptyReasonMessage" in notServedWithoutMessage),
    "emptyReasonMessage must stay absent (not null) when a caller sets emptyReason without one — byte-identical for every existing caller"
  );

  console.log("honest-empty-state: offline — buildNextTrainResponse's emptyReason/emptyReasonMessage are additive/optional, matches malmo/terminus precedent");
}

async function readHero(page) {
  return page.evaluate(() => ({
    title: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    body: document.getElementById("hero-scheduled-time")?.textContent?.trim() ?? "",
    bodyHidden: Boolean(document.getElementById("hero-scheduled-time")?.hidden),
    error: document.getElementById("error")?.textContent?.trim() ?? "",
  }));
}

async function main() {
  testEmptyReasonAdditive();

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(PERTH_GEO_CONTEXT);
    const page = await context.newPage();
    page.on("pageerror", (e) => {
      throw new Error(`Unexpected page error: ${e.message}`);
    });

    // Case 1: every direction empty via a live feed gap — the honest empty state must render.
    await page.goto(`${BASE}/?reset=1&test=1&fixture=live-gap`);
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim() !== "",
      null,
      { timeout: 20000 }
    );
    const gap = await readHero(page);
    assert(
      gap.title === "No live predictions for this stop right now",
      `live-gap: expected the honest empty-state title, got ${JSON.stringify(gap.title)}`
    );
    assert(!gap.bodyHidden, "live-gap: expected the body explanation to be visible");
    assert(
      gap.body ===
        "Trains are running but the operator's live feed has no times for this stop at the moment. Try again in a minute or check a nearby stop.",
      `live-gap: expected the honest empty-state body copy, got ${JSON.stringify(gap.body)}`
    );

    // Case 1b: every direction empty because today's static schedule itself expects nothing here
    // (docs/jim-brief-prague-line-c-closure.md) — a distinct reason code from live-gap above, and
    // the honest empty state must render the station-specific replacement-transport message
    // verbatim, not the generic live-gap copy.
    await page.goto(`${BASE}/?reset=1&test=1&fixture=not-served`);
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim() !== "",
      null,
      { timeout: 20000 }
    );
    const notServed = await readHero(page);
    assert(
      notServed.title === "No service at this station at the moment",
      `not-served: expected the not-currently-served title, got ${JSON.stringify(notServed.title)}`
    );
    assert(!notServed.bodyHidden, "not-served: expected the body explanation to be visible");
    assert(
      notServed.body ===
        "No metro service at this station at the moment — line closure for track repair; replacement bus XC runs.",
      `not-served: expected the station-specific replacement-transport message, got ${JSON.stringify(notServed.body)}`
    );

    // Case 2 (exclusion): outside service hours / no scheduled service at all — the existing
    // "empty" fixture (no emptyReason on either direction) must keep the plain generic copy.
    await page.goto(`${BASE}/?reset=1&test=1&fixture=empty`);
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim() !== "",
      null,
      { timeout: 20000 }
    );
    const noService = await readHero(page);
    assert(
      noService.title === "No upcoming trains",
      `empty (no-service) fixture: expected the plain generic empty copy, got ${JSON.stringify(noService.title)} — must NOT show the honest empty state`
    );

    // Case 3 (docs/jim-brief-per-direction-honest-empty.md): one direction gapped, one has a
    // real train, one is plainly empty (no reason). The board auto-focuses the soonest direction
    // with a real train, so explicitly click each row to focus it and check what that specific
    // direction renders, rather than trivially relying on whichever the board focused first.
    await page.goto(`${BASE}/?reset=1&test=1&fixture=live-gap-partial`);
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim() !== "",
      null,
      { timeout: 20000 }
    );

    // 3a: focusing the gapped direction shows ITS OWN honest copy, even though another
    // direction (Green + South) still has a train — the fix this brief exists for.
    await page.locator("#nearby-directions-list button").filter({ hasText: "Red + North" }).click();
    await page.waitForFunction(
      () =>
        (document.getElementById("depart-display-time")?.textContent ?? "").trim() ===
        "No live predictions for this stop right now",
      null,
      { timeout: 20000 }
    );
    const gappedDirection = await readHero(page);
    assert(
      gappedDirection.title === "No live predictions for this stop right now",
      `live-gap-partial (focused on the gapped direction): expected the per-direction honest empty-state title, got ${JSON.stringify(gappedDirection.title)}`
    );
    assert(!gappedDirection.bodyHidden, "live-gap-partial (gapped direction): expected the body explanation to be visible");

    // 3b: focusing the direction with a real train shows the train, unaffected.
    await page.locator("#nearby-directions-list button").filter({ hasText: "Green + South" }).click();
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim().includes("Green + South"),
      null,
      { timeout: 20000 }
    );
    const trainDirection = await readHero(page);
    assert(
      trainDirection.title !== "No live predictions for this stop right now" &&
        trainDirection.title !== "No upcoming trains",
      `live-gap-partial (focused on the direction with a train): expected the train to render, got ${JSON.stringify(trainDirection.title)}`
    );

    // 3c: focusing the plainly-empty direction (no emptyReason at all) keeps the plain generic
    // copy — a direction with no reason must never borrow another direction's honest copy.
    await page.locator("#nearby-directions-list button").filter({ hasText: "Blue + West" }).click();
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim() === "No upcoming trains",
      null,
      { timeout: 20000 }
    );
    const plainDirection = await readHero(page);
    assert(
      plainDirection.title === "No upcoming trains",
      `live-gap-partial (focused on the plainly-empty direction): expected the plain generic empty copy, got ${JSON.stringify(plainDirection.title)} — must NOT borrow another direction's honest empty state`
    );

    // Case 4 (exclusion): a feed error — the existing error path, never the honest empty state.
    await page.goto(`${BASE}/?reset=1&test=1&fixture=error`);
    await page.waitForFunction(
      () => (document.getElementById("error")?.textContent ?? "").trim() !== "" ||
        (document.getElementById("depart-display-time")?.textContent ?? "").trim() !== "",
      null,
      { timeout: 20000 }
    );
    const errored = await readHero(page);
    assert(
      errored.title !== "No live predictions for this stop right now",
      `error fixture: honest empty state must NOT render on a feed error (got ${JSON.stringify(errored.title)})`
    );

    console.log(
      "honest-empty-state: browser — honest empty state renders only for the all-directions-empty " +
        "live-gap case, and never for no-service/partial-gap/feed-error"
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
