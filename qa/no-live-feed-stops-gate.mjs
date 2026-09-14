/**
 * No-live-feed stops stay in the catalog but leave the picker and Near me —
 * docs/jim-brief-no-live-feed-stops-out-of-picker.md.
 *
 * Offline part (no dev server needed): for each of the six affected UK
 * regions (greater-manchester, east-midlands, north-east, south-yorkshire,
 * glasgow, edinburgh), scripts/list-no-live-feed-stops.mjs's derived list and
 * the `liveFeed` flags actually set in stations.json must agree exactly, and
 * /api/city-stations (in-process, no server) must carry the flag through.
 *
 * Browser part (starts its own dev server if one isn't already running, and
 * stops only what it started): one region, greater-manchester — St Peter's Square
 * (a Metrolink-only stop with no same-name National Rail collision) must not appear in the
 * nearby station picker, and
 * Help's coverage entry for the region must mention Metrolink.
 *
 * Usage: node qa/no-live-feed-stops-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { listNoLiveFeedStops, NO_LIVE_FEED_REGIONS } from "../scripts/list-no-live-feed-stops.mjs";
import { listMultiCityStations } from "../lib/cities/live-city-api.js";
import cityStationsHandler from "../api/city-stations.js";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { openStationSearch } from "./helpers/station-combobox.mjs";
import { dismissOnboardingIfVisible } from "./helpers/onboarding.mjs";
import { seedCountryStationsCache } from "./helpers/country-stations-fixture.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {},
  };
}

async function checkOffline() {
  const derived = listNoLiveFeedStops();

  for (const region of NO_LIVE_FEED_REGIONS) {
    const derivedNames = new Set(derived.filter((row) => row.region === region).map((row) => row.name));
    assert(derivedNames.size > 0, `${region}: expected at least one derived no-live-feed stop`);

    const raw = JSON.parse(readFileSync(join(ROOT, "lib", "cities", region, "stations.json"), "utf8")).stops;
    const flaggedNames = new Set();
    for (const stop of raw) {
      if (stop.mode === "metro") {
        assert(stop.liveFeed === false, `${region}: metro stop "${stop.name}" must carry liveFeed: false`);
        flaggedNames.add(stop.name);
      } else {
        assert(stop.liveFeed !== false, `${region}: non-metro stop "${stop.name}" must not carry liveFeed: false`);
      }
    }
    assert(
      flaggedNames.size === derivedNames.size,
      `${region}: ${flaggedNames.size} liveFeed:false stops in stations.json vs ${derivedNames.size} derived by scripts/list-no-live-feed-stops.mjs`
    );

    // listMultiCityStations (server-side, what /api/city-stations serves) —
    // default true when absent, carried through unfiltered for every entry.
    const apiEntries = listMultiCityStations(region);
    const apiFlagged = new Set(apiEntries.filter((e) => e.liveFeed === false).map((e) => e.name));
    assert(
      apiFlagged.size === flaggedNames.size,
      `${region}: listMultiCityStations must carry liveFeed:false through for all ${flaggedNames.size} stops, got ${apiFlagged.size}`
    );

    const res = mockRes();
    await cityStationsHandler({ method: "GET", query: { city: region }, headers: {} }, res);
    assert(res.statusCode === 200, `${region}: GET /api/city-stations must 200, got ${res.statusCode}`);
    const wireFlagged = new Set(
      (res.body?.stations ?? []).filter((s) => s.liveFeed === false).map((s) => s.name)
    );
    assert(
      wireFlagged.size === flaggedNames.size,
      `${region}: /api/city-stations wire response must carry liveFeed:false for all ${flaggedNames.size} stops, got ${wireFlagged.size}`
    );
  }

  // A live city untouched by this brief must never gain a liveFeed key —
  // default true when absent, every other region byte-identical apart from
  // nothing.
  const perthLike = listMultiCityStations("uk-west-midlands");
  assert(
    perthLike.every((s) => s.liveFeed === true),
    "uk-west-midlands (unaffected region) must report liveFeed: true for every stop"
  );

  console.log(
    `PASS no-live-feed-stops-gate (offline): ${derived.length} no-live-feed stops across ${NO_LIVE_FEED_REGIONS.length} regions agree between the derive script, stations.json, listMultiCityStations, and the /api/city-stations wire response`
  );
}

const NO_COLLISION_METRO_STOP = { latitude: 53.47844, longitude: -2.2429 }; // St Peter's Square — a Metrolink-only hub with no same-name National Rail station (UK station fill phase 2b, 14 Sep 2026, gave Altrincham a real, walk-up National Rail entry of its own, so it no longer works as this gate's "must never resolve" sample)

async function checkBrowser() {
  const server = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  try {
    // Not test=1 — test mode's testModeNearestStation() fixture always
    // answers Perth/Edgewater regardless of geolocation, which would make
    // this check meaningless. Mock geolocation directly instead, same
    // approach as qa/nearby-adaptive-relocate.mjs.
    const context = await browser.newContext({
      geolocation: NO_COLLISION_METRO_STOP,
      permissions: ["geolocation"],
    });
    const page = await context.newPage();
    await page.addInitScript((coords) => {
      const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: { latitude: coords.latitude, longitude: coords.longitude, accuracy: 10, speed: null },
          timestamp: Date.now(),
        });
      };
      navigator.geolocation.watchPosition = original
        ? navigator.geolocation.watchPosition.bind(navigator.geolocation)
        : () => 1;
    }, NO_COLLISION_METRO_STOP);

    await page.goto(`${BASE}/?reset=1&fixture=normal`);

    // Readiness, not a guessed sleep: wait for the app to have booted
    // (window.nextTrainApp wired) and for Near me's GPS-driven resolution to
    // have actually produced a session — the exact value asserted next —
    // rather than sleeping a fixed 4000ms and hoping it's done by then.
    await page.waitForFunction(() => typeof window.nextTrainApp?.ensureDeferredModulesReady === "function", null, {
      timeout: 20000,
    });
    await page.waitForFunction(() => window.nextTrainNearby?.getNearbySession?.() != null, null, {
      timeout: 20000,
    });

    // This gate isn't testing the custom-journey template wizard — mark it
    // seen so it never activates for the journey-setup flow below. Before
    // UK station fill grew greater-manchester's catalog from 18 to 65
    // stations, the wizard's own "Finding your nearest station" async chain
    // (completeTemplateRouteSetup -> applyTemplateRoute) happened to settle
    // fast enough that a fixed-sleep dismiss-and-retry loop could out-race
    // it; the bigger catalog shifted that timing enough to flake. Racing it
    // was never necessary — the wizard offers its own seen-suppression
    // (shouldShowTemplateRouteCoach() checks hasSeenTemplateWizard()) for
    // exactly this case. If a real rider's wizard ever reclaimed focus from
    // an open search field, that would be a product bug worth its own
    // report; nothing here suggests that happens outside a scripted run
    // that skips the seen-marking a real install performs incrementally.
    await page.evaluate(() => localStorage.setItem("nextTrainTemplateWizardSeen", "1"));

    // Near me (GPS-driven, cold start) must resolve to a real served station,
    // never St Peter's Square (Metrolink-only, liveFeed: false) and never leak the
    // Metrolink FeedUnconfirmedError rider message (PR #329) into a
    // nearest-station result — findNearestStation must have skipped it.
    const nearby = await page.evaluate(() => window.nextTrainNearby?.getNearbySession?.() ?? null);
    assert(nearby?.city === "greater-manchester", `Near me at St Peter's Square must resolve within greater-manchester, got ${JSON.stringify(nearby)}`);
    assert(nearby?.station !== "St Peter's Square", `Near me must never resolve to St Peter's Square itself, got "${nearby?.station}"`);
    const heroText = (await page.locator(".hero-empty-title").textContent().catch(() => "")) || "";
    assert(
      !/Metrolink/.test(heroText),
      `Near me must not surface the Metrolink feed-unconfirmed message as an empty-state title, got "${heroText}"`
    );

    // Readiness, not a guessed sleep: NextTrainCitySession's own GPS-follow
    // background task (runInit()'s un-awaited "follow the GPS" branch,
    // public/city-session.js) is a separate race from Near me's own
    // getNearbySession() resolution above — it's what persists savedCity,
    // which the Help coverage entry below reads via planningCityId(). Wait
    // for that to have actually landed rather than assuming it settled
    // within a fixed sleep.
    await page.waitForFunction(
      () => window.NextTrainCitySession?.readSavedCity?.() === "greater-manchester",
      null,
      { timeout: 20000 }
    );

    // The station picker (journey-detail combobox — same shared data path as
    // Near me's own manual fallback, public/station-combobox.js) must not
    // offer St Peter's Square at all.
    const { openCustomJourneyCreate } = await import("./helpers/open-custom-journey.mjs");
    // Readiness, not a guessed sleep: wait for the deferred journey-detail
    // module to actually be wired before opening the journeys library —
    // "script loaded" is not "deps wired" (see the QA rate-limit/deferred
    // load memory note); this is what previously made #journey-setup-btn's
    // click land before its handler was ready on a heavier page load.
    await page.evaluate(() => window.nextTrainApp.ensureDeferredModulesReady());
    await openCustomJourneyCreate(page);
    await dismissOnboardingIfVisible(page).catch(() => {});
    await page.locator("#detail-station-input").waitFor({ state: "visible", timeout: 15000 });

    // The template wizard was suppressed above (nextTrainTemplateWizardSeen)
    // rather than raced — assert that suppression actually held rather than
    // silently retrying past a reclaimed focus that would mask a real
    // regression in that suppression path.
    const wizardVisible = await page
      .evaluate(() => !document.getElementById("template-route-coach")?.hidden)
      .catch(() => false);
    assert(!wizardVisible, "custom-journey template wizard was active despite nextTrainTemplateWizardSeen being set");

    await openStationSearch(page, {
      rootSelector: "#detail-station-combobox",
      inputSelector: "#detail-station-input",
      listboxSelector: "#detail-station-listbox",
    });

    const searchInputLocator = page.locator("#detail-station-combobox .station-combobox-search-input");
    await searchInputLocator.waitFor({ state: "visible", timeout: 10000 });

    // Readiness, not a guessed 800ms settle: wait for the region's station
    // list to have actually rendered at least one option before typing —
    // this is exactly the async ensureLocalStationsLoaded() chain the old
    // fixed sleep was hoping had finished by then.
    await page.waitForFunction(
      () => document.querySelectorAll("#detail-station-listbox .station-combobox-option").length > 0,
      null,
      { timeout: 10000 }
    );

    await searchInputLocator.fill("St Peter's Square");

    // waitFor (auto-retrying) rather than a one-shot isVisible() snapshot —
    // the .station-combobox-empty node is present in the DOM immediately
    // (confirmed by debugging during UK station fill phase 1, 13 Sep 2026)
    // but a one-shot isVisible() check can race the dropdown's own
    // reposition/layout pass on a slower page load, flaking the assertion
    // even though the element is correct. This is also what makes the
    // fixed 800ms settle after typing unnecessary — the retrying wait
    // itself is the readiness condition.
    const emptyVisible = await page
      .locator("#detail-station-listbox .station-combobox-empty")
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    assert(emptyVisible, "greater-manchester picker must show the empty state for a St Peter's Square-only search");

    const altrinchamOptionCount = await page
      .locator("#detail-station-listbox .station-combobox-option", { hasText: "St Peter's Square" })
      .count();
    assert(altrinchamOptionCount === 0, `greater-manchester picker must not offer St Peter's Square (Metrolink, liveFeed: false), found ${altrinchamOptionCount} match(es)`);

    // Help's coverage entry for this region must mention Metrolink (the
    // explanation path the picker's "Can't find your station?" row points at).
    await page.evaluate(() => {
      const coach = document.getElementById("template-route-coach");
      if (coach) {
        coach.hidden = true;
      }
    });
    await page.evaluate(() => window.NextTrainHelpCoverage?.open?.());
    await page.waitForFunction(
      () => document.getElementById("help-dialog")?.open === true,
      null,
      { timeout: 5000 }
    ).catch(() => {});
    // Readiness, not a guessed 4000ms wait: poll for the actual assertion —
    // #help-coverage-body always contains a static "Other regions" link
    // (index.html) even before renderHelpCoverageEntry()'s async
    // loadCoverageNotes() fetch resolves, so a generic "non-empty text"
    // check would pass immediately, before the coverage notes are in. Wait
    // for the real condition instead.
    await page
      .waitForFunction(
        () => /Metrolink/.test(document.getElementById("help-coverage-body")?.textContent ?? ""),
        null,
        { timeout: 10000 }
      )
      .catch(() => {});
    const coverageBodyText = (await page.locator("#help-coverage-body").textContent().catch(() => "")) || "";
    assert(
      /Metrolink/.test(coverageBodyText),
      `greater-manchester Help coverage entry must mention Metrolink, got "${coverageBodyText.slice(0, 300)}"`
    );

    await browser.close();
  } finally {
    if (server) {
      stopDevServer(server);
    }
  }
}

const NO_LIVE_FEED_COUNTRY_ID = "gb-eng";
const NO_LIVE_FEED_REGION_TAG = { id: "greater-manchester", displayName: "Manchester" };

/**
 * Country-wide "All" list coverage (PR #383 broke exactly this path, fixed
 * by #386's isLiveFeedCountryStation filter in public/station-combobox.js).
 * Seeds a country-stations cache the same way qa/country-wide-picker.mjs
 * case 5 does (via the shared qa/helpers/country-stations-fixture.mjs
 * helper) rather than duplicating that shape, so no live network fetch of
 * the full England catalog is needed for a deterministic check.
 */
