/**
 * Guard: public/ads.js must survive double eval in the same realm.
 * Sentry CAPACITOR-12 — SyntaxError: Identifier 'adsInitInFlight' has already been declared
 *
 * Usage: node qa/ads-js-idempotent.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adsPath = path.join(__dirname, "..", "public", "ads.js");
const code = fs.readFileSync(adsPath, "utf8");

function makeContext() {
  const listeners = [];
  const context = {
    window: {
      addEventListener(type, fn) {
        listeners.push([type, fn]);
      },
    },
    document: {
      getElementById: () => null,
      body: {
        classList: {
          contains: () => false,
          add() {},
          remove() {},
        },
      },
      addEventListener() {},
      querySelector: () => null,
      createElement: () => ({
        style: {},
        dataset: {},
        appendChild() {},
      }),
      head: { appendChild() {} },
    },
    console,
    fetch: async () => ({ json: async () => ({}) }),
    localStorage: { getItem: () => null, setItem() {} },
    Boolean,
    Promise,
    setInterval,
    clearInterval,
    Date,
    Error,
  };
  vm.createContext(context);
  context.listeners = listeners;
  return context;
}

const context = makeContext();

try {
  vm.runInContext(code, context);
} catch (error) {
  console.error("FAIL  first ads.js eval threw:", error.message);
  process.exit(1);
}

if (!context.window.NextTrainAds?.reload) {
  console.error("FAIL  NextTrainAds.reload missing after first eval");
  process.exit(1);
}

if (!context.window.__nextTrainAdsJsLoaded) {
  console.error("FAIL  __nextTrainAdsJsLoaded not set");
  process.exit(1);
}

const listenerCountAfterFirst = context.listeners.length;

try {
  vm.runInContext(code, context);
} catch (error) {
  console.error("FAIL  second ads.js eval threw:", error.message);
  process.exit(1);
}

if (context.listeners.length !== listenerCountAfterFirst) {
  console.error(
    `FAIL  second eval re-bound listeners (${listenerCountAfterFirst} → ${context.listeners.length})`
  );
  process.exit(1);
}

console.log("PASS  ads-js-idempotent (double eval safe)");
