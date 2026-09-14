/**
 * Bundled city direction chips exist for every live multi-city region.
 * Usage: node qa/bundled-city-directions.mjs
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { MULTI_CITY_IDS } from "../lib/cities/live-city-api.js";
import { marketingLabelsForStation, HUB as AMS_HUB } from "../lib/cities/amsterdam/marketing-directions.js";
import { marketingLabelsForStation as rotterdamLabels, HUB as RET_HUB } from "../lib/cities/rotterdam/marketing-directions.js";
import { marketingLabelsForStation as newcastleLabels, HUB as NLR_HUB } from "../lib/cities/newcastle/marketing-directions.js";
import { marketingLabelsForStation as aucklandLabels, HUB as AT_HUB } from "../lib/cities/auckland/marketing-directions.js";
import { marketingLabelsForStation as goteborgLabels, TRAM_HUB as GBG_HUB } from "../lib/cities/goteborg/marketing-directions.js";
import { marketingLabelsForStation as stockholmLabels, METRO_HUB as STO_METRO_HUB, PENDELTÅG_HUB as STO_PENDEL_HUB } from "../lib/cities/stockholm/marketing-directions.js";
import { marketingLabelsForStation as wellingtonLabels, HUB as WLG_HUB } from "../lib/cities/wellington/marketing-directions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadDirections(city) {
  const file = join(ROOT, "public", "city-directions", `${city}.json`);
  assert(existsSync(file), `missing public/city-directions/${city}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

const DISAMBIGUATION_SUFFIX = /\s*\([^)]*\)\s*$/;

/**
 * Fold case/accents/whitespace for comparison. A separate helper strips the
 * trailing disambiguation suffix — kept apart so plain (non-disambiguated)
 * multi-word names are never suffix-matched against each other (e.g.
 * "Springfield Central" must not be flagged as a self-reference chip for a
 * station plainly named "Central" — that's a real, different terminus, not
 * the same physical stop under a disambiguated catalog name).
 */
