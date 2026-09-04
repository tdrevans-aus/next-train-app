/**
 * Regression gate for the multi-city station-picker mount() race
 * (docs/jim-brief-station-combobox-mount-race.md).
 *
 * public/brisbane-dogfood.js's mount() writes shared module-level `state`
 * after two await points (catalog load, direction-map load). Before the
 * fix, whichever overlapping mount() call's promises resolved *last* won
 * the write — regardless of which city was actually selected last. This
 * loads the real browser script into a sandboxed VM context with a
 * fetch stub whose resolution order we control, so we can prove the
 * *last-called* city always wins, even when its network round-trip
 * finishes before an earlier call's does.
 */
import { readFileSync } from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE = readFileSync(path.join(ROOT, "public/brisbane-dogfood.js"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/** Loads a fresh copy of brisbane-dogfood.js with a fetch stub whose delay
 * per city we control, so test cases can force any resolution order. */
function loadDogfoodApi(delaysByCity) {
  const localStorageStore = {};
  const windowObj = {
    location: { hostname: "next-train.example", port: "" },
    Capacitor: undefined,
    nextTrainStationCombobox: undefined,
  };
  const sandbox = {
    window: windowObj,
    location: windowObj.location,
    localStorage: {
      getItem: (key) => localStorageStore[key] ?? null,
      setItem: (key, value) => {
        localStorageStore[key] = String(value);
      },
      removeItem: (key) => {
        delete localStorageStore[key];
      },
    },
    console,
    setTimeout,
    clearTimeout,
    Promise,
    AbortController: globalThis.AbortController,
    fetch: async (url) => {
      const catalogMatch = /city-catalogs\/([^/]+)\.json/.exec(url);
      if (catalogMatch) {
        const city = decodeURIComponent(catalogMatch[1]);
        const delayMs = delaysByCity[city] ?? 0;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return {
          ok: true,
          json: async () => ({
            stations: [{ name: `${city}-station-a` }, { name: `${city}-station-b` }],
          }),
        };
      }
      const directionsMatch = /city-directions\/([^/]+)\.json/.exec(url);
      if (directionsMatch) {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: "public/brisbane-dogfood.js" });
  return sandbox.window.NextTrainBrisbaneDogfood;
}

async function testReversedResolutionOrder() {
  // sydney is called first but resolves *last*; adelaide is called second
  // and resolves first. The bug this regresses: the earlier call's late
  // resolution clobbers the later call's already-correct state.
  const api = loadDogfoodApi({ sydney: 80, adelaide: 5 });
  const firstCall = api.mount("sydney");
  const secondCall = api.mount("adelaide");
  const [, secondResult] = await Promise.all([firstCall, secondCall]);

  assert(secondResult === true, "the later mount() call must resolve true");
  assert(
    api.getCity() === "adelaide",
    `expected the last-called city (adelaide) to win even though it resolved first, got "${api.getCity()}"`
  );
  assert(
    api.getStations().every((name) => name.startsWith("adelaide")),
    "stations exposed after the race must belong to the last-called city, not the earlier one"
  );
}

async function testRepeatedRapidSwitching() {
  // Three overlapping calls with deliberately scrambled resolution timing —
  // the last call (vancouver) is neither the fastest nor the slowest to
  // resolve, so this can't pass by accident of ordering.
  const api = loadDogfoodApi({ sydney: 30, adelaide: 60, vancouver: 15 });
  await Promise.all([api.mount("sydney"), api.mount("adelaide"), api.mount("vancouver")]);

  assert(
    api.getCity() === "vancouver",
    `expected the last of three overlapping mount() calls to win, got "${api.getCity()}"`
  );
  assert(
    api.getStations().every((name) => name.startsWith("vancouver")),
    "stations after rapid switching must belong to the last-selected city"
  );
}

await testReversedResolutionOrder();
await testRepeatedRapidSwitching();

console.log("dogfood-mount-race-gate: ok (overlapping mount() calls always converge on the last-called city)");
