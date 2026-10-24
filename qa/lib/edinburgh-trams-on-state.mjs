/**
 * Child-process half of qa/edinburgh-trams-planned-gate.mjs: exercises the
 * Edinburgh Trams wiring with the switch turned ON, entirely offline.
 *
 * It must run in its own process because the tram switch is read when the
 * catalogs are first loaded (and cached). Before importing anything it flips
 * the in-memory registry entry (`CITIES` is a plain mutable array) — the same
 * field Mark's flip PR sets — and replaces `globalThis.fetch` with a stub that
 * serves Trapeze StopEvents fixtures shaped like the real 24 Oct 2026 probe
 * (single object, bare UTC "HH:MM" clocks, numeric countdowns, nulls).
 *
 * Prints one JSON line: { results: [{ name, ok, detail }] }.
 */
import { CITIES } from "../../lib/providers/registry.js";

CITIES.find((c) => c.id === "edinburgh").tramsLive = true;

const KEY = "unit-test-key-not-a-real-credential";
process.env.EDINBURGH_BUSTRACKER_KEY = KEY;

const requests = [];
let mode = "ok";
let bodies = {};

globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  requests.push({ path: u.pathname, search: u.search, atcocode: u.searchParams.get("atcocode"), headers: init.headers ?? {} });
  if (mode === "http500") {
    return new Response("boom", { status: 500 });
  }
  const validBody = () => JSON.stringify({ time: bodiesTime, atcocode: u.searchParams.get("atcocode"), events: [ev("Newhaven", "09:47", 608)] });
  if (mode === "http429json") {
    return new Response(validBody(), { status: 429, headers: { "content-type": "application/json", "Retry-After": "120" } });
  }
  if (mode === "http503json") {
    return new Response(validBody(), { status: 503, headers: { "content-type": "application/json" } });
  }
  if (mode === "reject") {
    throw new TypeError("network down");
  }
  if (mode === "html") {
    return new Response("<html>rate limited</html>", { status: 200, headers: { "content-type": "text/html" } });
  }
  const body = bodies[u.searchParams.get("atcocode")] ?? { time: bodiesTime, atcocode: u.searchParams.get("atcocode"), events: [] };
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
};

let bodiesTime = "2026-10-24T09:37:24Z";
const ev = (destination, sched, pred, extra = {}) => ({
  operator: "EDT",
  publicservicename: "T50",
  destination,
  journey: { id: "x", start: "2026-10-24T09:15:00Z" },
  scheduledeparturetime: sched,
  departuretime: pred,
  arrivaltime: pred,
  ...extra,
});

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail: ok ? "" : String(detail) });
}
async function rejects(promise) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}

const { fetchTramStopBoard, listTramStops, resolveCatalogEntry, MissingEdinburghTramsKeyError, EdinburghTramsFeedUnverifiedError } = await import(
  "../../lib/providers/edinburgh.js"
);
const { FeedUnavailableError } = await import("../../lib/providers/gtfs/errors.js");
const { clearEdinburghTramsCache } = await import("../../lib/providers/edinburgh-trams.js");
const { listMultiCityStations, findNearestStation, getMultiCityDirections } = await import("../../lib/cities/live-city-api.js");
const { getEdinburghDogfoodDirections, getEdinburghDogfoodNextTrain } = await import(
  "../../lib/cities/edinburgh/dogfood-next-train.js"
);

