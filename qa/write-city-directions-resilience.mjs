/**
 * Regression gate for docs/jim-brief-write-city-directions-net-crash.md.
 *
 * scripts/write-city-directions.mjs must not abort its whole build when one
 * station's provider throws by design (board-eligibility-rule exclusion,
 * e.g. NET's unconfirmed-GTFS Toton Lane stop). Exercises the exported
 * `writeCityDirections()` helper directly with a stubbed `getDirections` so
 * this gate needs no network/credentials:
 *
 *  (a) a city with one throwing station still gets a file written, and
 *  (b) the thrown station is absent from that file, while
 *  (c) the process-level outcome for that city is "success" (not counted as
 *      failed), and
 *  (d) a city where *every* station throws yields no file and is reported
 *      as a failed city (the caller then exits 1).
 *
 * Usage: node qa/write-city-directions-resilience.mjs
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { writeCityDirections } from "../scripts/write-city-directions.mjs";

function fail(message) {
  console.error(`write-city-directions-resilience: ${message}`);
  process.exit(1);
}

class FakeProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = "FakeProviderError";
  }
}

const outDir = mkdtempSync(join(tmpdir(), "write-city-directions-resilience-"));

try {
  const stations = {
    "partial-city": [{ name: "Good Station" }, { name: "Excluded Station" }],
    "all-fail-city": [{ name: "Only Station" }],
  };

  const warnings = [];
  const logs = [];

  async function getDirections(city, name) {
    if (name === "Excluded Station" || city === "all-fail-city") {
      throw new FakeProviderError(`${city}/${name} is excluded by design\nsome extra detail line`);
    }
    return { directions: [{ label: "Northbound" }] };
  }

  const { failedCities } = await writeCityDirections({
    cities: ["partial-city", "all-fail-city"],
    outDir,
    listStations: (city) => stations[city] || [],
    getDirections,
    log: (line) => logs.push(line),
    warn: (line) => warnings.push(line),
  });

  // (a) partial-city still gets a file.
  const partialFile = join(outDir, "partial-city.json");
  if (!existsSync(partialFile)) {
    fail("partial-city.json was not written despite one successful station");
  }
  const partialContent = JSON.parse(readFileSync(partialFile, "utf8"));

  // (b) the thrown station is absent.
  if ("Excluded Station" in partialContent) {
    fail("Excluded Station should not appear in partial-city.json");
  }
  if (!("Good Station" in partialContent)) {
    fail("Good Station is missing from partial-city.json");
  }

  // A warning line was printed for the excluded station, in the documented shape.
  const excludedWarning = warnings.find((w) => w.includes("Excluded Station"));
  if (!excludedWarning) {
    fail("no warning line was printed for the excluded station");
  }
  if (
    !excludedWarning.startsWith(
      "write-city-directions: partial-city/Excluded Station skipped — FakeProviderError:"
    )
  ) {
    fail(`warning line has unexpected shape: ${excludedWarning}`);
  }
  if (excludedWarning.includes("some extra detail line")) {
    fail("warning line should only include the first line of the error message");
  }

  // (c) partial-city is not counted as a failed city.
  if (failedCities.includes("partial-city")) {
    fail("partial-city should not be in failedCities — it wrote a file");
  }

  // (d) all-fail-city writes nothing and is reported failed.
  const allFailFile = join(outDir, "all-fail-city.json");
  if (existsSync(allFailFile)) {
    fail("all-fail-city.json should not have been written — every station failed");
  }
  if (!failedCities.includes("all-fail-city")) {
    fail("all-fail-city should be reported in failedCities");
  }
  const failedLine = logs.find((l) => l.includes("all-fail-city") && l.includes("FAILED"));
  if (!failedLine || !failedLine.includes("(0/1 stations)")) {
    fail(`expected a FAILED (0/1 stations) log line for all-fail-city, got: ${JSON.stringify(logs)}`);
  }

  console.log("write-city-directions-resilience: PASS");
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
