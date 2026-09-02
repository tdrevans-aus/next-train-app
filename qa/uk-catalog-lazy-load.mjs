/**
 * Cold getRegion("uk-london-tfl") must not parse WM or other region catalogs.
 * Usage: node qa/uk-catalog-lazy-load.mjs
 */
import {
  listRegions,
  getRegion,
  listRailStations,
  loadedUkRegionCatalogIds,
} from "../lib/providers/uk/catalog.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  loadedUkRegionCatalogIds().length === 0,
  `import must not parse region catalogs, got ${loadedUkRegionCatalogIds().join(",")}`
);

listRegions();
assert(
  loadedUkRegionCatalogIds().length === 0,
  `listRegions() must not parse stops.json, got ${loadedUkRegionCatalogIds().join(",")}`
);

const london = getRegion("uk-london-tfl");
assert(london?.id === "uk-london-tfl", "getRegion(uk-london-tfl) must return London");
assert(
  JSON.stringify(loadedUkRegionCatalogIds()) === JSON.stringify(["uk-london-tfl"]),
  `London getRegion must load only uk-london-tfl, got ${loadedUkRegionCatalogIds().join(",")}`
);

const wm = listRailStations("uk-west-midlands");
assert(wm.length > 0, "WM rail list must load its own catalog");
const loadedAfterWm = new Set(loadedUkRegionCatalogIds());
assert(loadedAfterWm.has("uk-london-tfl"), "London catalog must stay cached");
assert(loadedAfterWm.has("uk-west-midlands"), "WM request must load uk-west-midlands");
assert(
  !loadedAfterWm.has("east-midlands"),
  "WM request must not parse east-midlands"
);

console.log("uk-catalog-lazy-load: ok (London does not parse WM/other regions; WM does not parse siblings)");