// --- catalog (switch ON) ----------------------------------------------------
const tram = listTramStops();
const names = tram.map((s) => s.name);
check("on: 21 tram stops (23 official minus the two shared-name stops)", tram.length === 21, `got ${tram.length}`);
check("on: tram Haymarket is NOT in the catalog", !names.includes("Haymarket") && resolveCatalogEntry("Haymarket", "metro") === null);
check("on: tram Edinburgh Gateway is NOT in the catalog", !names.includes("Edinburgh Gateway") && resolveCatalogEntry("Edinburgh Gateway", "metro") === null);
check("on: rail Haymarket and rail Edinburgh Gateway are untouched", resolveCatalogEntry("Haymarket", "train")?.crs === "HYM" && resolveCatalogEntry("Edinburgh Gateway", "train")?.crs === "EGY");
check("on: a bare-name lookup of Haymarket still resolves to RAIL (never a tram entry)", resolveCatalogEntry("Haymarket")?.mode === "train" && resolveCatalogEntry("Edinburgh Gateway")?.mode === "train");
check("on: Edinburgh Park Station present", names.includes("Edinburgh Park Station"));
check("on: Edinburgh Park Central still present and separate", names.includes("Edinburgh Park Central"));
check("on: York Place absent", !names.some((n) => /york place/i.test(n)));
check("on: no Waverley tram stop", resolveCatalogEntry("Edinburgh Waverley", "metro") === null);
check("on: every tram stop liveFeed true", tram.every((s) => s.liveFeed === true));
const eps = resolveCatalogEntry("Edinburgh Park Station", "metro");
check("on: Edinburgh Park Station has real coordinates", eps && Number.isFinite(eps.lat) && Number.isFinite(eps.lng) && eps.lat > 55.9 && eps.lat < 55.95, JSON.stringify(eps));
check("on: Edinburgh Park Station is not the rail Edinburgh Park", resolveCatalogEntry("Edinburgh Park", "train")?.mode === "train" && eps?.mode === "metro");
const api = listMultiCityStations("edinburgh");
check("on: city-stations lists Edinburgh Park Station once, liveFeed true", api.filter((s) => s.name === "Edinburgh Park Station" && s.liveFeed === true).length === 1);
check("on: city-stations carries 58 entries (37 rail + 21 tram)", api.length === 58, `got ${api.length}`);
check("on: city-stations lists exactly one Haymarket and one Edinburgh Gateway (the rail ones)", ["Haymarket", "Edinburgh Gateway"].every((n) => api.filter((s) => s.name === n).length === 1), JSON.stringify(api.filter((s) => /haymarket|gateway/i.test(s.name)).map((s) => [s.name, s.mode])));
{
  const { listCatalogStations } = await import("../../lib/providers/uk/catalog.js");
  const uk = listCatalogStations("edinburgh");
  check("on: UK region catalog has 21 tram stops and no tram Haymarket/Gateway", uk.filter((s) => s.mode === "metro").length === 21 && !uk.some((s) => s.mode === "metro" && /^(haymarket|edinburgh gateway)$/i.test(s.name)), String(uk.filter((s) => s.mode === "metro").length));
  const mod = await import("../../api/coverage-notes.js");
  const res = { code: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() {} };
  await mod.default({ method: "GET", query: { city: "edinburgh" }, headers: { "x-forwarded-for": "10.88.0.1" } }, res);
  const text = JSON.stringify(res.body ?? {});
  check("on: coverage note says trams at Haymarket and Edinburgh Gateway aren't shown yet", res.code === 200 && text.includes("Trams at Haymarket and Edinburgh Gateway aren't shown yet; their rail departures are."), `${res.code} ${text.slice(0, 200)}`);
  check("on: coverage note no longer says Trams have no confirmed live feed", !/no confirmed live-times feed/.test(text) && (res.body?.partial ?? []).length === 0 && /21 tram stops/.test(text));
}
check("on: Near me finds Edinburgh Park Station at its own coordinates", findNearestStation("edinburgh", eps.lat, eps.lng) === "Edinburgh Park Station", findNearestStation("edinburgh", eps.lat, eps.lng));

// --- directions (switch ON) -------------------------------------------------
const dNew = await getEdinburghDogfoodDirections("Newhaven", { mode: "metro" });
const dAir = await getEdinburghDogfoodDirections("Edinburgh Airport", { mode: "metro" });
const dMur = await getEdinburghDogfoodDirections("Murrayfield Stadium", { mode: "metro" });
const dPk = await getEdinburghDogfoodDirections("Edinburgh Park Station", { mode: "metro" });
check("on: Newhaven offers only T50 towards Edinburgh Airport", JSON.stringify(dNew.directions) === JSON.stringify(["T50 towards Edinburgh Airport"]), JSON.stringify(dNew));
check("on: Edinburgh Airport offers only T50 towards Newhaven", JSON.stringify(dAir.directions) === JSON.stringify(["T50 towards Newhaven"]), JSON.stringify(dAir));
check("on: Murrayfield Stadium offers both chips", dMur.directions.length === 2 && dMur.directions.includes("T50 towards Newhaven") && dMur.directions.includes("T50 towards Edinburgh Airport"), JSON.stringify(dMur));
check("on: Edinburgh Park Station offers both chips", dPk.directions.length === 2);
const dDispatch = await getMultiCityDirections("edinburgh", "Newhaven");
check("on: live-city-api dispatch serves the tram chips", JSON.stringify(dDispatch.directions) === JSON.stringify(["T50 towards Edinburgh Airport"]), JSON.stringify(dDispatch));
check("on: directions made no upstream call", requests.length === 0, `${requests.length} requests`);

