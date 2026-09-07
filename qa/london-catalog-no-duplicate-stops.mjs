/**
 * London TfL catalog dedupe gate — docs/jim-brief-london-tram-duplicate-stops.md.
 *
 * TfL's Line/StopPoints endpoint returns both a hub StopPoint and one row per
 * platform for Tramlink (and a couple of National Rail pairs), which used to
 * make almost every London Trams stop show 2-3 times in the picker with no
 * way to tell the rows apart. `scripts/build-uk-london-tfl-catalog.mjs` now
 * folds those into a single row per (name, mode) with the dropped ids kept
 * on `alsoNaptanIds`.
 *
 * Runs offline against the committed lib/cities/uk-london-tfl/stops.json —
 * no network, no TFL_APP_KEY.
 *
 *   node qa/london-catalog-no-duplicate-stops.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { resolveTflStops } from "../lib/providers/uk/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_PATH = join(ROOT, "lib/cities/uk-london-tfl/stops.json");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const stops = catalog.stops ?? [];
  assert(stops.length > 0, "uk-london-tfl catalog is empty");
  assert(
    catalog.stopCount === stops.length,
    `stopCount header (${catalog.stopCount}) must match stops.length (${stops.length})`
  );

  // A1: no name+mode duplicates remain — every group sharing a printed name
  // must differ in modes (Bank tube/DLR etc. are fine; two identical-mode
  // rows for the same name, e.g. Addington Village tram x3, are not).
  const byName = new Map();
  for (const stop of stops) {
    if (!byName.has(stop.name)) {
      byName.set(stop.name, []);
    }
    byName.get(stop.name).push(stop);
  }

  const sameModeDuplicates = [];
  for (const [name, group] of byName) {
    if (group.length <= 1) {
      continue;
    }
    const modeSignatures = group.map((s) => (s.modes ?? []).join(","));
    const uniqueSignatures = new Set(modeSignatures);
    if (uniqueSignatures.size < group.length) {
      sameModeDuplicates.push({ name, ids: group.map((s) => s.naptanId) });
    }
  }

  assert(
    sameModeDuplicates.length === 0,
    `A1 FAILED: ${sameModeDuplicates.length} station name(s) still have same-mode duplicate ` +
      `rows: ${JSON.stringify(sameModeDuplicates.slice(0, 5))}`
  );
  console.log(`PASS A1: 0 same-mode duplicate station names (${stops.length} rows).`);

  // A4: a saved route/pin that stored a dropped platform id (or the plain
  // name) still resolves to the surviving primary row via alsoNaptanIds.
  const foldedExamples = stops.filter((s) => (s.alsoNaptanIds ?? []).length > 0);
  assert(foldedExamples.length > 0, "Expected at least one row with alsoNaptanIds after dedupe");

  const addington = stops.find((s) => s.name === "Addington Village");
  assert(addington, "Addington Village missing from catalog");
  assert(
    (addington.alsoNaptanIds ?? []).includes("9400ZZCRADV1"),
    "Addington Village primary row must record its folded platform id 9400ZZCRADV1"
  );

  const resolved = resolveTflStops("9400ZZCRADV1", "uk-london-tfl");
  assert(
    resolved.length === 1 && resolved[0].naptanId === addington.naptanId,
    `A4 FAILED: resolveTflStops("9400ZZCRADV1") must resolve to the Addington Village primary ` +
      `row (${addington.naptanId}), got ${JSON.stringify(resolved.map((r) => r.naptanId))}`
  );
  console.log(
    `PASS A4: resolveTflStops("9400ZZCRADV1") resolves to primary row ${addington.naptanId}.`
  );

  // Sanity: every folded id resolves back to its primary row too, not just
  // the Addington example above.
  let checked = 0;
  for (const stop of foldedExamples) {
    for (const alsoId of stop.alsoNaptanIds) {
      const matches = resolveTflStops(alsoId, "uk-london-tfl");
      assert(
        matches.length === 1 && matches[0].naptanId === stop.naptanId,
        `Dropped id ${alsoId} must resolve to primary row ${stop.naptanId}, got ` +
          `${JSON.stringify(matches.map((m) => m.naptanId))}`
      );
      checked += 1;
    }
  }
  console.log(`PASS: all ${checked} folded-in ids across ${foldedExamples.length} rows resolve back to their primary.`);
}

try {
  main();
  console.log("london-catalog-no-duplicate-stops: PASS");
} catch (error) {
  console.error(`london-catalog-no-duplicate-stops: FAIL — ${error.message}`);
  process.exit(1);
}
