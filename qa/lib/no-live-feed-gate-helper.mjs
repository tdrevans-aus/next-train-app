/**
 * Shared assertion block for the six *-dogfood-gate.mjs files affected by
 * docs/jim-brief-no-live-feed-stops-out-of-picker.md (greater-manchester,
 * east-midlands, north-east, south-yorkshire, glasgow, edinburgh). Kept as a
 * single helper so all six gates check the same three things the same way:
 *
 *   1. every `mode: metro` stop in the region's stations.json carries
 *      `liveFeed: false`, and every `mode: train` stop does not;
 *   2. that set matches scripts/list-no-live-feed-stops.mjs exactly (the
 *      derive-don't-hand-list rule from the brief);
 *   3. `listMultiCityStations` (what `/api/city-stations` serves) carries the
 *      flag through, and `findNearestStation` never nominates a no-live-feed
 *      stop even sitting right on top of one.
 *
 * Usage: assertNoLiveFeedStopsExcluded({ region, readFileSync, join, ROOT,
 *   listMultiCityStations, findNearestStation, assert, sample: { name, lat, lng } })
 */
import { listNoLiveFeedStops } from "../../scripts/list-no-live-feed-stops.mjs";

export function assertNoLiveFeedStopsExcluded({
  region,
  readFileSync,
  join,
  ROOT,
  listMultiCityStations,
  findNearestStation,
  assert,
  sample,
}) {
  const derivedNames = new Set(
    listNoLiveFeedStops()
      .filter((row) => row.region === region)
      .map((row) => row.name)
  );
  assert(derivedNames.size > 0, `${region}: scripts/list-no-live-feed-stops.mjs must derive at least one no-live-feed stop`);

  const rawStops = JSON.parse(readFileSync(join(ROOT, "lib", "cities", region, "stations.json"), "utf8")).stops;
  const flaggedNames = new Set();
  for (const stop of rawStops) {
    if (stop.mode === "metro") {
      assert(stop.liveFeed === false, `${region} stations.json: metro stop "${stop.name}" must carry liveFeed: false`);
      flaggedNames.add(stop.name);
    } else {
      assert(stop.liveFeed !== false, `${region} stations.json: non-metro stop "${stop.name}" must not carry liveFeed: false`);
    }
  }
  assert(
    flaggedNames.size === derivedNames.size,
    `${region}: liveFeed: false stops in stations.json (${flaggedNames.size}) must exactly match scripts/list-no-live-feed-stops.mjs's derived count (${derivedNames.size})`
  );
  for (const name of derivedNames) {
    assert(flaggedNames.has(name), `${region}: "${name}" is derived as no-live-feed but stations.json does not flag it`);
  }

  // /api/city-stations (listMultiCityStations) carries the flag through, unfiltered.
  const apiStations = listMultiCityStations(region);
  const apiFlagged = new Set(apiStations.filter((s) => s.liveFeed === false).map((s) => s.name));
  assert(
    apiFlagged.size === flaggedNames.size,
    `${region}: listMultiCityStations must carry liveFeed: false through for all ${flaggedNames.size} no-live-feed stops, got ${apiFlagged.size}`
  );

  // The nearest-station helper must never nominate a no-live-feed stop, even
  // sitting right on top of its own coordinates.
  if (sample) {
    const nearest = findNearestStation(region, sample.lat, sample.lng);
    assert(
      nearest !== sample.name,
      `${region}: findNearestStation must never nominate "${sample.name}" (liveFeed: false) even at its own coordinates, got "${nearest}"`
    );
  }
}