// --- board: BST sample, single object, nulls and echoes dropped -------------
bodiesTime = "2026-10-24T09:37:24Z"; // BST in force: London = UTC + 1h
bodies = {
  "9400ZZEDMUR1": {
    time: bodiesTime,
    atcocode: "9400ZZEDMUR1",
    smscode: "36290119",
    name: "Murrayfield Stadium (Edinburgh Trams)",
    events: [
      ev("Newhaven", "09:40", null), // no live value -> dropped
      ev("Newhaven", "09:47", 608), // countdown 608 s -> 09:47:32Z -> 10:47 BST
      ev("Newhaven", "09:55", "09:55"), // pred == sched -> dropped (G2)
      ev("Newhaven", "10:02", "10:05", { status: "delayed" }), // 10:05Z -> 11:05 BST
      ev(null, null, 120), // arrival-only row, no destination -> dropped
    ],
  },
  "9400ZZEDMUR2": {
    time: bodiesTime,
    atcocode: "9400ZZEDMUR2",
    name: "Murrayfield Stadium (Edinburgh Trams)",
    events: [ev("Edinburgh Airport", "09:51", "09:58", { status: "delayed" }), ev("Edinburgh Airport", "09:58", null)],
  },
};
clearEdinburghTramsCache();
requests.length = 0;
const hay = await fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 1_000 });
const shown = hay.trips.map((t) => `${t.platform}|${t.destination}|${t.displayTime}`);
check("on: single-object StopEvents parsed (not treated as an array)", hay.trips.length === 3, JSON.stringify(shown));
check("on: UTC clock converted to London BST (countdown + string preds)", JSON.stringify(shown) === JSON.stringify(["2|T50 towards Edinburgh Airport|10:58", "1|T50 towards Newhaven|10:47", "1|T50 towards Newhaven|11:05"]) || JSON.stringify(shown.sort()) === JSON.stringify(["1|T50 towards Newhaven|10:47", "1|T50 towards Newhaven|11:05", "2|T50 towards Edinburgh Airport|10:58"].sort()), JSON.stringify(shown));
check("on: board is realtime live with the response time", hay.realtime === "live" && hay.lastUpdate === "2026-10-24T09:37:24Z", JSON.stringify({ r: hay.realtime, l: hay.lastUpdate }));
check("on: scheduled times are never emitted (scheduled == live)", hay.trips.every((t) => t.scheduledDisplayTime === t.displayTime && t.scheduledDeparture === t.liveDeparture) && !JSON.stringify(hay).includes("09:40") && !JSON.stringify(hay).includes("09:55"), JSON.stringify(hay.trips));
check("on: request uses the key header, not the URL", requests.length === 2 && requests.every((r) => r.headers["Ocp-Apim-Subscription-Key"] === KEY && !r.search.includes(KEY) && r.path.endsWith("/stops/StopEvents") && /maxEvents=\d+/.test(r.search)), JSON.stringify(requests.map((r) => [r.path, r.search])));
check("on: both platforms of Murrayfield Stadium queried", new Set(requests.map((r) => r.atcocode)).size === 2 && requests.some((r) => r.atcocode === "9400ZZEDMUR1") && requests.some((r) => r.atcocode === "9400ZZEDMUR2"));

// cache: a second call inside 20 s makes no new upstream request
const before = requests.length;
await fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 1_000 + 5_000 });
check("on: 20 s server cache absorbs a repeat call", requests.length === before, `${requests.length - before} extra`);
await fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 1_000 + 25_000 });
check("on: cache expires after 20 s", requests.length === before + 2, `${requests.length - before} extra`);

