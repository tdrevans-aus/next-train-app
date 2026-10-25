/**
 * Offline check (docs/jim-brief-snapshot-feed-info.md): the Brussels and Melbourne snapshot strip
 * functions must carry the upstream feed_info.txt through byte-for-byte, because
 * qa/gtfs-live-blob-snapshot-integrity.mjs fails closed on a published zip without it. Also checks
 * that a feed with no feed_info.txt gets none fabricated, and runs the integrity gate's own
 * zip-inspection logic (qa/lib/snapshot-zip-integrity.mjs) over the stripped output.
 * No network, no Blob.
 */
import assert from "node:assert/strict";
import { stripToMetro } from "../scripts/publish-brussels-gtfs-snapshot-to-blob.mjs";
import { stripToConfig, MELBOURNE_CONFIG } from "../scripts/trim-melbourne-gtfs.mjs";
import { inspectSnapshotZip } from "./lib/snapshot-zip-integrity.mjs";
import { zipSync, unzipSync } from "../lib/vendor/fflate.mjs";

const enc = (t) => new TextEncoder().encode(t);
const FEED_INFO =
  'feed_publisher_name,feed_publisher_url,feed_lang\r\nSTIB,"https://example.org",fr\r\n';

function fixture({ routeType, shortNames, withFeedInfo }) {
  const routes = ["route_id,route_short_name,route_type"];
  const trips = ["route_id,service_id,trip_id"];
  const stopTimes = ["trip_id,stop_id,stop_sequence,arrival_time,departure_time"];
  shortNames.forEach((name, i) => {
    routes.push(`R${i},${name},${routeType}`);
    for (let t = 0; t < 3; t += 1) {
      trips.push(`R${i},S1,T${i}_${t}`);
      stopTimes.push(`T${i}_${t},A,1,08:00:00,08:00:00`, `T${i}_${t},B,2,08:10:00,08:10:00`);
    }
  });
  const files = {
    "routes.txt": enc(routes.join("\n") + "\n"),
    "trips.txt": enc(trips.join("\n") + "\n"),
    "stop_times.txt": enc(stopTimes.join("\n") + "\n"),
    "stops.txt": enc("stop_id,stop_name,parent_station\nA,Alpha,\nB,Beta,\n"),
    "calendar.txt": enc(
      "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS1,1,1,1,1,1,1,1,20261001,20261130\n"
    ),
    "calendar_dates.txt": enc("service_id,date,exception_type\nS1,20261101,2\n"),
    "agency.txt": enc("agency_id,agency_name\n1,X\n"),
  };
  if (withFeedInfo) files["feed_info.txt"] = enc(FEED_INFO);
  return files;
}

function check(name, stripped) {
  assert.ok(stripped["feed_info.txt"], `${name}: feed_info.txt missing from stripped output`);
  assert.equal(Buffer.from(stripped["feed_info.txt"]).toString(), FEED_INFO, `${name}: feed_info.txt altered`);
  const zipped = zipSync(stripped);
  const { publisher } = inspectSnapshotZip(unzipSync(zipped), 10 * 1024);
  assert.equal(publisher, "STIB", `${name}: gate logic could not read feed_publisher_name`);
  const { reasons } = inspectSnapshotZip(unzipSync(zipped), 10 * 1024);
  assert.deepEqual(reasons, [], `${name}: gate logic flags the stripped zip: ${reasons.join("; ")}`);
}

// Brussels (route_type 1, lines 1/2/5/6)
check("brussels", stripToMetro(fixture({ routeType: "1", shortNames: ["1", "2", "5", "6"], withFeedInfo: true })));
assert.equal(
  stripToMetro(fixture({ routeType: "1", shortNames: ["1", "2", "5", "6"], withFeedInfo: false }))["feed_info.txt"],
  undefined,
  "brussels: feed_info.txt must not be fabricated"
);

