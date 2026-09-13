/**
 * Crash-only smoke test for pin-state.js.
 *
 * resolvePinState runs inside renderNearbyBoard, so anything it throws wedges the
 * Near me board on "Locating..." with no visible error. Declaration-order mistakes
 * (using a const before its `const` line) are the recurring cause, and they only
 * surface for the specific mode/branch that reaches the bad line. This walks every
 * mode and pin/journey combination and fails on any throw, ignoring return values.
 *
 * Usage: node qa/pin-state-smoke.mjs
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import { BASE, DEV_PORT } from "./helpers/dev-server.mjs";

async function serverIsUp() {
  try {
    const response = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureDevServer() {
  if (await serverIsUp()) {
    return null;
  }

  const child = spawn(process.execPath, ["dev-server.js"], {
    stdio: "ignore",
    detached: false,
    env: { ...process.env, PORT: String(DEV_PORT) },
  });

  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (await serverIsUp()) {
      return child;
    }
  }

  child.kill();
  throw new Error("dev server did not start");
}

const PAYLOAD = {
  station: "Edgewater Stn",
  next: {
    departure: "2026-08-26T12:39:45.000Z",
    arrival: "2026-08-26T12:39:45.000Z",
    displayTime: "20:39",
    platform: "1",
    status: "On Time",
    destination: "Perth",
  },
  upcoming: [
    {
      departure: "2026-08-26T12:39:45.000Z",
      arrival: "2026-08-26T12:39:45.000Z",
      displayTime: "20:39",
      platform: "1",
      status: "On Time",
      destination: "Perth",
    },
    {
      departure: "2026-08-26T12:53:23.000Z",
      arrival: "2026-08-26T12:53:23.000Z",
      displayTime: "20:53",
      platform: "1",
      status: "On Time",
      destination: "Perth",
    },
  ],
};

const JOURNEY = {
  id: "j1",
  origin: "Edgewater Stn",
  destination: "Perth",
  preferredTime: "07:30",
  activeDays: [1, 2, 3, 4, 5],
};

function buildCases() {
  const cases = [];
  const modes = ["nearby", "journey", "route", undefined];
  const payloads = [
    ["payload", PAYLOAD],
    ["noPayload", null],
  ];
  const journeys = [
    ["journey", JOURNEY],
    ["noJourney", null],
  ];
  const pins = [
    ["noPin", null],
    ["pin", { station: "Edgewater Stn", departureIso: "2026-08-26T12:39:45.000Z" }],
  ];
  const skips = [0, 1];
  const browses = [false, true];

  for (const mode of modes) {
    for (const [payloadLabel, payload] of payloads) {
      for (const [journeyLabel, journey] of journeys) {
        for (const [pinLabel, nearbyPin] of pins) {
          for (const skipTrains of skips) {
            for (const browseLiveBoard of browses) {
              cases.push({
                label: `mode=${mode ?? "undefined"} ${payloadLabel} ${journeyLabel} ${pinLabel} skip=${skipTrains} browse=${browseLiveBoard}`,
                input: {
                  mode,
                  payload,
                  journey,
                  nearbyPin,
                  skipTrains,
                  browseLiveBoard,
                  clock: "2026-08-26T20:35:00+08:00",
                },
              });
            }
          }
        }
      }
    }
  }

  return cases;
}

async function run() {
  const server = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  let failures = 0;

  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/`);
    await page.addScriptTag({ url: `${BASE}/pin-state.js` });

    const available = await page.evaluate(
      () => typeof window.nextTrainPinState?.resolvePinState === "function"
    );
    if (!available) {
      throw new Error("window.nextTrainPinState.resolvePinState is not available");
    }

    const cases = buildCases();
    for (const testCase of cases) {
      const error = await page.evaluate((input) => {
        try {
          window.nextTrainPinState.resolvePinState(input);
          return null;
        } catch (thrown) {
          return String(thrown?.stack ?? thrown?.message ?? thrown);
        }
      }, testCase.input);

      if (error) {
        failures += 1;
        console.log(`FAIL ${testCase.label}\n  ${error.split("\n").slice(0, 3).join("\n  ")}`);
      }
    }

    console.log(
      `\npin-state-smoke: ${cases.length - failures}/${cases.length} case(s) resolved without throwing`
    );
  } finally {
    await browser.close();
    server?.kill();
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
