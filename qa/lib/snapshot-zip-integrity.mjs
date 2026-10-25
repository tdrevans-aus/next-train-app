/**
 * Pure content-integrity inspection of a published GTFS static snapshot zip, extracted verbatim
 * from qa/gtfs-live-blob-snapshot-integrity.mjs so offline checks can run the exact same logic
 * against a locally produced zip (docs/jim-brief-snapshot-feed-info.md). Do not loosen.
 */
import { parseCsv } from "../../lib/providers/gtfs/csv.js";
import { calendarRangeFromTrimmedOutput } from "../../lib/providers/gtfs/snapshot-manifest.js";

// Substrings that should never appear in a real transit agency's
// feed_publisher_name — deliberately narrow (our own product name, and the
// words used for test/placeholder data) to avoid false positives against a
// real agency's name.
export const SYNTHETIC_PUBLISHER_MARKERS = ["next-train", "dogfood", "fixture", "placeholder", "synthetic"];

// Structural signals that don't depend on any naming convention — harder to
// fake by accident than a publisher string. Newcastle's dogfood fixture was
// 2041 bytes, 2 trips, and a calendar spanning 20260101-20271231 (~730
// days); a genuine published feed for any of these cities is comfortably
// past all three thresholds. These are deliberately conservative (a real
// feed should never be this close to the line) to avoid false positives.
export const MIN_ZIP_BYTES = 5 * 1024;
export const MIN_TRIP_COUNT = 5;
export const MAX_CALENDAR_SPAN_DAYS = 400;

function findEntry(files, name) {
  return Object.keys(files).find((entry) => entry === name || entry.endsWith(`/${name}`)) ?? null;
}

function readTableText(files, name) {
  const key = findEntry(files, name);
  return key ? Buffer.from(files[key]).toString("utf8") : null;
}

function parseYyyymmdd(value) {
  const text = String(value ?? "");
  if (!/^\d{8}$/.test(text)) return null;
  return Date.UTC(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)));
}

export function calendarSpanDays(calendarText, calendarDatesText) {
  const range = calendarRangeFromTrimmedOutput({
    "calendar.txt": calendarText ?? "",
    "calendar_dates.txt": calendarDatesText ?? "",
  });
  const start = parseYyyymmdd(range.minDate);
  const end = parseYyyymmdd(range.maxDate);
  if (start === null || end === null) return null;
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/**
 * @param {Record<string, Uint8Array>} files unzipped snapshot
 * @param {number} zipBytes compressed size of the zip
 * @returns {{ reasons: string[], marker: string|undefined, publisher: string }}
 */
export function inspectSnapshotZip(files, zipBytes) {
  const feedInfoText = readTableText(files, "feed_info.txt");
  const feedInfoRow = feedInfoText ? (parseCsv(feedInfoText)[0] ?? null) : null;
  const publisher = String(feedInfoRow?.feed_publisher_name ?? "");
  const marker = SYNTHETIC_PUBLISHER_MARKERS.find((needle) => publisher.toLowerCase().includes(needle));

  const tripsText = readTableText(files, "trips.txt");
  const tripCount = tripsText ? parseCsv(tripsText).length : null;

  const calendarText = readTableText(files, "calendar.txt");
  const calendarDatesText = readTableText(files, "calendar_dates.txt");
  const spanDays = calendarSpanDays(calendarText, calendarDatesText);

  const reasons = [];

  if (marker) {
    reasons.push(`feed_info.feed_publisher_name ("${publisher}") looks like test/dogfood data (matched "${marker}")`);
    // The specific, already-diagnosed incident (docs/jim-brief-newcastle-
    // stale-snapshot.md) is Newcastle's blob carrying such a publisher string; the gate
    // decides "known" per city.
  }
  if (!feedInfoText) {
    reasons.push("feed_info.txt is missing from the published zip entirely (failing closed — absence is not evidence of a real feed)");
  }
  if (zipBytes < MIN_ZIP_BYTES) {
    reasons.push(`published zip is only ${zipBytes} bytes (< ${MIN_ZIP_BYTES}) — implausibly small for a real feed`);
  }
  if (tripCount !== null && tripCount < MIN_TRIP_COUNT) {
    reasons.push(`trips.txt has only ${tripCount} trip(s) (< ${MIN_TRIP_COUNT}) — implausibly few for a real feed`);
  }
  if (spanDays !== null && spanDays > MAX_CALENDAR_SPAN_DAYS) {
    reasons.push(`calendar spans ${spanDays} days (> ${MAX_CALENDAR_SPAN_DAYS}) — implausibly long, characteristic of a perpetual test calendar`);
  }

  return { reasons, marker, publisher };
}
