/**
 * Hong Kong flip follow-through gate. Rewritten 27 Sep 2026 (Mark's QA re-run after the
 * coordinates fix, PR #472 + docs/hong-kong-d1/mark-qa-note.md) to assert LIVE state — Hong
 * Kong flipped `status: "live"` once every checklist item (board eligibility, live-only grep,
 * rider-facing /api/board + /api/directions, trip counts, coordinates/Near me, hub lock,
 * coverage.json) came back green. Mirrors qa/copenhagen-dogfood-gate.mjs's/
 * qa/washington-dogfood-gate.mjs's post-flip shape. The old pre-flip assertions (assertCityLive
 * must fail, status === "planned", isMultiCity() === false, picker must not list Hong Kong, and
 * the api/next-train.js + api/board.js 501 probes — a Hong-Kong-only pre-flip scaffold, no other
 * flipped city's gate carries it) are removed, not left disabled.
 *
 * Deliberately does NOT call the live MTR Next Train REST (rt.data.gov.hk) — this is a
 * smoke-tier gate, not a network test. Instead this gate unit-tests the catalog/direction-model/
 * schedule-parsing logic (resolveCatalogEntry, mapScheduleEntryToTrip, tripsFromScheduleEntry,
 * parseScheduleResponse, resolveTerminusFromDestCode) against synthetic payloads shaped exactly
 * like the real REST responses captured live this session (docs/hong-kong-d1/jim-handoff.md
 * "Live verification"), plus asserts fetchStationBoard throws for an unknown station and
 * propagates every status-0/isdelay failure mode confirmed live (NT-301, NT-205, data absence)
 * rather than returning an empty board, all without any network call.
 *
 * Usage: node qa/hong-kong-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  METRO_HUB,
  HONG_KONG_TIMEZONE,
  resolveCatalogEntry,
  listCatalogStations,
  buildScheduleUrl,
  parseScheduleResponse,
  mapScheduleEntryToTrip,
  tripsFromScheduleEntry,
  fetchStationBoard,
  MtrScheduleError,
} from "../lib/providers/hong-kong.js";
import {
  foldKey,
  resolveTerminusFromDestCode,
  marketingLabel,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
  isForbiddenCollapseName,
} from "../lib/cities/hong-kong/marketing-directions.js";
import {
  listHongKongDogfoodStations,
  getHongKongDogfoodDirections,
  getHongKongDogfoodNextTrain,
} from "../lib/cities/hong-kong/dogfood-next-train.js";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchors only — a handful of live cities staying green, not a hardcoded roll call.
assert(assertCityLive("perth")?.ok === true, "Perth must stay live");
assert(assertCityLive("sydney")?.ok === true, "Sydney live-gate must stay green");
assert(assertCityLive("stockholm")?.ok === true, "Stockholm tester-live must stay green");
assert(assertCityLive("goteborg")?.ok === true, "Göteborg tester-live must stay green");
assert(assertCityLive("bart")?.ok === false, "BART stays planned");

// Registry identity + status — flipped live 27 Sep 2026.
const live = assertCityLive("hong-kong");
assert(live?.ok === true, "assertCityLive(hong-kong) must succeed now that hong-kong is live");

const entry = getCity("hong-kong");
assert(entry?.status === "live", "hong-kong registry status must be live");
assert(entry?.adapterReady === true, "hong-kong adapterReady must be true");
assert(entry?.displayName === "Hong Kong", "hong-kong display name must be Hong Kong");
assert(entry?.timeZone === "Asia/Hong_Kong", "hong-kong timezone must be Asia/Hong_Kong");
assert(entry?.agency === "MTR Corporation Limited", "Hong Kong agency is MTR Corporation Limited");
assert(!(entry.envKeys ?? []).length, "hong-kong has no env key");
assert(entry.modes?.includes("metro"), "hong-kong modes v1 are metro");
assert(!entry.modes?.includes("tram"), "Light Rail / tram is out of v1");
assert(/getSchedule\.php/i.test(entry.integration ?? ""), "registry must name the Next Train REST");
assert(/AEL/.test(entry.integration ?? "") && /DRL/.test(entry.integration ?? ""), "registry must name AEL and DRL as wired");
assert(!/gtfs\.zip|pt-headway/i.test(entry.integration ?? ""), "do not invent a TD GTFS live path");
assert(CITIES.filter((city) => city.id === "hong-kong").length === 1, "hong-kong must appear once in the registry");
for (const forbiddenId of ["hk", "mtr", "kowloon", "china", "light-rail", "airport-express"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}
assert(!CITIES.some((city) => city.id === "hk"), "registry must not invent city=hk");

assert(isMultiCity("hong-kong") === true, "hong-kong must be in MULTI_CITY_IDS now that status is live");

// D1 pack presence (+ Board eligibility section, appended after the original hazard pack).
const d1Dir = join(ROOT, "docs/hong-kong-d1");
for (const name of ["published-network.json", "oracle-clash-report.md", "hazard-pack.md", "direction-model-memo.md", "jim-handoff.md"]) {
  assert(existsSync(join(d1Dir, name)), `docs/hong-kong-d1/${name} is required`);
}
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
assert(/Tim, 27 Sep 2026|Tim's decision, 27 Sep 2026/i.test(oracleReport), "Board eligibility section must record Tim's 27 Sep 2026 AEL decision");
for (const marker of ["Airport Express", "Disneyland Resort", "in`", "out-mode"]) {
  assert(oracleReport.includes(marker), `Board eligibility section must record a verdict mentioning ${marker}`);
}

// D2 fixture stays a verbatim copy — untouched by the board-eligibility supersession, which
// lives in the oracle report prose, not the D1 published-network.json.
const d1Json = readFileSync(join(d1Dir, "published-network.json"), "utf8");
const fixturePath = join(ROOT, "qa/fixtures/hong-kong/published-network.json");
assert(existsSync(fixturePath), "D2 fixture must exist");
assert(d1Json === readFileSync(fixturePath, "utf8"), "qa/fixtures/hong-kong/published-network.json must stay a verbatim copy of docs/hong-kong-d1");

const network = JSON.parse(d1Json);
assert(network.uniqueStationCount === 95, "D1 unique station count must be 95");
assert(!(network.uniqueStations ?? []).includes("Airport"), "Airport is not a D1/catalog station");
assert(!(network.uniqueStations ?? []).includes("Disneyland Resort"), "Disneyland Resort is not a D1/catalog station");

// Catalog: 95 stations, none of Airport/AsiaWorld-Expo/Disneyland Resort/Hong Kong West Kowloon.
const stations = listCatalogStations();
assert(stations.length === 95, `catalog must have 95 stations, got ${stations.length}`);
for (const forbidden of ["Airport", "AsiaWorld-Expo", "Disneyland Resort", "Hong Kong West Kowloon"]) {
  assert(!stations.some((s) => s.name === forbidden), `catalog must not include ${forbidden}`);
}
const hub = stations.find((s) => s.name === METRO_HUB);
assert(hub, "catalog must lock Admiralty");
assert(hub.siteId === "ADM", "Admiralty siteId must be ADM");
assert(hub.lines.sort().join(",") === "EAL,ISL,SIL,TWL", `Admiralty must carry exactly TWL/ISL/SIL/EAL, got ${hub.lines.join(",")}`);

// Hong Kong / Kowloon / Tsing Yi carry TCL + AEL; Sunny Bay carries TCL + DRL — the two
// board-eligibility-approved product lines layered onto existing TCL stations, no new stations.
for (const name of ["Hong Kong", "Kowloon", "Tsing Yi"]) {
  const s = resolveCatalogEntry(name);
  assert(s, `catalog must still include ${name}`);
  assert(s.lines.includes("TCL") && s.lines.includes("AEL"), `${name} must carry TCL and AEL, got ${s.lines.join(",")}`);
}
const sunnyBay = resolveCatalogEntry("Sunny Bay");
assert(sunnyBay?.lines.includes("TCL") && sunnyBay.lines.includes("DRL"), `Sunny Bay must carry TCL and DRL, got ${(sunnyBay?.lines ?? []).join(",")}`);
assert(sunnyBay.siteId === "SUN", "Sunny Bay siteId must be SUN (not SBY — corrected from the controller brief, see jim-handoff.md)");

// resolveCatalogEntry — exact-match, alias resolution, forbidden tokens reject, unknown null.
assert(resolveCatalogEntry(METRO_HUB)?.name === METRO_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("ADM")?.name === METRO_HUB, "resolveCatalogEntry must resolve the hub by its ADM alias");
assert(resolveCatalogEntry("Downtown") === null, "Downtown must never resolve as a station");
assert(resolveCatalogEntry("Not A Real Station") === null, "an unknown name must resolve to null, never a fabricated station");
assert(isForbiddenCollapseName("City") === true, "City must never resolve as a station");

// DEST_CODE_TO_TERMINUS / resolveTerminusFromDestCode — every code below was independently
// confirmed live this session (docs/hong-kong-d1/jim-handoff.md).
assert(resolveTerminusFromDestCode("ISL", "CHW") === "Chai Wan", "ISL dest CHW must resolve to Chai Wan");
assert(resolveTerminusFromDestCode("ISL", "KET") === "Kennedy Town", "ISL dest KET must resolve to Kennedy Town");
assert(resolveTerminusFromDestCode("TWL", "TSW") === "Tsuen Wan", "TWL dest TSW must resolve to Tsuen Wan");
assert(resolveTerminusFromDestCode("TWL", "CEN") === "Central", "TWL dest CEN must resolve to Central");
assert(resolveTerminusFromDestCode("EAL", "LOW") === "Lo Wu / Lok Ma Chau", "EAL dest LOW must resolve to the combined Lo Wu / Lok Ma Chau chip");
assert(resolveTerminusFromDestCode("EAL", "LMC") === "Lo Wu / Lok Ma Chau", "EAL dest LMC must resolve to the same combined chip as LOW");
assert(resolveTerminusFromDestCode("SIL", "SOH") === "South Horizons", "SIL dest SOH must resolve to South Horizons");
assert(resolveTerminusFromDestCode("TML", "TUM") === "Tuen Mun", "TML dest TUM must resolve to Tuen Mun");
assert(resolveTerminusFromDestCode("TML", "WKS") === "Wu Kai Sha", "TML dest WKS must resolve to Wu Kai Sha");
assert(resolveTerminusFromDestCode("TKL", "POA") === "Po Lam / LOHAS Park", "TKL dest POA must resolve to the combined Po Lam / LOHAS Park chip");
assert(resolveTerminusFromDestCode("TKL", "LHP") === "Po Lam / LOHAS Park", "TKL dest LHP must resolve to the same combined chip as POA");
// AEL/DRL — live-confirmed dest codes (AEL-HOK/KOW/TSY -> AWE/HOK; DRL-SUN -> DIS).
assert(resolveTerminusFromDestCode("AEL", "AWE") === "Airport / AsiaWorld-Expo", "AEL dest AWE must resolve to the combined Airport / AsiaWorld-Expo chip");
assert(resolveTerminusFromDestCode("AEL", "AIR") === "Airport / AsiaWorld-Expo", "AEL dest AIR must resolve to the same combined chip as AWE");
assert(resolveTerminusFromDestCode("AEL", "HOK") === "Hong Kong", "AEL dest HOK must resolve to Hong Kong");
assert(resolveTerminusFromDestCode("DRL", "DIS") === "Disneyland Resort", "DRL dest DIS must resolve to Disneyland Resort");
assert(resolveTerminusFromDestCode("DRL", "SUN") === "Sunny Bay", "DRL dest SUN must resolve to Sunny Bay");
assert(resolveTerminusFromDestCode("ISL", "ZZZ") === null, "an unrecognised dest code must never fabricate a terminus");
assert(marketingLabel("AEL", "Hong Kong") === "Airport Express + Hong Kong", "marketingLabel must build the Airport Express family chip");
assert(marketingLabel("DRL", "Disneyland Resort") === "Disneyland Resort + Disneyland Resort", "marketingLabel must build the Disneyland Resort family chip (line name coincides with its own terminus, same style as Tung Chung + Tung Chung)");

// Hub chips (Admiralty never serves AEL/DRL) stay exactly as before this change.
const hubLabels = marketingLabelsForStation(METRO_HUB);
assert(hubLabels.includes("Island + Chai Wan") && hubLabels.includes("Island + Kennedy Town"), "Admiralty must offer Island + Kennedy Town / Chai Wan");
assert(hubLabels.includes("East Rail + Lo Wu / Lok Ma Chau") && hubLabels.includes("South Island + South Horizons"), "Admiralty must offer East Rail + Lo Wu / Lok Ma Chau and South Island + South Horizons");
assert(!hubLabels.some((label) => /airport|disneyland|light rail|high speed/i.test(label)), "Admiralty chips must not name AEL/DRL/Light Rail/HSR — Admiralty does not serve either product line");

// Hong Kong station now offers the AEL chip too (board-eligibility addition).
const hokLabels = marketingLabelsForStation("Hong Kong");
assert(hokLabels.includes("Airport Express + Airport / AsiaWorld-Expo"), `Hong Kong must offer the AEL chip, got ${hokLabels.join("; ")}`);
assert(hokLabels.includes("Tung Chung + Tung Chung"), "Hong Kong must still offer its TCL chip");
const sunnyBayLabels = marketingLabelsForStation("Sunny Bay");
assert(sunnyBayLabels.includes("Disneyland Resort + Disneyland Resort"), `Sunny Bay must offer the DRL chip, got ${sunnyBayLabels.join("; ")}`);

// buildScheduleUrl — no network.
const url = buildScheduleUrl("AEL", "HOK");
assert(url.includes("line=AEL") && url.includes("sta=HOK"), "buildScheduleUrl must carry both line and sta params");

// parseScheduleResponse — every failure mode confirmed LIVE this session
// (docs/hong-kong-d1/jim-handoff.md "Live verification"), from captured/synthetic raw bodies.
let nt301Threw = false;
try {
  parseScheduleResponse(
    { resultCode: 0, status: 0, error: { errorCode: "NT-301", errorMsg: "Please type the line-station." } },
    "",
    ""
  );
} catch (err) {
  nt301Threw = err instanceof MtrScheduleError && err.errorCode === "NT-301";
}
assert(nt301Threw, "parseScheduleResponse must propagate a real NT-301 response as an MtrScheduleError, never a silent empty board");

let nt205Threw = false;
try {
  parseScheduleResponse(
    { resultCode: 0, status: 0, error: { errorCode: "NT-205", errorMsg: "DRL line is disabled in CMS." } },
    "DRL",
    "SUN"
  );
} catch (err) {
  nt205Threw = err instanceof MtrScheduleError && err.errorCode === "NT-205";
}
assert(nt205Threw, "parseScheduleResponse must propagate the real NT-205 'line disabled' response (confirmed live for DRL outside park hours) as an MtrScheduleError");

let specialArrangementThrew = false;
try {
  // The v1.7 spec PDF's own documented shape (p.9) — no errorCode field, unlike the data.gov.hk
  // gateway's NT-301/NT-205 wrapper, but still status:0.
  parseScheduleResponse(
    { status: 0, message: "Special train service arrangements are now in place on this line. Please click here for more information.", url: "https://www.mtr.com.hk/alert/alert_title_wap.html" },
    "TKL",
    "TKO"
  );
} catch (err) {
  specialArrangementThrew = err instanceof MtrScheduleError;
}
assert(specialArrangementThrew, "parseScheduleResponse must propagate the spec's bare status:0 special-train-arrangement shape too");

let suspensionThrew = false;
try {
  parseScheduleResponse({ status: 0, message: "LOW station is suspended" }, "EAL", "LOW");
} catch (err) {
  suspensionThrew = err instanceof MtrScheduleError;
}
assert(suspensionThrew, "parseScheduleResponse must propagate a station-suspension status:0 response");

let isdelayThrew = false;
try {
  // "Data Absence" shape (spec p.9) — status:1 (successful) but isdelay:"Y" and no UP/DOWN keys.
  parseScheduleResponse(
    { sys_time: "-", curr_time: "-", data: { "TKL-TKO": { curr_time: "-", sys_time: "-" } }, status: 1, message: "successful", isdelay: "Y" },
    "TKL",
    "TKO"
  );
} catch (err) {
  isdelayThrew = err instanceof MtrScheduleError;
}
assert(isdelayThrew, "parseScheduleResponse must propagate isdelay:'Y' data-absence rather than a silent empty board");

// Success shape — parseScheduleResponse returns the data block; tripsFromScheduleEntry maps it.
const islAdmSuccess = parseScheduleResponse(
  {
    sys_time: "2026-09-27 08:37:23",
    curr_time: "2026-09-27 08:37:07",
    data: {
      "ISL-ADM": {
        curr_time: "2026-09-27 08:37:07",
        sys_time: "2026-09-27 08:37:23",
        UP: [{ seq: "1", dest: "CHW", plat: "3", time: "2026-09-27 08:40:07", ttnt: "3", valid: "Y", source: "-" }],
        DOWN: [{ seq: "1", dest: "KET", plat: "2", time: "2026-09-27 08:38:07", ttnt: "1", valid: "Y", source: "-" }],
      },
    },
    isdelay: "N",
    status: 1,
    message: "successful",
  },
  "ISL",
  "ADM"
);
const islTrips = tripsFromScheduleEntry(islAdmSuccess, "ISL");
assert(islTrips.length === 2, `tripsFromScheduleEntry must map both UP and DOWN rows, got ${islTrips.length}`);
assert(islTrips.some((t) => t.destination === "Island + Chai Wan"), "the UP row (dest CHW) must map to Island + Chai Wan");
assert(islTrips.some((t) => t.destination === "Island + Kennedy Town"), "the DOWN row (dest KET) must map to Island + Kennedy Town");
assert(islTrips.every((t) => t.cancelled === false), "the feed carries no cancellation flag — cancelled must always be false");
assert(islTrips.every((t) => typeof t.displayTime === "string" && t.displayTime !== ""), "every trip must carry a string displayTime");

// mapScheduleEntryToTrip drops an invalid row rather than showing it.
const invalidRow = mapScheduleEntryToTrip({ seq: "1", dest: "CHW", plat: "3", time: "2026-09-27 08:40:07", ttnt: "3", valid: "N" }, "ISL");
assert(invalidRow === null, "a row with valid !== 'Y' must be dropped, never shown");

// AEL live-confirmed shape (Hong Kong -> Airport/AsiaWorld-Expo).
const aelHokSuccess = parseScheduleResponse(
  {
    sys_time: "2026-09-27 08:37:28",
    curr_time: "2026-09-27 08:37:28",
    data: { "AEL-HOK": { curr_time: "2026-09-27 08:37:28", sys_time: "2026-09-27 08:37:28", UP: [{ seq: "1", dest: "AWE", plat: "1", time: "2026-09-27 08:39:00", ttnt: "2", valid: "Y", source: "-" }] } },
    isdelay: "N",
    status: 1,
    message: "successful",
  },
  "AEL",
  "HOK"
);
const aelTrips = tripsFromScheduleEntry(aelHokSuccess, "AEL");
assert(aelTrips.length === 1 && aelTrips[0].destination === "Airport Express + Airport / AsiaWorld-Expo", `AEL-HOK dest AWE must map to the Airport Express chip, got ${JSON.stringify(aelTrips)}`);

// DRL live-confirmed shape (Sunny Bay -> Disneyland Resort).
const drlSunSuccess = parseScheduleResponse(
  {
    sys_time: "2026-09-27 08:39:15",
    curr_time: "2026-09-27 08:39:14",
    data: { "DRL-SUN": { curr_time: "2026-09-27 08:39:14", sys_time: "2026-09-27 08:39:15", DOWN: [{ seq: "1", dest: "DIS", plat: "3", time: "2026-09-27 08:45:14", ttnt: "6", valid: "Y", source: "-" }] } },
    isdelay: "N",
    status: 1,
    message: "successful",
  },
  "DRL",
  "SUN"
);
const drlTrips = tripsFromScheduleEntry(drlSunSuccess, "DRL");
assert(drlTrips.length === 1 && drlTrips[0].destination === "Disneyland Resort + Disneyland Resort", `DRL-SUN dest DIS must map to the Disneyland Resort chip, got ${JSON.stringify(drlTrips)}`);

// fetchStationBoard — no network for either of these paths (the `entries`/`rawBodies` seams
// skip the HTTP call entirely).
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

const admiraltyBoard = await fetchStationBoard(METRO_HUB, {
  entries: {
    TWL: { UP: [{ dest: "TSW", plat: "1", time: "2026-09-27 08:37:49", valid: "Y" }], DOWN: [{ dest: "CEN", plat: "4", time: "2026-09-27 08:37:49", valid: "Y" }] },
    ISL: { UP: [{ dest: "CHW", plat: "3", time: "2026-09-27 08:40:07", valid: "Y" }], DOWN: [{ dest: "KET", plat: "2", time: "2026-09-27 08:38:07", valid: "Y" }] },
    SIL: { UP: [{ dest: "SOH", plat: "5", time: "2026-09-27 08:38:51", valid: "Y" }] },
    EAL: { UP: [{ dest: "LOW", plat: "7", time: "2026-09-27 08:38:47", valid: "Y" }] },
  },
});
assert(admiraltyBoard.realtime === "live", "fetchStationBoard must mark a board realtime: live");
assert(admiraltyBoard.trips.length === 6, `Admiralty's four lines must all be queried and merged, got ${admiraltyBoard.trips.length} trips`);

let disabledDrlThrew = false;
try {
  await fetchStationBoard("Sunny Bay", {
    rawBodies: {
      TCL: { data: { "TCL-SUN": { UP: [], DOWN: [] } }, status: 1, message: "successful", isdelay: "N" },
      DRL: { resultCode: 0, status: 0, error: { errorCode: "NT-205", errorMsg: "DRL line is disabled in CMS." } },
    },
  });
} catch (err) {
  disabledDrlThrew = err instanceof MtrScheduleError && err.errorCode === "NT-205";
}
assert(disabledDrlThrew, "fetchStationBoard must propagate a disabled-line failure on one of a multi-line station's lines, never silently drop it");

// Dogfood station list + directions come from the catalog/route tables, not a live parse.
const dogfoodStations = listHongKongDogfoodStations();
assert(dogfoodStations.length === 95, `dogfood stations must be the 95 D1 names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === METRO_HUB), "hub must be listed by the dogfood harness");

const hubPack = getHongKongDogfoodDirections(METRO_HUB);
assert(hubPack.source === "hong-kong-marketing-ends", "directions source must be hong-kong-marketing-ends");
assert(JSON.stringify(hubPack.directions.sort()) === JSON.stringify(hubLabels.sort()), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry (now gated live via MULTI_CITY_IDS) returns the same chips as
// the dogfood harness.
const dispatchedDirections = await getMultiCityDirections("hong-kong", METRO_HUB);
assert(JSON.stringify(dispatchedDirections.directions.sort()) === JSON.stringify(hubLabels.sort()), "live-city-api dispatch must return the same chips as the dogfood harness");
assert(dispatchedDirections.source === "hong-kong-marketing-ends", "live-city-api dispatch source must be hong-kong-marketing-ends");

let dispatchedThrew = false;
try {
  await getMultiCityNextTrain("hong-kong", {
    station: "Not A Real Station",
    destination: "Island + Chai Wan",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch {
  dispatchedThrew = true;
}
assert(dispatchedThrew, "dispatched next-train must throw for an unknown station, not a silent fallback board");

let directDogfoodThrew = false;
try {
  await getHongKongDogfoodNextTrain({
    station: "Not A Real Station",
    destination: "Island + Chai Wan",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch {
  directDogfoodThrew = true;
}
assert(directDogfoodThrew, "the dogfood module itself must throw for an unknown station, matching the dispatched path");

// tripMatchesMarketingChip / foldKey sanity.
assert(tripMatchesMarketingChip({ destination: "Island + Chai Wan" }, "Island + Chai Wan") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "Island + Chai Wan" }, "Island + Kennedy Town") === false, "tripMatchesMarketingChip must reject a mismatched chip");
assert(foldKey("Kowloon Station") === "kowloon", "foldKey must strip a trailing Station suffix");

assert(HONG_KONG_TIMEZONE === "Asia/Hong_Kong", "HONG_KONG_TIMEZONE must be Asia/Hong_Kong");

// Picker + live lists: now populated as part of this same flip commit
// (qa/live-city-lists-sync.mjs and qa/country-regions-sync-gate.mjs check they equal exactly
// the live-city set, and are run separately in the flip checklist).
const session = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(/id:\s*"hong-kong"/.test(session), "picker must now list Hong Kong (flipped live)");

const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
assert(!/"hong-kong"/.test(pkg), "do not add hong-kong scripts or bump version for a live-flip commit");

console.log(
  "hong-kong-dogfood-gate: ok (live, in MULTI_CITY_IDS, dispatch switch-cases wired and tested end to end without any network call, D1 pack + Board eligibility section recorded, D2 fixture verbatim, 95 stations, Admiralty hub TWLxISLxSILxEAL, AEL at Hong Kong/Kowloon/Tsing Yi + DRL at Sunny Bay live-confirmed dest-code mapping, NT-301/NT-205/isdelay=Y all propagate rather than a silent empty board, unknown-station throws before any fetch, Perth/Sydney/Stockholm/Göteborg green)"
);
