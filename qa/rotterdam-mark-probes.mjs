/**
 * Mark’s 13 Rotterdam RET metro probes (Haven is last). Offline fixture board.
 * Usage: node qa/rotterdam-mark-probes.mjs
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { fetchStationBoard } from "../lib/providers/rotterdam.js";
import {
  MARK_PROBES,
  marketingLabelsForStation,
} from "../lib/cities/rotterdam/marketing-directions.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Rotterdam's board is built from the live GTFS static blob (gtfsFixtureBlobUrl),
 * which is a *rolling* fixture: calendar_dates.txt only covers a ~90-day window
 * starting a day or two before the blob was last published (see
 * scripts/publish-gtfs-fixture-to-blob.mjs). A fixed historical NOW eventually
 * falls outside that window as the blob rolls forward, making every station
 * report an empty board — this is what made the gate intermittently fail.
 * Pin to "tomorrow, midday UTC" instead so NOW always lands inside the window.
 */
const NOW = new Date(Date.now() + 24 * 60 * 60 * 1000);
NOW.setUTCHours(10, 0, 0, 0);

assert(assertCityLive("rotterdam")?.ok === true, "assertCityLive(rotterdam) must pass");
assert(MARK_PROBES.length === 13, "Mark probes are 13 stations");
assert(MARK_PROBES[0] === "Beurs", "First probe is hub Beurs");
assert(MARK_PROBES[12] === "Hoek van Holland Haven", "Haven is the 13th probe");
assert(MARK_PROBES.includes("Hoek van Holland Strand"), "Strand is probed separately from Haven");

const graskruid = marketingLabelsForStation("Graskruid");
assert(graskruid.includes("Metro A + Binnenhof"), "Graskruid A is Binnenhof");
assert(!graskruid.some((label) => /metro a/i.test(label) && /nesselande/i.test(label)), "A is not Nesselande");
assert(graskruid.includes("Metro B + Nesselande"), "Graskruid B is Nesselande");

const tussenwater = marketingLabelsForStation("Tussenwater");
assert(tussenwater.includes("Metro C + De Akkers"), "Tussenwater C toward De Akkers");
assert(tussenwater.includes("Metro D + De Akkers"), "Tussenwater D toward De Akkers");
assert(tussenwater.includes("Metro C + De Terp"), "Tussenwater C vs D keep line tokens");
assert(tussenwater.includes("Metro D + Rotterdam Centraal"), "Tussenwater D vs C keep line tokens");

const akkars = marketingLabelsForStation("De Akkers");
assert(akkars.includes("Metro C + De Terp") && akkars.includes("Metro D + Rotterdam Centraal"), "De Akkers is shared C/D");

for (const station of MARK_PROBES) {
  const board = await fetchStationBoard(station, { now: NOW });
  assert(board.stationName === station, `${station}: product name must stay ${station}, got ${board.stationName}`);
  assert((board.trips ?? []).length > 0, `${station}: empty board at midday`);
  assert(
    !(board.trips ?? []).some((trip) => /gvb|m50|m51|m52|m53|m54|tram |bus |waterbus/i.test(`${trip.destination} ${trip.routeShortName}`)),
    `${station}: leaked GVB/tram/bus/waterbus`
  );
  if (station === "Hoek van Holland Strand") {
    assert(
      (board.trips ?? []).every((trip) => String(trip.routeShortName || "").toUpperCase() === "B"),
      "Strand board is Metro B only"
    );
    assert(
      !(board.trips ?? []).some((trip) => /hoek van holland haven/i.test(trip.destination)),
      "Strand board must not collapse into Haven"
    );
  }
  if (station === "Hoek van Holland Haven") {
    assert(board.stationName !== "Hoek van Holland Strand", "Haven must not resolve as Strand");
  }
  if (station === "Binnenhof") {
    assert(
      !(board.trips ?? []).some((trip) => /metro a/i.test(trip.destination) && /nesselande/i.test(trip.destination)),
      "Binnenhof A must not show Nesselande"
    );
  }
}

console.log(`rotterdam-mark-probes: ok (${MARK_PROBES.length}, Haven last, no Strand collapse)`);