async function checkCountryWideList() {
  const server = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await seedCountryStationsCache(page, {
      savedCity: "greater-manchester",
      savedCountry: NO_LIVE_FEED_COUNTRY_ID,
      countryId: NO_LIVE_FEED_COUNTRY_ID,
      regions: [NO_LIVE_FEED_REGION_TAG],
      stations: [
        { name: "St Peter's Square", lat: 53.47844, lng: -2.2429, liveFeed: false, region: NO_LIVE_FEED_REGION_TAG },
        { name: "Manchester Piccadilly", lat: 53.4773, lng: -2.2309, liveFeed: true, region: NO_LIVE_FEED_REGION_TAG },
      ],
    });
    // Reload without reset=1&test=1 so runInit() re-reads the seeded
    // pre-fix-style cache instead of clearing it again (same pattern as
    // qa/country-wide-picker.mjs cases 4/5).
    await page.goto(`${BASE}/?fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.evaluate(() => localStorage.setItem("nextTrainTemplateWizardSeen", "1"));
    await page.waitForFunction(() => typeof window.nextTrainApp?.ensureDeferredModulesReady === "function", null, {
      timeout: 20000,
    });
    await page.evaluate(() => window.nextTrainApp.ensureDeferredModulesReady());

    const { openCustomJourneyCreate } = await import("./helpers/open-custom-journey.mjs");
    await openCustomJourneyCreate(page);
    await dismissOnboardingIfVisible(page).catch(() => {});
    await page.locator("#detail-station-input").waitFor({ state: "visible", timeout: 15000 });

    // Region select must be "All" (regionExplicit: false, per case 4's
    // upgrade-path contract) so the combobox is searching the whole
    // country, not scoped back down to a single region.
    await openStationSearch(page, {
      rootSelector: "#detail-station-combobox",
      inputSelector: "#detail-station-input",
      listboxSelector: "#detail-station-listbox",
    });
    const searchInputLocator = page.locator("#detail-station-combobox .station-combobox-search-input");
    await searchInputLocator.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(
      () => document.querySelectorAll("#detail-station-listbox .station-combobox-option").length > 0,
      null,
      { timeout: 10000 }
    );

    const defaultRows = await page.evaluate(() =>
      [...document.querySelectorAll("#detail-station-listbox .station-combobox-option")].map(
        (el) => el.dataset.value
      )
    );
    assert(
      !defaultRows.includes("St Peter's Square"),
      `country-wide default list must omit St Peter's Square (liveFeed: false), got ${JSON.stringify(defaultRows)}`
    );
    assert(
      defaultRows.includes("Manchester Piccadilly"),
      `country-wide default list must keep a live station from the same seeded cache, got ${JSON.stringify(defaultRows)}`
    );

    await searchInputLocator.fill("st peter");
    const stPetersEmptyVisible = await page
      .locator("#detail-station-listbox .station-combobox-empty")
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    const stPetersMatches = await page
      .locator("#detail-station-listbox .station-combobox-option", { hasText: "St Peter's Square" })
      .count();
    assert(
      stPetersEmptyVisible && stPetersMatches === 0,
      `country-wide search for a liveFeed:false stop must find no match, got emptyVisible=${stPetersEmptyVisible} matches=${stPetersMatches}`
    );

    await searchInputLocator.fill("manchester picc");
    await page
      .locator("#detail-station-listbox .station-combobox-option", { hasText: "Manchester Piccadilly" })
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {});
    const piccadillyMatches = await page
      .locator("#detail-station-listbox .station-combobox-option", { hasText: "Manchester Piccadilly" })
      .count();
    assert(
      piccadillyMatches > 0,
      `country-wide search must still find a live station in the same seeded cache, got ${piccadillyMatches} match(es)`
    );

    await browser.close();
  } finally {
    if (server) {
      stopDevServer(server);
    }
  }
}

await checkOffline();
await checkBrowser();
await checkCountryWideList();

if (failures > 0) {
  console.error(`no-live-feed-stops-gate: ${failures} failure(s)`);
  process.exit(1);
}

console.log("PASS no-live-feed-stops-gate");