// --- GMT sample (after the 25 Oct 2026 change, UTC == London) ---------------
clearEdinburghTramsCache();
bodiesTime = "2026-11-02T09:00:00Z";
bodies = { "9400ZZEDMUR1": { time: bodiesTime, events: [ev("Newhaven", "09:06", 300)] } };
const gmt = await fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 2_000_000 });
check("on: GMT sample displays UTC time unchanged", gmt.trips.length === 1 && gmt.trips[0].displayTime === "09:05", JSON.stringify(gmt.trips));

// --- midnight rollover ------------------------------------------------------
clearEdinburghTramsCache();
bodiesTime = "2026-10-24T23:50:00Z";
bodies = { "9400ZZEDMUR1": { time: bodiesTime, events: [ev("Newhaven", "00:03", "00:05"), ev("Newhaven", "23:58", "23:59")] } };
const roll = await fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 3_000_000 });
const rollIso = roll.trips.map((t) => t.liveDeparture).sort();
check(
  "on: bare clocks after UTC midnight roll to the next day (00:05Z -> 25 Oct, shown 01:05 BST)",
  JSON.stringify(rollIso) === JSON.stringify(["2026-10-24T23:59:00.000Z", "2026-10-25T00:05:00.000Z"]) &&
    roll.trips.some((t) => t.displayTime === "01:05" && t.liveDeparture === "2026-10-25T00:05:00.000Z"),
  JSON.stringify(roll.trips)
);

// --- termini: one platform queried, no self-terminus chip -------------------
clearEdinburghTramsCache();
bodiesTime = "2026-10-24T09:37:24Z";
bodies = {
  "9400ZZTWWJN2": { time: bodiesTime, events: [ev("Edinburgh Airport", "09:50", 600), ev("Newhaven", "09:52", 700)] },
  "9400ZZEDAIR1": { time: bodiesTime, events: [ev("Newhaven", "09:45", 400), ev("Edinburgh Airport", "09:46", 450)] },
};
requests.length = 0;
const nh = await fetchTramStopBoard("Newhaven", { tramsLive: true, now: 4_000_000 });
check("on: Newhaven queries only its departing platform (2)", requests.length === 1 && requests[0].atcocode === "9400ZZTWWJN2", JSON.stringify(requests.map((r) => r.atcocode)));
check("on: Newhaven shows no chip towards itself", nh.trips.length === 1 && nh.trips[0].destination === "T50 towards Edinburgh Airport", JSON.stringify(nh.trips));
requests.length = 0;
const air = await fetchTramStopBoard("Edinburgh Airport", { tramsLive: true, now: 4_000_000 });
check("on: Edinburgh Airport queries only platform 1 and drops self-chip", requests.length === 1 && requests[0].atcocode === "9400ZZEDAIR1" && air.trips.length === 1 && air.trips[0].destination === "T50 towards Newhaven", JSON.stringify({ r: requests.map((r) => r.atcocode), t: air.trips }));

// --- Edinburgh Park Station (the 23rd stop) ---------------------------------
clearEdinburghTramsCache();
bodies = { "9400ZZEDPKS2": { time: bodiesTime, events: [ev("Edinburgh Airport", "09:41", 200)] } };
requests.length = 0;
const pks = await fetchTramStopBoard("Edinburgh Park Station", { tramsLive: true, now: 5_000_000 });
check("on: Edinburgh Park Station board uses its own platform ids", requests.some((r) => r.atcocode === "9400ZZEDPKS2") && requests.every((r) => /^9400ZZEDPKS[12]$/.test(r.atcocode)) && pks.trips.length === 1, JSON.stringify(requests.map((r) => r.atcocode)));
check("on: Edinburgh Park Central is a different stop (own ids)", await (async () => { requests.length = 0; clearEdinburghTramsCache(); await fetchTramStopBoard("Edinburgh Park Central", { tramsLive: true, now: 6_000_000 }); return requests.every((r) => /^9400ZZEDPKC[12]$/.test(r.atcocode)); })());

// --- honest empty state -----------------------------------------------------
clearEdinburghTramsCache();
bodies = { "9400ZZEDMUR1": { time: bodiesTime, events: [ev("Newhaven", "09:40", null)] }, "9400ZZEDMUR2": { time: bodiesTime } };
const empty = await fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 7_000_000 });
check("on: no live values -> empty trips, not an error (honest empty state)", empty.trips.length === 0 && empty.realtime === "live");

