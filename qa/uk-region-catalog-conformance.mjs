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

if (UK_REGION_IDS.length !== 11) {
  fail(`Expected 11 UK region ids, got ${UK_REGION_IDS.join(",")}`);
}

const regions = listRegions();
if (regions.length !== 11) {
  fail(`Expected 11 regions in index, got ${regions.length}`);
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

const sy = getRegion("south-yorkshire");
if (!sy || sy.railCount !== 7 || sy.metroCount !== 12) {
  fail(`south-yorkshire counts rail=${sy?.railCount} metro=${sy?.metroCount}`);
}

const syRail = listRailStations("south-yorkshire");
const syRailNames = new Set(syRail.map((s) => s.name));
for (const name of [
  "Sheffield Station",
  "Meadowhall Interchange",
  "Rotherham Central",
  "Denby Dale",
  "Darton",
  "South Elmsall",
  "Moorthorpe",
]) {
  if (!syRailNames.has(name)) {
    fail(`south-yorkshire missing National Rail station ${name}`);
  }
}
const syCrsSet = new Set(syRail.map((s) => s.crs).filter(Boolean));
if (!syCrsSet.has("SHF") || !syCrsSet.has("MHS")) {
  fail("south-yorkshire must carry SHF and MHS CRS codes");
}
if (syCrsSet.has("CHD") || syRailNames.has("Chesterfield")) {
  fail("south-yorkshire must not carry Chesterfield (owned by East Midlands)");
}
for (const name of getNotInRegion("south-yorkshire")) {
  if (syRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in south-yorkshire catalog`);
  }
}

const syMetro = listMetroStops("south-yorkshire");
const syMetroNames = new Set(syMetro.map((s) => s.name));
for (const name of [
  "Sheffield Station",
  "Malin Bridge",
  "Halfway",
  "Gleadless Townend",
  "Crystal Peaks",
  "Herdings Park",
  "Middlewood",
  "Hillsborough",
  "Sheffield Arena",
  "Meadowhall",
  "Rotherham Central",
  "Parkgate",
]) {
  if (!syMetroNames.has(name)) {
    fail(`south-yorkshire Supertram catalog missing ${name}`);
  }
}

const syHubRail = resolveRailEntry("Sheffield Station", "south-yorkshire");
const syHubMetro = resolveMetroEntry("Sheffield Station", "south-yorkshire");
if (!syHubRail || syHubRail.crs !== "SHF") {
  fail("south-yorkshire Sheffield Station must resolve as a rail entry with crs SHF");
}
if (!syHubMetro || !syHubMetro.catalogId?.startsWith("supertram:")) {
  fail("south-yorkshire Sheffield Station must also resolve as a Supertram metro entry, separate from the rail entry");
}

const syMeadowhallRail = resolveRailEntry("Meadowhall Interchange", "south-yorkshire");
const syMeadowhallMetro = resolveMetroEntry("Meadowhall", "south-yorkshire");
if (!syMeadowhallRail || syMeadowhallRail.crs !== "MHS") {
  fail("south-yorkshire Meadowhall Interchange must resolve as a rail entry with crs MHS");
}
if (!syMeadowhallMetro || syMeadowhallMetro.catalogId !== "supertram:meadowhall") {
  fail("south-yorkshire Meadowhall must also resolve as the Supertram Yellow terminus metro entry");
}

const ne = getRegion("north-east");
if (!ne || ne.railCount !== 3 || ne.metroCount !== 60) {
  fail(`north-east counts rail=${ne?.railCount} metro=${ne?.metroCount}`);
}

const neRail = listRailStations("north-east");
const neRailNames = new Set(neRail.map((s) => s.name));
for (const name of ["Newcastle Central", "Sunderland", "Berwick-upon-Tweed"]) {
  if (!neRailNames.has(name)) {
    fail(`north-east missing National Rail station ${name}`);
  }
}
const neCrsSet = new Set(neRail.map((s) => s.crs).filter(Boolean));
if (!neCrsSet.has("NCL") || !neCrsSet.has("BWK")) {
  fail("north-east must carry NCL and BWK CRS codes");
}
if (neRailNames.has("Darlington")) {
  fail("north-east must not carry Darlington (unresolved cross-region boundary)");
}
for (const name of getNotInRegion("north-east")) {
  if (neRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in north-east catalog`);
  }
}

