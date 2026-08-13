/**
 * CAPACITOR-5 / CAPACITOR-7 / CAPACITOR-8 / CAPACITOR-9: API 429 must not
 * become an unhandled pageerror / Sentry crash.
 *
 * Covers:
 * - raw "Too many requests"
 * - client-mapped "Live times are busy. Trying again shortly."
 * - aggregated Near me board failure "Could not load departures for this station"
 *
 * Usage: node qa/rate-limit-no-unhandled.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, BASE } from "./helpers/dev-server.mjs";

const CRASH_RE =
  /too many requests|live times are busy|could not load departures for this station/i;
const NEARBY_CACHE_KEY = "nextTrainLastNearbyStation";

async function run() {
  const spawned = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.884, longitude: 115.803 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });

  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: { "Retry-After": "60" },
      body: JSON.stringify({ error: "Too many requests" }),
    });
  });

  await page.addInitScript(() => {
    window.__unhandled = [];
    window.addEventListener("unhandledrejection", (event) => {
      window.__unhandled.push(String(event.reason?.message ?? event.reason));
    });
  });

  // Near me cold path: cached station + directions/next-train all 429.
  // CAPACITOR-9 previously surfaced as aggregated "Could not load departures…"
  // when every direction board fetch failed under rate limit.
  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  await page.waitForTimeout(400);
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem("nextTrainOnboardingDone", "1");
      localStorage.setItem(
        key,
        JSON.stringify({
          station: "Edgewater Stn",
          distanceKm: 0.4,
          savedAtMs: Date.now(),
        })
      );
    },
    { key: NEARBY_CACHE_KEY }
  );
  await page.reload();
  await page.waitForTimeout(1000);

  await page.evaluate(async () => {
    await window.nextTrainApp?.enterNearbyMode?.();
    // Overlapping refresh forces coalesced pending refetch (fire-and-forget).
    const first = window.nextTrainApp?.fetchNextTrain?.();
    const second = window.nextTrainApp?.fetchNextTrain?.();
    await Promise.allSettled([first, second].filter(Boolean));
  });
  await page.waitForTimeout(800);

  // Journey mode + configured journey so fetchNextTrain hits /api/next-train.
  await page.evaluate(() => {
    const settings = {
      leaveBeforeMinutes: 10,
      refreshSeconds: 30,
      activeJourneyId: "j1",
      journeys: [
        {
          id: "j1",
          name: "Morning",
          station: "Edgewater Stn",
          direction: "Perth",
          leaveBeforeMinutes: 10,
          remindDays: [1, 2, 3, 4, 5],
          templateKey: "morning",
        },
      ],
    };
    localStorage.setItem("nextTrainSettings", JSON.stringify(settings));
  });
  await page.reload();
  await page.waitForTimeout(800);

  await page.evaluate(async () => {
    await window.nextTrainApp?.enterJourneyMode?.();
    await window.nextTrainApp?.fetchNextTrain?.();
  });
  await page.waitForTimeout(400);

  // Leave-buffer settings opener previously lacked .catch().
  await page.evaluate(() => {
    document.getElementById("leave-buffer-edit-btn")?.click();
  });
  await page.waitForTimeout(400);

  // Template create path can call directions under rate limit.
  await page.evaluate(async () => {
    await window.nextTrainApp?.openJourneys?.();
  });
  await page.waitForTimeout(300);
  const eveningChip = page.locator('.journey-template-chip[data-template="evening"]');
  if (await eveningChip.count()) {
    await eveningChip.click({ force: true });
    await page.waitForTimeout(800);
  }

  // Re-open list so custom chip is interactable after evening wizard.
  await page.evaluate(async () => {
    await window.nextTrainApp?.openJourneys?.();
  });
  await page.waitForTimeout(300);
  const customChip = page.locator('.journey-template-chip[data-template="custom"]:not([hidden])');
  if (await customChip.count()) {
    await customChip.click({ force: true });
    await page.waitForTimeout(1000);
  }

  const unhandled = await page.evaluate(() => window.__unhandled || []);

  // pageerror / unhandledrejection are what Sentry GlobalHandlers capture.
  // Browser network console lines for 429 are expected under this mock.
  const crashPage = pageErrors.filter((msg) => CRASH_RE.test(msg));
  const crashUnhandled = unhandled.filter((msg) => CRASH_RE.test(msg));

  await browser.close();
  if (spawned) {
    spawned.kill("SIGTERM");
  }

  if (crashPage.length || crashUnhandled.length) {
    console.error("FAIL: rate-limit / board-unavailable message escaped as unhandled error", {
      pageErrors,
      unhandled,
    });
    process.exit(1);
  }

  console.log("PASS: 429 / Near me board failures did not surface unhandled crash messages", {
    pageErrors,
    unhandled,
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
