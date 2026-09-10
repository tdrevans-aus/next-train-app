/**
 * Build/refresh a small, committable "calendar-only" GTFS fixture for a
 * city's dogfood-gate staleness check
 * (docs/jim-brief-blob-transfer-reduction.md, item 1).
 *
 * qa/*-dogfood-gate.mjs's `assertSnapshotNotStaleTodayOrSkip` call used to
 * load each city's REAL, LIVE static snapshot (loadGtfsStatic -> a full zip
 * fetch from the Vercel Blob store or the agency directly) just to check
 * whether calendar.txt/calendar_dates.txt cover today. That made every
 * smoke/CI run pull ~100MB of production Blob transfer for a check that only
 * needs two small tables. Real-snapshot freshness/content is instead
 * monitored on a schedule by qa/prod-sweep.mjs and
 * qa/gtfs-live-blob-snapshot-integrity.mjs — this fixture is for testing our
 * staleness LOGIC against controlled local data, the same separation CLAUDE.md
 * and the brief describe.
 *
 * This script trims a real (or previously-downloaded) GTFS zip down to just
 * calendar.txt (a handful of representative rows spanning the feed's real
 * min/max validity window) plus header-only stops/routes/trips/stop_times/
 * calendar_dates.txt so `loadGtfsStaticFromDirectory` can read the directory
 * without erroring on a missing table. calendar_dates.txt is dropped to
 * header-only whenever it does not extend calendar.txt's own min/max range
 * (true for every feed checked so far) — pass --keep-calendar-dates to
 * preserve it verbatim if that's ever not true for a city.
 *
 * Usage:
 *   node scripts/extract-gtfs-calendar-fixture.mjs <city> <path-to-zip>
 *   node scripts/extract-gtfs-calendar-fixture.mjs <city> <path-to-zip> --keep-calendar-dates
 *
 * Writes qa/fixtures/gtfs-snapshots/<city>/{calendar,calendar_dates,stops,
 * routes,trips,stop_times}.txt + a README documenting source/extracted-on/
 * feed_version/validity window.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { unzipSync } from "../lib/vendor/fflate.mjs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";
import { calendarRangeFromTrimmedOutput } from "../lib/providers/gtfs/snapshot-manifest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const [, , city, zipPath, ...rest] = process.argv;
const keepCalendarDates = rest.includes("--keep-calendar-dates");

if (!city || !zipPath) {
  console.error("Usage: node scripts/extract-gtfs-calendar-fixture.mjs <city> <path-to-zip> [--keep-calendar-dates]");
  process.exit(1);
}

function findEntry(files, name) {
  return Object.keys(files).find((entry) => entry === name || entry.endsWith(`/${name}`)) ?? null;
}

function readTableText(files, name) {
  const key = findEntry(files, name);
  return key ? Buffer.from(files[key]).toString("utf8") : "";
}

const buffer = readFileSync(zipPath);
const files = unzipSync(new Uint8Array(buffer));

const calendarText = readTableText(files, "calendar.txt");
const calendarDatesText = readTableText(files, "calendar_dates.txt");
const feedInfoText = readTableText(files, "feed_info.txt");

const range = calendarRangeFromTrimmedOutput({
  "calendar.txt": calendarText,
  "calendar_dates.txt": calendarDatesText,
});

const calendarRows = calendarText ? parseCsv(calendarText) : [];
const calendarHeader =
  "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date";

// Keep every row that touches the feed's real min or max date, plus up to 8
// more for a representative sample — real data, trimmed for size, not
// fabricated.
const boundaryRows = calendarRows.filter(
  (row) => row.start_date === range.minDate || row.end_date === range.maxDate
);
const otherRows = calendarRows.filter((row) => !boundaryRows.includes(row));
const sampledRows = [...boundaryRows, ...otherRows.slice(0, 8)];

const trimmedCalendarLines = sampledRows.map((row) =>
  [
    row.service_id,
    row.monday,
    row.tuesday,
    row.wednesday,
    row.thursday,
    row.friday,
    row.saturday,
    row.sunday,
    row.start_date,
    row.end_date,
  ].join(",")
);

const calendarDatesRows = calendarDatesText ? parseCsv(calendarDatesText) : [];
const calendarDatesExtendsRange = calendarDatesRows.some(
  (row) => row.date === range.minDate || row.date === range.maxDate
) && !boundaryRows.length; // only meaningful when calendar.txt itself has no boundary row

const outDir = join(ROOT, "qa/fixtures/gtfs-snapshots", city);
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, "calendar.txt"), `${calendarHeader}\n${trimmedCalendarLines.join("\n")}\n`);
writeFileSync(
  join(outDir, "calendar_dates.txt"),
  keepCalendarDates || calendarDatesExtendsRange
    ? `${calendarDatesText.trim()}\n`
    : "service_id,date,exception_type\n"
);
writeFileSync(join(outDir, "stops.txt"), "stop_id,stop_name,stop_lat,stop_lon\n");
writeFileSync(join(outDir, "routes.txt"), "route_id,agency_id,route_short_name,route_long_name,route_type\n");
writeFileSync(join(outDir, "trips.txt"), "trip_id,route_id,service_id\n");
writeFileSync(join(outDir, "stop_times.txt"), "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n");

const feedInfoRow = feedInfoText ? parseCsv(feedInfoText)[0] : null;
const readmeLines = [
  `# ${city} — local calendar-only GTFS fixture`,
  "",
  "Not the whole feed — just enough for `assertSnapshotNotStaleTodayOrSkip` to exercise real",
  "staleness-detection logic without a network fetch",
  "(docs/jim-brief-blob-transfer-reduction.md). `stops.txt`/`routes.txt`/`trips.txt`/",
  "`stop_times.txt` are header-only (loadGtfsStaticFromDirectory requires the file to exist,",
  "but nothing here reads their rows). Real-snapshot freshness in production is monitored on",
  "a schedule by qa/prod-sweep.mjs and qa/gtfs-live-blob-snapshot-integrity.mjs, not here.",
  "",
  `**Source zip:** ${zipPath}`,
  `**Extracted:** ${new Date().toISOString().slice(0, 10)}`,
  feedInfoRow?.feed_version ? `**feed_version:** ${feedInfoRow.feed_version}` : null,
  feedInfoRow?.feed_publisher_name ? `**feed_publisher_name:** ${feedInfoRow.feed_publisher_name}` : null,
  `**Real validity window:** ${range.minDate} .. ${range.maxDate}`,
  "",
  "## Regenerate",
  "",
  "```bash",
  `node scripts/extract-gtfs-calendar-fixture.mjs ${city} <path-to-fresh-zip>`,
  "```",
  "",
  `This fixture stops covering "today" after ${range.maxDate} — the dogfood gate will start`,
  "failing then (correctly: the logic is doing its job) and this needs a refresh with a newer",
  "zip. That is expected maintenance, not a bug.",
  "",
].filter((line) => line !== null);
writeFileSync(join(outDir, "README.md"), readmeLines.join("\n"));

console.log(
  `extract-gtfs-calendar-fixture: wrote qa/fixtures/gtfs-snapshots/${city}/ ` +
    `(validity ${range.minDate}..${range.maxDate}, ${sampledRows.length} calendar rows, ` +
    `calendar_dates ${keepCalendarDates || calendarDatesExtendsRange ? "kept" : "trimmed to header-only"})`
);
