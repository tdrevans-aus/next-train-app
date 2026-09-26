/**
 * Small, credential-free integrity check for Dublin's published GTFS static snapshot
 * (gtfs/dublin.zip in the shared next-train-gtfs Vercel Blob store), run right after
 * publishing by .github/workflows/publish-gtfs-snapshot.yml.
 *
 * Dublin stays status: "planned" (docs/dublin-d1/jim-handoff.md), so
 * qa/gtfs-live-blob-snapshot-integrity.mjs's coverage — derived from
 * `status: "live"` cities only — never checks it. This is the "small inline check"
 * docs/jim-brief-dublin-blob-publish-action.md asks for as a stand-in: fetch the
 * just-published blob, confirm HTTP 200, a sane zip size, and that stops.txt actually
 * contains Luas stops (not an empty or synthetic snapshot).
 *
 * Usage: node qa/verify-dublin-gtfs-snapshot.mjs
 */
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { gtfsFixtureBlobUrl } from "../lib/providers/gtfs/blob-fixtures.js";

const MIN_BYTES = 5 * 1024;

function findEntry(files, name) {
  return Object.keys(files).find((entry) => entry === name || entry.endsWith(`/${name}`)) ?? null;
}

async function main() {
  const url = gtfsFixtureBlobUrl("dublin");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Published snapshot fetch failed: HTTP ${response.status} for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < MIN_BYTES) {
    throw new Error(`Published snapshot is only ${buffer.length} bytes (< ${MIN_BYTES}) — looks empty or synthetic.`);
  }

  const files = unzipSync(new Uint8Array(buffer));
  const stopsKey = findEntry(files, "stops.txt");
  if (!stopsKey) {
    throw new Error("Published snapshot has no stops.txt.");
  }

  const stopsText = Buffer.from(files[stopsKey]).toString("utf8").toLowerCase();
  if (!stopsText.includes("luas")) {
    throw new Error("stops.txt does not mention Luas anywhere — this does not look like the trimmed Dublin Luas snapshot.");
  }

  console.log(`verify-dublin-gtfs-snapshot: ok (${url}, ${buffer.length} bytes, stops.txt contains Luas stops)`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
