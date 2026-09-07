/**
 * List every stop, in the six UK tram/metro/subway regions whose operator has
 * no confirmed live-departures feed, that must carry `"liveFeed": false` in
 * its `lib/cities/<region>/stations.json` entry — docs/jim-brief-no-live-feed-stops-out-of-picker.md.
 *
 * The six regions are hardcoded, not auto-discovered from the registry: this
 * is a fixed, dated decision (Manchester Metrolink, Nottingham NET, Tyne and
 * Wear Metro, Sheffield Supertram, Glasgow Subway, Edinburgh Trams), not a
 * standing rule that a future region's `mode: metro` stops are automatically
 * out of the picker — a future region with a confirmed metro feed must not be
 * swept in here by accident.
 *
 * Within each of the six regions, every `mode: metro` stop qualifies — none of
 * the six has a metro-mode stop with a confirmed real-time feed (verified
 * against each region's own provider file, which throws a
 * `FeedUnconfirmedError` subclass unconditionally for every metro-mode stop;
 * see `lib/providers/<region>.js`). `mode: train` (National Rail, Darwin) is
 * never touched by this script.
 *
 * Usage: node scripts/list-no-live-feed-stops.mjs [--json]
 * Exported for qa/no-live-feed-stops-gate.mjs to compare against the
 * `liveFeed` flags actually set in each region's stations.json.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const NO_LIVE_FEED_REGIONS = [
  "greater-manchester",
  "east-midlands",
  "north-east",
  "south-yorkshire",
  "glasgow",
  "edinburgh",
];

/** @returns {{region: string, name: string, catalogId: string|null}[]} */
export function listNoLiveFeedStops() {
  const rows = [];
  for (const region of NO_LIVE_FEED_REGIONS) {
    const file = join(ROOT, "lib", "cities", region, "stations.json");
    const json = JSON.parse(readFileSync(file, "utf8"));
    const stops = Array.isArray(json.stops) ? json.stops : [];
    for (const stop of stops) {
      if (stop.mode === "metro") {
        rows.push({ region, name: stop.name, catalogId: stop.catalogId ?? null });
      }
    }
  }
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = listNoLiveFeedStops();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    for (const region of NO_LIVE_FEED_REGIONS) {
      const regionRows = rows.filter((r) => r.region === region);
      console.log(`${region}: ${regionRows.length} no-live-feed stop(s)`);
      for (const row of regionRows) {
        console.log(`  - ${row.name}${row.catalogId ? ` (${row.catalogId})` : ""}`);
      }
    }
    console.log(`Total: ${rows.length} no-live-feed stops across ${NO_LIVE_FEED_REGIONS.length} regions`);
  }
}