const neMetro = listMetroStops("north-east");
const neMetroNames = new Set(neMetro.map((s) => s.name));
for (const name of ["St James", "South Shields", "South Hylton", "Newcastle Airport", "Central Station", "Sunderland", "Pelaw"]) {
  if (!neMetroNames.has(name)) {
    fail(`north-east Metro catalog missing ${name}`);
  }
}
if (neMetroNames.has("Newcastle Central")) {
  fail("north-east Metro catalog must use 'Central Station', not 'Newcastle Central' (doNotGroup, distinct printed names)");
}

const neHubRail = resolveRailEntry("Newcastle Central", "north-east");
const neHubMetro = resolveMetroEntry("Central Station", "north-east");
if (!neHubRail || neHubRail.crs !== "NCL") {
  fail("north-east Newcastle Central must resolve as a rail entry with crs NCL");
}
if (!neHubMetro || !neHubMetro.catalogId?.startsWith("metro:")) {
  fail("north-east Central Station must also resolve as a Metro entry, separate from the rail entry");
}

const neSunderlandRail = resolveRailEntry("Sunderland", "north-east");
const neSunderlandMetro = resolveMetroEntry("Sunderland", "north-east");
if (!neSunderlandRail) {
  fail("north-east Sunderland must resolve as a rail entry (shared-platform case, CRS null — not guessed)");
}
if (!neSunderlandMetro || neSunderlandMetro.catalogId !== "metro:sunderland") {
  fail("north-east Sunderland must also resolve as the Green Line metro entry");
}

const woe = getRegion("west-of-england");
if (!woe || woe.railCount !== 6 || woe.metroCount !== 0) {
  fail(`west-of-england counts rail=${woe?.railCount} metro=${woe?.metroCount}`);
}

const woeRail = listRailStations("west-of-england");
const woeCrsSet = new Set(woeRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["BRI", "BTH", "CPW", "GCR", "WSB", "TAU"]) {
  if (!woeCrsSet.has(crs)) {
    fail(`west-of-england missing ${crs}`);
  }
}
for (const name of getNotInRegion("west-of-england")) {
  if (woeRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in west-of-england catalog`);
  }
}

const woeHub = resolveRailEntry("Bristol Temple Meads", "west-of-england");
const woeSecondary = resolveRailEntry("Bath Spa", "west-of-england");
if (!woeHub || woeHub.crs !== "BRI") {
  fail("west-of-england Bristol Temple Meads must resolve as a rail entry with crs BRI");
}
if (!woeSecondary || woeSecondary.crs !== "BTH") {
  fail("west-of-england Bath Spa must resolve as a rail entry with crs BTH");
}

const sw = getRegion("south-wales");
if (!sw || sw.railCount !== 2 || sw.metroCount !== 0) {
  fail(`south-wales counts rail=${sw?.railCount} metro=${sw?.metroCount}`);
}

const swRail = listRailStations("south-wales");
const swCrsSet = new Set(swRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["CDF", "STJ"]) {
  if (!swCrsSet.has(crs)) {
    fail(`south-wales missing ${crs}`);
  }
}
for (const name of getNotInRegion("south-wales")) {
  if (swRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in south-wales catalog`);
  }
}

const swHub = resolveRailEntry("Cardiff Central", "south-wales");
if (!swHub || swHub.crs !== "CDF") {
  fail("south-wales Cardiff Central must resolve as a rail entry with crs CDF");
}
if (resolveRailEntry("Cardiff Queen Street", "south-wales")) {
  fail("south-wales must not resolve Cardiff Queen Street — Valley Lines has no feed and is not catalogued");
}
if (resolveRailEntry("Pontypridd", "south-wales")) {
  fail("south-wales must not resolve Pontypridd — Valley Lines has no feed and is not catalogued");
}

const wy = getRegion("west-yorkshire");
if (!wy || wy.railCount !== 10 || wy.metroCount !== 0) {
  fail(`west-yorkshire counts rail=${wy?.railCount} metro=${wy?.metroCount}`);
}

