#!/usr/bin/env node
/**
 * Fill TfWM GTFS stop_ids on lib/cities/uk-west-midlands/metro-stops-source.json
 * (the source of truth for Metro stops — see build-uk-west-midlands-catalog.mjs,
 * which re-derives stations.json from it). Requires TFWM_API_APP_ID +
 * TFWM_API_APP_KEY (.env.local or environment).
 *
 * Station-graph note (5 Sep 2026, Luke pass): TfWM's GTFS models every Metro
 * stop as ONE station-level id (`940GZZWM<code>`, GTFS `location_type=1`,
 * never seen in the live trip_updates feed) with TWO directional platform-
 * level ids (`9400ZZWM<code><1|2>`, `location_type=0` — these ARE what
 * stop_time_update.stop_id carries in the real feed, confirmed against a
 * live pull). `lib/providers/uk-metro-wm.js`'s fetchMetroStopBoard() filters
 * on a single scalar `entry.stopId` with an exact match — there is no shape
 * in the current adapter for "one board, both directions" the way every
 * other GTFS-RT city in this repo gets via
 * lib/providers/gtfs/realtime-board.js's plural `resolveStopIds`. Populating
 * `stopId` with just one of the two platform ids would produce a board that
 * silently shows only one direction's departures — a direction-collapse bug,
 * not a fix. So this script writes the complete, verified `stopIds` array
 * (both platforms, TfWM-code-matched, not name-fuzzy-matched — TfWM's own
 * stops.txt names are inconsistent across location_types for the same
 * physical stop, e.g. "Wednesbury Great Western Street" appears as both
 * "Great Western Street" (location_type=2) and "Wednesbury Central"
 * (location_type=0, the platform rows) for the same parent station) and
 * leaves the legacy scalar `stopId` untouched (null) so
 * MetroStopIdNotCatalogedError keeps firing rather than silently degrading.
 * See docs/uk-west-midlands-d1/oracle-clash-report.md for the full writeup
 * and the recommended adapter follow-up (accept `entry.stopIds[]`, merge
 * trips across both platforms) — that change is Jim's, not this script's.
 *
 * Usage: node scripts/enrich-wm-metro-stop-ids.mjs [--zip=path/to/tfwm_gtfs.zip]
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { loadEnvLocal } from "../lib/load-env-local.js";
import { fetchTripUpdates } from "../lib/providers/gtfs/realtime.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(ROOT, "lib/cities/uk-west-midlands/metro-stops-source.json");
const GTFS_STATIC_URL = "http://api.tfwm.org.uk/gtfs/tfwm_gtfs.zip";
const GTFS_RT_URL = "http://api.tfwm.org.uk/gtfs/trip_updates";

/**
 * catalogId -> TfWM platform-id code. Hand-verified against a live GTFS
 * static pull + a live trip_updates pull on 5 Sep 2026 (both agreed on the
 * same 35 codes, 1:1 against the 35 metro-stops-source.json entries). Not
 * derived from fuzzy name matching — TfWM's own `stops.txt` names the same
 * physical stop differently across location_type rows (see module doc
 * comment), so name matching alone is unreliable for this feed.
 */
const CODE_BY_CATALOG_ID = {
  "metro:edgbaston-village": "EDG",
  "metro:five-ways": "FW",
  "metro:brindleyplace": "BPL",
  "metro:library-centenary-square": "CSQ",
  "metro:town-hall": "TOH",
  "metro:grand-central": "NWS",
  "metro:corporation-street": "COR",
  "metro:bull-street": "BUL",
  "metro:albert-street": "AS",
  "metro:millennium-point": "MP",
  "metro:st-chads": "BS",
  "metro:st-pauls": "ST",
  "metro:jewellery-quarter": "JQ",
  "metro:soho-benson-road": "SH",
  "metro:winson-green": "WI",
  "metro:handsworth-booth-street": "BO",
  "metro:the-hawthorns": "HA",
  "metro:kenrick-park": "KE",
  "metro:trinity-way": "TR",
  "metro:west-bromwich-central": "WB",
  "metro:lodge-road": "LR",
  "metro:dartmouth-street": "DR",
  "metro:dudley-street": "SG",
  "metro:black-lake": "BL",
  "metro:wednesbury-great-western-street": "WW",
  "metro:wednesbury-parkway": "WP",
  "metro:bradley-lane": "BR",
  "metro:loxdale": "LO",
  "metro:bilston-central": "BI",
  "metro:the-crescent": "CR",
  "metro:priestfield": "PR",
  "metro:the-royal": "RO",
  "metro:pipers-row": "PI",
  "metro:wolverhampton-station": "WR",
  "metro:wolverhampton-st-georges": "WS",
};

/**
 * A few stops use a different code for the parent station (location_type=1,
 * `940GZZWM<code>`) than for their platforms (`9400ZZWM<code><n>`) — e.g.
 * Pipers Row's platforms are coded PI but its GTFS parent station is
 * `940GZZWMXR`. Reference-only override so `stationId` still populates for
 * these; does not affect `stopIds` (platform ids), which is what the board
 * filter actually needs.
 */
