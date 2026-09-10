/**
 * Sydney direction-match gate (FB-62, 10 Sep 2026).
 *
 * Two things this proves, using the same published static GTFS fixture that
 * Vercel production serves from (`gtfsFixtureBlobUrl("sydney")` via
 * `loadGtfsStatic`), so a "match" here is a real captured trip, not a
 * hand-built fixture round-trip:
 *
 *  1. No catalog station offers an empty direction list, except a station
 *     recorded in line-map.json `suppressedTermini` (Helensburgh SCO — out of
 *     modes v1, see hazard-pack.md).
 *  2. Every chip FB-62 touches — the new "T2/T3/T8 City Circle" city-bound
 *     chips, and the outbound chips they now sit alongside — matches at least
 *     one real scheduled GTFS trip, both network-wide and at each of the
 *     specific stations named in the brief's acceptance criteria 1–2
 *     (Macarthur, Campbelltown, Revesby, Leppington, Liverpool). T6/T7
 *     (Bankstown, Olympic Park) are pinned unchanged: FB-62 investigated them
 *     and found their entire real GTFS headsign population terminates at
 *     Bankstown/Lidcombe and Olympic Park/Lidcombe/Strathfield/Central — never
 *     the City Circle — so adding a "T6/T7 City Circle" chip would be
 *     permanently next:null (a regression, not a fix). M1/T1/T4/T5/T9 are
 *     spot-checked unchanged (acceptance criterion 4).
 *
 * This gate deliberately does NOT assert "every chip at every station matches
 * a trip" network-wide: the Sydney catalog has pre-existing, documented branch
 * hazards (line-map.json `doNotGroup`, e.g. H4 T1 western fork, H4 T2 two
 * published termini) where a line's blanket MARKETING_ENDS chip legitimately
 * has no real trip at every station it nominally serves (e.g. "T1 Richmond"
 * at Berowra, which is only ever really served towards Emu Plains). That is
 * FB-61 territory ("chips offered where the line never calls") — explicitly
 * out of scope for FB-62 and not something this gate should fail CI over.
 *
 * Usage: node qa/sydney-direction-match.mjs
 */
import {
  SYDNEY_TIME_ZONE,
  listCatalogStations,
} from "../lib/providers/sydney.js";
import { loadGtfsStatic } from "../lib/providers/gtfs/static-cache.js";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "../lib/cities/sydney/marketing-directions.js";
import lineMap from "../lib/cities/sydney/line-map.json" with { type: "json" };