// --- faults -----------------------------------------------------------------
for (const [label, m] of [["HTTP 500", "http500"], ["network rejection", "reject"], ["non-JSON 200", "html"]]) {
  clearEdinburghTramsCache();
  mode = m;
  const error = await rejects(fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 8_000_000 + results.length }));
  check(`on: ${label} -> FeedUnavailableError`, error instanceof FeedUnavailableError && error.name === "FeedUnavailableError", `${error?.name}: ${error?.message}`);
}
// A valid JSON body behind a non-2xx status: if status handling were removed, this body would parse
// cleanly and the board would silently be empty. Status and Retry-After must propagate.
for (const [label, m, status] of [["HTTP 429 + Retry-After + valid body", "http429json", 429], ["HTTP 503 + valid body", "http503json", 503]]) {
  clearEdinburghTramsCache();
  mode = m;
  const error = await rejects(fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 8_500_000 + results.length }));
  check(`on: ${label} -> FeedUnavailableError with status ${status}`, error instanceof FeedUnavailableError && error.status === status, `${error?.name}: status=${error?.status} ${error?.message}`);
  if (status === 429) {
    check("on: 429 carries retryAfterMs from the Retry-After header (120 s)", error?.retryAfterMs === 120_000, `retryAfterMs=${error?.retryAfterMs}`);
  }
}
mode = "ok";
clearEdinburghTramsCache();
bodies = { "9400ZZEDMUR1": [], "9400ZZEDMUR2": "nope" };
const shapeErr = await rejects(fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 9_000_000 }));
check("on: wrong-shaped body -> FeedUnavailableError", shapeErr instanceof FeedUnavailableError, `${shapeErr?.name}: ${shapeErr?.message}`);
delete process.env.EDINBURGH_BUSTRACKER_KEY;
clearEdinburghTramsCache();
const keyErr = await rejects(fetchTramStopBoard("Murrayfield Stadium", { tramsLive: true, now: 9_500_000 }));
check("on: missing key -> typed MissingEdinburghTramsKeyError (a FeedUnavailableError)", keyErr instanceof MissingEdinburghTramsKeyError && keyErr instanceof FeedUnavailableError && keyErr.name === "MissingEdinburghTramsKeyError" && keyErr.envNames?.[0] === "EDINBURGH_BUSTRACKER_KEY", `${keyErr?.name}`);
process.env.EDINBURGH_BUSTRACKER_KEY = KEY;
check("on: key never appears in an error message", ![shapeErr, keyErr].some((e) => String(e?.message).includes(KEY)));

// --- next-train end to end through the dogfood module -----------------------
clearEdinburghTramsCache();
bodiesTime = "2026-10-24T09:37:24Z";
bodies = {
  "9400ZZEDMUR1": { time: bodiesTime, events: [ev("Newhaven", "09:47", 608), ev("Newhaven", "09:55", 1084)] },
  "9400ZZEDMUR2": { time: bodiesTime, events: [ev("Edinburgh Airport", "09:51", "09:58")] },
};
const nt = await getEdinburghDogfoodNextTrain({
  station: "Murrayfield Stadium",
  mode: "metro",
  destination: "T50 towards Newhaven",
  leaveBeforeMinutes: 2,
  refreshSeconds: 30,
  now: new Date("2026-10-24T09:37:30Z"),
});
const upcoming = nt.upcoming ?? [];
check("on: next-train returns only the chosen direction", upcoming.length === 2 && upcoming.every((t) => t.destination === "T50 towards Newhaven"), JSON.stringify(upcoming.map((t) => [t.destination, t.displayTime])));
check("on: next-train times are London local (BST)", upcoming[0]?.displayTime === "10:47" && upcoming[1]?.displayTime === "10:55", JSON.stringify(upcoming.map((t) => t.displayTime)));

// --- off again: the explicit override still gives the old error -------------
const offErr = await rejects(fetchTramStopBoard("Murrayfield Stadium", { tramsLive: false }));
check("override: tramsLive false still throws EdinburghTramsFeedUnverifiedError", offErr instanceof EdinburghTramsFeedUnverifiedError);

console.log(JSON.stringify({ results }));
