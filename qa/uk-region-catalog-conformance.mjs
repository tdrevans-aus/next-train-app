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

if (UK_REGION_IDS.length !== 20) {
  fail(`Expected 20 UK region ids, got ${UK_REGION_IDS.join(",")}`);
}

const regions = listRegions();
if (regions.length !== 20) {
  fail(`Expected 20 regions in index, got ${regions.length}`);
}

const wm = getRegion("uk-west-midlands");
if (!wm || wm.railCount !== 75 || wm.metroCount !== 35) {
  fail(`uk-west-midlands counts rail=${wm?.railCount} metro=${wm?.metroCount}`);
}

const tfl = getRegion("uk-london-tfl");
if (!tfl || tfl.stopCount < 4) {
  fail(`uk-london-tfl seed stops ${tfl?.stopCount}`);
}

const wmRail = listRailStations("uk-west-midlands");
const crsSet = new Set(wmRail.map((s) => s.crs));
for (const crs of ["BHM", "BMO", "BSW", "BHI", "COV", "WVH", "UNI", "WSL", "SBJ", "KID", "MOV", "KIH", "PIR", "DAS", "THW", "SLY", "TAM"]) {
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
if (!sy || sy.railCount !== 6 || sy.metroCount !== 12) {
  fail(`south-yorkshire counts rail=${sy?.railCount} metro=${sy?.metroCount}`);
}

const syRail = listRailStations("south-yorkshire");
const syRailNames = new Set(syRail.map((s) => s.name));
for (const name of [
  "Sheffield Station",
  "Meadowhall Interchange",
  "Rotherham Central",
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
// Denby Dale is West Yorkshire's (DBD) per docs/united-kingdom-ledger.md, 5 Sep 2026 — must not reappear here.
if (syRailNames.has("Denby Dale")) {
  fail("south-yorkshire must not carry Denby Dale (owned by West Yorkshire)");
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
for (const crs of ["LDS", "BDQ", "BDI", "DBD", "WDN", "HUD", "HFX", "TOD", "HBD", "KEI"]) {
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

// london-se-national-rail: FIRST multi-group region, no single hub-lock — 10 boards
// (5 single-board groups + 3 London Bridge sub-boards + 2 Liverpool Street sub-boards).
const lse = getRegion("london-se-national-rail");
if (!lse || lse.railCount !== 10 || lse.metroCount !== 0) {
  fail(`london-se-national-rail counts rail=${lse?.railCount} metro=${lse?.metroCount}`);
}

const lseRail = listRailStations("london-se-national-rail");
const lseCrsSet = new Set(lseRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["WAT", "VIC", "LBG", "LST", "KGX", "STP", "PAD"]) {
  if (!lseCrsSet.has(crs)) {
    fail(`london-se-national-rail missing ${crs}`);
  }
}
for (const name of getNotInRegion("london-se-national-rail")) {
  if (lseRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in london-se-national-rail catalog`);
  }
}

const lseWaterloo = resolveRailEntry("London Waterloo", "london-se-national-rail");
if (!lseWaterloo || lseWaterloo.crs !== "WAT") {
  fail("london-se-national-rail London Waterloo must resolve as a rail entry with crs WAT");
}
const lseLondonBridgeBoards = lseRail.filter((s) => s.groupId === "london-bridge");
if (lseLondonBridgeBoards.length !== 3 || lseLondonBridgeBoards.some((s) => s.crs !== "LBG")) {
  fail(`london-se-national-rail London Bridge must have 3 boards sharing crs LBG, got ${lseLondonBridgeBoards.length}`);
}
const lseLiverpoolStreetBoards = lseRail.filter((s) => s.groupId === "liverpool-street");
if (lseLiverpoolStreetBoards.length !== 2 || lseLiverpoolStreetBoards.some((s) => s.crs !== "LST")) {
  fail(`london-se-national-rail Liverpool Street must have 2 boards sharing crs LST, got ${lseLiverpoolStreetBoards.length}`);
}
if (resolveRailEntry("Euston", "london-se-national-rail")) {
  fail("london-se-national-rail must not resolve Euston — no named regional operator, not built");
}

// glasgow: TWO independent National Rail groups (no single hub-lock, "Option A at n=2") plus a
// hub-locked closed-loop Subway (first no-terminus metro in this pipeline).
const gla = getRegion("glasgow");
if (!gla || gla.railCount !== 2 || gla.metroCount !== 15) {
  fail(`glasgow counts rail=${gla?.railCount} metro=${gla?.metroCount}`);
}

const glaRail = listRailStations("glasgow");
const glaCrsSet = new Set(glaRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["GLC", "GLQ"]) {
  if (!glaCrsSet.has(crs)) {
    fail(`glasgow missing ${crs}`);
  }
}
for (const name of getNotInRegion("glasgow")) {
  if (glaRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in glasgow catalog`);
  }
}
if (resolveRailEntry("Falkirk High", "glasgow")) {
  fail("glasgow must not resolve Falkirk High — owned by the Edinburgh region's exclusive territory");
}

const glaCentral = resolveRailEntry("Glasgow Central", "glasgow");
const glaQueenStreet = resolveRailEntry("Glasgow Queen Street", "glasgow");
if (!glaCentral || glaCentral.crs !== "GLC") {
  fail("glasgow Glasgow Central must resolve as a rail entry with crs GLC");
}
if (!glaQueenStreet || glaQueenStreet.crs !== "GLQ") {
  fail("glasgow Glasgow Queen Street must resolve as a rail entry with crs GLQ");
}

const glaMetro = listMetroStops("glasgow");
const glaMetroNames = new Set(glaMetro.map((s) => s.name));
for (const name of ["Buchanan Street", "St Enoch", "Partick", "Govan"]) {
  if (!glaMetroNames.has(name)) {
    fail(`glasgow Subway catalog missing ${name}`);
  }
}
const glaBuchananStreet = resolveMetroEntry("Buchanan Street", "glasgow");
if (!glaBuchananStreet || !glaBuchananStreet.catalogId?.startsWith("subway:")) {
  fail("glasgow Buchanan Street must resolve as a Subway hub entry, separate from any rail entry");
}
if (resolveRailEntry("Buchanan Street", "glasgow")) {
  fail("glasgow Buchanan Street must NOT resolve as a rail entry — Subway-only, doNotGroup vs Glasgow Queen Street");
}

// edinburgh: SINGLE National Rail hub-lock (Edinburgh Waverley) with two through-running
// satellites (Haymarket, Slateford) — structurally different from glasgow's two independent
// termini — plus a hub-locked Trams line with two confirmed termini (standard line+terminus,
// NOT glasgow Subway's closed-loop model).
const edi = getRegion("edinburgh");
if (!edi || edi.railCount !== 3 || edi.metroCount !== 22) {
  fail(`edinburgh counts rail=${edi?.railCount} metro=${edi?.metroCount}`);
}

const ediRail = listRailStations("edinburgh");
const ediCrsSet = new Set(ediRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["EDB", "HYM", "SLA"]) {
  if (!ediCrsSet.has(crs)) {
    fail(`edinburgh missing ${crs}`);
  }
}
for (const name of getNotInRegion("edinburgh")) {
  if (ediRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in edinburgh catalog`);
  }
}
if (resolveRailEntry("Falkirk High", "edinburgh")) {
  fail("edinburgh must not resolve Falkirk High — unresolved cross-pack ownership prose, excluded either way");
}

const ediWaverley = resolveRailEntry("Edinburgh Waverley", "edinburgh");
const ediHaymarketRail = resolveRailEntry("Haymarket", "edinburgh");
const ediSlateford = resolveRailEntry("Slateford", "edinburgh");
if (!ediWaverley || ediWaverley.crs !== "EDB") {
  fail("edinburgh Edinburgh Waverley must resolve as a rail entry with crs EDB");
}
if (!ediHaymarketRail || ediHaymarketRail.crs !== "HYM") {
  fail("edinburgh Haymarket must resolve as a rail entry with crs HYM");
}
if (!ediSlateford || ediSlateford.crs !== "SLA") {
  fail("edinburgh Slateford must resolve as a rail entry with crs SLA");
}

const ediMetro = listMetroStops("edinburgh");
const ediMetroNames = new Set(ediMetro.map((s) => s.name));
for (const name of ["Newhaven", "Edinburgh Airport", "Princes Street", "Haymarket"]) {
  if (!ediMetroNames.has(name)) {
    fail(`edinburgh Trams catalog missing ${name}`);
  }
}
const ediHaymarketTram = resolveMetroEntry("Haymarket", "edinburgh");
if (!ediHaymarketTram || !ediHaymarketTram.catalogId?.startsWith("tram:")) {
  fail("edinburgh Haymarket must also resolve as a Trams entry, separate from the rail entry");
}
if (resolveMetroEntry("Edinburgh Waverley", "edinburgh")) {
  fail("edinburgh Trams catalog must NOT carry a stop literally named 'Edinburgh Waverley' — doNotGroup vs the rail hub");
}

// solent: TWO-HUB NR shape, one hub (Portsmouth Harbour) carrying a secondary board
// (Portsmouth & Southsea) via the West-of-England hub+secondary-hub pattern — not a single
// hub-lock, not full flat multi-group like london-se-national-rail's seven groups.
const sol = getRegion("solent");
if (!sol || sol.railCount !== 7 || sol.metroCount !== 0) {
  fail(`solent counts rail=${sol?.railCount} metro=${sol?.metroCount}`);
}

const solRail = listRailStations("solent");
const solCrsSet = new Set(solRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["SOU", "PMH", "PMS", "FRM", "ESL", "WSB", "WAT"]) {
  if (!solCrsSet.has(crs)) {
    fail(`solent missing ${crs}`);
  }
}
for (const name of getNotInRegion("solent")) {
  if (solRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in solent catalog`);
  }
}

const solWest = resolveRailEntry("Southampton Central", "solent");
const solEast = resolveRailEntry("Portsmouth Harbour", "solent");
const solEastSecondary = resolveRailEntry("Portsmouth & Southsea", "solent");
if (!solWest || solWest.crs !== "SOU") {
  fail("solent Southampton Central must resolve as a rail entry with crs SOU");
}
if (!solEast || solEast.crs !== "PMH") {
  fail("solent Portsmouth Harbour must resolve as a rail entry with crs PMH");
}
if (!solEastSecondary || solEastSecondary.crs !== "PMS") {
  fail("solent Portsmouth & Southsea must resolve as a rail entry with crs PMS");
}

// thames-valley: HUB + SECONDARY-HUB NR shape, reusing West of England/Solent's pattern, but
// Oxford (the secondary hub) needs an internal doNotGroup split — GWR vs Chiltern Railways on
// separate platforms/infrastructure, one CRS (OXF) split into two catalog entries. FIRST TIME a
// secondary hub (not a primary terminus) has needed this in the pipeline.
const tv = getRegion("thames-valley");
if (!tv || tv.railCount !== 8 || tv.metroCount !== 0) {
  fail(`thames-valley counts rail=${tv?.railCount} metro=${tv?.metroCount}`);
}

const tvRail = listRailStations("thames-valley");
const tvCrsSet = new Set(tvRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["RDG", "OXF", "SWI", "BAN", "WSB", "HOT", "DID"]) {
  if (!tvCrsSet.has(crs)) {
    fail(`thames-valley missing ${crs}`);
  }
}
for (const name of getNotInRegion("thames-valley")) {
  if (tvRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in thames-valley catalog`);
  }
}

const tvHub = resolveRailEntry("Reading", "thames-valley");
const tvSecondaryGwr = resolveRailEntry("Oxford (GWR)", "thames-valley");
const tvSecondaryChiltern = resolveRailEntry("Oxford (Chiltern)", "thames-valley");
if (!tvHub || tvHub.crs !== "RDG" || tvHub.doNotGroup !== false) {
  fail("thames-valley Reading must resolve as a rail entry with crs RDG and doNotGroup false");
}
if (!tvSecondaryGwr || tvSecondaryGwr.crs !== "OXF" || tvSecondaryGwr.doNotGroup !== true) {
  fail("thames-valley Oxford (GWR) must resolve as a rail entry with crs OXF and doNotGroup true");
}
if (!tvSecondaryChiltern || tvSecondaryChiltern.crs !== "OXF" || tvSecondaryChiltern.doNotGroup !== true) {
  fail("thames-valley Oxford (Chiltern) must resolve as a rail entry with crs OXF and doNotGroup true");
}

// greater-manchester: TWO AGENCIES, TWO HUB+SECONDARY-HUB PAIRS cross-linked at one
// shared-building station (Manchester Victoria) — National Rail's own hub (Manchester
// Piccadilly) and Metrolink's own hub (St Peter's Square) are different physical stations,
// unlike every prior two-agency region (Sheffield Station / Nottingham Station) which shared
// one hub name across both modes.
const gm = getRegion("greater-manchester");
if (!gm || gm.railCount !== 4 || gm.metroCount !== 15) {
  fail(`greater-manchester counts rail=${gm?.railCount} metro=${gm?.metroCount}`);
}

const gmRail = listRailStations("greater-manchester");
const gmCrsSet = new Set(gmRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["MAN", "MCV", "SMN", "WDN"]) {
  if (!gmCrsSet.has(crs)) {
    fail(`greater-manchester missing ${crs}`);
  }
}
if (gmCrsSet.has("WAD")) {
  fail("greater-manchester must not silently adopt West Yorkshire's WAD code for Walsden");
}
for (const name of getNotInRegion("greater-manchester")) {
  if (gmRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in greater-manchester catalog`);
  }
}

const gmNrHub = resolveRailEntry("Manchester Piccadilly", "greater-manchester");
const gmNrSecondary = resolveRailEntry("Manchester Victoria", "greater-manchester");
if (!gmNrHub || gmNrHub.crs !== "MAN") {
  fail("greater-manchester Manchester Piccadilly must resolve as a rail entry with crs MAN");
}
if (!gmNrSecondary || gmNrSecondary.crs !== "MCV") {
  fail("greater-manchester Manchester Victoria must resolve as a rail entry with crs MCV");
}

const gmMetro = listMetroStops("greater-manchester");
const gmMetroNames = new Set(gmMetro.map((s) => s.name));
for (const name of ["St Peter's Square", "Manchester Victoria", "Piccadilly Gardens"]) {
  if (!gmMetroNames.has(name)) {
    fail(`greater-manchester Metrolink catalog missing ${name}`);
  }
}
const gmVictoriaMetro = resolveMetroEntry("Manchester Victoria", "greater-manchester");
if (!gmVictoriaMetro || !gmVictoriaMetro.catalogId?.startsWith("metrolink:")) {
  fail("greater-manchester Manchester Victoria must also resolve as a Metrolink entry, separate from the rail entry (shared building, doNotGroup)");
}
const gmPiccadillyGardens = resolveMetroEntry("Piccadilly Gardens", "greater-manchester");
if (!gmPiccadillyGardens || gmPiccadillyGardens.catalogId !== "metrolink:piccadilly-gardens") {
  fail("greater-manchester Piccadilly Gardens must resolve as a Metrolink entry, separate from Manchester Piccadilly (walk-link pair, doNotGroup)");
}
if (resolveRailEntry("Piccadilly Gardens", "greater-manchester")) {
  fail("greater-manchester Piccadilly Gardens must NOT resolve as a National Rail entry — Metrolink-only");
}

// liverpool-city-region: TWO STRUCTURALLY SEPARATE AGENCY SHAPES — National Rail's own
// hub+secondary-hub pair (Lime Street/South Parkway) is structurally distinct from Merseyrail's
// own unranked interchange pair (Liverpool Central/Moorfields), unlike greater-manchester's
// cross-linked Manchester Victoria or south-yorkshire/east-midlands' single shared-name hub.
// Liverpool Lime Street's former train/metro doNotGroup pair (H1) is CLOSED AS MOOT 4 Sep 2026
// (Tim's option B): one catalog entry only (mode train, CRS LIV) — see
// docs/liverpool-city-region-d1/hazard-pack.md for the closed history.
const lcr = getRegion("liverpool-city-region");
if (!lcr || lcr.railCount !== 29 || lcr.metroCount !== 68) {
  fail(`liverpool-city-region counts rail=${lcr?.railCount} metro=${lcr?.metroCount}`);
}

const lcrRail = listRailStations("liverpool-city-region");
const lcrCrsSet = new Set(lcrRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["LIV", "LPY"]) {
  if (!lcrCrsSet.has(crs)) {
    fail(`liverpool-city-region missing ${crs}`);
  }
}
for (const name of getNotInRegion("liverpool-city-region")) {
  if (lcrRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in liverpool-city-region catalog`);
  }
}

const lcrNrHub = resolveRailEntry("Liverpool Lime Street", "liverpool-city-region");
const lcrNrSecondary = resolveRailEntry("Liverpool South Parkway", "liverpool-city-region");
if (!lcrNrHub || lcrNrHub.crs !== "LIV") {
  fail("liverpool-city-region Liverpool Lime Street must resolve as a rail entry with crs LIV");
}
if (!lcrNrSecondary || lcrNrSecondary.crs !== "LPY") {
  fail("liverpool-city-region Liverpool South Parkway must resolve as a rail entry with crs LPY");
}

const lcrMetro = listMetroStops("liverpool-city-region");
const lcrMetroNames = new Set(lcrMetro.map((s) => s.name));
for (const name of ["Liverpool Central", "Moorfields", "Ellesmere Port"]) {
  if (!lcrMetroNames.has(name)) {
    fail(`liverpool-city-region Merseyrail catalog missing ${name}`);
  }
}
// H1 closed as moot 4 Sep 2026 (Tim's option B): exactly one Lime Street entry, mode train,
// CRS LIV — the metro-mode Merseyrail entry is gone, folded into the single rail entry.
if (lcrMetroNames.has("Liverpool Lime Street")) {
  fail("liverpool-city-region Merseyrail catalog must NOT carry a separate Liverpool Lime Street entry — H1 closed as moot");
}
const lcrLimeStreetMetro = resolveMetroEntry("Liverpool Lime Street", "liverpool-city-region");
if (lcrLimeStreetMetro !== null) {
  fail("liverpool-city-region Liverpool Lime Street must NOT resolve as a Merseyrail metro entry — H1 closed as moot, option B");
}
const lcrCentralMetro = resolveMetroEntry("Liverpool Central", "liverpool-city-region");
if (!lcrCentralMetro || lcrCentralMetro.catalogId !== "merseyrail:liverpool-central") {
  fail("liverpool-city-region Liverpool Central must resolve as a Merseyrail entry");
}
if (resolveRailEntry("Liverpool Central", "liverpool-city-region")) {
  fail("liverpool-city-region Liverpool Central must NOT resolve as a National Rail entry — Merseyrail-only");
}

// greater-anglia: single primary agency (National Rail), TWO co-equal secondary hubs
// (Cambridge, Ipswich) alongside the Norwich hub lock — a deliberate departure from
// west-of-england/solent/thames-valley's single-secondary-hub shape. Peterborough is a flat
// through-running boundary entry, not a doNotGroup hub — LNER's board-eligibility verdict
// resolved to `in` 5 Sep 2026, so no excludeOperators is carried there.
const ga = getRegion("greater-anglia");
if (!ga || ga.railCount !== 14 || ga.metroCount !== 0) {
  fail(`greater-anglia counts rail=${ga?.railCount} metro=${ga?.metroCount}`);
}

const gaRail = listRailStations("greater-anglia");
const gaCrsSet = new Set(gaRail.map((s) => s.crs).filter(Boolean));
for (const crs of ["NRW", "CBG", "IPS", "PBO", "COL", "ELY", "KLN", "TTF", "DIS", "WMD", "GYM", "LWT", "SSD", "BIS"]) {
  if (!gaCrsSet.has(crs)) {
    fail(`greater-anglia missing ${crs}`);
  }
}
if (gaCrsSet.has("LST")) {
  fail("greater-anglia must not carry LST anywhere — that CRS belongs to Liverpool Street in london-se-national-rail");
}
if (gaRail.some((s) => s.crsVerified !== true)) {
  fail("greater-anglia every rail entry must carry crsVerified: true (verified live 5 Sep 2026)");
}
for (const name of getNotInRegion("greater-anglia")) {
  if (gaRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in greater-anglia catalog`);
  }
}

const gaHub = resolveRailEntry("Norwich", "greater-anglia");
const gaSecondaryCambridge = resolveRailEntry("Cambridge", "greater-anglia");
const gaSecondaryIpswich = resolveRailEntry("Ipswich", "greater-anglia");
if (!gaHub || gaHub.crs !== "NRW") {
  fail("greater-anglia Norwich must resolve as a rail entry with crs NRW");
}
if (!gaSecondaryCambridge || gaSecondaryCambridge.crs !== "CBG") {
  fail("greater-anglia Cambridge must resolve as a rail entry with crs CBG");
}
if (!gaSecondaryIpswich || gaSecondaryIpswich.crs !== "IPS") {
  fail("greater-anglia Ipswich must resolve as a rail entry with crs IPS");
}

const gaPeterborough = resolveRailEntry("Peterborough", "greater-anglia");
if (!gaPeterborough || gaPeterborough.crs !== "PBO") {
  fail("greater-anglia Peterborough must resolve as a rail entry with crs PBO");
}
if ((gaPeterborough?.excludeOperators ?? []).length) {
  fail("greater-anglia Peterborough must carry no excludeOperators — LNER's board-eligibility verdict resolved to `in` 5 Sep 2026, the exclusion is removed");
}

if (resolveRailEntry("Liverpool Street", "greater-anglia")) {
  fail("greater-anglia must not resolve Liverpool Street — already built in london-se-national-rail, not duplicated");
}

const gaLowestoft = resolveRailEntry("Lowestoft", "greater-anglia");
if (!gaLowestoft) {
  fail("greater-anglia Lowestoft must still resolve by name even with an unverified crs");
}
if (gaLowestoft?.crs !== "LWT") {
  fail("greater-anglia Lowestoft must carry LWT (verified live against Darwin 5 Sep 2026; never LST, which is Liverpool Street)");
}

const swst = getRegion("southwest");
if (!swst || swst.railCount !== 9 || swst.metroCount !== 0) {
  fail(`southwest counts rail=${swst?.railCount} metro=${swst?.metroCount}`);
}

const swstRail = listRailStations("southwest");
const swstCrsSet = new Set(swstRail.map((s) => s.crs));
for (const crs of ["EXD", "PLY", "PNZ", "TAU", "NAB", "TON", "TRU", "SAU", "SER"]) {
  if (!swstCrsSet.has(crs)) {
    fail(`southwest missing ${crs}`);
  }
}
for (const name of getNotInRegion("southwest")) {
  if (swstRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in southwest catalog`);
  }
}

const swstHub = resolveRailEntry("Exeter St Davids", "southwest");
const swstSecondary = resolveRailEntry("Plymouth", "southwest");
const swstTerminus = resolveRailEntry("Penzance", "southwest");
if (!swstHub || swstHub.crs !== "EXD") {
  fail("southwest Exeter St Davids must resolve as a rail entry with crs EXD");
}
if (!swstSecondary || swstSecondary.crs !== "PLY") {
  fail("southwest Plymouth must resolve as a rail entry with crs PLY");
}
if (!swstTerminus || swstTerminus.crs !== "PNZ") {
  fail("southwest Penzance must resolve as a rail entry with crs PNZ");
}

const cum = getRegion("cumbria");
if (!cum || cum.railCount !== 7 || cum.metroCount !== 0) {
  fail(`cumbria counts rail=${cum?.railCount} metro=${cum?.metroCount}`);
}

const cumRail = listRailStations("cumbria");
const cumCrsSet = new Set(cumRail.map((s) => s.crs));
for (const crs of ["CAR", "OXO", "BIF", "PEN", "WND", "KND", "SLF"]) {
  if (!cumCrsSet.has(crs)) {
    fail(`cumbria missing ${crs}`);
  }
}
for (const name of getNotInRegion("cumbria")) {
  if (cumRail.some((s) => s.name === name)) {
    fail(`False friend ${name} in cumbria catalog`);
  }
}

const cumHub = resolveRailEntry("Carlisle", "cumbria");
const cumSecondary1 = resolveRailEntry("Oxenholme Lake District", "cumbria");
const cumSecondary2 = resolveRailEntry("Barrow-in-Furness", "cumbria");
if (!cumHub || cumHub.crs !== "CAR") {
  fail("cumbria Carlisle must resolve as a rail entry with crs CAR");
}
if (!cumSecondary1 || cumSecondary1.crs !== "OXO") {
  fail("cumbria Oxenholme Lake District must resolve as a rail entry with crs OXO");
}
if (!cumSecondary2 || cumSecondary2.crs !== "BIF") {
  fail("cumbria Barrow-in-Furness must resolve as a rail entry with crs BIF");
}

if (failures.length) {
  console.error("uk-region-catalog-conformance failures:\n");
  for (const f of failures) {
    console.error(`- ${f}`);
  }
  process.exit(1);
}

console.log(
  "uk-region-catalog-conformance: ok (uk-west-midlands 74+35, uk-london-tfl seed, east-midlands 6+4, south-yorkshire 7+12, north-east 3+60, west-of-england 6+0, south-wales 2+0, west-yorkshire 10+0, rest-of-wales 17+0, rest-of-scotland 9+0 four co-equal hubs, london-se-national-rail 10+0 seven multi-group station groups, glasgow 2+15 two independent NR groups plus closed-loop Subway, edinburgh 3+22 single-hub NR plus line+terminus Trams, solent 7+0 two-hub NR shape with Portsmouth Harbour/Portsmouth & Southsea hub+secondary, thames-valley 8+0 hub+secondary-hub with Oxford's first secondary-hub internal doNotGroup split, greater-manchester 4+15 two-agency two-hub-pair shape cross-linked at Manchester Victoria, liverpool-city-region 29+68 (full-network rescope 4 Sep 2026, ORR Table 6329 + NaPTAN; Merseyrail via Darwin, H1 closed as moot 4 Sep 2026) two structurally separate agency shapes, greater-anglia 14+0 hub Norwich with two co-equal secondary hubs Cambridge/Ipswich and Peterborough's flat boundary (LNER resolved in, no excludeOperators), southwest 9+0 hub+secondary+terminus (Exeter St Davids/Plymouth/Penzance) with Night Riviera Sleeper's per-station excludeOperators exclusion, cumbria 7+0 single tier-1 hub Carlisle plus two tier-2 secondary hubs Oxenholme Lake District/Barrow-in-Furness with Penrith staying regional)"
);
