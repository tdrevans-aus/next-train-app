/**
 * Offline UK region catalog conformance — docs/uk-architecture.md
 * Usage: node qa/uk-region-catalog-conformance.mjs
 */
import {
  listRegions,
  getRegion,
  listRailStations,
  listMetroStops,
  listCatalogStations,
  resolveRailEntry,
  resolveMetroEntry,
  resolveTflStop,
  getNotInRegion,
  isCrsInRegion,
  UK_REGION_IDS,
} from "../lib/providers/uk/catalog.js";

const failures = [];

function fail(msg) {
  failures.push(msg);
}

if (UK_REGION_IDS.length !== 4) {
  fail(`Expected 4 UK region ids, got ${UK_REGION_IDS.join(",")}`);
}

const regions = listRegions();
if (regions.length !== 4) {
  fail(`Expected 4 regions in index, got ${regions.length}`);
}

const wm = getRegion("uk-west-midlands");
if (!wm || wm.railCount !== 75 || wm.metroCount !== 35) {
  fail(`uk-west-midlands counts rail=${wm?.railCount} metro=${wm?.metroCount}`);
}

const ep = getRegion("uk-ellesmere-port");
if (!ep || ep.railCount !== 11) {
  fail(`uk-ellesmere-port count ${ep?.railCount}`);
}

const tfl = getRegion("uk-london-tfl");
if (!tfl || tfl.stopCount < 4) {
  fail(`uk-london-tfl seed stops ${tfl?.stopCount}`);
}

const wmRail = listRailStations("uk-west-midlands");
const crsSet = new Set(wmRail.map((s) => s.crs));
for (const crs of ["BHM", "BMO", "BSH", "BHI", "COV", "WVH", "UNI", "WSL", "SBJ", "KID", "MOV", "KIH", "PIR", "DAS", "WLE"]) {
  if (!crsSet.has(crs)) {
    fail(`uk-west-midlands missing ${crs}`);
  }
}

for (const name of getNotInRegion("uk-west-midlands")) {
  if (wmRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in WM catalog`);
  }
}

if (isCrsInRegion("RED", "uk-west-midlands")) {
  fail("Redditch not in WM allow-list");
}

const grandCentralMetro = resolveMetroEntry("Grand Central", "uk-west-midlands");
const newStreetNr = resolveRailEntry("Birmingham New Street", "uk-west-midlands");
if (!grandCentralMetro?.catalogId?.startsWith("metro:")) {
  fail("Metro Grand Central must resolve");
}
if (!newStreetNr || newStreetNr.crs !== "BHM") {
  fail("NR BHM must resolve");
}

const epCrs = new Set(listRailStations("uk-ellesmere-port").map((s) => s.crs));
for (const crs of ["ELP", "OVE", "LTT", "HOO", "CPU", "BAC", "CTR", "LVJ", "MRF", "LIV", "LVC"]) {
  if (!epCrs.has(crs)) {
    fail(`uk-ellesmere-port missing ${crs}`);
  }
}

const kx = resolveTflStop("King's Cross St. Pancras Underground Station", "uk-london-tfl");
if (!kx?.naptanId) {
  fail("TfL King's Cross seed must resolve");
}

const catalogAll = listCatalogStations("uk-west-midlands");
if (catalogAll.length !== 110) {
  fail(`WM combined catalog ${catalogAll.length}, expected 110`);
}

const em = getRegion("east-midlands");
if (!em || em.railCount !== 6 || em.metroCount !== 4) {
  fail(`east-midlands counts rail=${em?.railCount} metro=${em?.metroCount}`);
}

const emRail = listRailStations("east-midlands");
const emCrsSet = new Set(emRail.map((s) => s.crs));
for (const crs of ["NOT", "LEI", "KET", "WEL", "CHD", "ALF"]) {
  if (!emCrsSet.has(crs)) {
    fail(`east-midlands missing ${crs}`);
  }
}
if (emCrsSet.has("TAM")) {
  fail("east-midlands must not carry Tamworth (D2 de-dup boundary with West Midlands)");
}
for (const name of getNotInRegion("east-midlands")) {
  if (emRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in east-midlands catalog`);
  }
}

const emMetro = listMetroStops("east-midlands");
const emMetroNames = new Set(emMetro.map((s) => s.name));
for (const name of ["Hucknall", "Nottingham Station", "Beeston/Chilwell", "Phoenix Park"]) {
  if (!emMetroNames.has(name)) {
    fail(`east-midlands NET catalog missing ${name}`);
  }
}
if (emMetroNames.has("city centre")) {
  fail("east-midlands NET catalog must not carry the unconfirmed 'city centre' placeholder");
}

const emHubRail = resolveRailEntry("Nottingham Station", "east-midlands");
const emHubMetro = resolveMetroEntry("Nottingham Station", "east-midlands");
if (!emHubRail || emHubRail.crs !== "NOT") {
  fail("east-midlands Nottingham Station must resolve as a rail entry with crs NOT");
}
if (!emHubMetro || !emHubMetro.catalogId?.startsWith("net:")) {
  fail("east-midlands Nottingham Station must also resolve as a NET metro entry, separate from the rail entry");
}

if (failures.length) {
  console.error("uk-region-catalog-conformance failures:\n");
  for (const f of failures) {
    console.error(`- ${f}`);
  }
  process.exit(1);
}

console.log(
  "uk-region-catalog-conformance: ok (uk-west-midlands 75+35, uk-ellesmere-port 11, uk-london-tfl seed, east-midlands 6+4)"
);
