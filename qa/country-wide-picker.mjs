/**
 * Country-wide station picker (docs/jim-brief-country-wide-station-picker.md).
 * - Region select defaults to "All" for a fresh install.
 * - GET /api/country-stations returns every live region's stations for a
 *   country, tagged with region, and 400s for an unknown country.
 * - The "Choose station" combobox searches the whole country, tags
 *   cross-region matches, and selecting a station silently switches the
 *   active region (no explicit Region pick).
 *
 * Usage: node qa/country-wide-picker.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { openJourneySetup } from "./helpers/travel-library.mjs";
import { seedCountryStationsCache } from "./helpers/country-stations-fixture.mjs";

let failed = false;

function pass(id, notes) {
  console.log(`  PASS — ${id}${notes ? `: ${notes}` : ""}`);
}

function fail(id, notes) {
  failed = true;
  console.error(`  FAIL — ${id}${notes ? `: ${notes}` : ""}`);
}

async function run() {
  console.log("country-wide-picker: starting Playwright suite...");

  // This script runs last in the smoke list. Round 2 (docs/jim-brief-
  // country-wide-station-picker.md): under a full --smoke run its first
  // fetch got ECONNREFUSED even though it passes standalone — the runner's
  // shared dev-server.js had died by the time ~190 scripts ahead of it had
  // finished. ensureDevServer() here is the same self-healing discovery
  // reset-param-gated.mjs and other standalone-callable scripts already use:
  // it attaches (returns null) if the runner's server still answers on
  // BASE, or spawns a fresh one and waits for it to be ready if not — either
  // way the first fetch below only runs once something is actually live.
  const serverChild = await ensureDevServer();

  try {
  // 1. GET /api/country-stations — server contract.
  {
    const ukRes = await fetch(`${BASE}/api/country-stations?country=gb-eng`);
    const ukBody = await ukRes.json();
    const hasRegionField =
      Array.isArray(ukBody.stations) &&
      ukBody.stations.length > 0 &&
      ukBody.stations.every((s) => s.region && typeof s.region.id === "string" && typeof s.region.displayName === "string");
    const hasMultipleRegions = new Set((ukBody.stations || []).map((s) => s.region.id)).size > 1;
    if (ukRes.status === 200 && hasRegionField && hasMultipleRegions) {
      pass("country-stations gb-eng", `${ukBody.stations.length} stations across ${ukBody.regions.length} regions`);
    } else {
      fail("country-stations gb-eng", JSON.stringify({ status: ukRes.status, hasRegionField, hasMultipleRegions }));
    }

    const badRes = await fetch(`${BASE}/api/country-stations?country=zz-nowhere`);
    if (badRes.status === 400) {
      pass("country-stations unknown country -> 400");
    } else {
      fail("country-stations unknown country -> 400", `got ${badRes.status}`);
    }

    const auRes = await fetch(`${BASE}/api/country-stations?country=au`);
    const auBody = await auRes.json();
    const hasPerth = (auBody.stations || []).some((s) => s.region.id === "perth");
    if (auRes.status === 200 && hasPerth) {
      pass("country-stations au includes Perth");
    } else {
      fail("country-stations au includes Perth", `status=${auRes.status} hasPerth=${hasPerth}`);
    }
  }

  const browser = await chromium.launch({ headless: true });

  // 2. Region select defaults to "All" for a fresh install.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    await page.evaluate(() => window.NextTrainCitySession.openRegionScreen());
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const select = document.querySelector("[data-region-city]");
      return {
        value: select?.value ?? null,
        firstLabel: select?.options?.[0]?.textContent?.trim() ?? "",
        label: document.querySelector('label.region-field span')?.textContent ?? "",
      };
    });

    if (state.value === "" && state.firstLabel === "All") {
      pass("Region select defaults to All for a fresh install");
    } else {
      fail("Region select defaults to All for a fresh install", JSON.stringify(state));
    }
    await context.close();
  }

  // 3. Country-wide search, region tag, and silent region switch on selection.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    // Start on an explicit region other than Perth so a later silent switch
    // to Perth is an observable change, not a no-op. An explicit pick also
    // sets the Region select's filter to that region (brief #1), so put it
    // back on "All" the same way a rider would — via the select — before
    // searching, or the country-wide search would be narrowed to Sydney.
    await page.evaluate(async () => {
      await window.NextTrainCitySession.applyCity("sydney", { persist: true, explicit: true });
      const select = document.querySelector("[data-region-city]");
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(1500);

    await openJourneySetup(page);
    await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);

    // Opening the combobox should jump straight to search mode (brief #2).
    await page.locator("#detail-station-combobox .station-combobox-input").click();
    await page.waitForTimeout(400);

    const searchVisible = await page.evaluate(() => {
      const input = document.querySelector("#detail-station-combobox .station-combobox-search-input");
      return input && !input.hidden;
    });
    if (searchVisible) {
      pass("Opening the combobox focuses the search field directly");
    } else {
      fail("Opening the combobox focuses the search field directly");
    }

    await page.locator("#detail-station-combobox .station-combobox-search-input").fill("perth");
    await page.waitForTimeout(600);

    const query = await page.evaluate(() => {
      const options = [...document.querySelectorAll("#detail-station-combobox .station-combobox-option")];
      return options.map((el) => ({
        value: el.dataset.value,
        text: el.textContent.trim(),
        hasTag: Boolean(el.querySelector(".station-combobox-region-tag")),
      }));
    });

    const perthOption = query.find((o) => o.text.startsWith("Perth"));
    if (perthOption && perthOption.hasTag) {
      pass("Typing 'perth' under Australia surfaces a tagged Perth result", perthOption.text);
    } else {
      fail("Typing 'perth' under Australia surfaces a tagged Perth result", JSON.stringify(query));
    }

    if (perthOption) {
      await page.locator("#detail-station-combobox .station-combobox-option", { hasText: "Perth" }).first().click();
      await page.waitForTimeout(1500);

      const after = await page.evaluate(() => ({
        savedCity: window.NextTrainCitySession.readSavedCity(),
        regionFilter: window.NextTrainCitySession.readRegionFilter(),
      }));

      if (after.savedCity === "perth" && after.regionFilter === "") {
        pass("Selecting the station silently switches the active region and Region stays 'All'", JSON.stringify(after));
      } else {
        fail("Selecting the station silently switches the active region and Region stays 'All'", JSON.stringify(after));
      }
    }

    await context.close();
  }

  // 4. Upgrade regression (Round 2, Mark FAIL #1): a pre-PR install had
  // `savedCity` but no `regionExplicit` key at all (the key never existed
  // before this feature) — not `regionExplicit: false`, which is what the
  // new GPS-follow path writes. Seeding exactly that pre-PR shape must keep
  // the stored region selected, not reset to "All" on first open post-upgrade.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.evaluate(() => {
      localStorage.setItem(
        "nextTrainSettings",
        JSON.stringify({
          settingsSchemaVersion: 2,
          savedCity: "stockholm",
          savedCountry: "se",
          refreshSeconds: 60,
        })
      );
    });
    // Reload without reset=1&test=1 so runInit() re-reads the seeded,
    // pre-PR-style localStorage instead of clearing it again.
    await page.goto(`${BASE}/?fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    await page.evaluate(() => window.NextTrainCitySession.openRegionScreen());
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const select = document.querySelector("[data-region-city]");
      return {
        value: select?.value ?? null,
        explicit: window.NextTrainCitySession.readRegionExplicit(),
        savedCity: window.NextTrainCitySession.readSavedCity(),
      };
    });

    if (state.value === "stockholm" && state.explicit === true && state.savedCity === "stockholm") {
      pass("Pre-PR localStorage (savedCity, no regionExplicit key) keeps its stored region on upgrade", JSON.stringify(state));
    } else {
      fail("Pre-PR localStorage (savedCity, no regionExplicit key) keeps its stored region on upgrade", JSON.stringify(state));
    }
    await context.close();
  }

  // 5. docs/jim-brief-country-list-hides-no-live-feed-stops.md — a
  // liveFeed:false stop must never render in the country-wide "All" list,
  // in any group, or in search, even when it comes from a country-stations
  // cache written to localStorage before this fix shipped (the client must
  // filter regardless of what the server or an old cache sent).
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const glasgow = { id: "glasgow", displayName: "Glasgow" };
    await seedCountryStationsCache(page, {
      savedCity: "glasgow",
      savedCountry: "gb-sct",
      countryId: "gb-sct",
      regions: [glasgow],
      stations: [
        { name: "Kelvinhall", lat: 55.8752, lng: -4.2919, liveFeed: false, region: glasgow },
        { name: "Glasgow Central", lat: 55.8592, lng: -4.2576, liveFeed: true, region: glasgow },
      ],
    });
    // Reload without reset=1&test=1 so runInit() re-reads the seeded
    // pre-fix-style cache instead of clearing it again (same pattern as
    // case 4 above).
    await page.goto(`${BASE}/?fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    await openJourneySetup(page);
    await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);

    await page.locator("#detail-station-combobox .station-combobox-input").click();
    await page.waitForTimeout(600);

    const defaultRows = await page.evaluate(() =>
      [...document.querySelectorAll("#detail-station-combobox .station-combobox-option")].map(
        (el) => el.dataset.value
      )
    );
    if (!defaultRows.includes("Kelvinhall") && defaultRows.includes("Glasgow Central")) {
      pass("Default (no query) country-wide list omits a liveFeed:false stop but keeps a live one", JSON.stringify(defaultRows));
    } else {
      fail("Default (no query) country-wide list omits a liveFeed:false stop but keeps a live one", JSON.stringify(defaultRows));
    }

    const searchInput = page.locator("#detail-station-combobox .station-combobox-search-input");
    await searchInput.fill("kelv");
    await page.waitForTimeout(600);

    const kelvinhallMatches = await page
      .locator("#detail-station-combobox .station-combobox-option", { hasText: "Kelvinhall" })
      .count();
    const emptyStateVisible = await page
      .locator("#detail-station-combobox .station-combobox-empty")
      .isVisible()
      .catch(() => false);
    if (kelvinhallMatches === 0 && emptyStateVisible) {
      pass("Searching 'kelv' finds no match for a liveFeed:false stop (empty state shown)");
    } else {
      fail("Searching 'kelv' finds no match for a liveFeed:false stop (empty state shown)", `matches=${kelvinhallMatches} emptyStateVisible=${emptyStateVisible}`);
    }

    await searchInput.fill("glasgow c");
    await page.waitForTimeout(600);
    const glasgowCentralMatches = await page
      .locator("#detail-station-combobox .station-combobox-option", { hasText: "Glasgow Central" })
      .count();
    if (glasgowCentralMatches > 0) {
      pass("Searching still finds a live station in the same seeded cache", `matches=${glasgowCentralMatches}`);
    } else {
      fail("Searching still finds a live station in the same seeded cache", `matches=${glasgowCentralMatches}`);
    }

    await context.close();
  }

  // 6. docs/jim-brief-picker-near-you-nearest-five.md — a fresh (<30 min)
  // last-known-position cache produces exactly five "Near you" rows,
  // nearest-first, none liveFeed:false, and no geolocation call is made to
  // build them (the picker only reads the cache app.js/city-session.js's
  // existing call sites already wrote).
  {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Stub navigator.geolocation before any script runs, on every
    // navigation in this context, so a call from *anywhere* (not just the
    // picker) would be caught — then assert the count is still 0 after
    // opening "Near you".
    await context.addInitScript(() => {
      window.__geoCallCount = 0;
      const throwing = {
        getCurrentPosition: (_success, error) => {
          window.__geoCallCount += 1;
          if (typeof error === "function") {
            error(Object.assign(new Error("geolocation should not be called"), { code: 2 }));
          }
        },
        watchPosition: () => {
          window.__geoCallCount += 1;
          return 0;
        },
        clearWatch: () => {},
      };
      Object.defineProperty(navigator, "geolocation", { value: throwing, configurable: true });
    });

    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Perth Underground Stn's real coordinate (public/station-coords.json)
    // as the cached fix. Fixture stations are placed at known, increasing
    // offsets north of it so distance order is unambiguous: five liveFeed
    // stations within ~2.8km, a sixth liveFeed station further out (must be
    // excluded — only 5 rows), and two liveFeed:false decoys closer than
    // every liveFeed station (must never appear despite being nearest).
    const perth = { id: "perth", displayName: "Perth" };
    const CENTER_LAT = -31.9519389;
    const CENTER_LNG = 115.8580047;
    const offsetStation = (name, latOffsetDeg, liveFeed) => ({
      name,
      lat: CENTER_LAT + latOffsetDeg,
      lng: CENTER_LNG,
      liveFeed,
      region: perth,
    });
    const fixtureStations = [
      offsetStation("Fixture NoFeed Near", 0.003, false),
      offsetStation("Fixture NoFeed Mid", 0.008, false),
      offsetStation("Fixture Near A", 0.005, true),
      offsetStation("Fixture Near B", 0.010, true),
      offsetStation("Fixture Near C", 0.015, true),
      offsetStation("Fixture Near D", 0.020, true),
      offsetStation("Fixture Near E", 0.025, true),
      offsetStation("Fixture Far F", 0.030, true),
    ];
    const expectedOrder = ["Fixture Near A", "Fixture Near B", "Fixture Near C", "Fixture Near D", "Fixture Near E"];

    await seedCountryStationsCache(page, {
      savedCity: "perth",
      savedCountry: "au",
      countryId: "au",
      regions: [perth],
      stations: fixtureStations,
    });
    await page.evaluate(
      ({ lat, lng }) => {
        localStorage.setItem(
          "nextTrainLastKnownPosition",
          JSON.stringify({ lat, lng, timestamp: Date.now() })
        );
      },
      { lat: CENTER_LAT, lng: CENTER_LNG }
    );

    // Reload without reset=1&test=1 so runInit() re-reads the seeded cache
    // instead of clearing it again (same two-navigation shape as case 4/5).
    await page.goto(`${BASE}/?fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    // Cold boot may itself probe geolocation for GPS-follow — reset the
    // counter right before exercising the picker so this case only proves
    // the picker itself made no call.
    await page.evaluate(() => {
      window.__geoCallCount = 0;
    });

    await openJourneySetup(page);
    await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);

    await page.locator("#detail-station-combobox .station-combobox-input").click();
    await page.waitForTimeout(600);

    const nearYouState = await page.evaluate(() => {
      const headers = [...document.querySelectorAll("#detail-station-combobox .station-combobox-group-header")];
      const header = headers.find((h) => h.textContent.trim() === "Near you");
      if (!header) {
        return { found: false, rows: [], geoCallCount: window.__geoCallCount };
      }
      const rows = [];
      let node = header.nextElementSibling;
      while (node && node.classList.contains("station-combobox-option")) {
        rows.push({
          value: node.dataset.value,
          distanceKm: node.querySelector(".station-combobox-distance")?.dataset.distanceKm ?? null,
        });
        node = node.nextElementSibling;
      }
      return { found: true, rows, geoCallCount: window.__geoCallCount };
    });

    const rowNames = nearYouState.rows.map((r) => r.value);
    const distances = nearYouState.rows.map((r) => Number(r.distanceKm));
    const isAscending = distances.every((d, i) => i === 0 || d >= distances[i - 1]);
    const noDecoys = !rowNames.includes("Fixture NoFeed Near") && !rowNames.includes("Fixture NoFeed Mid");
    const noSixth = !rowNames.includes("Fixture Far F");
    const exactOrder = rowNames.join(",") === expectedOrder.join(",");

    if (
      nearYouState.found &&
      nearYouState.rows.length === 5 &&
      exactOrder &&
      isAscending &&
      noDecoys &&
      noSixth
    ) {
      pass("Near you shows the 5 nearest liveFeed stations, nearest first, from a fresh position cache", rowNames.join(", "));
    } else {
      fail(
        "Near you shows the 5 nearest liveFeed stations, nearest first, from a fresh position cache",
        JSON.stringify(nearYouState)
      );
    }

    if (nearYouState.geoCallCount === 0) {
      pass("Building the fresh-cache Near you group makes no geolocation call");
    } else {
      fail("Building the fresh-cache Near you group makes no geolocation call", `calls=${nearYouState.geoCallCount}`);
    }

    await context.close();
  }

  // 7. docs/jim-brief-picker-near-you-nearest-five.md — with no last-known-
  // position cache, "Near you" keeps today's behaviour: the single station
  // from nearby-mode's own last-resolved-station cache, not a computed
  // nearest-five. Uses the normal AU/Perth fixture boot (which resolves a
  // nearby station itself, e.g. Edgewater Stn, without ever calling real
  // geolocation) rather than a hand-seeded country catalog, so the
  // fallback's station name isn't hard-coded here.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    const resolvedNearby = await page.evaluate(() => {
      // Confirm the position cache this fix adds is genuinely absent —
      // the fixture's own nearby resolution never touches it — before
      // trusting the fallback path below.
      localStorage.removeItem("nextTrainLastKnownPosition");
      return {
        lastPos: window.nextTrainLastPosition?.read?.() ?? null,
        nearbyStation: window.nextTrainNearby?.readLastNearbyStationCache?.()?.station ?? null,
      };
    });

    await openJourneySetup(page);
    await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);

    await page.locator("#detail-station-combobox .station-combobox-input").click();
    await page.waitForTimeout(600);

    const rows = await page.evaluate(() => {
      const headers = [...document.querySelectorAll("#detail-station-combobox .station-combobox-group-header")];
      const header = headers.find((h) => h.textContent.trim() === "Near you");
      if (!header) {
        return null;
      }
      const result = [];
      let node = header.nextElementSibling;
      while (node && node.classList.contains("station-combobox-option")) {
        result.push({
          value: node.dataset.value,
          hasDistance: Boolean(node.querySelector(".station-combobox-distance")),
        });
        node = node.nextElementSibling;
      }
      return result;
    });

    const single = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (
      resolvedNearby.lastPos === null &&
      resolvedNearby.nearbyStation &&
      single &&
      single.value === resolvedNearby.nearbyStation &&
      !single.hasDistance
    ) {
      pass(
        "With no position cache, Near you keeps today's single-row behaviour (no distance shown)",
        JSON.stringify({ resolvedNearby, rows })
      );
    } else {
      fail(
        "With no position cache, Near you keeps today's single-row behaviour (no distance shown)",
        JSON.stringify({ resolvedNearby, rows })
      );
    }

    await context.close();
  }

  await browser.close();

  if (failed) {
    process.exitCode = 1;
  }
  } finally {
    stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
