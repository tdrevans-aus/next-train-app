/**
 * docs/jim-brief-dublin-honest-empty-state.md — a LIVE city's `/api/board` returning a
 * well-formed board with zero trips in EVERY direction, where the provider says service should
 * genuinely be running (additive `emptyReason: "no-live-predictions"` on each direction's
 * data — set by a live-only GTFS-RT provider, e.g. lib/providers/dublin.js, when NTA's feed
 * intermittently omits a stop's stopTimeUpdate rows for a few minutes while Luas is running),
 * must read as "the feed has a gap right now", never as a bare blank board indistinguishable
 * from broken.
 *
 * Part 1 (offline, no server): buildNextTrainResponse's additive `emptyReason` field — present
 * only when `upcoming` resolves empty and a reason was passed, absent (byte-identical to every
 * existing caller) otherwise.
 *
 * Part 2 (browser, via lib/fixtures.js's "live-gap"/"live-gap-partial"/"empty"/"error"
 * fixtures over Perth's /api/board — city-agnostic, since the honest empty state is shared
 * rider-facing UI, not Dublin-specific code): the title/body render for the all-directions-empty
 * live-gap case, and do NOT render for the three excluded cases — a feed error, a station with
 * no scheduled service (the existing "empty" fixture, no emptyReason), and a station where only
 * one of two directions is gapped while the other still has a train.
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

  console.log("honest-empty-state: offline — buildNextTrainResponse's emptyReason is additive/optional, matches malmo/terminus precedent");
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

    // Case 3 (exclusion): one direction gapped, the other has a real train — station-wide honest
    // state must not fire just because the currently-focused direction happens to be empty.
    // The board auto-focuses the soonest direction with a real train, so explicitly click the
    // gapped direction's own row to focus it and prove the exclusion, rather than trivially
    // passing because the board never focused the empty one in the first place.
    await page.goto(`${BASE}/?reset=1&test=1&fixture=live-gap-partial`);
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim() !== "",
      null,
      { timeout: 20000 }
    );
    await page.locator("#nearby-directions-list button").filter({ hasText: "Red + North" }).click();
    await page.waitForFunction(
      () => (document.getElementById("depart-display-time")?.textContent ?? "").trim() === "No upcoming trains",
      null,
      { timeout: 20000 }
    );
    const partial = await readHero(page);
    assert(
      partial.title === "No upcoming trains",
      `live-gap-partial (focused on the gapped direction): expected the plain generic empty copy, got ${JSON.stringify(partial.title)} — honest empty state must NOT render while another direction still has a train`
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
