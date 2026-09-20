/**
 * jim-brief-donotgroup-picker-disambiguation — two catalog entries sharing a
 * printed name (doNotGroup pairs, e.g. Liverpool Lime Street National Rail
 * vs Merseyrail, Nottingham Station National Rail vs NET tram) must render
 * as visibly distinguishable rows in the station picker, generically for
 * any UK region with such a pair — not hardcoded to one city's station name.
 * Usage: node qa/donotgroup-picker-disambiguation.mjs
 */
import { chromium } from "playwright";
import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { MULTI_CITY_IDS } from "../lib/cities/live-city-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
import { BASE } from "./helpers/dev-server.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Scans every lib/cities/<region>/stations.json for doNotGroup pairs that
 * share an identical printed name — the exact ambiguous-picker shape this
 * brief covers (a doNotGroup pair with two *different* names, e.g. Glasgow's
 * Buchanan Street vs Queen Street, was never ambiguous in the picker and
 * isn't scanned for here). Returns { region, name, modes }[].
 */
function findSameNameDoNotGroupPairs() {
  const citiesDir = path.join(ROOT, "lib", "cities");
  const found = [];
  for (const region of readdirSync(citiesDir)) {
    // This scan is a picker-rendering concern (disambiguationSuffixesFor renders live station
    // combobox rows) — a catalog for a city with no picker entry yet (not in MULTI_CITY_IDS;
    // guardrail: never add a Coming Soon picker entry for a still-planned city, Tim 30 Aug
    // 2026) can't have a real ambiguous-picker-row problem, so it's out of scope here. Chicago
    // (planned, single-mode 'L' catalog) has same-name-different-physical-place families
    // (Western, Belmont, ...) that are a lib/providers/chicago.js AmbiguousChicagoStationError
    // concern, not a cross-modal picker-label concern this script checks for.
    if (!MULTI_CITY_IDS.includes(region)) {
      continue;
    }
    const file = path.join(citiesDir, region, "stations.json");
    if (!existsSync(file)) {
      continue;
    }
    let json;
    try {
      json = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const stops = json.stops ?? json.stations ?? [];
    const byName = new Map();
    for (const stop of stops) {
      if (!stop?.name) {
        continue;
      }
      const modes = byName.get(stop.name) ?? [];
      modes.push(stop.mode ?? null);
      byName.set(stop.name, modes);
    }
    for (const [name, modes] of byName) {
      if (modes.length > 1) {
        found.push({ region, name, modes });
      }
    }
  }
  return found;
}

async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  try {
    spawned = await ensureDevServer();
    const page = await browser.newPage();
    await page.goto(`${BASE}/?test=1`);
    await page.waitForFunction(() => Boolean(window.nextTrainStationCombobox?.disambiguationSuffixesFor));

    // Confirmed cases from the brief: Liverpool City Region's Lime Street
    // (train vs metro) and East Midlands' Nottingham Station (train vs
    // metro). Also exercise a region with no doNotGroup collision (Cumbria)
    // to prove unique names are left alone.
    const result = await page.evaluate(() => {
      const api = window.nextTrainStationCombobox;

      function withStub(city, modesByName, fn) {
        const originalSession = window.NextTrainCitySession;
        const originalDogfood = window.NextTrainBrisbaneDogfood;
        window.NextTrainCitySession = {
          MULTI_CITY_IDS: [city],
          readSavedCity: () => city,
        };
        window.NextTrainBrisbaneDogfood = {
          getCity: () => city,
          getStationModesByName: () => modesByName,
        };
        try {
          return fn();
        } finally {
          window.NextTrainCitySession = originalSession;
          window.NextTrainBrisbaneDogfood = originalDogfood;
        }
      }

      const liverpool = withStub(
        "liverpool-city-region",
        { "Liverpool Lime Street": ["train", "metro"] },
        () =>
          api.disambiguationSuffixesFor([
            "Liverpool Lime Street",
            "Liverpool South Parkway",
            "Liverpool Lime Street",
            "Moorfields",
          ])
      );

      const eastMidlands = withStub(
        "east-midlands",
        { "Nottingham Station": ["train", "metro"] },
        () =>
          api.disambiguationSuffixesFor(["Hucknall", "Nottingham Station", "Nottingham Station"])
      );

      const uniqueNamesOnly = withStub("cumbria", {}, () =>
        api.disambiguationSuffixesFor(["Carlisle", "Oxenholme", "Barrow-in-Furness"])
      );

      return { liverpool, eastMidlands, uniqueNamesOnly };
    });

    const pass =
      result.liverpool.length === 4 &&
      result.liverpool[0] === " — National Rail" &&
      result.liverpool[1] === "" &&
      result.liverpool[2] === " — Merseyrail" &&
      result.liverpool[3] === "" &&
      result.eastMidlands[0] === "" &&
      result.eastMidlands[1] === " — National Rail" &&
      result.eastMidlands[2] === " — NET tram" &&
      result.uniqueNamesOnly.every((suffix) => suffix === "");

    if (!pass) {
      console.error("FAIL", JSON.stringify(result, null, 2));
      process.exit(1);
    }

    // Generic coverage check: every same-name doNotGroup pair currently in
    // the UK catalogs (not just the two the brief happened to name) must get
    // a real, non-generic label for each of its modes — proving the fix
    // covers the whole current set, not just Liverpool/East Midlands.
    // Floor was 8 until 6 Sep 2026, when West Midlands' three Metro/National
    // Rail name clashes (Five Ways, Jewellery Quarter, The Hawthorns) were
    // resolved by renaming the Metro entries "... (Metro)" — the API has no
    // mode parameter, so a picked same-name row always routed to the rail
    // board (docs/jim-brief-uk-west-midlands-metro-shared-names.md, FB-60).
    // Seven pairs remain across five regions; the floor guards the scan, not a
    // specific count.
    const pairs = findSameNameDoNotGroupPairs();
    assert(pairs.length >= 5, `expected to find several same-name doNotGroup pairs, found ${pairs.length}`);

    const genericFallback = (mode) => {
      const raw = String(mode || "").trim();
      return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
    };

    const coverage = await page.evaluate((pairsArg) => {
      const api = window.nextTrainStationCombobox;
      return pairsArg.map(({ region, name, modes }) => ({
        region,
        name,
        labels: modes.map((mode) => api.modeDisplayLabel(region, mode)),
      }));
    }, pairs);

    for (const { region, name, labels } of coverage) {
      const pair = pairs.find((p) => p.region === region && p.name === name);
      labels.forEach((label, i) => {
        const mode = pair.modes[i];
        assert(label, `${region}/${name}: mode "${mode}" got an empty disambiguation label`);
        assert(
          label !== genericFallback(mode),
          `${region}/${name}: mode "${mode}" fell back to the generic "${label}" label — add a REGION_MODE_LABELS entry in public/station-combobox.js`
        );
      });
      assert(
        new Set(labels).size === labels.length,
        `${region}/${name}: two modes produced the same label (${labels.join(", ")}) — still indistinguishable`
      );
    }

    console.log("PASS donotgroup-picker-disambiguation:", result);
    console.log(`  covered ${pairs.length} same-name doNotGroup pairs across ${new Set(pairs.map((p) => p.region)).size} regions`);
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