// Melbourne, both zips
check("melbourne", stripToConfig(fixture({ routeType: "400", shortNames: ["Alamein", "Belgrave"], withFeedInfo: true }), MELBOURNE_CONFIG["2"]));
check("melbourne-vline", stripToConfig(fixture({ routeType: "2", shortNames: ["Geelong", "Ballarat"], withFeedInfo: true }), MELBOURNE_CONFIG["1"]));
assert.equal(
  stripToConfig(fixture({ routeType: "400", shortNames: ["Alamein", "Belgrave"], withFeedInfo: false }), MELBOURNE_CONFIG["2"])["feed_info.txt"],
  undefined,
  "melbourne: feed_info.txt must not be fabricated"
);

// Gate logic still fails closed with none.
const none = inspectSnapshotZip(unzipSync(zipSync(stripToMetro(fixture({ routeType: "1", shortNames: ["1", "2", "5", "6"], withFeedInfo: false })))), 10 * 1024);
assert.ok(none.reasons.some((r) => r.includes("feed_info.txt is missing")), "gate must still fail closed without feed_info.txt");

// Melbourne feed_info.txt absence exception (docs/jim-brief-melbourne-feed-info-exception.md).
const noFeedInfo = (extra = {}) => ({
  ...fixture({ routeType: "400", shortNames: ["Alamein", "Belgrave"], withFeedInfo: false }),
  ...extra,
});
const REAL_AGENCY = enc(
  "agency_id,agency_name,agency_url,agency_timezone\n1,Transport Victoria,https://transport.vic.gov.au/,Australia/Melbourne\n"
);
const inspect = (files, city) => inspectSnapshotZip(unzipSync(zipSync(files)), 10 * 1024, city);
// 1. Melbourne, no feed_info, real agency: passes and reports why.
{
  const r = inspect(noFeedInfo({ "agency.txt": REAL_AGENCY }), "melbourne");
  assert.deepEqual(r.reasons, [], "melbourne without feed_info but real agency.txt must pass");
  assert.ok(r.notes.some((n) => n.includes("absent upstream")), "exception reason must be reported");
  assert.deepEqual(inspect(noFeedInfo({ "agency.txt": REAL_AGENCY }), "melbourne-vline").reasons, []);
}
// 2. Melbourne, no feed_info, agency missing / synthetic / no url: fails.
{
  const noAgency = noFeedInfo();
  delete noAgency["agency.txt"];
  assert.ok(inspect(noAgency, "melbourne").reasons.some((x) => x.includes("feed_info.txt is missing")), "missing agency.txt must fail");
  const synth = noFeedInfo({ "agency.txt": enc("agency_id,agency_name,agency_url\n1,Next-Train Dogfood,https://example.org\n") });
  assert.ok(inspect(synth, "melbourne").reasons.length, "synthetic agency must fail");
  const noUrl = noFeedInfo({ "agency.txt": enc("agency_id,agency_name,agency_url\n1,Transport Victoria,\n") });
  assert.ok(inspect(noUrl, "melbourne").reasons.length, "agency without url must fail");
}
// 3. Brussels (any non-exempt city), no feed_info: fails closed even with a real agency.
assert.ok(inspect(noFeedInfo({ "agency.txt": REAL_AGENCY }), "brussels").reasons.some((x) => x.includes("feed_info.txt is missing")), "brussels must fail closed");
assert.ok(inspect(noFeedInfo({ "agency.txt": REAL_AGENCY }), undefined).reasons.length, "no city must fail closed");
// 4. Melbourne WITH a synthetic feed_info.txt: normal checks apply, fails.
{
  const synthFi = noFeedInfo({
    "agency.txt": REAL_AGENCY,
    "feed_info.txt": enc("feed_publisher_name,feed_publisher_url,feed_lang\nnext-train dogfood,https://example.org,en\n"),
  });
  assert.ok(inspect(synthFi, "melbourne").reasons.some((x) => x.includes("test/dogfood")), "melbourne with synthetic feed_info must fail");
}

console.log("snapshot-feed-info-carried: ok");
