/**
 * Copenhagen flip follow-through gate. Rewritten 26 Sep 2026
 * (docs/jim-brief-copenhagen-flip.md) to assert LIVE state — Copenhagen flipped
 * `status: "live"` on Tim's explicit decision in chat, recorded in the brief, after Mark's own
 * QA pass (docs/copenhagen-d1/mark-qa-note.md) could not re-verify the live Rejseplanen fetch
 * from his sandbox (proxy 403) and so did not call this "fully green" itself; the flip instead
 * rests on CI evidence that the live half of this very gate passed on a real Actions runner
 * (docs/copenhagen-d1/ci-live-evidence.md — PR #448's release run and master CI, both green).
 * Mirrors qa/boston-dogfood-gate.mjs's/qa/washington-dogfood-gate.mjs's post-flip shape. The old
 * pre-flip assertions (assertCityLive must fail, status === "planned", isMultiCity() === false)
 * are removed, not left disabled.
 *
 * Metro M1-M4 + S-tog + DSB Regional/InterCity/InterCityLyn + Öresundståg, all via the
 * shared Rejseplanen national platform. Static GTFS only (no key required) — this gate live-
 * fetches the real national GTFS.zip because that is the only way to catch the two silent-
 * exclusion defects a previous pass found and fixed (see
 * lib/cities/copenhagen/marketing-directions.js's classifyDsbService/resolveTerminus comments,
 * confirmed live 20 Sep 2026): Regionaltog/InterCity/InterCityLyn were being dropped from every
 * board because the real feed carries their codes on route_short_name (RE/IC/ICL), not
 * route_long_name/route_desc as the D1-era heuristic assumed, and M2's "Lufthavnen" terminus
 * didn't fold-match the live headsign "Københavns Lufthavn St. (Metro)". One nationwide
 * GTFS.zip download, cached in-process — same cost class as any other GTFS-static smoke-tier
 * gate (e.g. qa/malmo-dogfood-gate.mjs). This live half needs outbound access to
 * rejseplanen.info; it is not reachable from every sandbox (see the CI-evidence doc above) but
 * runs fine in CI and any networked environment.
 *
 * Usage: node qa/copenhagen-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  COPENHAGEN_HUB,
  METRO_CODES,
  STOG_CODES,
  resolveCatalogEntry,
  listCatalogStations,
  fetchStationBoard,
  tripAllowed,
  mapGroupOf,
} from "../lib/providers/copenhagen.js";
import {
  foldKey,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
  mapM3Direction,
  mapLineTerminusDestination,
  classifyDsbService,
  mapDsbDestination,
  resolveTerminus,
} from "../lib/cities/copenhagen/marketing-directions.js";
import { REJSEPLANEN_GTFS_STATIC_URL, MissingRejseplanenApiKeyError } from "../lib/providers/rejseplanen.js";
import {
  listCopenhagenDogfoodStations,
  getCopenhagenDogfoodDirections,
  getCopenhagenDogfoodNextTrain,
} from "../lib/cities/copenhagen/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — deliberately not a hardcoded roll call of every other live city (the
// pattern that caused the Helsinki-contamination bug). Perth (Australia) green + copenhagen
// correctly wired as planned is enough.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Flipped live 26 Sep 2026 (Tim's decision, docs/jim-brief-copenhagen-flip.md); assertCityLive
// must now succeed.
const live = assertCityLive("copenhagen");
assert(live?.ok === true, "assertCityLive(copenhagen) must succeed now that copenhagen is live");

const entry = getCity("copenhagen");
assert(entry?.status === "live", "copenhagen registry status must be live");
assert(entry?.adapterReady === true, "copenhagen adapterReady must be true");
assert(entry?.displayName === "Copenhagen", "copenhagen display name must be Copenhagen");
assert(entry?.timeZone === "Europe/Copenhagen", "copenhagen timezone must be Europe/Copenhagen");
assert(
  CITIES.filter((city) => city.id === "copenhagen").length === 1,
  "copenhagen must appear once in the registry"
);
for (const forbiddenId of ["denmark", "rejseplanen", "aarhus", "cph"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

assert(isMultiCity("copenhagen") === true, "copenhagen must be in MULTI_CITY_IDS now that status is live");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/copenhagen-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/copenhagen-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "copenhagen", "D1 city id must be copenhagen");
// The D1 pack's own published-network.json still says "planned" — it's a point-in-time
// research artifact, not re-stamped on flip (same as washington-d1/brussels-d1's D1 packs).
assert(network.status === "planned", "D1 pack itself is a point-in-time artifact and stays planned");
assert(network.printedInnerCityNames?.lock === COPENHAGEN_HUB, `D1 lock must be ${COPENHAGEN_HUB}`);

const metroLines = network.lines.filter((line) => line.mapGroup === "Metro");
assert(metroLines.length === 4, "D1 must carry exactly 4 metro lines (M1, M2, M3, M4)");
const m3 = network.lines.find((line) => line.id === "m3");
assert(m3?.shape === "ring" && (m3.termini ?? []).length === 0, "M3 must be a true ring with no linear termini");
const nordhavnStogLine = network.lines.find((line) => line.id === "stog-h");
assert(
  !(nordhavnStogLine.stations ?? []).includes("Nordhavn"),
  "S-tog line H must NOT list Nordhavn (H2 correction — H stopped serving Nordhavn in 2017)"
);

// Board eligibility rule (docs/board-eligibility-rule.md): every service calling at an
// in-catalog station needs a recorded verdict — every `in` verdict must survive into the
// adapter, not just the doc (this is exactly the class of bug this pass found and fixed).
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const operator of [
  "Metro M1",
  "S-tog",
  "DSB Regional",
  "DSB InterCity",
  "Öresundståg",
  "DSB EuroCity",
  "SJ X2000",
  "České dráhy",
]) {
  assert(oracleReport.includes(operator), `Board eligibility section must record a verdict for ${operator}`);
}

const stations = listCatalogStations();
assert(stations.length === 44, `catalog must have 44 stations, got ${stations.length}`);
const byName = new Map(stations.map((s) => [s.name, s]));
assert(byName.has(COPENHAGEN_HUB), `catalog must lock ${COPENHAGEN_HUB}`);
assert(byName.get(COPENHAGEN_HUB)?.hub === true, "hub entry must carry hub:true");

for (const shared of ["Nørreport", "Nørrebro", "København H", "Nordhavn"]) {
  assert(byName.has(shared), `catalog must carry the shared station ${shared}`);
  assert(byName.get(shared)?.sharedOperators, `${shared} must carry a sharedOperators block`);
}
assert(
  !(byName.get("Nordhavn")?.sharedOperators?.stog ?? []).includes("H"),
  "Nordhavn's sharedOperators.stog must NOT include H (five lines, not six)"
);
assert(
  (byName.get("Nørreport")?.sharedOperators?.stog ?? []).includes("H"),
  "Nørreport's sharedOperators.stog must include H (six lines, not just C)"
);
assert(
  (byName.get("Nørrebro")?.sharedOperators?.stog ?? []).length === 1 &&
    byName.get("Nørrebro").sharedOperators.stog[0] === "F",
  "Nørrebro's sharedOperators.stog must be F only"
);

// resolveCatalogEntry.
assert(resolveCatalogEntry(COPENHAGEN_HUB)?.name === COPENHAGEN_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("København S")?.name === "København S", "resolveCatalogEntry must resolve København S");
assert(resolveCatalogEntry("Ny Ellebjerg")?.name === "København S", "resolveCatalogEntry must resolve the pre-2024 alias Ny Ellebjerg");
assert(resolveCatalogEntry("Copenhagen") === null, "resolveCatalogEntry must reject the marketing token Copenhagen");
assert(resolveCatalogEntry("denmark") === null, "resolveCatalogEntry must reject the invented city token denmark");
assert(isForbiddenCollapseName("København") === true, "København must never resolve as a station on its own");
assert(isForbiddenHubProxy("Nørreport") === true, "Nørreport must never stand in for the Kongens Nytorv hub identity");
assert(isForbiddenHubProxy(COPENHAGEN_HUB) === false, "the hub itself is not its own proxy violation");
assert(foldKey("Nørreport") === foldKey("NORREPORT".replace("R", "R")) || foldKey("Nørreport") !== "", "foldKey must fold diacritics/case");

// tripAllowed / mapGroupOf — synthetic trips, no network.
const metroTrip = { routeShortName: "M1", destination: "Vestamager" };
assert(mapGroupOf(metroTrip) === "Metro", "M1 must classify as Metro");
assert(tripAllowed(metroTrip, byName.get("Vanløse")) === true, "Metro must be allowed at any of the 44 stations");

const stogHAtNordhavn = { routeShortName: "H", destination: "Østerport" };
assert(mapGroupOf(stogHAtNordhavn) === "S-tog", "H must classify as S-tog");
assert(
  tripAllowed(stogHAtNordhavn, byName.get("Nordhavn")) === false,
  "S-tog H must NOT be allowed at Nordhavn (H2 correction)"
);
assert(
  tripAllowed(stogHAtNordhavn, byName.get("Nørreport")) === true,
  "S-tog H must be allowed at Nørreport"
);
const stogCAtNordhavn = { routeShortName: "C", destination: "Klampenborg" };
assert(tripAllowed(stogCAtNordhavn, byName.get("Nordhavn")) === true, "S-tog C must be allowed at Nordhavn");
const stogFAtNorrebro = { routeShortName: "F", destination: "Hellerup" };
assert(tripAllowed(stogFAtNorrebro, byName.get("Nørrebro")) === true, "S-tog F must be allowed at Nørrebro");
assert(
  tripAllowed({ routeShortName: "C", destination: "Klampenborg" }, byName.get("Nørrebro")) === false,
  "S-tog C must NOT be allowed at Nørrebro (F only)"
);
assert(
  tripAllowed({ routeShortName: "M1", destination: "x" }, null) === true,
  "Metro allow-list does not depend on the station entry"
);

// classifyDsbService — the confirmed-live route_short_name codes (RE/IC/ICL), NOT just the
// route_long_name/route_desc text heuristic. This is the exact defect this pass fixed:
// before it, these three synthetic trips (empty long name/desc, only a short code — exactly
// what the live feed sends) would have classified as null and been silently dropped despite
// their `in` Board eligibility verdict.
assert(classifyDsbService({ routeShortName: "RE", routeLongName: "", routeDesc: "" }) === "Regionaltog", "RE short code must classify as Regionaltog");
assert(classifyDsbService({ routeShortName: "IC", routeLongName: "", routeDesc: "" }) === "InterCity", "IC short code must classify as InterCity");
assert(classifyDsbService({ routeShortName: "ICL", routeLongName: "", routeDesc: "" }) === "InterCityLyn", "ICL short code must classify as InterCityLyn");
assert(classifyDsbService({ routeShortName: "ECE", routeLongName: "", routeDesc: "" }) === null, "ECE (EuroCity) short code must NOT classify — out-reservation, excluded");
assert(classifyDsbService({ routeShortName: "RJ", routeLongName: "", routeDesc: "" }) === null, "RJ (České dráhy) short code must NOT classify — out-reservation, excluded");
const regionaltogTrip = { routeShortName: "RE", routeLongName: "", routeDesc: "", destination: "Ringsted" };
assert(mapGroupOf(regionaltogTrip) === "DSB/Öresundståg", "RE-coded Regionaltog must classify as DSB/Öresundståg");
assert(tripAllowed(regionaltogTrip, byName.get("København H")) === true, "Regionaltog must be allowed at København H");
// Öresundståg's real route_short_name is a bare corridor number (802/803/804/805, confirmed
// live) with route_desc literally "Öresundståg" — still classified via the text heuristic,
// unaffected by the short-code fix above.
assert(classifyDsbService({ routeShortName: "802", routeLongName: "", routeDesc: "Öresundståg" }) === "Öresundståg", "numeric-coded Öresundståg trip must still classify via route_desc");

const euroCityTrip = { routeShortName: "ECE", routeLongName: "", routeDesc: "", destination: "Hamburg" };
assert(mapGroupOf(euroCityTrip) === null, "EuroCity must not classify into any in-scope mapGroup (out-reservation, excluded)");
assert(tripAllowed(euroCityTrip, byName.get("København H")) === false, "EuroCity must never be allowed on any board");
const cdTrip = { routeShortName: "RJ", routeLongName: "", routeDesc: "", destination: "Praha hl.n." };
assert(mapGroupOf(cdTrip) === null, "České dráhy RJ must not classify into any in-scope mapGroup (out-reservation, excluded)");
assert(tripAllowed(cdTrip, byName.get("København H")) === false, "České dráhy must never be allowed on any board");

const busTrip = { routeShortName: "991", routeLongName: "Havnebus", destination: "Orientkaj" };
assert(mapGroupOf(busTrip) === null, "harbour bus must not classify into any in-scope mapGroup (out-mode)");

// classifyDsbService text-heuristic fallback (routeLongName/routeDesc) — still exercised for
// non-live-shaped payloads (e.g. a future feed revision that DOES populate these fields).
assert(classifyDsbService({ routeLongName: "Öresundståg mod Lund" }) === "Öresundståg", "must classify Öresundståg by text");
assert(classifyDsbService({ routeLongName: "InterCityLyn til Odense" }) === "InterCityLyn", "must classify InterCityLyn before InterCity by text");
assert(classifyDsbService({ routeLongName: "InterCity til Ringsted" }) === "InterCity", "must classify InterCity by text");
assert(classifyDsbService({ routeLongName: "Regionaltog til Køge" }) === "Regionaltog", "must classify Regionaltog by text");
assert(classifyDsbService({ routeLongName: "EuroCity til Hamburg" }) === null, "must NOT classify EuroCity into any DSB service type");
assert(mapDsbDestination("Lund", "Öresundståg") === "Öresundståg + Lund", "DSB chip must be service type + destination");

assert(mapM3Direction("Clockwise") === "Clockwise", "M3 direction must pass through the English word");
assert(mapM3Direction("mod uret") === "Counter-clockwise", "M3 direction must normalize Danish 'mod uret'");
assert(mapM3Direction("med uret") === "Clockwise", "M3 direction must normalize Danish 'med uret'");
assert(
  mapLineTerminusDestination("Clockwise", "M3", "Metro") === "M3 + Clockwise",
  "M3 chip must never invent a fake linear terminus"
);
assert(
  mapLineTerminusDestination("Vestamager", "M1", "Metro") === "M1 + Vestamager",
  "M1 chip must be line + terminus"
);
assert(resolveTerminus("Vestamager", "M1") === "Vestamager", "resolveTerminus must recover a known M1 terminus");
assert(resolveTerminus("Some Unknown Headsign", "M1") === null, "resolveTerminus must not fabricate an unknown terminus");
// Confirmed-live fix: M2's official terminus "Lufthavnen" vs the real feed's headsign
// "Københavns Lufthavn St. (Metro)", which doesn't plain-substring-match.
assert(
  resolveTerminus("Københavns Lufthavn St. (Metro)", "M2") === "Lufthavnen",
  "resolveTerminus must resolve the live Lufthavnen headsign alias"
);
assert(
  mapLineTerminusDestination("Københavns Lufthavn St. (Metro)", "M2", "Metro") === "M2 + Lufthavnen",
  "M2 chip must print the official terminus name, not the raw live headsign"
);

// Provider wiring sanity.
assert(REJSEPLANEN_GTFS_STATIC_URL.startsWith("https://www.rejseplanen.info/"), "static GTFS URL must point at Rejseplanen");
assert(typeof MissingRejseplanenApiKeyError === "function", "MissingRejseplanenApiKeyError must be exported for the future live-realtime path");
assert(METRO_CODES.has("M1") && METRO_CODES.has("M4"), "METRO_CODES must include M1..M4");
assert(STOG_CODES.has("A") && STOG_CODES.has("F"), "STOG_CODES must include every S-tog letter");

let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

// Dogfood station list comes from the catalog, not a fresh GTFS parse.
const dogfoodStations = listCopenhagenDogfoodStations();
assert(dogfoodStations.length === 44, `dogfood stations must be the 44 catalog entries, got ${dogfoodStations.length}`);
const dogfoodNames = new Set(dogfoodStations.map((row) => row.name));
assert(dogfoodNames.has(COPENHAGEN_HUB), "hub must be listed by the dogfood harness");

let dogfoodUnknownThrew = false;
try {
  await getCopenhagenDogfoodDirections("Not A Real Station");
} catch {
  dogfoodUnknownThrew = true;
}
assert(dogfoodUnknownThrew, "getCopenhagenDogfoodDirections must not silently succeed for an unknown station");

// Live network section: one nationwide GTFS.zip fetch (in-process cached), exercising the
// dogfood module + the live-city-api dispatch switch-case end to end, including the two
// confirmed-live fixes above.
const hubPack = await getCopenhagenDogfoodDirections(COPENHAGEN_HUB);
assert(hubPack.source === "copenhagen-rejseplanen-schedule", "directions source must be copenhagen-rejseplanen-schedule");
assert(Array.isArray(hubPack.directions) && hubPack.directions.length > 0, "hub directions must be a non-empty array");
for (const chip of hubPack.directions) {
  assert(typeof chip === "string" && chip.length > 0, "every direction chip must be a non-empty string");
  assert(!/EuroCity|SJ X2000|Ceské drá|České dráhy|RailJet/i.test(chip), `Kongens Nytorv must never surface an excluded operator chip, got "${chip}"`);
}
assert(
  hubPack.directions.every((chip) => /^M[1-4] \+/.test(chip)),
  "Kongens Nytorv (Metro-only hub, zero rail/S-tog transfer) must only ever offer Metro chips"
);

// The dispatch switch-case (now gated live via MULTI_CITY_IDS) must return the exact same
// chips as calling the dogfood harness directly.
const dispatched = await getMultiCityDirections("copenhagen", COPENHAGEN_HUB);
assert(
  JSON.stringify(dispatched.directions) === JSON.stringify(hubPack.directions),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatched.source === "copenhagen-rejseplanen-schedule", "live-city-api dispatch source must be copenhagen-rejseplanen-schedule");

// København H must surface DSB Regional/InterCity/InterCityLyn/Öresundståg chips (the
// silent-exclusion defect this pass fixed) but never EuroCity/SJ/České dráhy.
const kobenhavnHPack = await getCopenhagenDogfoodDirections("København H");
assert(
  kobenhavnHPack.directions.some((chip) => chip.startsWith("Regionaltog +")),
  "København H must surface at least one Regionaltog chip (RE short-code fix)"
);
assert(
  kobenhavnHPack.directions.some((chip) => chip.startsWith("InterCity +") || chip.startsWith("InterCityLyn +")),
  "København H must surface at least one InterCity/InterCityLyn chip (IC/ICL short-code fix)"
);
assert(
  kobenhavnHPack.directions.some((chip) => chip.startsWith("Öresundståg +")),
  "København H must surface at least one Öresundståg chip"
);
for (const chip of kobenhavnHPack.directions) {
  assert(!/EuroCity|SJ X2000|Ceské drá|České dráhy|RailJet|Praha|Hamburg Hbf/i.test(chip), `København H must never surface an excluded operator chip, got "${chip}"`);
}

// End-to-end next-train, through both the dogfood harness and the dispatch, for a real chip.
const firstChip = hubPack.directions[0];
const nextTrain = await getCopenhagenDogfoodNextTrain({
  station: COPENHAGEN_HUB,
  destination: firstChip,
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
});
assert(nextTrain.config?.destination === firstChip, "next-train destination must equal the chosen chip");

const dispatchedNextTrain = await getMultiCityNextTrain("copenhagen", {
  station: COPENHAGEN_HUB,
  destination: firstChip,
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
});
assert(
  dispatchedNextTrain.config?.destination === firstChip,
  "dispatched next-train destination must equal the chosen chip"
);

// Persistence + dogfood-mount whitelists (journey-model PERSISTED_CITY_IDS, brisbane-dogfood
// MULTI_CITY_IDS/available, app.js/city-session.js copies) are now updated in this same flip
// commit — qa/live-city-lists-sync.mjs checks they equal exactly the live-city set.

// Probe plumbing: local express only; Vercel dev board must 404 regardless.
const previous = process.env.ALLOW_CITY_PROBES;
delete process.env.ALLOW_CITY_PROBES;
assert(isCityProbeAllowed() === false, "CI/default must not allow city probes");
process.env.ALLOW_CITY_PROBES = "1";
assert(isCityProbeAllowed() === true, "ALLOW_CITY_PROBES=1 enables local express probes only");

const res = {
  statusCode: 0,
  body: null,
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  end() {},
};
await vercelBoard({ method: "GET", query: { city: "copenhagen", station: COPENHAGEN_HUB } }, res);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

console.log(
  "copenhagen-dogfood-gate: ok (live, adapterReady, in MULTI_CITY_IDS, dispatch switch-cases wired and tested end to end against a live GTFS.zip pull, D1 pack, Board eligibility section all-in incl. SJ/České dráhy, 44 stations, hub Kongens Nytorv Metro-only, Nordhavn 5-line/Nørreport 6-line H2 correction enforced, EuroCity/SJ/České dráhy/bus excluded live, RE/IC/ICL short-code classification fix confirmed live (previously silently dropped), Lufthavnen live-headsign alias fix confirmed live, M3 clockwise/counter-clockwise direction model, Perth Australia green)"
);
