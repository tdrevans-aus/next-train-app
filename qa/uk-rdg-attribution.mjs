/**
 * Rail Delivery Group attribution appears on every Darwin-backed board (licence cl. 3.3.1).
 * Modelled on qa/vancouver-attribution.mjs.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const RDG_LDB_LINE =
  "Live departure data © Rail Delivery Group, via the Rail Data Marketplace. Times may change — check station displays.";
const TFL = "Powered by TfL Open Data";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const session = readFileSync(join(ROOT, "public/city-session.js"), "utf8");

assert(session.includes(RDG_LDB_LINE), "city-session must contain the exact RDG attribution line");
assert(session.includes("RDG_LDB_LINE"), "RDG line must be exported as a named constant");
assert(session.includes(TFL), "TfL line must be unchanged");

// Load city-session.js in a sandbox and exercise feedAttributionForCity directly.
const window = {};
const sandbox = {
  window,
  document: { getElementById: () => null, addEventListener: () => {}, querySelector: () => null },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { geolocation: {} },
  console,
  setTimeout,
  clearTimeout,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(session, sandbox);
const api = sandbox.window.NextTrainCitySession;
assert(api, "city-session.js must expose window.NextTrainCitySession");
assert(typeof api.feedAttributionForCity === "function", "feedAttributionForCity must be exported");

// uk-london-tfl is not Darwin — keeps its TfL line.
const tfl = api.feedAttributionForCity("uk-london-tfl");
assert(tfl && tfl.text === TFL, "uk-london-tfl must keep the TfL attribution line");
assert(tfl.required === false, "uk-london-tfl attribution stays non-required");

// A live Darwin region resolves to the RDG line, required prominence.
const live = api.feedAttributionForCity("west-of-england");
assert(live && live.text === RDG_LDB_LINE, "west-of-england (live Darwin) must show the RDG line");
assert(live.required === true, "RDG attribution must be required (is-required prominence)");

// A planned Darwin region resolves to the RDG line too — future flips inherit it with no edit.
const planned = api.feedAttributionForCity("london-se-national-rail");
assert(
  planned && planned.text === RDG_LDB_LINE,
  "london-se-national-rail (planned Darwin) must show the RDG line"
);
assert(planned.required === true, "planned Darwin attribution must be required too");

// Other non-Darwin cities are untouched.
const vancouver = api.feedAttributionForCity("vancouver");
assert(vancouver && vancouver.text !== RDG_LDB_LINE, "Vancouver must not get the RDG line");

const perth = api.feedAttributionForCity("perth");
assert(!perth, "Perth (not a Darwin/UK region) must not get any RDG attribution");

console.log("uk-rdg-attribution: ok (RDG line present, gated to Darwin cities, TfL/Vancouver unchanged)");
