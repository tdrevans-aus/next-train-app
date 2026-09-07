/**
 * Offline — asserts loadGtfsStatic() and fetchTripUpdates() never leak a
 * failing request's query string (API keys) into the thrown Error message.
 * Usage: node qa/gtfs-error-redaction.mjs
 * @see docs/jim-brief-sweden-static-429-and-key-leak.md
 */
import { redactUrl } from "../lib/providers/gtfs/redact-url.js";
import { loadGtfsStatic } from "../lib/providers/gtfs/static-cache.js";
import { fetchTripUpdates } from "../lib/providers/gtfs/realtime.js";

const failures = [];
const SECRET = "SECRET";
const STATIC_URL = `https://example.invalid/x.zip?key=${SECRET}`;
const RT_URL = `https://example.invalid/TripUpdates.pb?key=${SECRET}`;

function assertRedacted(label, message) {
  if (!message.includes("x.zip") && !message.includes("TripUpdates.pb")) {
    failures.push(`${label}: message did not mention the redacted path — "${message}"`);
  }
  if (message.includes(SECRET)) {
    failures.push(`${label}: message leaked the secret — "${message}"`);
  }
}

function unitTestRedactUrl() {
  const redacted = redactUrl(STATIC_URL);
  if (redacted.includes(SECRET)) {
    failures.push(`redactUrl: leaked secret — "${redacted}"`);
  }
  if (!redacted.startsWith("https://example.invalid/x.zip?key=")) {
    failures.push(`redactUrl: unexpected shape — "${redacted}"`);
  }
  const noQuery = redactUrl("https://example.invalid/x.zip");
  if (noQuery !== "https://example.invalid/x.zip") {
    failures.push(`redactUrl: URL with no query string must pass through unchanged, got "${noQuery}"`);
  }
}

async function testStaticDownloadFailure() {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 429, headers: new Map() });
  try {
    await loadGtfsStatic({ url: STATIC_URL });
    failures.push("loadGtfsStatic: expected a throw for a 429 response");
  } catch (err) {
    assertRedacted("loadGtfsStatic", err.message);
  } finally {
    global.fetch = originalFetch;
  }
}

async function testRealtimeFetchFailure() {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 429, headers: new Map() });
  try {
    await fetchTripUpdates(RT_URL);
    failures.push("fetchTripUpdates: expected a throw for a 429 response");
  } catch (err) {
    assertRedacted("fetchTripUpdates", err.message);
  } finally {
    global.fetch = originalFetch;
  }
}

async function main() {
  unitTestRedactUrl();
  await testStaticDownloadFailure();
  await testRealtimeFetchFailure();

  if (failures.length) {
    console.error("gtfs-error-redaction failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("gtfs-error-redaction: ok (static + realtime fetch failures redact query strings)");
}

main();
