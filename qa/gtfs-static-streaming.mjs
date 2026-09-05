/**
 * Streaming GTFS static parser — regression gate for the ERR_STRING_TOO_LONG
 * fix in lib/providers/gtfs/static-cache.js (see docs/jim-brief-gtfs-streaming-parser.md).
 *
 * Builds a small fixture directory containing:
 *   - a quoted field with an embedded comma (stop_times.txt stop_headsign),
 *   - a CRLF-terminated row mixed in among LF-terminated rows,
 *   - a stop_times.txt large enough (> STREAM_CHUNK_BYTES, currently 4MB) to
 *     span at least two decoder chunks,
 * then asserts the streaming parser's stop_times output equals a whole-buffer
 * (`TextDecoder().decode()` over the entire file) reference parse of the same
 * fixture — i.e. filter semantics/row contents are unchanged by chunking.
 *
 * Usage: node qa/gtfs-static-streaming.mjs
 */
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  loadGtfsStaticFromDirectory,
  clearGtfsStaticCaches,
} from "../lib/providers/gtfs/static-cache.js";
import { parseCsvLine } from "../lib/providers/gtfs/csv.js";

const STREAM_CHUNK_BYTES = 4 * 1024 * 1024;
const ROW_COUNT = 250_000; // ~35 bytes/row -> comfortably > 2 chunks

function fail(message) {
  console.error(`gtfs-static-streaming: ${message}`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "gtfs-streaming-fixture-"));

try {
  writeFileSync(
    join(dir, "routes.txt"),
    "route_id,agency_id,route_short_name,route_long_name,route_type\n" +
      "R1,AG1,R1,Route One,2\n"
  );
  writeFileSync(
    join(dir, "trips.txt"),
    "trip_id,route_id,service_id\nT0001,R1,SVC1\n"
  );
  writeFileSync(
    join(dir, "stops.txt"),
    "stop_id,stop_name,stop_lat,stop_lon\n" +
      "S0001,Stop One,0,0\nS0002,Stop Two,0,0\nS0003,Stop Three,0,0\n"
  );
  writeFileSync(
    join(dir, "calendar.txt"),
    "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
  );
  writeFileSync(join(dir, "calendar_dates.txt"), "service_id,date,exception_type\n");

  // stop_times.txt: header, one quoted-field row, one CRLF row, then a bulk
  // of plain LF rows large enough to span multiple decoder chunks.
  const header = "trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign\n";
  const quotedRow = 'T0001,08:00:00,08:00:01,S0001,1,"Zug, via X"\n';
  const crlfRow = "T0001,08:00:02,08:00:03,S0002,2,plain\r\n";

  const lines = [header, quotedRow, crlfRow];
  for (let i = 3; i < ROW_COUNT; i += 1) {
    const stopId = `S000${(i % 3) + 1}`;
    lines.push(`T0001,08:${String(10 + (i % 40)).padStart(2, "0")}:00,08:${String(10 + (i % 40)).padStart(2, "0")}:01,${stopId},${i},h${i}\n`);
  }
  const stopTimesPath = join(dir, "stop_times.txt");
  writeFileSync(stopTimesPath, lines.join(""));

  const fileSize = readFileSync(stopTimesPath).length;
  if (fileSize <= STREAM_CHUNK_BYTES) {
    fail(`fixture stop_times.txt too small to span two chunks (${fileSize} bytes)`);
  }

  // Reference: whole-buffer decode + parse, mirroring the pre-streaming code path.
  const wholeText = new TextDecoder("utf-8").decode(readFileSync(stopTimesPath));
  const refLines = wholeText.split("\n").filter((line) => line.length);
  const refHeader = parseCsvLine(refLines[0].replace(/\r$/, ""));
  const referenceRows = refLines.slice(1).map((rawLine) => {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    const values = parseCsvLine(line);
    const row = {};
    for (let col = 0; col < refHeader.length; col += 1) {
      row[refHeader[col]] = values[col] ?? "";
    }
    return row;
  });

  clearGtfsStaticCaches();
  const data = loadGtfsStaticFromDirectory(dir, {});
  const streamedRows = [...data.stopTimesByStopId.values()].flat();

  if (streamedRows.length !== referenceRows.length) {
    fail(
      `row count mismatch: streamed ${streamedRows.length} vs whole-buffer reference ${referenceRows.length}`
    );
  }

  // Order within a stop bucket follows encounter order for that stop, so sort
  // both sides by (stop_id, stop_sequence) before comparing row-for-row.
  const sortKey = (row) => `${row.stop_id}::${String(row.stop_sequence).padStart(10, "0")}`;
  streamedRows.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));
  referenceRows.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));

  for (let i = 0; i < referenceRows.length; i += 1) {
    const a = streamedRows[i];
    const b = referenceRows[i];
    for (const key of Object.keys(b)) {
      if (a[key] !== b[key]) {
        fail(
          `row ${i} field "${key}" mismatch: streamed=${JSON.stringify(a[key])} reference=${JSON.stringify(b[key])}`
        );
      }
    }
  }

  const quoted = streamedRows.find((row) => row.stop_headsign === "Zug, via X");
  if (!quoted) {
    fail("quoted field with embedded comma did not parse correctly");
  }

  const crlf = streamedRows.find((row) => row.stop_sequence === "2" && row.stop_headsign === "plain");
  if (!crlf) {
    fail("CRLF-terminated row did not parse correctly");
  }

  console.log(
    `gtfs-static-streaming: ok (${streamedRows.length} rows, ${fileSize} bytes, ${Math.ceil(
      fileSize / STREAM_CHUNK_BYTES
    )} chunks)`
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
