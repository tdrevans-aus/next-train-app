/**
 * Coverage-notes gate — docs/jim-brief-help-coverage-notes.md.
 *
 * Every live city (registry status === "live") must ship
 * lib/cities/<city>/coverage.json: rider prose describing what the board does and
 * doesn't show, so a rider can trust the app instead of guessing. This gate checks
 * shape only — factual accuracy against oracle reports is Mark's spot-check, not
 * mechanically enforceable.
 *
 * Offline pure-Node gate — no dev server. Usage: node qa/coverage-notes-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CITIES } from "../lib/providers/registry.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

const liveIds = CITIES.filter((city) => city.status === "live").map((city) => city.id);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function checkListItem(city, listName, item, index) {
  const where = `${city} ${listName}[${index}]`;
  if (typeof item?.label !== "string" || !item.label.trim()) {
    fail(`${where} missing a label`);
  }
  if (listName === "partial" || listName === "notCovered") {
    if (typeof item?.detail !== "string" || !item.detail.trim()) {
      fail(`${where} missing a detail (every partial/notCovered item needs one)`);
    }
  }
  const text = `${item?.label || ""} ${item?.detail || ""}`;
  if (/TODO/i.test(text)) {
    fail(`${where} contains a TODO string`);
  }
}

for (const city of liveIds) {
  const file = join(ROOT, "lib", "cities", city, "coverage.json");
  if (!existsSync(file)) {
    fail(`missing lib/cities/${city}/coverage.json`);
    continue;
  }
  let json;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    fail(`${city} coverage.json is not valid JSON: ${err.message}`);
    continue;
  }

  if (json.region !== city) {
    fail(`${city} coverage.json 'region' field is '${json.region}', expected '${city}'`);
  }
  if (!DATE_RE.test(json.updated)) {
    fail(`${city} coverage.json 'updated' must be a YYYY-MM-DD date, got '${json.updated}'`);
  }
  for (const listName of ["covered", "partial", "notCovered"]) {
    if (!Array.isArray(json[listName])) {
      fail(`${city} coverage.json '${listName}' must be an array`);
      continue;
    }
    json[listName].forEach((item, index) => checkListItem(city, listName, item, index));
  }
  if (typeof json.stations !== "string" || !json.stations.trim()) {
    fail(`${city} coverage.json missing a 'stations' string`);
  }
  if (typeof json.notes !== "string") {
    fail(`${city} coverage.json 'notes' must be a string (can be empty)`);
  }
  const whole = JSON.stringify(json);
  if (/TODO/i.test(whole)) {
    fail(`${city} coverage.json contains a TODO string`);
  }
  if (/\bD1\b|\boracle\b|CRS\b/i.test(whole)) {
    fail(`${city} coverage.json reads like pipeline notes, not rider prose (found a D1/oracle/CRS reference)`);
  }
}

if (failures > 0) {
  console.error(`coverage-notes-gate: ${failures} failure(s)`);
  process.exit(1);
}

console.log(`PASS coverage-notes-gate — ${liveIds.length} live cities all have a valid coverage.json`);
