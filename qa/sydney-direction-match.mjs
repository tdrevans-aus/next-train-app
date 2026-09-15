/**
 * Sydney direction-match gate (FB-62, 10 Sep 2026).
 *
 * Offline by construction (since 13 Sep 2026): this gate used to call
 * `loadGtfsStatic` against `gtfsFixtureBlobUrl("sydney")` — a full static-zip
 * download from the Vercel Blob store on every `--smoke` and CI run — and was
 * the last smoke-tier consumer of the Blob transfer allowance after PR #357
 * moved the seven dogfood gates onto local fixtures (the 10 Sep 2026
 * exhaustion took seven live cities down). It now reads the trimmed local
 * fixture at qa/fixtures/gtfs-snapshots/sydney/ via `loadLocalGtfsSnapshot`
 * (qa/lib/local-gtfs-snapshot.mjs → `loadGtfsStaticFromDirectory`), and
 * `globalThis.fetch` is stubbed to throw before any other import runs so a
 * future change that reintroduces a live call fails loudly here (same shape
 * as qa/brussels-planned-gate.mjs). The fixture's README says what its trip
 * rows are: one representative trip per (station, chip) pair asserted below,
 * with the catalog's real stop ids, real T-line short names and verbatim
 * CHIP_HEADSIGN_GROUPS headsigns — so this is a logic check that chip
 * matching works against the shapes the real feed uses. Whether the
 * currently published snapshot still carries those headsigns is
 * qa/prod-sweep.mjs's job, on a schedule.
 *
 * Two things this proves:
 *
 *  1. No catalog station offers an empty direction list, except a station
 *     recorded in line-map.json `suppressedTermini` (Helensburgh SCO — out of
 *     modes v1, see hazard-pack.md).
 *  2. Every chip FB-62 touches — the new "T2/T3/T8 City Circle" city-bound
 *     chips, and the outbound chips they now sit alongside — matches at least
 *     one scheduled GTFS trip, both network-wide and at each of the
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
 *   SYDNEY_DIRECTION_MATCH_FIXTURE=<dir> points the gate at a different
 *   fixture directory; qa/sydney-direction-match-negative.mjs uses it to prove
 *   the gate still fails when a chip has no matching trip.
 */
globalThis.fetch = async (input) => {
  throw new Error(
    `sydney-direction-match: network access is forbidden in this gate (attempted fetch: ${
      typeof input === "string" ? input : input?.url ?? input
    }) — it reads qa/fixtures/gtfs-snapshots/sydney/ instead`
  );
};

import {
  SYDNEY_TIME_ZONE,
  listCatalogStations,
} from "../lib/providers/sydney.js";
import { loadGtfsStaticFromDirectory } from "../lib/providers/gtfs/static-cache.js";
import { loadLocalGtfsSnapshot } from "./lib/local-gtfs-snapshot.mjs";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
  MARKETING_ENDS,
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

const fixtureOverride = process.env.SYDNEY_DIRECTION_MATCH_FIXTURE;
const staticData = fixtureOverride
  ? loadGtfsStaticFromDirectory(fixtureOverride, {
      routeTypes: ["2", "401"],
      timeZone: SYDNEY_TIME_ZONE,
      sourceUrl: `local-fixture:${fixtureOverride}`,
    })
  : loadLocalGtfsSnapshot("sydney", { routeTypes: ["2", "401"], timeZone: SYDNEY_TIME_ZONE });
assert(
  staticData.tripsById.size > 0,
  `fixture at ${staticData.sourceUrl} has no trips — nothing to match chips against`
);

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
  // Campbelltown also gained SHL chips 14 Sep 2026 (Southern Highlands Line calls here too;
  // docs/jim-brief-sydney-intercity-fill.md).
  Campbelltown: ["SHL Central", "SHL Goulburn", "T8 City Circle", "T8 Macarthur"],
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

// 5. NSW TrainLink intercity + Hunter (14 Sep 2026, docs/jim-brief-sydney-intercity-fill.md).
// Every new chip matches a scheduled fixture trip network-wide, and a representative
// acceptance station per line offers the chip towards Central and it matches a trip at that
// station's own stopIds.
for (const chip of [
  "BMT Central",
  "BMT Lithgow",
  "CCN Central",
  "CCN Newcastle Interchange",
  "SCO Central",
  "SCO Bomaderry",
  "SHL Central",
  "SHL Goulburn",
  "HUN Dungog",
  "HUN Scone",
]) {
  const matched = allScheduledRows.some((row) => tripMatchesMarketingChip(row, chip));
  assert(matched, `"${chip}" matches no scheduled GTFS trip anywhere in the network`);
}

const intercityAcceptance = {
  Katoomba: "BMT Central",
  Gosford: "CCN Central",
  Wollongong: "SCO Central",
  "Moss Vale": "SHL Central",
};
for (const [name, chip] of Object.entries(intercityAcceptance)) {
  const station = stationsByName.get(name);
  assert(station, `catalog is missing station ${name}`);
  const chips = marketingLabelsForStation(name);
  assert(chips.includes(chip), `${name} must offer "${chip}"`);
  const rows = scheduledRowsForStopIds(station.stopIds);
  assert(
    rows.some((row) => tripMatchesMarketingChip(row, chip)),
    `${name} "${chip}" matches no scheduled GTFS trip at this station`
  );
}

// Maitland sits on both Hunter branches (Dungog via North Coast, Scone via Muswellbrook).
const maitland = stationsByName.get("Maitland");
assert(maitland, "catalog is missing station Maitland");
const maitlandChips = marketingLabelsForStation("Maitland");
const maitlandRows = scheduledRowsForStopIds(maitland.stopIds);
for (const chip of ["HUN Dungog", "HUN Scone"]) {
  assert(maitlandChips.includes(chip), `Maitland must offer "${chip}"`);
  assert(
    maitlandRows.some((row) => tripMatchesMarketingChip(row, chip)),
    `Maitland "${chip}" matches no scheduled GTFS trip at this station`
  );
}

// Excluded booked services never surface a chip: XPT/Xplorer/coach route codes aren't in
// MARKETING_ENDS at all, so a headsign like "Melbourne" or "Dubbo" on an excluded route can
// never become a chip — proven directly against the exclusion list.
for (const excludedShort of ["CAN", "MEL", "BRI", "GRF", "DBB", "ARM"]) {
  assert(
    !Object.keys(MARKETING_ENDS).includes(excludedShort),
    `${excludedShort} (compulsory reservation) must never have marketing chips`
  );
}

console.log(
  `sydney-direction-match: ok (offline, ${staticData.sourceUrl}; ${stations.length} stations, no unrecorded empty direction lists; ` +
    "T2/T3/T8 City Circle chips match scheduled fixture trips network-wide and at every FB-62 acceptance station; " +
    "T6/T7 pinned unchanged; M1/T1/T4/T5/T9 spot-checked unchanged)"
);
