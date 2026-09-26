/**
 * Adelaide is live on Vercel; hub locked to Adelaide Railway Station; public GTFS needs no key.
 *
 * Direction labels relabelled to terminus-only/Perth style 22 Sep 2026
 * (docs/jim-brief-melbourne-direction-labels-perth-style.md): outbound chips are the bare
 * terminus ("Belair"); hub-bound chips (terminus is Adelaide Railway Station, shared by every
 * line) carry the line name — "Adelaide Railway Station (Belair line)".
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  marketingLabelsForStation,
  isTerminatingAtStation,
  tripMatchesMarketingChip,
} from "../lib/cities/adelaide/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { readAdelaideMetroApiKey } from "../lib/providers/gtfs/auth.js";
import { loadAdelaideStatic } from "../lib/providers/adelaide.js";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";
import { getMultiCityNextTrain } from "../lib/cities/live-city-api.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const live = assertCityLive("adelaide");
assert(live && live.ok === true, "assertCityLive(adelaide) must pass");

const perth = assertCityLive("perth");
assert(perth && perth.ok === true, "Perth live-gate must stay green");
const sydney = assertCityLive("sydney");
assert(sydney && sydney.ok === true, "Sydney live-gate must pass");
const brisbane = assertCityLive("brisbane");
assert(brisbane && brisbane.ok === true, "Brisbane live-gate must pass");
// Anchor moved off melbourne (flipped live 22 Sep 2026) to bart, which stays planned pending
// a Tim-held key — see docs/jim-brief-melbourne-flip-unblock.md.
const bart = assertCityLive("bart");
assert(bart && bart.ok === false, "BART must stay planned");

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

await vercelBoard(
  { method: "GET", query: { city: "adelaide", station: "Adelaide Railway Station" } },
  res
);
assert(res.statusCode === 404, "Vercel /api/dev/board must 404 even if ALLOW_CITY_PROBES=1");

const hub = marketingLabelsForStation("Adelaide Railway Station");
assert(hub.includes("Belair"), "Hub must offer the bare terminus Belair");
assert(hub.includes("Port Dock"), "Port Dock is a seventh printed line");
assert(!hub.some((label) => /tonsley/i.test(label)), "Tonsley is not a line chip");
assert(hub.length === 7, `Hub must have 7 chips, got ${hub.length}: ${hub.join("; ")}`);
assert(
  !hub.some((label) => label.includes("Adelaide Railway Station")),
  "no direction from Adelaide Railway Station may itself be destined for Adelaide Railway Station — that's an arrival"
);
assert(
  !hub.some((label) => label.includes(" line ") || / line$/i.test(label)),
  `no hub chip may use the retired "<Line> line <terminus>" format, got: ${hub.join("; ")}`
);

// Hub-bound chips at a non-hub, multi-line station carry the line name to disambiguate —
// Goodwood sits on Belair/Seaford/Flinders, all converging on Adelaide Railway Station.
const goodwood = marketingLabelsForStation("Goodwood");
assert(goodwood.includes("Adelaide Railway Station (Belair line)"), `Goodwood must offer the hub-bound Belair chip, got: ${goodwood.join("; ")}`);
assert(goodwood.includes("Adelaide Railway Station (Seaford line)"), `Goodwood must offer the hub-bound Seaford chip, got: ${goodwood.join("; ")}`);
assert(goodwood.includes("Adelaide Railway Station (Flinders line)"), `Goodwood must offer the hub-bound Flinders chip, got: ${goodwood.join("; ")}`);
assert(goodwood.includes("Belair") && goodwood.includes("Seaford") && goodwood.includes("Flinders"), `Goodwood's outbound chips must be bare termini, got: ${goodwood.join("; ")}`);
assert(!goodwood.some((label) => label.includes(" + ")), 'no Adelaide label may use the retired "<Line> line <terminus>" format with a "+"');

// tripMatchesMarketingChip must still resolve the new chip formats to real trips.
assert(tripMatchesMarketingChip({ destination: "Belair" }, "Belair") === true, "an outbound chip must match its own bare terminus");
assert(tripMatchesMarketingChip({ destination: "Adelaide" }, "Adelaide Railway Station (Belair line)") === true, "a hub-bound chip must match an Adelaide-bound trip");
assert(tripMatchesMarketingChip({ destination: "Belair" }, "Seaford") === false, "a chip must not match an unrelated terminus");

// A trip terminating at the station being viewed is an arrival, not a departure.
assert(isTerminatingAtStation("Belair", "Belair") === true, "a trip destined for the station being viewed must be flagged as terminating here");
assert(isTerminatingAtStation("Adelaide", "Adelaide Railway Station") === true, "the hub is its own terminus under either spelling");
assert(isTerminatingAtStation("Belair", "Goodwood") === false, "a genuine departure must not be flagged as terminating here");

// docs/jim-brief-adelaide-city-bound-rows-missing.md: the live Adelaide Metro feed's
// trip_headsign for every hub-bound trip is the bare word "City" (not "Adelaide" or
// "Adelaide Railway Station") — #439 missed this and every hub-bound chip's trip count
// silently went to zero in production. Assert both ends of that regression directly.
assert(isTerminatingAtStation("City", "Adelaide Railway Station") === true, '"City" must be recognised as the hub, so an arrival there is dropped, not double-counted');
assert(isTerminatingAtStation("City", "Alberton") === false, '"City" is not an arrival anywhere except the hub itself');
assert(tripMatchesMarketingChip({ destination: "City", routeShortName: "OUTHA" }, "Adelaide Railway Station (Outer Harbor line)") === true, 'a feed trip destined "City" must match its line\'s hub-bound chip');
assert(tripMatchesMarketingChip({ destination: "City", routeShortName: "BEL" }, "Adelaide Railway Station (Belair line)") === true, 'a feed trip destined "City" must match its line\'s hub-bound chip');

// A real captured Adelaide feed fixture (qa/fixtures/adelaide/city-bound-capture.json,
// no synthetic rows) must prove hub-bound chips have real trips behind them, not just
// resolvable labels — this is the exact check that was missing before this fix: the old
// gate only ever exercised tripMatchesMarketingChip against a bare "Adelaide" destination,
// which the live feed never actually sends.
const capture = JSON.parse(
  readFileSync(join(ROOT, "qa/fixtures/adelaide/city-bound-capture.json"), "utf8")
);
for (const [stationName, trips, expectedHubChips] of [
  ["Alberton", capture.alberton, ["Adelaide Railway Station (Outer Harbor line)", "Adelaide Railway Station (Port Dock line)"]],
  ["Goodwood", capture.goodwood, ["Adelaide Railway Station (Belair line)", "Adelaide Railway Station (Flinders line)", "Adelaide Railway Station (Seaford line)"]],
]) {
  const labels = marketingLabelsForStation(stationName);
  for (const chip of expectedHubChips) {
    assert(labels.includes(chip), `${stationName} must offer the hub-bound chip "${chip}"`);
    const matches = trips.filter((t) => !isTerminatingAtStation(t.destination, stationName) && tripMatchesMarketingChip(t, chip));
    assert(matches.length >= 1, `${stationName}'s "${chip}" chip must have at least one real captured trip behind it, got ${matches.length}`);
  }
  // Osborne-style short-workings must still be attributed to their line's outbound chip,
  // not silently dropped for lacking a printed terminus of their own.
  const osborneTrips = trips.filter((t) => t.destination === "Osborne");
  if (osborneTrips.length > 0) {
    const outerHarborMatches = osborneTrips.filter((t) => tripMatchesMarketingChip(t, "Outer Harbor"));
    assert(outerHarborMatches.length === osborneTrips.length, `every captured Osborne short-working at ${stationName} must match the Outer Harbor outbound chip`);
  }
  // No trip on a non-hub station's fixture may resolve as an arrival at that station.
  assert(!trips.some((t) => isTerminatingAtStation(t.destination, stationName)), `${stationName} must show no arrival rows for itself`);
}
// Adelaide Railway Station itself must show no arrival rows: every hub-bound destination
// spelling the feed uses is recognised as terminating there.
for (const hubDestination of ["City", "Adelaide", "Adelaide Railway Station"]) {
  assert(isTerminatingAtStation(hubDestination, "Adelaide Railway Station") === true, `"${hubDestination}" must be recognised as an arrival at Adelaide Railway Station itself`);
}

assert(
  typeof readAdelaideMetroApiKey() === "string",
  "H2: missing key must be an empty string, not a throw"
);

if (previous === undefined) {
  delete process.env.ALLOW_CITY_PROBES;
} else {
  process.env.ALLOW_CITY_PROBES = previous;
}

await assertSnapshotNotStaleTodayOrSkip("adelaide", loadAdelaideStatic);

// jim-brief-direction-label-aliases-server-side.md Part 1: every installed app still sending the
// retired "<line name> <terminus>" form must keep getting a train, and the response must echo
// the canonical terminus-only label so the client self-heals its saved value.
const legacyOutboundNextTrain = await getMultiCityNextTrain("adelaide", {
  station: "Adelaide Railway Station",
  destination: "Belair line Belair",
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
});
assert(
  legacyOutboundNextTrain.config?.destination === "Belair",
  `legacy label "Belair line Belair" must resolve to canonical "Belair", got ${legacyOutboundNextTrain.config?.destination}`
);
assert(
  legacyOutboundNextTrain.config?.destinationLabel === "Belair",
  "legacy label request must echo the canonical destinationLabel"
);
assert(
  legacyOutboundNextTrain.next !== null,
  'legacy label "Belair line Belair" from Adelaide Railway Station must return a non-null next train'
);

const legacyHubNextTrain = await getMultiCityNextTrain("adelaide", {
  station: "Goodwood",
  destination: "Belair line Adelaide Railway Station",
  leaveBeforeMinutes: 5,
  refreshSeconds: 60,
});
assert(
  legacyHubNextTrain.config?.destination === "Adelaide Railway Station (Belair line)",
  `legacy hub-bound label must resolve to canonical "Adelaide Railway Station (Belair line)", got ${legacyHubNextTrain.config?.destination}`
);
assert(
  legacyHubNextTrain.next !== null,
  'Goodwood towards "Adelaide Railway Station (Belair line)" must return a non-null next train — this is the exact production regression from #439 (docs/jim-brief-adelaide-city-bound-rows-missing.md)'
);

console.log(
  "adelaide-dogfood-gate: ok (live, Vercel board 404, seven hub chips (terminus-only/Perth style), Goodwood's hub-bound chips carry the line name, terminating-here filter, hub-bound chips proven to have real captured trips behind them (city-bound feed destination \"City\" recognised), Osborne short-workings attributed to their line, BART stays planned, snapshot not stale today)"
);