const wyRail = listRailStations("west-yorkshire");
const wyCrsSet = new Set(wyRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["LDS", "BDQ", "BDI", "DDL", "WAD", "HUD", "HFX", "TOD", "HBN", "KEY"]) {
  if (!wyCrsSet.has(crs)) {
    fail(`west-yorkshire missing ${crs}`);
  }
}
for (const name of getNotInRegion("west-yorkshire")) {
  if (wyRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in west-yorkshire catalog`);
  }
}

const wyHub = resolveRailEntry("Leeds Station", "west-yorkshire");
const wySecondary = resolveRailEntry("Bradford Forster Square", "west-yorkshire");
const wyBdi = resolveRailEntry("Bradford Interchange", "west-yorkshire");
if (!wyHub || wyHub.crs !== "LDS") {
  fail("west-yorkshire Leeds Station must resolve as a rail entry with crs LDS");
}
if (!wySecondary || wySecondary.crs !== "BDQ") {
  fail("west-yorkshire Bradford Forster Square must resolve as a rail entry with crs BDQ");
}
if (!wyBdi || wyBdi.crs !== "BDI") {
  fail("west-yorkshire Bradford Interchange must resolve as a rail entry with crs BDI (doNotGroup vs BDQ)");
}

const row = getRegion("rest-of-wales");
if (!row || row.railCount !== 17 || row.metroCount !== 0) {
  fail(`rest-of-wales counts rail=${row?.railCount} metro=${row?.metroCount}`);
}

const rowRail = listRailStations("rest-of-wales");
const rowCrsSet = new Set(rowRail.map((s) => s.crs).filter(Boolean));
for (const crs of [
  "WRX", "LLJ", "CON", "BNG", "HOY",
  "WEL", "MCH", "AYW", "PWL",
  "CMN", "WLD", "NAR", "TNB", "PMD", "MLH", "FGW", "LLE",
]) {
  if (!rowCrsSet.has(crs)) {
    fail(`rest-of-wales missing ${crs}`);
  }
}
for (const name of getNotInRegion("rest-of-wales")) {
  if (rowRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in rest-of-wales catalog`);
  }
}

const rowHub = resolveRailEntry("Wrexham General", "rest-of-wales");
if (!rowHub || rowHub.crs !== "WRX") {
  fail("rest-of-wales Wrexham General must resolve as a rail entry with crs WRX");
}
if (resolveRailEntry("Wrexham Central", "rest-of-wales")) {
  fail("rest-of-wales must not resolve Wrexham Central — lower-connectivity terminus, not the hub lock");
}
if (resolveRailEntry("Chester", "rest-of-wales")) {
  fail("rest-of-wales must not resolve Chester — England pass-through, not a catalog station");
}
if (resolveRailEntry("Shrewsbury", "rest-of-wales")) {
  fail("rest-of-wales must not resolve Shrewsbury — England pass-through, not a catalog station");
}
const rowSecondary = resolveRailEntry("Aberystwyth", "rest-of-wales");
const rowTertiary = resolveRailEntry("Carmarthen", "rest-of-wales");
if (!rowSecondary || rowSecondary.crs !== "AYW") {
  fail("rest-of-wales Aberystwyth must resolve as a rail entry with crs AYW (corridor-significant, not hub-locked)");
}
if (!rowTertiary || rowTertiary.crs !== "CMN") {
  fail("rest-of-wales Carmarthen must resolve as a rail entry with crs CMN (corridor-significant, not hub-locked)");
}

const ros = getRegion("rest-of-scotland");
if (!ros || ros.railCount !== 9 || ros.metroCount !== 0) {
  fail(`rest-of-scotland counts rail=${ros?.railCount} metro=${ros?.metroCount}`);
}

const rosRail = listRailStations("rest-of-scotland");
const rosCrsSet = new Set(rosRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["PTH", "INV", "ABD", "DDE", "KLS", "THR", "WCK", "MLG", "FTW"]) {
  if (!rosCrsSet.has(crs)) {
    fail(`rest-of-scotland missing ${crs}`);
  }
}
for (const name of getNotInRegion("rest-of-scotland")) {
  if (rosRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in rest-of-scotland catalog`);
  }
}

// Four co-equal hub locks — no single primary hub, unlike every other UK region above.
for (const [name, crs] of [
  ["Perth", "PTH"],
  ["Inverness", "INV"],
  ["Aberdeen", "ABD"],
  ["Dundee", "DDE"],
]) {
  const hit = resolveRailEntry(name, "rest-of-scotland");
  if (!hit || hit.crs !== crs) {
    fail(`rest-of-scotland ${name} must resolve as a rail entry with crs ${crs}`);
  }
}
if (resolveRailEntry("Falkirk High", "rest-of-scotland")) {
  fail("rest-of-scotland must not resolve Falkirk High — unresolved Central Belt boundary, not a catalog station");
}

if (failures.length) {
  console.error("uk-region-catalog-conformance failures:\n");
  for (const f of failures) {
    console.error(`- ${f}`);
  }
  process.exit(1);
}

console.log(
  "uk-region-catalog-conformance: ok (uk-west-midlands 75+35, uk-ellesmere-port 11, uk-london-tfl seed, east-midlands 6+4, south-yorkshire 7+12, north-east 3+60, west-of-england 6+0, south-wales 2+0, west-yorkshire 10+0, rest-of-wales 17+0, rest-of-scotland 9+0 four co-equal hubs)"
);
