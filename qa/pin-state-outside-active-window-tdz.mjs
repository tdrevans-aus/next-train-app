/**
 * CAPACITOR-1A — resolvePinState must not ReferenceError on outsideActiveWindow TDZ.
 * Reproduces the master regression where retainDepartedOutsideWindow read the const
 * before its declaration. No browser required.
 *
 * Usage: node qa/pin-state-outside-active-window-tdz.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIN_STATE_PATH = path.join(__dirname, "..", "public", "pin-state.js");

function loadPinStateApi() {
  const code = fs.readFileSync(PIN_STATE_PATH, "utf8");
  const sandbox = {
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    parseInt,
    isNaN,
    Error,
    ReferenceError,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.nextTrainPinState;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const api = loadPinStateApi();
  assert(typeof api?.resolvePinState === "function", "nextTrainPinState.resolvePinState missing");

  const clock = {
    nowMs: new Date("2026-08-17T07:07:00+08:00").getTime(),
    perthDateKey: "2026-08-17",
  };

  let threw = null;
  let state = null;
  try {
    state = api.resolvePinState({
      mode: "journey",
      journey: {
        id: "j-overnight",
        kind: "journey",
        preferredTrainTime: "0:55",
        defaultFrom: "23:25",
        defaultUntil: "2:25",
        remindDays: [1, 2, 3, 4, 5, 6, 7],
        leaveBeforeMinutes: 10,
        useLeaveBefore: true,
      },
      payload: {
        next: {
          departure: "2026-08-17T07:11:00+08:00",
          displayTime: "07:11",
        },
        upcoming: [
          {
            departure: "2026-08-17T00:55:00+08:00",
            displayTime: "0:55",
          },
          {
            departure: "2026-08-17T07:11:00+08:00",
            displayTime: "07:11",
          },
        ],
      },
      clock,
    });
  } catch (error) {
    threw = String(error?.message ?? error);
  }

  assert(
    !threw,
    `resolvePinState threw (CAPACITOR-1A TDZ?): ${threw}`
  );
  assert(state && typeof state === "object", "resolvePinState returned no state");
  assert(
    !String(threw || "").includes("outsideActiveWindow"),
    "outsideActiveWindow TDZ still present"
  );

  console.log("PASS  pin-state-outside-active-window-tdz");
}

try {
  main();
} catch (error) {
  console.error("FAIL  pin-state-outside-active-window-tdz:", error.message || error);
  process.exit(1);
}
