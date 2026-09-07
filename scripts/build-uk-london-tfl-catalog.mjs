/**
 * Build lib/cities/uk-london-tfl/stops.json from TfL Unified API.
 * Requires TFL_APP_KEY. Do not hand-type 272+ stations.
 *
 *   node scripts/build-uk-london-tfl-catalog.mjs
 *
 * Without TFL_APP_KEY, running this script does not hit the network — it
 * instead applies the same platform/hub dedupe (see dedupeTflStops below) as
 * a post-processing pass over the already-committed stops.json. See
 * docs/jim-brief-london-tram-duplicate-stops.md.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "lib/cities/uk-london-tfl");
const OUT_PATH = join(OUT_DIR, "stops.json");
const TFL_MODES = "tube,overground,elizabeth-line,dlr,tram";
const TFL_RAIL = new Set(["tube", "overground", "elizabeth-line", "dlr", "tram"]);

/**
 * TfL returns both a station/hub StopPoint (e.g. `940GZZCRADV`, stopType
 * NaptanMetroStation) and one row per platform (e.g. `9400ZZCRADV1`, `…2`,
 * stopType NaptanMetroPlatform) for every Tramlink stop, and for tube/DLR/
 * Overground/Elizabeth line hubs too on some lines. Arrivals is identical
 * across all of them, so the picker must show one row per station per mode.
 *
 * Classification prefers `stopType` (present on live TfL API responses);
 * when it's absent (e.g. re-running the dedupe pass over an already-built
 * catalog that never captured it) it falls back to the id shape: metro/tram
 * hubs are `940G…`, platforms are `9400…` ending in a digit.
 */
export function classifyNaptanKind(naptanId, stopType) {
  const id = String(naptanId || "");
  const type = String(stopType || "").toLowerCase();
  if (type.includes("station")) {
    return "hub";
  }
  if (type.includes("platform") || type.includes("bay") || type.includes("entrance")) {
    return "platform";
  }
  if (/^940g/i.test(id)) {
    return "hub";
  }
  if (/^9400.*\d$/i.test(id)) {
    return "platform";
  }
  return "other";
}

function mergeLines(group) {
  const lines = new Set();
  for (const stop of group) {
    for (const line of stop.lines ?? []) {
      lines.add(line);
    }
  }
  return [...lines].sort();
}

/**
 * Dedupe a flat stops list so each station name appears once per mode.
 * Where a same-name-same-mode group has one hub StopPoint, the hub survives
 * and every platform id in the group is folded into its `alsoNaptanIds`.
 * Where a group has no hub (e.g. Clapham Junction's two National Rail
 * TIPLOC-based ids, or West Croydon's tram hub + platform + a *different*
 * mode's own id), the lowest-sorting id becomes primary and the rest go into
 * `alsoNaptanIds` — no stop, hub or platform, is ever dropped entirely; ids
 * that don't survive as their own row are always recoverable via
 * `alsoNaptanIds` (see resolveTflStops in lib/providers/uk/catalog.js).
 */
export function dedupeTflStops(rawStops) {
  const groups = new Map();
  for (const stop of rawStops) {
    const key = `${stop.name}::${(stop.modes ?? []).join(",")}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(stop);
  }

  const result = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      const [only] = group;
      result.push({ ...only, alsoNaptanIds: only.alsoNaptanIds ?? [] });
      continue;
    }

    const classified = group.map((stop) => ({
      stop,
      kind: classifyNaptanKind(stop.naptanId, stop.stopType),
    }));
    const hubs = classified.filter((c) => c.kind === "hub");

    let survivors = classified;
    if (hubs.length === 1) {
      survivors = hubs;
    }

    const sorted = [...survivors].sort((a, b) => a.stop.naptanId.localeCompare(b.stop.naptanId));
    const primary = sorted[0].stop;
    const also = new Set(primary.alsoNaptanIds ?? []);
    for (const stop of group) {
      if (stop.naptanId !== primary.naptanId) {
        also.add(stop.naptanId);
      }
    }

    result.push({
      ...primary,
      lines: mergeLines(group),
      alsoNaptanIds: [...also].sort(),
    });
  }

  return result;
}

async function tflFetch(key, path) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.tfl.gov.uk${path}${sep}app_key=${encodeURIComponent(key)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TfL ${response.status} ${path}`);
  }
  return response.json();
}

async function buildFromLiveApi(key) {
  const lines = await tflFetch(key, `/Line/Mode/${TFL_MODES}`);
  const rawStops = [];
  const seen = new Set();

  for (const line of lines ?? []) {
    const lineId = line.id;
    const lineName = line.name;
    const stopPoints = await tflFetch(key, `/Line/${encodeURIComponent(lineId)}/StopPoints`);
    for (const stop of stopPoints ?? []) {
      const naptanId = stop.naptanId || stop.id;
      if (!naptanId || seen.has(naptanId)) {
        continue;
      }
      const modes = (stop.modes ?? [])
        .map((m) => String(m).toLowerCase())
        .filter((m) => TFL_RAIL.has(m));
      if (!modes.length) {
        continue;
      }
      seen.add(naptanId);
      rawStops.push({
        name: stop.commonName || stop.name,
        naptanId,
        stopType: stop.stopType || null,
        modes,
        lines: [lineName],
        lat: stop.lat ?? null,
        lng: stop.lon ?? stop.lng ?? null,
        aliases: [],
      });
    }
  }

  // Merge line names for stops visited on multiple lines (pre-dedupe; the
  // dedupe pass below also merges lines across folded-in platform/hub rows).
  for (const stop of rawStops) {
    stop.lines = [...new Set(stop.lines)].sort();
  }

  const deduped = dedupeTflStops(rawStops).map((stop) => {
    // stopType was only needed for classification; drop it from the
    // persisted shape so it matches the pre-existing schema.
    const { stopType, ...rest } = stop;
    return rest;
  });

  const payload = {
    region: "uk-london-tfl",
    displayName: "London",
    timeZone: "Europe/London",
    source: "TfL Unified API Line/StopPoints",
    retrievedAt: new Date().toISOString().slice(0, 10),
    feeds: { tfl: "unified-api" },
    modes: ["tube", "elizabeth-line", "dlr", "overground", "tram"],
    notInRegion: ["bus", "river-bus", "coach", "national-rail-only"],
    stopCount: deduped.length,
    stops: deduped,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `Wrote ${deduped.length} TfL stops (${rawStops.length} raw StopPoints before dedupe) — live TFL_APP_KEY rebuild.`
  );
}

function applyPostProcessDedupe() {
  if (!existsSync(OUT_PATH)) {
    console.error(`No existing catalog at ${OUT_PATH} to post-process — set TFL_APP_KEY instead.`);
    process.exit(1);
  }
  const existing = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  const rawStops = existing.stops ?? existing.stations ?? [];
  const deduped = dedupeTflStops(rawStops);

  const payload = {
    ...existing,
    retrievedAt: new Date().toISOString().slice(0, 10),
    stopCount: deduped.length,
    stops: deduped,
  };
  delete payload.stations;

  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `Post-processed ${rawStops.length} -> ${deduped.length} TfL stops (dedupe pass, no TFL_APP_KEY — not a live rebuild).`
  );
}

async function main() {
  const key = String(process.env.TFL_APP_KEY ?? "").trim();
  if (!key) {
    console.warn(
      "TFL_APP_KEY not set — applying the platform/hub dedupe as a post-processing pass over " +
        "the existing lib/cities/uk-london-tfl/stops.json instead of a live rebuild."
    );
    applyPostProcessDedupe();
    return;
  }
  await buildFromLiveApi(key);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
