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
 * stops only what it started): one region, greater-manchester — Altrincham
 * (a Metrolink-only stop) must not appear in the nearby station picker, and
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

const ALTRINCHAM = { latitude: 53.3877, longitude: -2.3475 };

async function checkBrowser() {
  const server = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  try {
    // Not test=1 — test mode's testModeNearestStation() fixture always
    // answers Perth/Edgewater regardless of geolocation, which would make
    // this check meaningless. Mock geolocation directly instead, same
    // approach as qa/nearby-adaptive-relocate.mjs.
    const context = await browser.newContext({
      geolocation: ALTRINCHAM,
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
    }, ALTRINCHAM);

    await page.goto(`${BASE}/?reset=1&fixture=normal`);
    await page.waitForTimeout(4000);

    // Near me (GPS-driven, cold start) must resolve to a real served station,
    // never Altrincham (Metrolink-only, liveFeed: false) and never leak the
    // Metrolink FeedUnconfirmedError rider message (PR #329) into a
    // nearest-station result — findNearestStation must have skipped it.
    const nearby = await page.evaluate(() => window.nextTrainNearby?.getNearbySession?.() ?? null);
    assert(nearby?.city === "greater-manchester", `Near me at Altrincham must resolve within greater-manchester, got ${JSON.stringify(nearby)}`);
    assert(nearby?.station !== "Altrincham", `Near me must never resolve to Altrincham itself, got "${nearby?.station}"`);
    const heroText = (await page.locator(".hero-empty-title").textContent().catch(() => "")) || "";
    assert(
      !/Metrolink/.test(heroText),
      `Near me must not surface the Metrolink feed-unconfirmed message as an empty-state title, got "${heroText}"`
    );

    // The station picker (journey-detail combobox — same shared data path as
    // Near me's own manual fallback, public/station-combobox.js) must not
    // offer Altrincham at all.
    const { openCustomJourneyCreate } = await import("./helpers/open-custom-journey.mjs");
    await openCustomJourneyCreate(page);
    await page.waitForTimeout(500);
    await dismissOnboardingIfVisible(page).catch(() => {});
    await page.locator("#detail-station-input").waitFor({ state: "visible", timeout: 15000 });

    // UK station fill phase 2a (14 Sep 2026): greater-manchester's catalog grew from 18 to 65
    // stations, shifting this page's load timing enough that the CUSTOM-JOURNEY TEMPLATE WIZARD
    // (#template-route-coach, isTemplateWizardActive() — a different dialog from the general
    // #onboarding-coach dismissOnboardingIfVisible() already handles) now sometimes activates a
    // few hundred ms after openStationSearch() returns, reclaiming focus and hiding the search
    // row it just opened. Dismiss it (same button qa/repros/custom-template-no-wizard-repro.mjs
    // uses) before and retry opening search until the input stays visible.
    async function dismissTemplateWizardIfVisible() {
      for (let step = 0; step < 6; step++) {
        const visible = await page
          .evaluate(() => !document.getElementById("template-route-coach")?.hidden)
          .catch(() => false);
        if (!visible) return;
        await page.locator("#template-wizard-primary-btn").click().catch(() => {});
        await page.waitForTimeout(200);
      }
    }

    const searchInputLocator = page.locator("#detail-station-combobox .station-combobox-search-input");
    let searchOpen = false;
    for (let attempt = 0; attempt < 5 && !searchOpen; attempt++) {
      await dismissTemplateWizardIfVisible();
      await openStationSearch(page, {
        rootSelector: "#detail-station-combobox",
        inputSelector: "#detail-station-input",
        listboxSelector: "#detail-station-listbox",
      });
      await dismissOnboardingIfVisible(page).catch(() => {});
      await dismissTemplateWizardIfVisible();
      searchOpen = await searchInputLocator
        .waitFor({ state: "visible", timeout: 2000 })
        .then(() => true)
        .catch(() => false);
    }
    assert(searchOpen, "greater-manchester station search input never stayed open (template wizard kept reclaiming it)");

    // Extra settle time before typing (13 Sep 2026, UK station fill phase 1): entering search
    // mode kicks off an async ensureLocalStationsLoaded() chain that re-renders the list and
    // re-focuses the search input once it resolves; on a heavier page load that resolution can
    // land AFTER a fast scripted .fill(), clobbering the typed query back to unfiltered and
    // racing focus/blur. Waiting for that chain to settle first avoids it.
    await page.waitForTimeout(800);
    await searchInputLocator.waitFor({ state: "visible", timeout: 5000 });
    await searchInputLocator.fill("Altrincham");
    await page.waitForTimeout(800);
    const altrinchamOptionCount = await page
      .locator("#detail-station-listbox .station-combobox-option", { hasText: "Altrincham" })
      .count();
    assert(altrinchamOptionCount === 0, `greater-manchester picker must not offer Altrincham (Metrolink, liveFeed: false), found ${altrinchamOptionCount} match(es)`);
    // waitFor (auto-retrying) rather than a one-shot isVisible() snapshot —
    // the .station-combobox-empty node is present in the DOM immediately
    // (confirmed by debugging during UK station fill phase 1, 13 Sep 2026)
    // but a one-shot isVisible() check can race the dropdown's own
    // reposition/layout pass on a slower page load, flaking the assertion
    // even though the element is correct. This does not change what is
    // asserted, only how patiently it's checked for.
    // waitFor (auto-retrying) rather than a one-shot isVisible() snapshot —
    // more tolerant of the dropdown's own reposition/layout pass than a
    // single synchronous check, without changing what is asserted.
    const emptyVisible = await page
      .locator("#detail-station-listbox .station-combobox-empty")
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    assert(emptyVisible, "greater-manchester picker must show the empty state for an Altrincham-only search");

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
    await page.waitForTimeout(4000);
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

await checkOffline();
await checkBrowser();

if (failures > 0) {
  console.error(`no-live-feed-stops-gate: ${failures} failure(s)`);
  process.exit(1);
}

console.log("PASS no-live-feed-stops-gate");