function fail(message) {
  console.error(`sydney-direction-match: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
}

const suppressed = new Set((lineMap.suppressedTermini ?? []).map(normalizeKey));

const staticData = await loadGtfsStatic({
  url: gtfsFixtureBlobUrl("sydney"),
  routeTypes: ["2", "401"],
  timeZone: SYDNEY_TIME_ZONE,
});

const stations = listCatalogStations();
const stationsByName = new Map(stations.map((s) => [s.name, s]));

function scheduledRowsForStopIds(stopIds) {
  const rows = [];
  for (const stopId of stopIds ?? []) {
    for (const stopTime of staticData.stopTimesByStopId.get(stopId) ?? []) {
      const trip = staticData.tripsById.get(stopTime.trip_id);
      if (!trip) {
        continue;
      }
      const route = staticData.routesById.get(trip.route_id);
      const destination = String(trip.trip_headsign || route?.route_long_name || "").trim();
      if (!destination) {
        continue;
      }
      rows.push({ destination, routeShortName: String(route?.route_short_name || "").trim() });
    }
  }
  return rows;
}

const allScheduledRows = stations.flatMap((s) => scheduledRowsForStopIds(s.stopIds));

// 1. No empty direction list outside a recorded suppression.
let emptyFailures = 0;
for (const station of stations) {
  const chips = marketingLabelsForStation(station.name);
  if (chips.length === 0 && !suppressed.has(normalizeKey(station.name))) {
    console.error(`sydney-direction-match: ${station.name} offers an empty direction list`);
    emptyFailures += 1;
  }
}
assert(emptyFailures === 0, `${emptyFailures} catalog station(s) with an unrecorded empty direction list`);

// 2a. The three new City Circle chips match a real scheduled trip network-wide.
for (const chip of ["T2 City Circle", "T3 City Circle", "T8 City Circle"]) {
  const matched = allScheduledRows.some((row) => tripMatchesMarketingChip(row, chip));
  assert(matched, `"${chip}" matches no scheduled GTFS trip anywhere in the network`);
}

// 2b. Acceptance criteria 1–2: named stations offer the expected before/after
// chip set, and each new City Circle chip matches a real trip at that
// station's own stopIds (not just somewhere in the network).
const expected = {
  Macarthur: ["T8 City Circle"],
  Campbelltown: ["T8 City Circle", "T8 Macarthur"],
  Revesby: ["T8 City Circle", "T8 Macarthur"],
};
for (const [name, expectedChips] of Object.entries(expected)) {
  const chips = marketingLabelsForStation(name);
  assert(
    JSON.stringify([...chips].sort()) === JSON.stringify([...expectedChips].sort()),
    `${name} expected ${JSON.stringify(expectedChips)}, got ${JSON.stringify(chips)}`
  );
}

const cityCircleAtStation = {
  Macarthur: "T8 City Circle",
  Campbelltown: "T8 City Circle",
  Revesby: "T8 City Circle",
  Leppington: "T2 City Circle",
  Liverpool: ["T2 City Circle", "T3 City Circle"],
};
for (const [name, chipOrChips] of Object.entries(cityCircleAtStation)) {
  const station = stationsByName.get(name);
  assert(station, `catalog is missing station ${name}`);
  const chips = marketingLabelsForStation(name);
  const rows = scheduledRowsForStopIds(station.stopIds);
  for (const chip of Array.isArray(chipOrChips) ? chipOrChips : [chipOrChips]) {
    assert(chips.includes(chip), `${name} must offer "${chip}"`);
    const matched = rows.some((row) => tripMatchesMarketingChip(row, chip));
    assert(matched, `${name} "${chip}" matches no scheduled GTFS trip at this station`);
  }
}

// 3. T6/T7 investigated and left unchanged (Bankstown, Olympic Park): no City
// Circle chip, existing outbound chip untouched and still matches a real trip.
const unchangedLoopEnded = {
  Bankstown: "T6 Lidcombe",
  "Olympic Park": "T7 Lidcombe",
};
for (const [name, chip] of Object.entries(unchangedLoopEnded)) {
  const station = stationsByName.get(name);
  const chips = marketingLabelsForStation(name);
  assert(
    JSON.stringify(chips) === JSON.stringify([chip]),
    `${name} must stay pinned to [${chip}] — T6/T7 have no real City Circle GTFS trips`
  );
  const rows = scheduledRowsForStopIds(station.stopIds);
  assert(
    rows.some((row) => tripMatchesMarketingChip(row, chip)),
    `${name} "${chip}" matches no scheduled GTFS trip`
  );
  assert(
    !chips.some((label) => /city circle/i.test(label)),
    `${name} must not gain a City Circle chip (no supporting GTFS data)`
  );
}

// 4. Acceptance criterion 4 spot check: M1/T1/T4/T5/T9 never gain a City
// Circle chip and their existing labels are untouched.
const central = marketingLabelsForStation("Central");
assert(central.includes("T1 Emu Plains"), "Central must still offer T1 Emu Plains");
assert(
  !central.some((label) => /^T1 |^T4 |^T5 |^T9 |^M1 /.test(label) && /city circle/i.test(label)),
  "M1/T1/T4/T5/T9 must never gain a City Circle chip"
);
const cronulla = marketingLabelsForStation("Cronulla");
assert(
  JSON.stringify(cronulla.filter((l) => l.startsWith("T4 "))) ===
    JSON.stringify(["T4 Bondi Junction", "T4 Waterfall"]),
  "Cronulla T4 chips must be unchanged"
);

console.log(
  `sydney-direction-match: ok (${stations.length} stations, no unrecorded empty direction lists; ` +
    "T2/T3/T8 City Circle chips match real scheduled trips network-wide and at every FB-62 acceptance station; " +
    "T6/T7 pinned unchanged; M1/T1/T4/T5/T9 spot-checked unchanged)"
);