const STATION_CODE_OVERRIDE = {
  PI: "XR",
};

function readTfwmCredentials() {
  loadEnvLocal();
  const appId = String(process.env.TFWM_API_APP_ID ?? "").trim();
  const appKey = String(process.env.TFWM_API_APP_KEY ?? "").trim();
  if (!appId || !appKey) {
    console.error("Set TFWM_API_APP_ID and TFWM_API_APP_KEY");
    process.exit(1);
  }
  return { appId, appKey };
}

async function loadZipBuffer(zipPath, credentials) {
  if (zipPath) {
    return readFileSync(zipPath);
  }
  const { appId, appKey } = credentials;
  const url = `${GTFS_STATIC_URL}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GTFS static fetch failed: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * The live trip_updates feed is the ground truth for which stop_ids
 * actually appear in real StopTimeUpdates — used to supplement the static
 * stops.txt parse, which has been observed to under-report at least one
 * platform (Five Ways' second platform has an empty location_type/
 * parent_station in stops.txt as of 5 Sep 2026, so it's silently dropped by
 * a location_type=="0" filter alone, despite being a live, real stop_id).
 * Returns { code -> Set<stopId> }.
 */
async function fetchLiveCodeMap(credentials) {
  const { appId, appKey } = credentials;
  const url = `${GTFS_RT_URL}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`;
  const { entities } = await fetchTripUpdates(url, { timeoutMs: 8000 });
  const byCode = {};
  for (const entity of entities) {
    for (const stu of entity.tripUpdate?.stopTimeUpdate ?? []) {
      const match = /^9400ZZWM([A-Z]+)\d+$/.exec(String(stu.stopId ?? ""));
      if (match) {
        (byCode[match[1]] ??= new Set()).add(stu.stopId);
      }
    }
  }
  return byCode;
}

/**
 * Pure — parses only stops.txt out of the zip (routes/trips/stop_times for
 * the whole TfWM bus+Metro network are ~400MB uncompressed and unneeded
 * here; unzipSync's filter option skips decompressing them).
 * Returns { code -> { stationId, platformIds[] } }.
 */
export function buildCodeMapFromZip(buffer) {
  const files = unzipSync(new Uint8Array(buffer), { filter: (f) => f.name === "stops.txt" });
  const text = new TextDecoder("utf-8").decode(files["stops.txt"]);
  const rows = parseCsv(text);

  const byCode = {};
  for (const row of rows) {
    const stationMatch = row.location_type === "1" && /^940GZZWM([A-Z]+)$/.exec(row.stop_id);
    if (stationMatch) {
      const code = stationMatch[1];
      byCode[code] ??= { stationId: null, platformIds: [] };
      byCode[code].stationId = row.stop_id;
      continue;
    }
    const platformMatch = row.location_type === "0" && /^9400ZZWM([A-Z]+)\d+$/.exec(row.stop_id);
    if (platformMatch) {
      const code = platformMatch[1];
      byCode[code] ??= { stationId: null, platformIds: [] };
      byCode[code].platformIds.push(row.stop_id);
    }
  }
  for (const entry of Object.values(byCode)) {
    entry.platformIds.sort();
  }
  return byCode;
}

async function main() {
  const zipArg = process.argv.find((arg) => arg.startsWith("--zip="));
  const zipPath = zipArg ? zipArg.slice("--zip=".length) : "";
  const credentials = zipPath ? null : readTfwmCredentials();

  const buffer = await loadZipBuffer(zipPath || null, credentials);
  const byCode = buildCodeMapFromZip(buffer);

  if (credentials) {
    const liveByCode = await fetchLiveCodeMap(credentials);
    for (const [code, liveIds] of Object.entries(liveByCode)) {
      byCode[code] ??= { stationId: null, platformIds: [] };
      const merged = new Set([...byCode[code].platformIds, ...liveIds]);
      byCode[code].platformIds = [...merged].sort();
    }
  }

  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  let matched = 0;
  const unmatched = [];
  for (const stop of source.stops ?? []) {
    const code = CODE_BY_CATALOG_ID[stop.catalogId];
    const entry = code ? byCode[code] : null;
    if (!entry || !entry.platformIds.length) {
      unmatched.push(stop.catalogId);
      continue;
    }
    if (!entry.stationId && code) {
      const stationCode = STATION_CODE_OVERRIDE[code] ?? code;
      entry.stationId = byCode[stationCode]?.stationId ?? null;
    }
    // Legacy scalar left untouched (stays null): the current adapter does an
    // exact single-value match against stop_time_update.stop_id, and a
    // Metro station's two directional platforms have different ids, so
    // filling this with one of them would silently drop the other
    // direction's departures. See module doc comment above.
    stop.stopId = stop.stopId ?? null;
    stop.stopIds = entry.platformIds;
    stop.stationId = entry.stationId;
    matched += 1;
  }

  writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");
  console.log(`enrich-wm-metro-stop-ids: matched ${matched}/${(source.stops ?? []).length} metro stops (stopIds array populated; legacy scalar stopId left null — see script header)`);
  if (unmatched.length) {
    console.log(`Unmatched: ${unmatched.join(", ")}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
