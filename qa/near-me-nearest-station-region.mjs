/**
 * Near me: the nearest live-feed station decides the region, not the first
 * CITY_BOUNDS box (docs/jim-brief-near-me-nearest-station-region.md).
 *
 * hintCityFromCoords() picked the first CITY_BOUNDS box that contained the
 * rider — wrong wherever regions overlap. Central London: uk-london-tfl is
 * listed before london-se-national-rail, so a rider at King's Cross,
 * Waterloo or Victoria was hinted the Tube region even standing at a
 * National Rail terminus. Near me now resolves the region from the nearest
 * live-feed station across every live region in the rider's country
 * (hintCityFromNearestStation, fed the /api/country-stations shape via
 * app.js's resolveRegionHintFromCoords), falling back to the box hint only
 * when no live station is close enough or the country list isn't available.
 *
 * Six cases (all via window.nextTrainApp.findNearestStation({ followGps:
 * true }), the exact function Near me itself calls — no live geolocation,
 * Playwright's mocked context.setGeolocation stands in):
 *   1. King's Cross    -> london-se-national-rail (board: King's Cross)
 *   2. Bank             -> uk-london-tfl
 *   3. Cheshunt         -> rest-of-england
 *   4. Burnham-on-Crouch -> greater-anglia
 *   5. 40 km from every seeded station -> falls back to the first-box hint
 *      (uk-london-tfl, the first CITY_BOUNDS entry containing that point)
 *   6. An explicit region pick survives boot even with a GPS fix that would
 *      otherwise hint a different region.
 *
 * Usage: node qa/near-me-nearest-station-region.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { seedCountryStationsCache } from "./helpers/country-stations-fixture.mjs";

let failed = false;

function pass(id, notes) {
  console.log(`  PASS — ${id}${notes ? `: ${notes}` : ""}`);
}

function fail(id, notes) {
  failed = true;
  console.error(`  FAIL — ${id}${notes ? `: ${notes}` : ""}`);
}

// Real, catalogued coordinates (lib/cities/<region>/{stations,stops}.json) so
// the nearest-station-within-region lookup that follows region resolution
// finds exactly the fixture station, not some other real nearby stop.
const KINGS_CROSS = { latitude: 51.5308, longitude: -0.1238 };
const BANK = { latitude: 51.5133, longitude: -0.0886 };
const CHESHUNT = { latitude: 51.7027, longitude: -0.0243 };
const BURNHAM = { latitude: 51.633526, longitude: 0.813459 };
// ~40 km from every seeded station above, but still inside uk-london-tfl's
// own CITY_BOUNDS box (51.28–51.7 lat, -0.52–0.35 lng) — the first box in
// object order that contains it, so a correct fallback lands here.
const FAR_FROM_ANY_STATION = { latitude: 51.3, longitude: -0.5 };

const LONDON_SE_NATIONAL_RAIL = { id: "london-se-national-rail", displayName: "London & South East National Rail" };
const UK_LONDON_TFL = { id: "uk-london-tfl", displayName: "London" };
const REST_OF_ENGLAND = { id: "rest-of-england", displayName: "Rest of England" };
const GREATER_ANGLIA = { id: "greater-anglia", displayName: "East Anglia" };

const FIXTURE_STATIONS = [
  { name: "London King's Cross", lat: KINGS_CROSS.latitude, lng: KINGS_CROSS.longitude, liveFeed: true, region: LONDON_SE_NATIONAL_RAIL },
  { name: "Bank", lat: BANK.latitude, lng: BANK.longitude, liveFeed: true, region: UK_LONDON_TFL },
  { name: "Cheshunt", lat: CHESHUNT.latitude, lng: CHESHUNT.longitude, liveFeed: true, region: REST_OF_ENGLAND },
  { name: "Burnham-on-Crouch", lat: BURNHAM.latitude, lng: BURNHAM.longitude, liveFeed: true, region: GREATER_ANGLIA },
];

async function findNearestAt(page, context, { latitude, longitude }) {
  await context.setGeolocation({ latitude, longitude });
  return page.evaluate(async () => {
    try {
      const nearest = await window.nextTrainApp.findNearestStation({
        followGps: true,
        forceFresh: true,
        allowSessionShortcut: false,
        maximumAge: 0,
      });
      return { ok: true, nearest };
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error), code: error?.code ?? null };
    }
  });
}

async function run() {
  const serverChild = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  try {
    // Cases 1–5: one context, one seeded country-stations cache covering all
    // four fixture stations, non-explicit region so the resolver is free to
    // hint whatever it likes.
    {
      const context = await browser.newContext({
        geolocation: KINGS_CROSS,
        permissions: ["geolocation"],
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/?fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(500);
      await seedCountryStationsCache(page, {
        savedCity: "uk-london-tfl",
        savedCountry: "gb-eng",
        countryId: "gb-eng",
        regions: [LONDON_SE_NATIONAL_RAIL, UK_LONDON_TFL, REST_OF_ENGLAND, GREATER_ANGLIA],
        stations: FIXTURE_STATIONS,
      });
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);

      const cases = [
        { id: "King's Cross -> london-se-national-rail", coords: KINGS_CROSS, expectCity: "london-se-national-rail", expectStationIncludes: "King's Cross" },
        { id: "Bank -> uk-london-tfl", coords: BANK, expectCity: "uk-london-tfl", expectStationIncludes: "Bank" },
        { id: "Cheshunt -> rest-of-england", coords: CHESHUNT, expectCity: "rest-of-england", expectStationIncludes: "Cheshunt" },
        { id: "Burnham-on-Crouch -> greater-anglia", coords: BURNHAM, expectCity: "greater-anglia", expectStationIncludes: "Burnham-on-Crouch" },
        { id: "40 km from any station falls back to the first-box hint (uk-london-tfl)", coords: FAR_FROM_ANY_STATION, expectCity: "uk-london-tfl", expectStationIncludes: null },
      ];

      for (const testCase of cases) {
        const result = await findNearestAt(page, context, testCase.coords);
        const cityOk = result.ok && result.nearest?.city === testCase.expectCity;
        const stationOk =
          !testCase.expectStationIncludes ||
          (result.ok && String(result.nearest?.station || "").includes(testCase.expectStationIncludes));
        if (cityOk && stationOk) {
          pass(testCase.id, JSON.stringify(result.nearest));
        } else {
          fail(testCase.id, JSON.stringify(result));
        }
      }

      await context.close();
    }

    // Case 6: an explicit region pick is not overridden by the hint, even
    // with a GPS fix (and a seeded country-stations list) that would
    // otherwise resolve to a different region.
    {
      const context = await browser.newContext({
        geolocation: KINGS_CROSS,
        permissions: ["geolocation"],
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/?fixture=normal`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(500);
      await page.evaluate(
        ({ countryId, regions, stations }) => {
          localStorage.setItem(
            "nextTrainSettings",
            JSON.stringify({
              settingsSchemaVersion: 2,
              savedCity: "greater-anglia",
              savedCountry: "gb-eng",
              regionExplicit: true,
              refreshSeconds: 60,
            })
          );
          localStorage.setItem(
            `nextTrainCountryStations:${countryId}`,
            JSON.stringify({ countryId, fetchedAt: Date.now(), regions, stations })
          );
        },
        {
          countryId: "gb-eng",
          regions: [LONDON_SE_NATIONAL_RAIL, UK_LONDON_TFL, REST_OF_ENGLAND, GREATER_ANGLIA],
          stations: FIXTURE_STATIONS,
        }
      );
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);

      const after = await page.evaluate(() => ({
        savedCity: window.NextTrainCitySession?.readSavedCity?.() ?? null,
        explicit: window.NextTrainCitySession?.readRegionExplicit?.() ?? null,
      }));

      if (after.savedCity === "greater-anglia" && after.explicit === true) {
        pass("An explicit region pick is not overridden by the nearest-station hint", JSON.stringify(after));
      } else {
        fail("An explicit region pick is not overridden by the nearest-station hint", JSON.stringify(after));
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await stopDevServer(serverChild);
  }

  if (failed) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