function foldKeyForBundleCheck(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function stripDisambiguation(value) {
  return String(value ?? "").replace(DISAMBIGUATION_SUFFIX, "").trim();
}

for (const city of MULTI_CITY_IDS) {
  const pack = loadDirections(city);
  const names = Object.keys(pack);
  assert(names.length > 0, `${city} bundled directions must include at least one station`);
  const first = pack[names[0]];
  assert(Array.isArray(first) && first.length > 0, `${city} ${names[0]} must have chips`);

  // No station's own chip set may name itself as a destination (FB — London
  // TfL Richmond/Richmond (London) self-reference, 15 Sep 2026): compare by
  // canonical identity, not raw string equality, so a catalog-disambiguated
  // stop still matches its own line's terminus string. Scoped to stations
  // whose catalog name carries a disambiguation suffix — this is exactly the
  // bug pattern (a stop's own un-suffixed base name appearing verbatim as a
  // chip's trailing word(s)); plain multi-word names are never suffix-matched
  // against each other, so a real different terminus that merely shares a
  // last word (e.g. "Springfield Central" vs a station named "Central")
  // never false-positives.
  for (const station of names) {
    if (!DISAMBIGUATION_SUFFIX.test(station)) {
      continue;
    }
    const baseKey = foldKeyForBundleCheck(stripDisambiguation(station));
    for (const chip of pack[station]) {
      const chipKey = foldKeyForBundleCheck(chip);
      const namesSelf = chipKey === baseKey || chipKey.endsWith(` ${baseKey}`);
      assert(
        !namesSelf,
        `${city} station "${station}" must not offer a chip towards itself (found "${chip}")`
      );
    }
  }
}

const amsterdam = loadDirections("amsterdam");
const amsHub = marketingLabelsForStation(AMS_HUB);
assert(Array.isArray(amsterdam[AMS_HUB]), "Amsterdam hub must be in bundled directions");
assert(
  amsHub.every((chip) => amsterdam[AMS_HUB].includes(chip)),
  "Amsterdam bundled hub chips must match marketingLabelsForStation"
);

const rotterdam = loadDirections("rotterdam");
const retHub = rotterdamLabels(RET_HUB);
assert(Array.isArray(rotterdam[RET_HUB]), "Rotterdam hub Beurs must be in bundled directions");
assert(
  retHub.every((chip) => rotterdam[RET_HUB].includes(chip)),
  "Rotterdam bundled hub chips must match marketingLabelsForStation"
);
assert(rotterdam[RET_HUB].includes("Metro A + Binnenhof"), "Beurs must offer Metro A + Binnenhof");

const newcastle = loadDirections("newcastle");
const nlrHub = newcastleLabels(NLR_HUB);
assert(
  nlrHub.every((chip) => newcastle[NLR_HUB].includes(chip)),
  "Newcastle bundled hub chips must match marketingLabelsForStation"
);

const auckland = loadDirections("auckland");
const atHub = aucklandLabels(AT_HUB);
assert(Array.isArray(auckland[AT_HUB]), "Auckland hub Waitematā Station must be in bundled directions");
assert(
  atHub.every((chip) => auckland[AT_HUB].includes(chip)),
  "Auckland bundled hub chips must match marketingLabelsForStation"
);

// Göteborg is tester-live — hub chips must match the marketing module.
const goteborg = loadDirections("goteborg");
const gbgHub = goteborgLabels(GBG_HUB);
assert(Array.isArray(goteborg[GBG_HUB]), "Göteborg hub Brunnsparken must be in bundled directions");
assert(
  gbgHub.every((chip) => goteborg[GBG_HUB].includes(chip)),
  "Göteborg bundled hub chips must match marketingLabelsForStation"
);
assert(goteborg[GBG_HUB].includes("1 + Tynnered"), "Brunnsparken must offer 1 + Tynnered");
assert(!goteborg[GBG_HUB].some((chip) => /^(8|12) \+ /.test(chip)), "Brunnsparken must not offer 8 or 12");

// Stockholm is tester-live — hub chips must match the marketing module.
const stockholm = loadDirections("stockholm");
const stoMetro = stockholmLabels(STO_METRO_HUB);
assert(Array.isArray(stockholm[STO_METRO_HUB]), "Stockholm hub T-Centralen must be in bundled directions");
assert(
  stoMetro.every((chip) => stockholm[STO_METRO_HUB].includes(chip)),
  "Stockholm bundled metro hub chips must match marketingLabelsForStation"
);
assert(stockholm[STO_METRO_HUB].includes("Röda linjen + Norsborg"), "T-Centralen must offer Röda linjen + Norsborg");
assert(!stockholm[STO_METRO_HUB].some((chip) => /pendeltåg/i.test(chip)), "T-Centralen must not offer pendeltåg chips");
assert(!(stockholm[STO_PENDEL_HUB] ?? []).some((chip) => /pendeltåg 48/i.test(chip)), "Stockholm City must not offer line 48");
assert(!("Stockholms central" in stockholm), "Stockholms central must not have bundled chips");

// Wellington is tester-live — hub chips must match the marketing module.
const wellington = loadDirections("wellington");
const wlgHub = wellingtonLabels(WLG_HUB);
assert(Array.isArray(wellington[WLG_HUB]), "Wellington hub Wellington Station must be in bundled directions");
assert(
  wlgHub.every((chip) => wellington[WLG_HUB].includes(chip)),
  "Wellington bundled hub chips must match marketingLabelsForStation"
);
assert(wellington[WLG_HUB].includes("Kāpiti Line Waikanae Station"), "Wellington Station must offer Kāpiti Line Waikanae Station");
assert(!wellington[WLG_HUB].some((chip) => /melling station$/i.test(chip)), "Wellington Station must not offer a Melling Station chip");

console.log(`bundled-city-directions: ok (${MULTI_CITY_IDS.length} cities)`);
