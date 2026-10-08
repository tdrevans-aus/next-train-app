/**
 * Offline — every live city whose provider reads gtfsFixtureBlobUrl() must be covered by a
 * scheduled refresh (docs/jim-brief-scheduled-snapshot-refresh.md, item 5), so the next city
 * added can't be forgotten the way Melbourne/Prague were.
 *
 * Covered = listed in scripts/refresh-hand-published-gtfs.mjs REFRESH_UNITS (daily GitHub
 * Actions workflow), or in AUTO_REFRESHED_ELSEWHERE and actually named in lib/gtfs-refresh.js
 * (the Vercel cron). Also unit-tests decideRefresh() and checks the workflow wires the secrets.
 *
 * Usage: node qa/hand-published-snapshot-coverage-gate.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES } from "../lib/providers/registry.js";
import { REFRESH_UNITS, AUTO_REFRESHED_ELSEWHERE, decideRefresh } from "../scripts/refresh-hand-published-gtfs.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROVIDERS_DIR = path.join(ROOT, "lib", "providers");

const blobBacked = new Set();
const callRe = /gtfsFixtureBlobUrl\(\s*["'`]([a-z0-9-]+)["'`]\s*\)/g;
for (const entry of fs.readdirSync(PROVIDERS_DIR, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  const text = fs.readFileSync(path.join(PROVIDERS_DIR, entry.name), "utf8");
  let m;
  while ((m = callRe.exec(text))) blobBacked.add(m[1]);
}
const live = new Set(CITIES.filter((c) => c.status === "live").map((c) => c.id));
// melbourne-vline is not a registry city; it rides with melbourne.
const liveBlobCityIds = [...blobBacked].filter((id) => live.has(id) || live.has(id.replace(/-vline$/, "")));
assert.ok(liveBlobCityIds.length >= 8, `scan found suspiciously few blob-backed live cities: ${liveBlobCityIds}`);

const refreshText = fs.readFileSync(path.join(ROOT, "lib", "gtfs-refresh.js"), "utf8");
const covered = new Set(REFRESH_UNITS.flatMap((u) => u.blobCities));
for (const id of AUTO_REFRESHED_ELSEWHERE) {
  assert.ok(refreshText.includes(`"${id}"`) || refreshText.includes(`'${id}'`), `AUTO_REFRESHED_ELSEWHERE lists ${id} but lib/gtfs-refresh.js does not mention it`);
  covered.add(id);
}
const uncovered = liveBlobCityIds.filter((id) => !covered.has(id));
assert.deepEqual(
  uncovered,
  [],
  `live city(ies) read a Blob GTFS snapshot but no scheduled refresh covers them: ${uncovered.join(", ")}. ` +
    "Add a unit to REFRESH_UNITS in scripts/refresh-hand-published-gtfs.mjs (and its workflow secrets)."
);

// Every unit has commands and every required env var is wired into the workflow.
const workflow = fs.readFileSync(path.join(ROOT, ".github", "workflows", "refresh-hand-published-gtfs.yml"), "utf8");
assert.match(workflow, /BLOB_READ_WRITE_TOKEN: \$\{\{ secrets\.BLOB_READ_WRITE_TOKEN \}\}/);
assert.match(workflow, /schedule:/, "workflow must be scheduled");
for (const unit of REFRESH_UNITS) {
  assert.ok(unit.commands?.length, `${unit.id}: no commands`);
  for (const name of unit.requiredEnv ?? []) {
    assert.ok(workflow.includes(`${name}: \${{ secrets.${name} }}`), `${unit.id}: workflow does not pass secret ${name}`);
  }
}

// decideRefresh() behaviour.
const now = new Date("2026-10-08T12:00:00Z");
const manifest = { etag: '"a"', publishedAt: "2026-10-07T00:00:00Z" };
const same = { changed: false, reason: "unchanged" };
const diff = { changed: true, reason: "changed" };
assert.equal(decideRefresh({ manifest, probe: same, calendarMaxDate: "20261231", now }).refresh, false, "unchanged + healthy -> skip");
assert.equal(decideRefresh({ manifest, probe: diff, calendarMaxDate: "20261231", now }).refresh, true, "changed upstream -> refresh");
const shortUnchanged = decideRefresh({ manifest, probe: same, calendarMaxDate: "20261012", now });
assert.equal(shortUnchanged.refresh, false, "unchanged upstream: republishing identical data cannot help");
assert.ok(shortUnchanged.warn, "...but a short calendar must warn");
assert.equal(decideRefresh({ manifest, probe: same, calendarMaxDate: "20261001", now }).refresh, true, "already expired -> refresh");
assert.equal(decideRefresh({ manifest, probe: same, calendarMaxDate: null, now }).refresh, true, "unreadable -> refresh");
assert.equal(decideRefresh({ manifest, probe: same, calendarMaxDate: "20261231", now, force: true }).refresh, true, "force");
// bootstrap (no manifest)
assert.equal(decideRefresh({ manifest: null, probe: same, calendarMaxDate: "20261231", now, blobLastModified: "Wed, 07 Oct 2026 00:00:00 GMT", upstreamLastModified: "Thu, 08 Oct 2026 00:00:00 GMT" }).refresh, true, "no manifest + upstream newer -> refresh");
const adopt = decideRefresh({ manifest: null, probe: same, calendarMaxDate: "20261231", now, blobLastModified: "Thu, 08 Oct 2026 06:00:00 GMT", upstreamLastModified: "Thu, 08 Oct 2026 00:00:00 GMT" });
assert.equal(adopt.refresh, false);
assert.equal(adopt.adopt, true);
assert.equal(decideRefresh({ manifest: null, probe: same, calendarMaxDate: "20261011", now, blobLastModified: "Thu, 08 Oct 2026 06:00:00 GMT", upstreamLastModified: "Thu, 08 Oct 2026 00:00:00 GMT" }).refresh, true, "no manifest + short calendar -> refresh once");
// probe-less (Trafiklab)
assert.equal(decideRefresh({ manifest: { publishedAt: "2026-10-07T00:00:00Z" }, probe: null, calendarMaxDate: "20261231", now }).refresh, false, "probe-less, fresh manifest -> skip");
assert.equal(decideRefresh({ manifest: { publishedAt: "2026-09-25T00:00:00Z" }, probe: null, calendarMaxDate: "20261231", now }).refresh, true, "probe-less, old manifest -> weekly refresh");

console.log(`hand-published-snapshot-coverage-gate: ok (${[...covered].sort().join(", ")})`);
