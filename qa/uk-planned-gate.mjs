/**
 * UK regions stay planned; no city=uk dump. Perth stays live.
 * Usage: node qa/uk-planned-gate.mjs
 */
import { assertCityLive, getCity } from "../lib/providers/registry.js";
import { UK_REGION_IDS } from "../lib/providers/uk/catalog.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const perth = assertCityLive("perth");
assert(perth?.ok === true, "Perth must stay live");

for (const id of UK_REGION_IDS) {
  if (id === "uk-london-tfl") {
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
  "uk-planned-gate: ok (uk-west-midlands and remaining UK regions planned/501; uk-london-tfl live; no city=uk; Perth green)"
);
