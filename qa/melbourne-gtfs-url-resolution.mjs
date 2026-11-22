#!/usr/bin/env node
/**
 * Network-free proof that Melbourne's statewide GTFS download URL is resolved from the CKAN dataset
 * record, not pinned (docs/jim-brief-melbourne-gtfs-url-404.md). The pinned resource UUID
 * fb152201-... started 404ing on 25 Oct 2026 and the refresh failed until 21 Nov.
 */
import { readFileSync } from "node:fs";
import {
  STATEWIDE_DATASET_API_URL,
  pickStatewideGtfsUrl,
  resolveStatewideGtfsUrl,
  resolveOuterZipBytes,
} from "../scripts/trim-melbourne-gtfs.mjs";
import { REFRESH_UNITS } from "../scripts/refresh-hand-published-gtfs.mjs";

const ckan = JSON.parse(readFileSync(new URL("./fixtures/melbourne/ckan-gtfs-schedule.json", import.meta.url), "utf8"));
const DEAD = "fb152201-859f-4882-9206-b768060b50ad";
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const fixtureFetch = async (url) => {
  const u = String(url);
  if (u === STATEWIDE_DATASET_API_URL) return new Response(JSON.stringify(ckan), { status: 200 });
  if (u.includes(DEAD)) return new Response("gone", { status: 404 });
  return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
};

// 1. The resolver returns the URL listed on the dataset, never the dead pinned resource.
const url = await resolveStatewideGtfsUrl({ fetchImpl: fixtureFetch });
check(url === ckan.result.resources[0].url, `resolver returned ${url}`);
check(!url.includes(DEAD), "resolver returned the dead pinned resource");

// 2. The download path follows the resolved URL (a pinned dead URL would 404 here).
const bytes = await resolveOuterZipBytes("--download", { fetchImpl: fixtureFetch });
check(bytes.length === 3, "download did not follow the resolved URL");

// 3. Reissue: a new resource UUID on the dataset is picked up with no code change.
const reissued = {
  ...ckan,
  result: {
    ...ckan.result,
    resources: [
      { ...ckan.result.resources[0], url: "https://example.test/new/gtfs.zip", last_modified: "2027-01-01T00:00:00" },
      ckan.result.resources[0],
    ],
  },
};
check(pickStatewideGtfsUrl(reissued) === "https://example.test/new/gtfs.zip", "newest ZIP resource not preferred");

// 3b. A newer non-GTFS ZIP (docs, GTFS-RT) on the record must not be picked over the GTFS schedule.
const withDocsZip = {
  ...ckan,
  result: {
    ...ckan.result,
    resources: [
      { id: "x", format: "ZIP", name: "Data dictionary", url: "https://example.test/docs/dictionary.zip", last_modified: "2027-06-01T00:00:00" },
      ckan.result.resources[0],
    ],
  },
};
check(pickStatewideGtfsUrl(withDocsZip) === ckan.result.resources[0].url, "picked a non-GTFS ZIP resource");
const onlyDocsZip = { success: true, result: { resources: [{ format: "ZIP", name: "Docs", url: "https://example.test/docs.zip" }] } };
try {
  pickStatewideGtfsUrl(onlyDocsZip);
  failures.push("non-GTFS-only ZIP list: did not throw");
} catch (err) {
  check(/no ZIP resource/.test(err.message), `non-GTFS-only ZIP list: unclear error "${err.message}"`);
}

// 3c. The scheduled refresh's melbourne probe resolves from CKAN too (not a pinned probeUrl).
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = fixtureFetch;
  try {
    const unit = REFRESH_UNITS.find((u) => u.id === "melbourne");
    check(typeof unit?.resolveProbeUrl === "function", "melbourne refresh unit has no resolveProbeUrl");
    check(!unit?.probeUrl, "melbourne refresh unit pins a probeUrl");
    const probeUrl = await unit?.resolveProbeUrl?.();
    check(probeUrl === ckan.result.resources[0].url, `refresh probe resolved ${probeUrl}`);
  } finally {
    globalThis.fetch = realFetch;
  }
}

// 4. Clear errors on resolution failure.
const cases = [
  ["CKAN HTTP error", () => resolveStatewideGtfsUrl({ fetchImpl: async () => new Response("x", { status: 503 }) }), /dataset lookup failed: HTTP 503/],
  ["no ZIP resource", async () => pickStatewideGtfsUrl({ success: true, result: { resources: [{ format: "CSV", url: "x" }] } }), /no ZIP resource/],
  ["malformed body", async () => pickStatewideGtfsUrl({ success: false }), /no resources/],
];
for (const [label, fn, re] of cases) {
  try {
    await fn();
    failures.push(`${label}: did not throw`);
  } catch (err) {
    check(re.test(err.message), `${label}: unclear error "${err.message}"`);
  }
}

// 5. No pinned resource UUID may creep back into the scripts (comments excluded).
for (const f of ["../scripts/trim-melbourne-gtfs.mjs", "../scripts/refresh-hand-published-gtfs.mjs", "../scripts/publish-melbourne-gtfs-to-blob.mjs"]) {
  const src = readFileSync(new URL(f, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("//"))
    .join("\n");
  check(!/\/resource\/[0-9a-f]{8}-/.test(src), `${f} pins a resource UUID`);
}

if (failures.length) {
  console.error("FAIL melbourne-gtfs-url-resolution\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("PASS melbourne-gtfs-url-resolution");
