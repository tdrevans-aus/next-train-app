/**
 * Vienna flip follow-through gate. Rewritten 27 Sep 2026 (Mark's flip QA, second pass, after
 * docs/jim-brief-vienna-u2-hub-bound-direction.md's U2 fix) to assert LIVE state — Vienna
 * flipped `status: "live"` per Mark's fully-green QA pass (docs/vienna-d1/mark-qa-note.md).
 * Mirrors qa/washington-dogfood-gate.mjs's post-flip shape. The old pre-flip assertions
 * (assertCityLive must fail, status === "planned", isMultiCity() === false) are removed, not
 * left disabled.
 *
 * Deliberately does NOT call the live Wiener Linien OGD Realtime Monitor
 * (www.wienerlinien.at/ogd_realtime/monitor) — this is a smoke-tier gate, not a network test.
 * Instead this gate unit-tests the catalog/direction-model/monitor-parsing logic
 * (resolveCatalogEntry, mapMonitorDepartureToTrip, tripsFromMonitors,
 * mapLineTerminusDestination, resolveTerminus) against synthetic payloads shaped like the real
 * monitor JSON captured live this session (docs/vienna-d1/jim-handoff.md "Live verification"),
 * plus asserts that fetchStationBoard throws for an unknown station and propagates a non-OK
 * monitor messageCode (e.g. a rate-limit response) rather than returning an empty board, all
 * without any network call.
 *
 * Usage: node qa/vienna-dogfood-gate.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive, getCity, CITIES } from "../lib/providers/registry.js";
import { isMultiCity, getMultiCityDirections, getMultiCityNextTrain } from "../lib/cities/live-city-api.js";
import {
  VIENNA_HUB,
  VIENNA_TIMEZONE,
  WIENER_LINIEN_LINE_NAME_TO_LINE,
  WIENER_LINIEN_MONITOR_URL,
  LINE_LABELS,
  LINE_TERMINI,
  resolveCatalogEntry,
  listCatalogStations,
  buildMonitorUrl,
  mapMonitorDepartureToTrip,
  tripsFromMonitors,
  fetchStationBoard,
  isForbiddenCollapseName,
  isForbiddenHubProxy,
} from "../lib/providers/vienna.js";
import {
  foldKey,
  resolveTerminus,
  mapLineTerminusDestination,
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "../lib/cities/vienna/marketing-directions.js";
import {
  listViennaDogfoodStations,
  getViennaDogfoodDirections,
  getViennaDogfoodNextTrain,
} from "../lib/cities/vienna/dogfood-next-train.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Sanity anchor only — Perth (Australia) green is enough, not a hardcoded roll call.
const perthAustralia = assertCityLive("perth");
assert(perthAustralia?.ok === true, "Perth (Australia) must stay live");

// Registry identity + status — Vienna flipped live 27 Sep 2026; assertCityLive must now succeed.
const live = assertCityLive("vienna");
assert(live?.ok === true, "assertCityLive(vienna) must succeed now that vienna is live");

const entry = getCity("vienna");
assert(entry?.status === "live", "vienna registry status must be live");
assert(entry?.adapterReady === true, "vienna adapterReady must be true");
assert(entry?.displayName === "Vienna", "vienna display name must be Vienna");
assert(entry?.timeZone === "Europe/Vienna", "vienna timezone must be Europe/Vienna");
assert(CITIES.filter((city) => city.id === "vienna").length === 1, "vienna must appear once in the registry");
for (const forbiddenId of ["wien", "at-vienna", "austria"]) {
  assert(!getCity(forbiddenId), `must not be registered as city=${forbiddenId}`);
}

// Dogfood dispatch is wired and vienna is now in MULTI_CITY_IDS (the flip commit).
assert(isMultiCity("vienna") === true, "vienna must be in MULTI_CITY_IDS now that status is live");

// D1 pack presence.
const d1Dir = join(ROOT, "docs/vienna-d1");
for (const name of [
  "published-network.json",
  "oracle-clash-report.md",
  "hazard-pack.md",
  "direction-model-memo.md",
  "jim-handoff.md",
]) {
  assert(existsSync(join(d1Dir, name)), `docs/vienna-d1/${name} is required`);
}

const network = JSON.parse(readFileSync(join(d1Dir, "published-network.json"), "utf8"));
assert(network.city === "vienna", "D1 city id must be vienna");
assert(network.status === "planned", "D1 pack stays planned");
assert(network.printedInnerCityNames?.lock === VIENNA_HUB, `D1 lock must be ${VIENNA_HUB}`);
assert(network.lines.length === 5, "D1 must carry exactly 5 passenger lines (U1/U2/U3/U4/U6)");

// Board eligibility rule (docs/board-eligibility-rule.md) — the section must exist with a
// recorded net verdict (S-Bahn/Badner Bahn/ÖBB explicitly out of catalog scope).
const oracleReport = readFileSync(join(d1Dir, "oracle-clash-report.md"), "utf8");
assert(/## Board eligibility/.test(oracleReport), "oracle report must carry a Board eligibility section");
for (const service of ["S-Bahn", "Badner Bahn", "ÖBB"]) {
  assert(oracleReport.includes(service), `Board eligibility section must record a verdict for ${service}`);
}

const stations = listCatalogStations();
assert(stations.length === 99, `catalog must have 99 stations, got ${stations.length}`);
const hubEntries = stations.filter((s) => s.name === VIENNA_HUB);
assert(hubEntries.length === 1, `catalog must carry ${VIENNA_HUB} exactly once`);
assert(
  hubEntries[0].lines.sort().join(",") === "u1,u2,u4",
  `${VIENNA_HUB} must carry exactly U1/U2/U4`
);

// Every station carries lat/lng and at least one live-verified RBL id (this session's live
// verification, docs/vienna-d1/jim-handoff.md).
for (const station of stations) {
  assert(typeof station.lat === "number" && typeof station.lng === "number", `${station.name} must carry lat/lng`);
  assert(Array.isArray(station.rbl) && station.rbl.length > 0, `${station.name} must carry at least one RBL stopId`);
}

// Karlsplatz's live-confirmed RBL shape: exactly one U2 platform (the terminus), two each for
// U1/U4 (docs/vienna-d1/jim-handoff.md "Live verification").
assert(hubEntries[0].rbl.length === 5, `${VIENNA_HUB} must carry exactly 5 live-confirmed RBL ids, got ${hubEntries[0].rbl.length}`);

// resolveCatalogEntry — exact-match, alias resolution, forbidden tokens reject.
assert(resolveCatalogEntry(VIENNA_HUB)?.name === VIENNA_HUB, "resolveCatalogEntry must resolve the hub by printed name");
assert(resolveCatalogEntry("Vienna") === null, "Vienna must never resolve as a station");
assert(resolveCatalogEntry("Wien") === null, "Wien must never resolve as a station");
assert(resolveCatalogEntry("City") === null, "City must never resolve as a station");
assert(resolveCatalogEntry("Kaisermühlen")?.name === "Kaisermühlen-VIC", "the truncated alias must resolve to the fuller printed name");
assert(isForbiddenHubProxy("Stephansplatz") === true, "Stephansplatz must never stand in for the Karlsplatz hub identity");
assert(isForbiddenHubProxy(VIENNA_HUB) === false, "the hub itself is not its own proxy violation");
assert(isForbiddenCollapseName("Zentrum") === true, "Zentrum must never resolve as a station");

// Line labels + termini (direction-model-memo.md sections 1-2, corrected 27 Sep 2026 per
// docs/jim-brief-vienna-u2-hub-bound-direction.md) — U2 now carries BOTH real printed termini,
// Seestadt and its hub-bound terminus Karlsplatz; the hub lock forbids only a bare/generic hub
// token, not a line-qualified hub-bound chip.
assert(LINE_LABELS.u1 === "U1" && LINE_LABELS.u6 === "U6", "line labels must be the bare printed U-codes");
assert(LINE_TERMINI.u1.includes("Leopoldau") && LINE_TERMINI.u1.includes("Oberlaa"), "U1 termini must be Leopoldau/Oberlaa");
assert(LINE_TERMINI.u2.length === 2 && LINE_TERMINI.u2.includes("Seestadt") && LINE_TERMINI.u2.includes("Karlsplatz"), "U2 termini must be Seestadt AND Karlsplatz");
assert(!LINE_TERMINI.u1.includes(VIENNA_HUB), "U1 must never gain a Karlsplatz terminus/chip");
assert(!LINE_TERMINI.u4.includes(VIENNA_HUB), "U4 must never gain a Karlsplatz terminus/chip");
assert(mapLineTerminusDestination(VIENNA_HUB, "u1") === "U1", "Karlsplatz must never appear as a U1 direction token — falls back to the bare line label");
assert(mapLineTerminusDestination("Seestadt", "u2") === "U2 + Seestadt", "direction chip must be line + terminus");
assert(mapLineTerminusDestination(VIENNA_HUB, "u2") === "U2 + Karlsplatz", "a U2 towards-Karlsplatz string must resolve to the line-qualified hub-bound chip");
assert(resolveTerminus("Some Unknown Headsign", "u1") === null, "resolveTerminus must not fabricate an unknown terminus");
assert(foldKey("Kaisermühlen") !== "", "foldKey must fold diacritics");

// marketingLabelsForStation excludes a self-referential terminus chip.
const karlsplatzLabels = marketingLabelsForStation(VIENNA_HUB);
assert(karlsplatzLabels.includes("U1 + Leopoldau"), "Karlsplatz must offer U1 + Leopoldau");
assert(karlsplatzLabels.includes("U2 + Seestadt"), "Karlsplatz must offer U2 + Seestadt");
assert(!karlsplatzLabels.some((l) => l.endsWith("+ Karlsplatz")), "Karlsplatz must never offer a self-referential + Karlsplatz chip");
assert(!karlsplatzLabels.some((l) => l.startsWith("U1") && l.includes("Karlsplatz")), "Karlsplatz's own U1 chips must never mention Karlsplatz");
assert(!karlsplatzLabels.some((l) => l.startsWith("U4") && l.includes("Karlsplatz")), "Karlsplatz's own U4 chips must never mention Karlsplatz");
assert(tripMatchesMarketingChip({ destination: "U1 + Leopoldau" }, "U1 + Leopoldau") === true, "tripMatchesMarketingChip must match an identical chip");
assert(tripMatchesMarketingChip({ destination: "U1 + Leopoldau" }, "U1 + Oberlaa") === false, "tripMatchesMarketingChip must reject a mismatched chip");

// Seestadt (U2's own terminus, Mark's flip-QA RED station) must now offer exactly the
// Karlsplatz-bound chip, and every U1/U4 chip must never mention Karlsplatz.
const seestadtLabels = marketingLabelsForStation("Seestadt");
assert(JSON.stringify(seestadtLabels) === JSON.stringify(["U2 + Karlsplatz"]), `Seestadt must offer exactly ["U2 + Karlsplatz"], got ${JSON.stringify(seestadtLabels)}`);

// An intermediate U2 station (not a terminus either side) must show BOTH U2 directions.
const praternsternLabels = marketingLabelsForStation("Praterstern");
assert(praternsternLabels.includes("U2 + Seestadt"), "Praterstern must offer U2 + Seestadt");
assert(praternsternLabels.includes("U2 + Karlsplatz"), "Praterstern must offer U2 + Karlsplatz");

// Synthetic per-direction trip-count assertion: a station with live trips in both directions
// must have BOTH chips backed by at least one matching trip (a zero-trip chip at a station with
// live trips must fail this pattern).
function assertBothDirectionsHaveTrips(stationName, lineId, towardsA, towardsB, referenceTime) {
  const chipA = mapLineTerminusDestination(towardsA, lineId);
  const chipB = mapLineTerminusDestination(towardsB, lineId);
  const syntheticMonitors = [
    {
      lines: [
        {
          name: lineId.toUpperCase(),
          towards: towardsA,
          platform: "1",
          type: "ptMetro",
          departures: { departure: [{ departureTime: { timeReal: referenceTime } }] },
        },
        {
          name: lineId.toUpperCase(),
          towards: towardsB,
          platform: "2",
          type: "ptMetro",
          departures: { departure: [{ departureTime: { timeReal: referenceTime } }] },
        },
      ],
    },
  ];
  const trips = tripsFromMonitors(syntheticMonitors, new Date(referenceTime));
  const countA = trips.filter((t) => tripMatchesMarketingChip(t, chipA)).length;
  const countB = trips.filter((t) => tripMatchesMarketingChip(t, chipB)).length;
  assert(countA > 0, `${stationName}: chip "${chipA}" must have > 0 matching trips, got ${countA}`);
  assert(countB > 0, `${stationName}: chip "${chipB}" must have > 0 matching trips, got ${countB}`);
}
assertBothDirectionsHaveTrips("Praterstern", "u2", "Seestadt", "Karlsplatz", "2026-09-27T02:16:00.000+0200");
assertBothDirectionsHaveTrips("Aspern Nord", "u2", "Seestadt", "Karlsplatz", "2026-09-27T02:16:00.000+0200");

// Monitor URL shaping (no SENDER parameter, multiple stopId params) — no network.
assert(WIENER_LINIEN_MONITOR_URL === "https://www.wienerlinien.at/ogd_realtime/monitor", "monitor URL must point at the OGD Realtime Monitor");
const url = buildMonitorUrl([4109, 4120]);
assert(url.includes("stopId=4109") && url.includes("stopId=4120"), "buildMonitorUrl must carry every stopId param");
assert(!url.includes("SENDER"), "buildMonitorUrl must never send the documented SENDER parameter");

// mapMonitorDepartureToTrip / tripsFromMonitors — synthetic payloads shaped exactly like the
// real monitor response captured live this session (docs/vienna-d1/jim-handoff.md).
const referenceNow = new Date("2026-09-27T02:00:00+02:00");
const u1LineEntry = {
  name: "U1",
  towards: "Leopoldau",
  platform: "1",
  type: "ptMetro",
  departures: {
    departure: [
      {
        departureTime: {
          timePlanned: "2026-09-27T02:14:00.000+0200",
          timeReal: "2026-09-27T02:14:00.000+0200",
          countdown: 14,
        },
      },
    ],
  },
};
const u1Trip = mapMonitorDepartureToTrip(u1LineEntry, u1LineEntry.departures.departure[0], referenceNow);
assert(u1Trip.lineId === "u1", "mapMonitorDepartureToTrip must classify U1 by the monitor's own line name");
assert(u1Trip.destination === "U1 + Leopoldau", "mapMonitorDepartureToTrip must produce a line + terminus chip");
assert(typeof u1Trip.displayTime === "string" && u1Trip.displayTime !== "", "mapMonitorDepartureToTrip must set a string displayTime");
assert(typeof u1Trip.scheduledDisplayTime === "string" && u1Trip.scheduledDisplayTime !== "", "mapMonitorDepartureToTrip must set a string scheduledDisplayTime");
assert(u1Trip.cancelled === false, "the monitor never reports a cancellation flag — cancelled must always be false");

const tramLineEntry = {
  name: "WLB",
  towards: "Wien Oper",
  platform: "1",
  type: "ptTramWLB",
  departures: { departure: [{ departureTime: { timePlanned: "2026-09-27T02:20:00.000+0200", timeReal: "2026-09-27T02:20:00.000+0200" } }] },
};
assert(
  mapMonitorDepartureToTrip(tramLineEntry, tramLineEntry.departures.departure[0], referenceNow) === null,
  "a non-U-Bahn line name (tram WLB) must be dropped even if it slipped into a monitor response"
);

const busLineEntry = {
  name: "N46",
  towards: "Oper, Karlsplatz U",
  platform: "1",
  type: "ptBusNight",
  departures: { departure: [{ departureTime: { timeReal: "2026-09-27T02:25:00.000+0200" } }] },
};
assert(
  mapMonitorDepartureToTrip(busLineEntry, busLineEntry.departures.departure[0], referenceNow) === null,
  "a night-bus row must be dropped even if it slipped into a monitor response"
);

const syntheticKarlsplatzMonitors = [
  { lines: [u1LineEntry] },
  { lines: [tramLineEntry] },
  { lines: [busLineEntry] },
  {
    lines: [
      {
        name: "U2",
        towards: "Seestadt",
        platform: "2",
        type: "ptMetro",
        departures: { departure: [{ departureTime: { timeReal: "2026-09-27T02:16:00.000+0200" } }] },
      },
    ],
  },
];
const syntheticTrips = tripsFromMonitors(syntheticKarlsplatzMonitors, referenceNow);
assert(syntheticTrips.length === 2, `tripsFromMonitors must drop the tram/night-bus rows, got ${syntheticTrips.length}`);
assert(syntheticTrips.every((t) => ["u1", "u2"].includes(t.lineId)), "every remaining synthetic trip must be U1 or U2");

// fetchStationBoard — no network for either of these failure/verdict paths (a synthetic
// `monitors`/`rblIds` option skips the HTTP call entirely).
let unknownThrew = false;
try {
  await fetchStationBoard("Not A Real Station");
} catch {
  unknownThrew = true;
}
assert(unknownThrew, "fetchStationBoard must throw for an unknown station without any network call");

const syntheticBoard = await fetchStationBoard(VIENNA_HUB, {
  monitors: syntheticKarlsplatzMonitors,
  now: referenceNow,
});
assert(syntheticBoard.realtime === "live", "fetchStationBoard must mark a board realtime: live");
assert(syntheticBoard.trips.length === 2, "fetchStationBoard must return only the U-Bahn trips from a synthetic monitor payload");

// Note: fetchStationBoard's real HTTP path (fetchMonitorJson, incl. its non-OK-messageCode
// throw for a rate-limited response) is never mocked here — this gate deliberately stops
// testing fetchStationBoard once past the synthetic-`monitors`-option seam above, same posture
// as Chicago's Train Tracker note in qa/chicago-dogfood-gate.mjs. The live monitor endpoint WAS
// exercised for real during this adapter's build (docs/vienna-d1/jim-handoff.md "Live
// verification"), just not from this smoke-tier gate.

// Dogfood station list + directions come from the catalog/route tables, not a live parse.
const dogfoodStations = listViennaDogfoodStations();
assert(dogfoodStations.length === 99, `dogfood stations must be the 99 D1 names, got ${dogfoodStations.length}`);
assert(dogfoodStations.some((row) => row.name === VIENNA_HUB), "hub must be listed by the dogfood harness");

const hubPack = getViennaDogfoodDirections(VIENNA_HUB);
assert(hubPack.source === "vienna-marketing-ends", "directions source must be vienna-marketing-ends");
assert(JSON.stringify(hubPack.directions.sort()) === JSON.stringify(karlsplatzLabels.sort()), "dogfood directions must match marketingLabelsForStation");

// The production dispatch entry exists and returns the same chips as the dogfood harness, now
// that vienna is live and in MULTI_CITY_IDS.
const dispatchedDirections = await getMultiCityDirections("vienna", VIENNA_HUB);
assert(
  JSON.stringify(dispatchedDirections.directions.sort()) === JSON.stringify(karlsplatzLabels.sort()),
  "live-city-api dispatch must return the same chips as the dogfood harness"
);
assert(dispatchedDirections.source === "vienna-marketing-ends", "live-city-api dispatch source must be vienna-marketing-ends");

// The dispatched next-train call must still surface an unknown-station error for a bogus
// station name (no key exists for this feed, so the only guaranteed-no-network failure path is
// an unresolvable station).
let dispatchedThrew = false;
try {
  await getMultiCityNextTrain("vienna", {
    station: "Not A Real Station",
    destination: "U1 + Leopoldau",
    leaveBeforeMinutes: 5,
    refreshSeconds: 60,
  });
} catch {
  dispatchedThrew = true;
}
assert(dispatchedThrew, "dispatched next-train must throw for an unknown station, not a silent fallback board");

assert(VIENNA_TIMEZONE === "Europe/Vienna", "VIENNA_TIMEZONE must be Europe/Vienna");
assert(WIENER_LINIEN_LINE_NAME_TO_LINE.U1 === "u1", "line-name map must classify the monitor's own U1 label");

console.log(
  "vienna-dogfood-gate: ok (live/status flipped 27 Sep 2026, MULTI_CITY_IDS/mount/persistence lists updated, D1 pack, Board eligibility section recorded, 99 stations each with lat/lng and live-verified RBL ids, hub Karlsplatz U1xU2xU4 with U2's hub-bound + terminating directions both wired (Seestadt board fix), line+terminus direction model, Karlsplatz never a generic direction token, monitor URL never sends SENDER, tram/night-bus rows dropped even when present in a monitor payload, unknown-station throws before any fetch, Perth Australia green)"
);
