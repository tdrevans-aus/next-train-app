/**
 * UK station fill dataset audit (phase 2a, docs/jim-brief-uk-station-fill-phase2a.md).
 *
 * Proves acceptance criteria 1 and 2 from the brief directly against the data, not just by
 * inspection:
 *   1. Every Welsh candidate (constituentCountry: "wales") in the frozen candidate-dataset
 *      snapshot is in south-wales or rest-of-wales's own stations.json, or listed in
 *      docs/uk-station-fill/unverified.md.
 *   2. Every English candidate is in exactly one UK region's stations.json (any mode, matched
 *      by crs field), or in docs/uk-station-fill/unassigned-england.md, or in
 *      docs/uk-station-fill/unverified.md — never zero, never two.
 *
 * Reads a frozen point-in-time snapshot (docs/uk-station-fill/candidate-dataset-en-wales-
 * snapshot.json — England+Wales rows only, captured 13 Sep 2026 from the same davwheat/
 * uk-railway-stations source docs/uk-station-fill/source.md documents) rather than fetching the
 * live GitHub URL on every run — offline, deterministic, no CI network dependency, same
 * rationale as every other "no dev server" gate in this file's OFFLINE_ONLY_SCRIPTS group in
 * qa/run-all.mjs. A future station-fill phase that refreshes the candidate list refreshes this
 * snapshot too, deliberately, rather than this gate silently drifting off a live fetch.
 *
 * Usage: node qa/uk-station-fill-audit.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

// Every GB National Rail-catalogued UK region (Darwin-served). uk-london-tfl is TfL/Underground —
// no National Rail crs fields, excluded from the "already catalogued" scan on purpose.
const ALL_UK_DARWIN_REGIONS = [
  "edinburgh", "glasgow", "rest-of-scotland", "east-midlands",
  "uk-west-midlands", "south-yorkshire", "north-east", "west-of-england", "southwest",
  "cumbria", "south-wales", "west-yorkshire", "rest-of-wales", "london-se-national-rail",
  "solent", "thames-valley", "greater-manchester", "liverpool-city-region", "greater-anglia",
  "rest-of-england",
];

const dataset = JSON.parse(
  readFileSync(join(ROOT, "docs/uk-station-fill/candidate-dataset-en-wales-snapshot.json"), "utf8")
);
check(dataset.length > 2000, `candidate dataset snapshot looks too small (${dataset.length} rows)`);

// Collect every crs already in a catalog, any mode (a stop counts as "catalogued" if it carries
// its own crs field directly — an interchange.nationalRailCrs cross-reference on an unrelated
// tram/subway/metro stop does NOT count, that's a pointer to a different catalog entry).
const catalogCrs = new Map(); // crs -> region
for (const region of ALL_UK_DARWIN_REGIONS) {
  const path = join(ROOT, `lib/cities/${region}/stations.json`);
  if (!existsSync(path)) {
    check(false, `expected lib/cities/${region}/stations.json to exist`);
    continue;
  }
  const json = JSON.parse(readFileSync(path, "utf8"));
  for (const stop of json.stops ?? []) {
    if (stop.crs) {
      catalogCrs.set(stop.crs, region);
    }
  }
}

// Parse a "## <region-id>" sectioned markdown table file, column 2 (index 1) = CRS, skipping any
// section whose heading isn't exactly one of the known region ids (e.g. "## Summary", "## Transient
// failures, resolved on retry (not excluded)" — informational sections, not exclusion records).
function parseRegionSectionedCrs(text, { knownHeadings }) {
  const out = new Set();
  let inKnownSection = false;
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const id = heading[1].trim().toLowerCase();
      inKnownSection = knownHeadings.has(id);
      continue;
    }
    if (!inKnownSection) continue;
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // cells[0] is "" (leading pipe); cells[1] is column 1 (Station); cells[2] is column 2 (CRS).
    const crs = cells[2];
    if (crs && crs !== "CRS" && /^[A-Z]{3}$/.test(crs)) {
      out.add(crs);
    }
  }
  return out;
}

// docs/uk-station-fill/unassigned-england.md: "CRS | name | lat | lng | nearest region | why" —
// CRS is column 1 here (no region-heading sectioning, it's one flat list per the brief's format).
function parseFlatCrsColumn(text) {
  const out = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const crs = cells[1];
    if (crs && crs !== "CRS" && /^[A-Z]{3}$/.test(crs)) {
      out.add(crs);
    }
  }
  return out;
}

// "unassigned-england" is the phase 2a unverified.md section for candidates that failed
// Darwin verification while ALSO having no target-region territory match — a real exclusion
// record, distinct from the informational "Transient failures..." section (deliberately not
// included: those already-shipped stations are accounted for via the catalog, not this file).
const regionHeadings = new Set([...ALL_UK_DARWIN_REGIONS, "unassigned-england"]);

// docs/united-kingdom-ledger.md section 2: Chepstow (CPW) is a Welsh station whose decided home
// region is West of England (through-running-only, Gloucester-Newport Wye Valley line) — a
// genuine documented boundary exception, not a gap. Any Welsh CRS below is "owned" if catalogued
// in south-wales/rest-of-wales OR in this allow-list.
const WALES_LEDGER_EXCEPTIONS = { CPW: "west-of-england" };

// docs/united-kingdom-ledger.md §3: Elizabeth line and London Overground are built entirely
// inside uk-london-tfl (TfL Unified API), never as Darwin-side entries in any Darwin region pack
// — "every Elizabeth line stop [is] TfL's", same for Overground. These six CRS are Elizabeth
// line/Overground-EXCLUSIVE stations (no legacy National Rail heritage — NaPTAN RailReferences.csv
// carries no coordinate record for any of them, the tell that surfaced this during phase 2a) that
// Darwin nonetheless answers a stationName for; they are uk-london-tfl's, not
// london-se-national-rail's, even though this audit's ALL_UK_DARWIN_REGIONS scan (uk-london-tfl
// has no crs-keyed catalog format) can't see them as "already catalogued" there.
const TFL_EXCLUSIVE_ENGLAND_EXCEPTIONS = new Set(["BDS", "CWX", "CUS", "TCR", "WWC", "BGV"]);
const unverifiedPath = join(ROOT, "docs/uk-station-fill/unverified.md");
check(existsSync(unverifiedPath), "docs/uk-station-fill/unverified.md must exist");
const unverifiedCrs = existsSync(unverifiedPath)
  ? parseRegionSectionedCrs(readFileSync(unverifiedPath, "utf8"), { knownHeadings: regionHeadings })
  : new Set();

const unassignedPath = join(ROOT, "docs/uk-station-fill/unassigned-england.md");
check(existsSync(unassignedPath), "docs/uk-station-fill/unassigned-england.md must exist");
const unassignedCrs = existsSync(unassignedPath)
  ? parseFlatCrsColumn(readFileSync(unassignedPath, "utf8"))
  : new Set();

let walesChecked = 0;
let englandChecked = 0;
const walesFailures = [];
const englandZero = [];
const englandTwoPlus = [];

for (const cand of dataset) {
  const crs = cand.crsCode;
  if (!crs) continue;
  const country = (cand.constituentCountry || "").toLowerCase();
  const inCatalog = catalogCrs.has(crs);
  const catalogRegion = catalogCrs.get(crs);
  const inUnverified = unverifiedCrs.has(crs);
  const inUnassigned = unassignedCrs.has(crs);

  if (country === "wales") {
    walesChecked += 1;
    const inWalesCatalog =
      inCatalog &&
      (catalogRegion === "south-wales" ||
        catalogRegion === "rest-of-wales" ||
        WALES_LEDGER_EXCEPTIONS[crs] === catalogRegion);
    if (!inWalesCatalog && !inUnverified) {
      walesFailures.push(`${crs} (${cand.stationName}) — catalogRegion=${catalogRegion ?? "none"}`);
    }
  } else if (country === "england") {
    englandChecked += 1;
    if (TFL_EXCLUSIVE_ENGLAND_EXCEPTIONS.has(crs)) {
      continue; // uk-london-tfl's, per docs/united-kingdom-ledger.md §3 — see note above.
    }
    const placeCount = (inCatalog ? 1 : 0) + (inUnassigned ? 1 : 0) + (inUnverified ? 1 : 0);
    if (placeCount === 0) {
      englandZero.push(`${crs} (${cand.stationName})`);
    } else if (placeCount > 1) {
      englandTwoPlus.push(
        `${crs} (${cand.stationName}) — catalog=${inCatalog ? catalogRegion : "-"} unassigned=${inUnassigned} unverified=${inUnverified}`
      );
    }
  }
}

check(walesChecked > 0, "no Welsh candidates found in the dataset snapshot");
check(englandChecked > 0, "no English candidates found in the dataset snapshot");
check(
  walesFailures.length === 0,
  `${walesFailures.length} Welsh station(s) not in south-wales/rest-of-wales nor unverified.md:\n  ${walesFailures.slice(0, 30).join("\n  ")}`
);
check(
  englandZero.length === 0,
  `${englandZero.length} English station(s) in NONE of catalog/unassigned-england.md/unverified.md:\n  ${englandZero.slice(0, 30).join("\n  ")}`
);
check(
  englandTwoPlus.length === 0,
  `${englandTwoPlus.length} English station(s) in MORE THAN ONE of catalog/unassigned-england.md/unverified.md:\n  ${englandTwoPlus.slice(0, 30).join("\n  ")}`
);

if (failures > 0) {
  console.error(`\nuk-station-fill-audit: ${failures} check(s) failed`);
  process.exit(1);
}
console.log(
  `uk-station-fill-audit: ok (${walesChecked} Welsh candidates all owned, ${englandChecked} English candidates each in exactly one place: catalog=${[...catalogCrs.values()].length} unassigned=${unassignedCrs.size} unverified=${unverifiedCrs.size})`
);
