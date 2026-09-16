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
 * Round 2 (Mark's FAIL on PR #403, https://github.com/tdrevans-aus/
 * next-train-app/pull/403#issuecomment-5690208145): plain nearest-wins still
 * sent a King's Cross rider to uk-london-tfl in the real UI, because the
 * Tube stop "King's Cross St. Pancras" sits closer to the National Rail
 * concourse than "London King's Cross" itself. hintCityFromNearestStation
 * now treats any station within 250 m of the single nearest one as
 * co-located, and among co-located candidates a Darwin (National Rail) feed
 * wins over a non-Darwin (metro/tram/TfL) one — decided by the region's own
 * `feed` field (isDarwinCityId), never a London-specific check, so Glasgow
 * Queen Street/Buchanan Street and any other interchange get the same
 * treatment. This fixture now seeds the actual competing stops at each
 * interchange instead of a single station per region, which is what let the
 * round-1 fixture pass while the real UI still failed.
 *
 * Cases (all via window.nextTrainApp.findNearestStation({ followGps: true }),
 * the exact function Near me itself calls — no live geolocation, Playwright's
 * mocked context.setGeolocation stands in):
 *   1. King's Cross — Tube stop closer (~24 m) than the NR station (~71 m),
 *      both within the 250 m tie band -> london-se-national-rail wins
 *      (board: King's Cross).
 *   2. Bank — only Tube stops within 250 m, no NR candidate -> uk-london-tfl.
 *   3. Cheshunt -> rest-of-england.
 *   4. Burnham-on-Crouch -> greater-anglia.
 *   5. Waterloo — Tube stop closer (~24 m) than the NR station (~104 m),
 *      both within the tie band -> london-se-national-rail wins.
 *   6. Glasgow Queen Street vs Buchanan Street — the Subway stop
 *      (Buchanan Street) is nominally closer but liveFeed: false, so it is
 *      never a candidate at all (tie rule or not) -> glasgow (Queen Street)
 *      wins regardless of the closer Subway coordinate.
 *   7. A co-located pair of two Darwin stations (thames-valley vs solent,
 *      ~71 m apart, both within the tie band) -> nearest of the two wins;
 *      the Darwin preference only breaks ties across DIFFERENT feed types.
 *   8. 40 km from every seeded station -> falls back to the first-box hint
 *      (uk-london-tfl, the first CITY_BOUNDS entry containing that point).
 *   9. An explicit region pick survives boot even with a GPS fix that would
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
const WATERLOO = { latitude: 51.5031, longitude: -0.1132 };
const GLASGOW_QUEEN_STREET = { latitude: 55.8617, longitude: -4.2514 };
const DARWIN_TIE_RIDER = { latitude: 51.05, longitude: -1.31 };
// ~40 km from every seeded station above, but still inside uk-london-tfl's
// own CITY_BOUNDS box (51.28–51.7 lat, -0.52–0.35 lng) — the first box in
// object order that contains it, so a correct fallback lands here.
const FAR_FROM_ANY_STATION = { latitude: 51.3, longitude: -0.5 };

const LONDON_SE_NATIONAL_RAIL = { id: "london-se-national-rail", displayName: "London & South East National Rail" };
const UK_LONDON_TFL = { id: "uk-london-tfl", displayName: "London" };
const REST_OF_ENGLAND = { id: "rest-of-england", displayName: "Rest of England" };
const GREATER_ANGLIA = { id: "greater-anglia", displayName: "East Anglia" };
const GLASGOW = { id: "glasgow", displayName: "Glasgow" };
const THAMES_VALLEY = { id: "thames-valley", displayName: "Thames Valley (Reading / Oxford)" };
const SOLENT = { id: "solent", displayName: "Solent (Southampton / Portsmouth)" };

const ALL_REGIONS = [
  LONDON_SE_NATIONAL_RAIL,
  UK_LONDON_TFL,
  REST_OF_ENGLAND,
  GREATER_ANGLIA,
  GLASGOW,
  THAMES_VALLEY,
  SOLENT,
];

const FIXTURE_STATIONS = [
  // King's Cross interchange: the Tube stop sits closer to the rider fix
  // than the NR station (~24 m vs ~71 m, ~94 m apart — inside the 250 m tie
  // band) — this is the exact shape of Mark's real-UI FAIL, so both stops
  // must be present for the fixture to catch it.
  { name: "London King's Cross", lat: 51.5312, lng: -0.1230, liveFeed: true, region: LONDON_SE_NATIONAL_RAIL },
  { name: "King's Cross St. Pancras", lat: 51.5307, lng: -0.1241, liveFeed: true, region: UK_LONDON_TFL },
  // Bank: only Tube stops nearby, no NR candidate within any radius.
  { name: "Bank", lat: BANK.latitude, lng: BANK.longitude, liveFeed: true, region: UK_LONDON_TFL },
  { name: "Cheshunt", lat: CHESHUNT.latitude, lng: CHESHUNT.longitude, liveFeed: true, region: REST_OF_ENGLAND },
  { name: "Burnham-on-Crouch", lat: BURNHAM.latitude, lng: BURNHAM.longitude, liveFeed: true, region: GREATER_ANGLIA },
  // Waterloo interchange: same shape as King's Cross (~24 m vs ~104 m, ~127 m
  // apart — inside the tie band).
  { name: "London Waterloo", lat: 51.5038, lng: -0.1122, liveFeed: true, region: LONDON_SE_NATIONAL_RAIL },
  { name: "Waterloo", lat: 51.5030, lng: -0.1135, liveFeed: true, region: UK_LONDON_TFL },
  // Glasgow Queen Street vs Buchanan Street: the Subway stop is nominally
  // closer to the rider fix (~44 m vs ~50 m) but liveFeed: false, so it must
  // never even become a candidate — Queen Street wins on that basis alone,
  // not because of the Darwin tie rule.
  { name: "Glasgow Queen Street", lat: 55.8620, lng: -4.2508, liveFeed: true, region: GLASGOW },
  { name: "Buchanan Street (Subway)", lat: 55.8615, lng: -4.2520, liveFeed: false, region: GLASGOW },
  // Two Darwin (National Rail) stations co-located (~71 m apart, both inside
  // the tie band): the Darwin-preference rule only breaks ties across
  // DIFFERENT feed types, so among two Darwin candidates nearest still wins.
  { name: "Thames Valley Tie Stop", lat: 51.0501, lng: -1.3102, liveFeed: true, region: THAMES_VALLEY },
  { name: "Solent Tie Stop", lat: 51.0505, lng: -1.3110, liveFeed: true, region: SOLENT },
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
    // Cases 1–8: one context, one seeded country-stations cache covering
    // every fixture station, non-explicit region so the resolver is free to
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
        regions: ALL_REGIONS,
        stations: FIXTURE_STATIONS,
      });
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);

      const cases = [
        {
          id: "King's Cross: Tube stop closer but within 250 m of the NR station -> london-se-national-rail wins",
          coords: KINGS_CROSS,
          expectCity: "london-se-national-rail",
          expectStationIncludes: "King's Cross",
        },
        { id: "Bank -> uk-london-tfl (no NR candidate nearby)", coords: BANK, expectCity: "uk-london-tfl", expectStationIncludes: "Bank" },
        { id: "Cheshunt -> rest-of-england", coords: CHESHUNT, expectCity: "rest-of-england", expectStationIncludes: "Cheshunt" },
        { id: "Burnham-on-Crouch -> greater-anglia", coords: BURNHAM, expectCity: "greater-anglia", expectStationIncludes: "Burnham-on-Crouch" },
        {
          id: "Waterloo: Tube stop closer but within 250 m of the NR station -> london-se-national-rail wins",
          coords: WATERLOO,
          expectCity: "london-se-national-rail",
          expectStationIncludes: null,
        },
        {
          id: "Glasgow Queen Street vs Buchanan Street: Subway stop liveFeed false, never a candidate -> glasgow",
          coords: GLASGOW_QUEEN_STREET,
          expectCity: "glasgow",
          expectStationIncludes: null,
        },
        {
          id: "Two co-located Darwin stations (thames-valley vs solent): nearest wins among equals",
          coords: DARWIN_TIE_RIDER,
          expectCity: "thames-valley",
          expectStationIncludes: null,
        },
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

    // Case 9: an explicit region pick is not overridden by the hint, even
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
          regions: ALL_REGIONS,
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
