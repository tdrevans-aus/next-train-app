/**
 * jim-brief-feed-unconfirmed-rider-copy — a "*FeedUnconfirmedError" board
 * used to paint its long pipeline `message` (doc paths, agent names, GTFS
 * jargon) straight into the hero. api/board.js now maps
 * `error.code === "FEED_UNCONFIRMED"` to a 503 with a short, server-built
 * rider sentence, and MissingDarwinTokenError to a generic 503
 * PROVIDER_UNAVAILABLE. This gate calls the real /api/board handler
 * in-process (no dev server) for one no-live-feed stop in each affected
 * region and asserts the rider-facing shape — then asserts, across every
 * probed response, that no `error` string leaks a doc path, an agent name,
 * or GTFS jargon.
 * Usage: node qa/feed-unconfirmed-rider-copy.mjs
 */
import board from "../api/board.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
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
}

async function callBoard(query) {
  const res = mockRes();
  await board({ method: "GET", query, headers: {} }, res);
  return res;
}

// One genuinely no-live-feed stop per affected region (mode: metro/tram/
// subway, no National Rail directions at that stop) — each region's own
// FeedUnconfirmedError/FeedUnverifiedError subclass must surface through
// api/board.js as 503 FEED_UNCONFIRMED with server-built rider copy.
const FEED_UNCONFIRMED_CASES = [
  { city: "greater-manchester", station: "Altrincham", agency: "Manchester Metrolink" },
  { city: "east-midlands", station: "Beeston/Chilwell", agency: "Nottingham Express Transit (NET)" },
  { city: "north-east", station: "Bank Foot", agency: "Tyne and Wear Metro" },
  { city: "south-yorkshire", station: "Malin Bridge", agency: "Sheffield Supertram" },
  { city: "glasgow", station: "Kelvinhall", agency: "Glasgow Subway" },
  { city: "edinburgh", station: "Newhaven", agency: "Edinburgh Trams" },
];

const allErrorStrings = [];

for (const { city, station, agency } of FEED_UNCONFIRMED_CASES) {
  const res = await callBoard({ city, station });
  assert(
    res.statusCode === 503,
    `GET /api/board?city=${city}&station=${station} must 503, got ${res.statusCode} (body: ${JSON.stringify(res.body)})`
  );
  assert(
    res.body?.code === "FEED_UNCONFIRMED",
    `${city}/${station} must carry code: "FEED_UNCONFIRMED", got ${JSON.stringify(res.body)}`
  );
  assert(
    res.body?.agency === agency,
    `${city}/${station} must carry agency "${agency}", got "${res.body?.agency}"`
  );
  assert(
    res.body?.station === station,
    `${city}/${station} must carry the rider-facing station name, got "${res.body?.station}"`
  );
  assert(
    typeof res.body?.error === "string" && res.body.error.length > 0,
    `${city}/${station} must carry a non-empty rider error string`
  );
  assert(
    res.body.error.includes(agency) && res.body.error.includes(station),
    `${city}/${station} rider error must name both the agency and the station: "${res.body.error}"`
  );
  allErrorStrings.push(res.body.error);
  console.log(`  ok ${city}/${station}: 503 FEED_UNCONFIRMED — "${res.body.error}"`);
}

console.log("PASS feed-unconfirmed-rider-copy: all 6 no-live-feed stops return 503 FEED_UNCONFIRMED with rider copy");

// MissingDarwinTokenError is an ops failure, not a rider-facing feed gap —
// only exercise this (network-free — the token check happens before any
// fetch) when DARWIN_LDB_TOKEN is genuinely unset in this environment, same
// guard every *-dogfood-gate.mjs already uses.
if (!process.env.DARWIN_LDB_TOKEN) {
  const res = await callBoard({ city: "greater-manchester", station: "Manchester Piccadilly" });
  assert(
    res.statusCode === 503,
    `National Rail board with no DARWIN_LDB_TOKEN must 503, got ${res.statusCode} (body: ${JSON.stringify(res.body)})`
  );
  assert(
    res.body?.code === "PROVIDER_UNAVAILABLE",
    `No-token National Rail board must carry code: "PROVIDER_UNAVAILABLE", got ${JSON.stringify(res.body)}`
  );
  assert(
    res.body?.error === "Live times are temporarily unavailable — please try again shortly.",
    `No-token National Rail board must carry the generic ops-failure rider message, got "${res.body?.error}"`
  );
  allErrorStrings.push(res.body.error);
  console.log("PASS feed-unconfirmed-rider-copy: MissingDarwinTokenError maps to 503 PROVIDER_UNAVAILABLE with generic copy");
} else {
  console.log("SKIP feed-unconfirmed-rider-copy: DARWIN_LDB_TOKEN set in this environment — MissingDarwinTokenError path not exercised here");
}

// No response error string anywhere above may leak a doc path, an agent
// name, or GTFS jargon to the rider — that was the whole bug.
const FORBIDDEN_SUBSTRINGS = ["docs/", ".md", "Jim", "Nico", "Luke", "Mark", "GTFS"];
for (const text of allErrorStrings) {
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    assert(
      !text.includes(forbidden),
      `rider error string must not contain "${forbidden}": "${text}"`
    );
  }
}
console.log(`PASS feed-unconfirmed-rider-copy: no rider error string leaks ${FORBIDDEN_SUBSTRINGS.join(", ")}`);
