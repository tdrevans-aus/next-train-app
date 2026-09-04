/**
 * Token-free validation of lib/cities/uk/rail-crs-index.json (FB-51's
 * national name->CRS index). Checks:
 *  - every printed terminus from the live chip sets in
 *    docs/jim-brief-fb51-uk-hub-rollout.md resolves to the expected CRS;
 *  - a nonsense name does not resolve;
 *  - the index has > 2,000 entries.
 *
 * Usage: node qa/uk-rail-crs-index.mjs
 */
import { resolveCrsForName, railCrsIndexSize, railCrsIndexGeneratedAt } from "../lib/cities/uk/rail-crs-index.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Every printed terminus in the brief's live chip sets (Nottingham Station,
// Leicester, Kettering, Wellingborough, Chesterfield, Alfreton — pulled
// 4 Sep 2026), stripped of operator suffix.
const EXPECTED = {
  "Birmingham New Street": "BHM",
  "Cardiff Central": "CDF",
  Crewe: "CRE",
  Leeds: "LDS",
  Leicester: "LEI",
  "Lincoln Central": "LCN",
  "Liverpool Lime Street": "LIV",
  "London St Pancras (Intl)": "STP",
  Nottingham: "NOT",
  Sheffield: "SHF",
  "Stansted Airport": "SSD",
  Corby: "COR",
  Edinburgh: "EDB",
  "Glasgow Central": "GLC",
  Norwich: "NRW",
  Plymouth: "PLY",
  Matlock: "MAT",
  Skegness: "SKG",
  Worksop: "WRK",
};

for (const [name, expectedCrs] of Object.entries(EXPECTED)) {
  const crs = resolveCrsForName(name);
  assert(crs === expectedCrs, `resolveCrsForName("${name}") must be ${expectedCrs}, got ${crs}`);
}

assert(resolveCrsForName("Not A Real Station Whatsoever") === null, "a nonsense name must not resolve");
assert(resolveCrsForName("") === null, "an empty name must not resolve");

const size = railCrsIndexSize();
assert(size > 2000, `rail-crs-index.json must have > 2,000 entries, got ${size}`);

const generatedAt = railCrsIndexGeneratedAt();
assert(typeof generatedAt === "string" && generatedAt.length > 0, "rail-crs-index.json must record a generatedAt date");

console.log(
  `uk-rail-crs-index: ok (${size} entries, generated ${generatedAt}, every FB-51 brief chip terminus resolves, nonsense name does not)`
);
