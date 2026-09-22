/**
 * Adelaide is live on Vercel; hub locked to Adelaide Railway Station; public GTFS needs no key.
 *
 * Direction labels relabelled to terminus-only/Perth style 22 Sep 2026
 * (docs/jim-brief-melbourne-direction-labels-perth-style.md): outbound chips are the bare
 * terminus ("Belair"); hub-bound chips (terminus is Adelaide Railway Station, shared by every
 * line) carry the line name — "Adelaide Railway Station (Belair line)".
 */
import { assertCityLive } from "../lib/providers/registry.js";
import { isCityProbeAllowed } from "../lib/dev-city-board.js";
import vercelBoard from "../api/dev/board.js";
import {
  marketingLabelsForStation,
  isTerminatingAtStation,
  tripMatchesMarketingChip,
} from "../lib/cities/adelaide/marketing-directions.js";
import { readAdelaideMetroApiKey } from "../lib/providers/gtfs/auth.js";
import { loadAdelaideStatic } from "../lib/providers/adelaide.js";
import { assertSnapshotNotStaleTodayOrSkip } from "./lib/assert-not-stale.mjs";

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

console.log(
  "adelaide-dogfood-gate: ok (live, Vercel board 404, seven hub chips (terminus-only/Perth style), Goodwood's hub-bound chips carry the line name, terminating-here filter, BART stays planned, snapshot not stale today)"
);
