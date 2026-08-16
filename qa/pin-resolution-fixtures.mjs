/**
 * FB-26 pin-resolution fixture validator + optional resolution runner.
 *
 * Safe to run before pin-state.js is implemented (schema validation only).
 *
 * Usage:
 *   node qa/pin-resolution-fixtures.mjs --validate-only
 *   IMPLEMENT_PIN_STATE=1 node qa/pin-resolution-fixtures.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(__dirname, "fixtures", "pin-resolution");
const HERO_LABELS = new Set(["Next Train", "Target train", "Later train", "Pinned Train"]);
const MODES = new Set(["journey", "nearby"]);
const EXPECTED_BOOLEAN_KEYS = new Set([
  "isPinnedToday",
  "heroShowsPin",
  "isOverrideActiveToday",
  "isPinDismissedToday",
  "isSkipPreview",
  "isHeroPinLockingSwipe",
  "showSecondaryNext",
  "leaveCardArmed",
]);
const EXPECTED_DEPARTURE_KEYS = new Set([
  "trueNextDeparture",
  "pinDeparture",
  "heroDeparture",
  "leaveDeparture",
  "secondaryNextDeparture",
  "widgetFaceDeparture",
]);
const TAGS = new Set([
  "journey",
  "nearby",
  "widget",
  "override",
  "dismissed",
  "preferred",
  "skip",
  "secondary-next",
  "outside-hours",
  "native-parity",
]);

const validateOnly = process.argv.includes("--validate-only");
const runResolution = process.env.IMPLEMENT_PIN_STATE === "1" && !validateOnly;

function loadFixtures() {
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith(".json") && name !== "schema.json")
    .sort()
    .map((name) => {
      const filePath = path.join(FIXTURE_DIR, name);
      const raw = fs.readFileSync(filePath, "utf8");
      const fixture = JSON.parse(raw);
      return { name, filePath, fixture };
    });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isDepartureOrNull(value) {
  return value === null || (typeof value === "string" && value.length > 0);
}

function validateFixture({ name, fixture }) {
  const prefix = `${name}:`;

  assert(typeof fixture.id === "string" && /^[a-z0-9-]+$/.test(fixture.id), `${prefix} invalid id`);
  assert(typeof fixture.description === "string" && fixture.description.length > 0, `${prefix} missing description`);

  if (fixture.tags !== undefined) {
    assert(Array.isArray(fixture.tags), `${prefix} tags must be an array`);
    for (const tag of fixture.tags) {
      assert(TAGS.has(tag), `${prefix} unknown tag ${tag}`);
    }
  }

  const { clock, input, expected } = fixture;
  assert(clock && typeof clock === "object", `${prefix} missing clock`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(clock.perthDateKey ?? ""), `${prefix} invalid perthDateKey`);
  assert(typeof clock.nowIso === "string" && clock.nowIso.length > 0, `${prefix} missing nowIso`);

  assert(input && typeof input === "object", `${prefix} missing input`);
  assert(MODES.has(input.mode), `${prefix} invalid mode`);
  if (input.skipTrains !== undefined) {
    assert(Number.isInteger(input.skipTrains) && input.skipTrains >= 0, `${prefix} invalid skipTrains`);
  }
  if (input.mode === "journey") {
    assert(input.journey && typeof input.journey === "object", `${prefix} journey mode requires journey`);
  }
  if (input.mode === "nearby" && input.nearbyPin !== undefined) {
    assert(typeof input.nearbyPin === "object", `${prefix} nearbyPin must be object`);
  }

  assert(expected && typeof expected === "object", `${prefix} missing expected`);
  for (const [key, value] of Object.entries(expected)) {
    if (EXPECTED_DEPARTURE_KEYS.has(key)) {
      assert(isDepartureOrNull(value), `${prefix} expected.${key} must be string or null`);
      continue;
    }
    if (EXPECTED_BOOLEAN_KEYS.has(key)) {
      assert(typeof value === "boolean", `${prefix} expected.${key} must be boolean`);
      continue;
    }
    if (key === "heroLabel") {
      assert(HERO_LABELS.has(value), `${prefix} invalid heroLabel`);
      continue;
    }
    throw new Error(`${prefix} unexpected expected field ${key}`);
  }

  if (expected.showSecondaryNext === true) {
    assert(
      expected.secondaryNextDeparture !== null,
      `${prefix} showSecondaryNext requires secondaryNextDeparture`
    );
  }
  if (expected.showSecondaryNext === false) {
    assert(
      expected.secondaryNextDeparture === null,
      `${prefix} hidden secondary next must use null secondaryNextDeparture`
    );
  }
  if (expected.heroShowsPin === true) {
    assert(expected.heroDeparture !== null, `${prefix} heroShowsPin requires heroDeparture`);
    if (expected.pinDeparture !== null) {
      assert(
        expected.heroDeparture === expected.pinDeparture,
        `${prefix} heroShowsPin requires heroDeparture === pinDeparture`
      );
    }
  }
}

function buildPinStateInput(fixture) {
  const { clock, input } = fixture;
  return {
    mode: input.mode,
    clock: {
      nowMs: Date.parse(clock.nowIso),
      perthDateKey: clock.perthDateKey,
    },
    payload: input.payload ?? null,
    journey: input.journey ?? null,
    nearbyPin: input.nearbyPin ?? null,
    skipTrains: input.skipTrains ?? 0,
    journeyModeActive: input.journeyModeActive ?? false,
    nearbyModeActive: input.nearbyModeActive ?? false,
  };
}

function normalizeResult(result) {
  const normalized = {};
  for (const [key, value] of Object.entries(result ?? {})) {
    if (key.endsWith("Departure") && value === undefined) {
      normalized[key] = null;
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

async function runResolutionFixtures(fixtures) {
  await ensureDevServer();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/");
    await page.addScriptTag({ url: "http://localhost:3000/pin-state.js" });

    const isStub = await page.evaluate(() => Boolean(window.nextTrainPinState?.FB26_STUB));
    if (isStub) {
      console.log("SKIP resolution — public/pin-state.js is still the FB-26 stub.");
      return;
    }

    for (const { name, fixture } of fixtures) {
      const pinInput = buildPinStateInput(fixture);
      const result = await page.evaluate((input) => {
        return window.nextTrainPinState.resolvePinState(input);
      }, pinInput);

      const actual = normalizeResult(result);
      for (const [key, expectedValue] of Object.entries(fixture.expected)) {
        const actualValue = actual[key];
        assert(
          actualValue === expectedValue,
          `${name}: expected.${key} = ${JSON.stringify(expectedValue)} but got ${JSON.stringify(actualValue)}`
        );
      }
      console.log(`OK resolution ${fixture.id}`);
    }
  } finally {
    await browser.close();
    await stopDevServer();
  }
}

async function main() {
  const fixtures = loadFixtures();
  assert(fixtures.length > 0, "No pin-resolution fixtures found");

  for (const entry of fixtures) {
    validateFixture(entry);
    console.log(`OK schema ${entry.fixture.id}`);
  }

  if (runResolution) {
    await runResolutionFixtures(fixtures);
  } else if (!validateOnly) {
    console.log("Resolution assertions skipped (set IMPLEMENT_PIN_STATE=1 when pin-state.js is implemented).");
  }

  console.log(`pin-resolution-fixtures: ${fixtures.length} fixture(s) validated`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
