/**
 * Build lib/cities/uk-london-tfl/stops.json from TfL Unified API.
 * Requires TFL_APP_KEY. Do not hand-type 272+ stations.
 *
 *   node scripts/build-uk-london-tfl-catalog.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "../lib/load-env-local.js";

loadEnvLocal();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TFL_MODES = "tube,overground,elizabeth-line,dlr,tram";
const TFL_RAIL = new Set(["tube", "overground", "elizabeth-line", "dlr", "tram"]);

const key = String(process.env.TFL_APP_KEY ?? "").trim();
if (!key) {
  console.error("Set TFL_APP_KEY");
  process.exit(1);
}

async function tflFetch(path) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.tfl.gov.uk${path}${sep}app_key=${encodeURIComponent(key)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TfL ${response.status} ${path}`);
  }
  return response.json();
}

const lines = await tflFetch(`/Line/Mode/${TFL_MODES}`);
const stops = [];
const seen = new Set();

for (const line of lines ?? []) {
  const lineId = line.id;
  const lineName = line.name;
  const stopPoints = await tflFetch(`/Line/${encodeURIComponent(lineId)}/StopPoints`);
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
    stops.push({
      name: stop.commonName || stop.name,
      naptanId,
      modes,
      lines: [lineName],
      lat: stop.lat ?? null,
      lng: stop.lon ?? stop.lng ?? null,
      aliases: [],
    });
  }
}

// Merge line names for stops visited on multiple lines
for (const stop of stops) {
  stop.lines = [...new Set(stop.lines)].sort();
}

const payload = {
  region: "uk-london-tfl",
  displayName: "London TfL",
  timeZone: "Europe/London",
  source: "TfL Unified API Line/StopPoints",
  retrievedAt: new Date().toISOString().slice(0, 10),
  feeds: { tfl: "unified-api" },
  modes: ["tube", "elizabeth-line", "dlr", "overground", "tram"],
  notInRegion: ["bus", "river-bus", "coach", "national-rail-only"],
  stopCount: stops.length,
  stops,
};

const outDir = join(ROOT, "lib/cities/uk-london-tfl");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "stops.json"), JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${stops.length} TfL stops`);
