/**
 * Fill stopId on metro entries in lib/cities/uk-west-midlands/stations.json from TfWM GTFS.
 * Requires TFWM_API_APP_ID + TFWM_API_APP_KEY.
 */
import { createWriteStream, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(ROOT, "lib/cities/uk-west-midlands/stations.json");

const appId = String(process.env.TFWM_API_APP_ID ?? "").trim();
const appKey = String(process.env.TFWM_API_APP_KEY ?? "").trim();
if (!appId || !appKey) {
  console.error("Set TFWM_API_APP_ID and TFWM_API_APP_KEY");
  process.exit(1);
}

const url = `http://api.tfwm.org.uk/gtfs/tfwm_gtfs.zip?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`;
const response = await fetch(url);
if (!response.ok) {
  console.error(`GTFS fetch failed: ${response.status}`);
  process.exit(1);
}

const tmpZip = join(ROOT, "_tmp-tfwm-gtfs.zip");
await pipeline(Readable.fromWeb(response.body), createWriteStream(tmpZip));

const zipBuf = readFileSync(tmpZip);
unlinkSync(tmpZip);

const headerIdx = zipBuf.indexOf("stop_id,stop_code,stop_name");
if (headerIdx < 0) {
  throw new Error("GTFS stops.txt header not found");
}
const slice = zipBuf.subarray(headerIdx, headerIdx + 500000).toString("utf8");
const stopMap = new Map();
for (const line of slice.split(/\r?\n/).slice(1)) {
  if (!line || line.startsWith("PK")) {
    break;
  }
  const cols = line.split(",");
  const stopId = cols[0]?.trim();
  const stopName = cols[2]?.trim().replace(/^"|"$/g, "");
  if (stopId && stopName) {
    stopMap.set(stopName.toLowerCase(), stopId);
  }
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
let matched = 0;
for (const stop of catalog.stops ?? []) {
  if (stop.mode !== "metro") {
    continue;
  }
  const id = stopMap.get(stop.name.toLowerCase());
  if (id) {
    stop.stopId = id;
    matched += 1;
  }
}

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
console.log(`enrich-wm-metro-stop-ids: matched ${matched} metro stops`);
