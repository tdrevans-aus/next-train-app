/**
 * Most UK regions stay planned; no city=uk dump. Perth stays live.
 * uk-london-tfl and west-of-england are live (see west-of-england-dogfood-gate.mjs
 * for west-of-england's own dedicated flip assertions — flipped 2 Sep 2026
 * following the Darwin REST fix, commit 215a93f/PR #188).
 * Usage: node qa/uk-planned-gate.mjs
 */
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { UK_REGION_IDS } from "../lib/providers/uk/catalog.js";

const LIVE_UK_REGION_IDS = new Set(["uk-london-tfl", "west-of-england", "east-midlands", "uk-west-midlands", "liverpool-city-region", "solent", "west-yorkshire", "thames-valley", "greater-anglia"]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

for (const id of UK_REGION_IDS) {
  if (LIVE_UK_REGION_IDS.has(id)) {
    const live = assertCityLive(id);
    assert(live?.ok === true, `assertCityLive(${id}) must be live now`);
    const entry = getCity(id);
    assert(entry?.status === "live", `${id} registry status must be live`);
    continue;
  }
  const live = assertCityLive(id);
  assert(live?.ok === false, `assertCityLive(${id}) must fail`);
  assert(live?.status === 501, `${id} must be 501 planned`);
  const entry = getCity(id);
  assert(entry?.status === "planned", `${id} registry status must be planned`);
  assert(entry?.adapterReady === true, `${id} adapterReady must be true`);
}

const ukDump = getCity("uk");
assert(!ukDump, "city=uk must not exist in registry");

console.log(
  "uk-planned-gate: ok (remaining UK regions planned/501; uk-london-tfl + west-of-england + east-midlands + uk-west-midlands + greater-anglia + liverpool-city-region live; no city=uk; Perth green)"
);
