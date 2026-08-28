/**
 * Reopen / foreground must request a FRESH GPS fix (maximumAge: 0) and swap
 * the Near me station as soon as that fix lands — not after the 45s travel
 * relocate timer. Cached last station still paints first (no empty flash).
 *
 * Simulates Tim’s Joondalup-line case: cache at Edgewater, stale fused geo
 * still at Edgewater, fresh position 3 stations south (Warwick).
 *
 * Usage: node qa/nearby-fresh-gps-on-reopen.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const CACHE_KEY = "nextTrainLastNearbyStation";
const EDGEWATER = { latitude: -31.7872, longitude: 115.7723 };
const WARWICK = { latitude: -31.8448271, longitude: 115.7963953 };
const JOONDALUP = { latitude: -31.7444, longitude: 115.7656 };

async function waitForNearbyStation(page, stationSubstring, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const station = await page.evaluate(
      () => window.nextTrainNearby?.getNearbySession?.()?.station ?? null
    );
    if (station && station.includes(stationSubstring)) {
      return station;
    }
    await page.waitForTimeout(150);
  }
  return null;
}

async function run() {
  let serverChild = null;
  const browser = await chromium.launch({ headless: true });
  try {
    serverChild = await ensureDevServer();
    const context = await browser.newContext({
      geolocation: EDGEWATER,
      permissions: ["geolocation"],
    });
    const page = await context.newPage();

    const pageErrors = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error?.message ?? error));
    });

    await page.addInitScript(
      ({ stale, fresh }) => {
      window.__geoCalls = [];
      window.__holdGeo = true;
      window.__pendingGeoQueue = [];
      window.__staleCoords = stale;
      window.__freshCoords = fresh;
      navigator.geolocation.getCurrentPosition = (success, _error, options) => {
        window.__geoCalls.push({
          maximumAge: options?.maximumAge,
          timeout: options?.timeout,
          enableHighAccuracy: Boolean(options?.enableHighAccuracy),
        });
        const deliver = () => {
          const coords =
            options?.maximumAge === 0 ? window.__freshCoords : window.__staleCoords;
          success({
            coords: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: 10,
              speed: null,
            },
            timestamp: Date.now(),
          });
        };
        if (window.__holdGeo) {
          window.__pendingGeoQueue.push({ deliver });
          return;
        }
        deliver();
      };
      },
      { stale: EDGEWATER, fresh: WARWICK }
    );

    await page.goto("http://localhost:3000/?reset=1&fixture=normal");
    await page.waitForTimeout(400);
    await page.evaluate(
      ({ key }) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            station: "Edgewater Stn",
            city: "perth",
            distanceKm: 0.2,
            savedAtMs: Date.now(),
          })
        );
        localStorage.setItem("nextTrainOnboardingDone", "1");
      },
      { key: CACHE_KEY }
    );
    await page.reload();
    await page.waitForFunction(
      () =>
        Boolean(window.nextTrainNearby?.getNearbySession?.()?.station) &&
        ((window.__pendingGeoQueue?.length ?? 0) > 0 || (window.__geoCalls?.length ?? 0) > 0),
      null,
      { timeout: 15000 }
    );

    const cachedPaint = await page.evaluate(() => ({
      route: document.getElementById("route")?.textContent?.trim() ?? "",
      heroCopy: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
      station: window.nextTrainNearby?.getNearbySession?.()?.station ?? null,
      locating: document.body.innerText.includes("Finding your nearest station"),
      pendingGeo: window.__pendingGeoQueue?.length ?? 0,
      geoCalls: window.__geoCalls ?? [],
    }));

    const cachePaintOk =
      String(cachedPaint.station || "").includes("Edgewater") &&
      cachedPaint.route.includes("Edgewater") &&
      !cachedPaint.locating &&
      cachedPaint.heroCopy !== "Finding your nearest station…" &&
      cachedPaint.heroCopy !== "Locating..." &&
      cachedPaint.heroCopy !== "No upcoming trains";

    const freshGpsRequestedOnLoad = cachedPaint.geoCalls.some(
      (call) => call.maximumAge === 0
    );

    const releasedAt = Date.now();
    await page.evaluate(() => {
      window.__holdGeo = false;
      for (const pending of window.__pendingGeoQueue ?? []) {
        pending.deliver();
      }
      window.__pendingGeoQueue = [];
    });

    const afterLoad = await waitForNearbyStation(page, "Warwick", 8000);
    const loadSwapMs = Date.now() - releasedAt;
    const loadSwapOk = String(afterLoad || "").includes("Warwick") && loadSwapMs < 15000;

    await page.evaluate((fresh) => {
      window.__freshCoords = fresh;
      window.__geoCalls = [];
    }, JOONDALUP);

    const resumeAt = Date.now();
    await page.evaluate(() => {
      window.nextTrainNearby.refreshNearbyOnForeground();
    });
    const afterResumeHook = await waitForNearbyStation(page, "Joondalup", 8000);
    const resumeHookMs = Date.now() - resumeAt;
    const resumeHookOk =
      String(afterResumeHook || "").includes("Joondalup") && resumeHookMs < 15000;
    const resumeHookFreshGps = await page.evaluate(() =>
      (window.__geoCalls ?? []).some((call) => call.maximumAge === 0)
    );

    await page.evaluate((fresh) => {
      window.__freshCoords = fresh;
      window.__geoCalls = [];
    }, WARWICK);
    await page.waitForTimeout(1100);

    const visibilityAt = Date.now();
    await page.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const afterVisibility = await waitForNearbyStation(page, "Warwick", 8000);
    const visibilityMs = Date.now() - visibilityAt;
    const visibilityOk =
      String(afterVisibility || "").includes("Warwick") && visibilityMs < 15000;
    const visibilityFreshGps = await page.evaluate(() =>
      (window.__geoCalls ?? []).some((call) => call.maximumAge === 0)
    );

    const loopStillRunning = await page.evaluate(
      () => window.nextTrainNearby?.isNearbyRelocateLoopScheduled?.() ?? false
    );

    if (
      cachePaintOk &&
      freshGpsRequestedOnLoad &&
      loadSwapOk &&
      resumeHookOk &&
      resumeHookFreshGps &&
      visibilityOk &&
      visibilityFreshGps &&
      loopStillRunning &&
      pageErrors.length === 0
    ) {
      console.log(
        "PASS — reopen/foreground requests a fresh GPS fix and swaps station without waiting 45s",
        { loadSwapMs, resumeHookMs, visibilityMs }
      );
    } else {
      console.error("FAIL — nearby fresh GPS on reopen", {
        cachePaintOk,
        cachedPaint,
        freshGpsRequestedOnLoad,
        afterLoad,
        loadSwapOk,
        loadSwapMs,
        resumeHookOk,
        resumeHookMs,
        resumeHookFreshGps,
        visibilityOk,
        visibilityMs,
        visibilityFreshGps,
        loopStillRunning,
        pageErrors,
      });
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
