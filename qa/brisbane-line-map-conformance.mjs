/**
 * D5 — Offline Brisbane line-map conformance (published map vs GTFS line-map).
 * Usage: node qa/brisbane-line-map-conformance.mjs
 *
 * LABEL_EXPECTATIONS locked (Luke, 2026-08-22): Central = 12 marketing chips
 * (T1–T6 × two ends). Nests are not extra Central chips. Exhibition suppressed.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/**
 * Marketing ends for line+terminus chips — not GTFS far termini.
 * T1 nests (Rosewood, Nambour, Gympie North) are not extra Central chips.
 * T5 chip is "Brisbane Airport", not Domestic/International split.
 */
const MARKETING_ENDS = {
  T1: ["Caboolture", "Ipswich"],
  T2: ["Kippa-Ring", "Springfield Central"],
  T3: ["Doomben", "Roma Street"],
  T4: ["Cleveland", "Shorncliffe"],
  T5: ["Brisbane Airport", "Varsity Lakes"],
  T6: ["Beenleigh", "Ferny Grove"],
};

const SUPPRESSED_LABEL_ENDS = ["Exhibition"];

/**
 * Locked Central chips (Luke). Other stations inherit MARKETING_ENDS via C7.
 * @type {Array<{ station: string, labels: string[] }>}
 */
const LABEL_EXPECTATIONS = [
  {
    station: "Central",
    labels: [
      "T1 towards Caboolture",
      "T1 towards Ipswich",
      "T2 towards Kippa-Ring",
      "T2 towards Springfield Central",
      "T3 towards Doomben",
      "T3 towards Roma Street",
      "T4 towards Cleveland",
      "T4 towards Shorncliffe",
      "T5 towards Brisbane Airport",
      "T5 towards Varsity Lakes",
      "T6 towards Beenleigh",
      "T6 towards Ferny Grove",
    ],
  },
];

const H6_STATIONS = [
  "Bowen Hills",
  "Fortitude Valley",
  "Central",
  "Roma Street",
  "South Brisbane",
  "South Bank",
  "Boggo Road",
];

/** Line+terminus ceiling after collapse. Central is 12 marketing chips (T1–T6 × 2). */
const DIRECTION_CEILING = 12;

const NAME_ALIASES = {
  "brisbane central": "central",
  "glasshouse mountains": "glass house mountains",
  "brisbane airport": "domestic airport",
  "airport": "domestic airport",
};

/**
 * Authored from D1 / oracle-clash-report — not from generator output.
 * Extra GTFS stations (or missing D1 stations) allowed per T-line.
 */
const DOCUMENTED_STATION_DIFFS = {
  T1: {
    id: "C3-3+rosewood",
    reason:
      "D1 Caboolture corridor elides Petrie–Northgate shared track; D1 also lists the Rosewood branch while mapped T1 GTFS codes stop at Ipswich (IPRW/RWIP unmapped)",
    extraGtfs: [
      "Lawnton",
      "Bray Park",
      "Strathpine",
      "Bald Hills",
      "Carseldine",
      "Zillmere",
      "Geebung",
      "Sunshine",
      "Virginia",
      "Albion",
      "Wooloowin",
      "Toombul",
      "Nundah",
    ],
    extraPublished: ["Thomas Street", "Wulkuraka", "Karrabin", "Walloon", "Thagoona", "Rosewood"],
  },
  T2: {
    id: "C3-T2-petrie",
    reason: "D1 T2 list omits Petrie (junction of T1/T2); GTFS SPRP/BRRP serve it",
    extraGtfs: ["Petrie"],
    extraPublished: [],
  },
  T3: {
    id: "C3-T3-southbank",
    reason: "D1 T3 ends at Roma Street; weekend BRDB/DBBR patterns continue to Boggo Road",
    extraGtfs: ["South Brisbane", "South Bank", "Boggo Road"],
    extraPublished: [],
  },
  T5: {
    id: "C3-4",
    reason: "D1 T5 is express-style (Boggo Road → Altandi); GTFS all-stops extras are a pattern variant",
    extraGtfs: [
      "Dutton Park",
      "Fairfield",
      "Yeronga",
      "Yeerongpilly",
      "Rocklea",
      "Salisbury",
      "Coopers Plains",
      "Banoon",
      "Sunnybank",
      "Runcorn",
      "Fruitgrove",
      "Kuraby",
      "Trinder Park",
      "Woodridge",
      "Kingston",
      "Bethania",
      "Edens Landing",
      "Holmview",
      "Moorooka",
    ],
    extraPublished: [],
  },
  T6: {
    id: "C3-T6-moorooka",
    reason: "D1 lists Moorooka on Beenleigh corridor; longest GTFS T6 patterns may skip it",
    extraGtfs: [],
    extraPublished: ["Moorooka"],
  },
};

/**
 * GTFS route codes that are not on a published T-line mapping.
 * Exhibition (H3) plus incomplete H2 tagging of variants (city shorts, Rosewood shuttle, etc.).
 */
const DOCUMENTED_UNMAPPED_ROUTES = [
  "BDBR",
  "BNBN",
  "BNSH",
  "BNVL",
  "BRFG",
  "BRIP",
  "BRSP",
  "CAEX",
  "CASP",
  "CLCL",
  "EXCA",
  "EXGY",
  "EXNA",
  "EXRP",
  "FGBR",
  "GYEX",
  "GYSP",
  "IPBR",
  "IPIP",
  "NAIP",
  "IPRW",
  "IPSP",
  "NAEX",
  "NASP",
  "RPEX",
  "RPSP",
  "RWIP",
  "SHBN",
  "SPBR",
  "SPCA",
  "SPIP",
  "SPNA",
  "VLBN",
];

const FROZEN_SHORT_TURN_GROUPS = {};

/** Reviewed heuristic dump — new keys fail C5 until Luke/Tim accept or reject them. */
const FROZEN_PROPOSED_SHORT_TURN_KEYS = [
  "T1:Ipswich station",
  "T2:Roma Street station",
  "T3:Roma Street station",
  "T4:Cleveland station",
  "T5:Varsity Lakes station",
  "T6:Beenleigh station",
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function normalizeKey(value) {
  let key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
  return NAME_ALIASES[key] ?? key;
}

function displayName(value) {
  const key = normalizeKey(value);
  if (key === "central") {
    return "Central";
  }
  return String(value || "")
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "")
    .trim();
}

function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(displayName(value));
  }
  return out;
}

function fail(message) {
  throw new Error(message);
}

function setDiff(left, right) {
  const rightKeys = new Set(right.map(normalizeKey));
  return left.filter((item) => !rightKeys.has(normalizeKey(item)));
}

function sharedSequence(order, presentKeys) {
  return order.map(normalizeKey).filter((key) => presentKeys.has(key));
}

function relativeOrderOk(publishedOrder, gtfsOrder) {
  const publishedKeys = new Set(publishedOrder.map(normalizeKey));
  const gtfsKeys = new Set(gtfsOrder.map(normalizeKey));
  const sharedPub = sharedSequence(publishedOrder, gtfsKeys);
  const sharedGtfs = sharedSequence(gtfsOrder, publishedKeys);
  if (sharedPub.length < 2) {
    return true;
  }
  const fwd = sharedPub.join("|");
  const gtfsFwd = sharedGtfs.join("|");
  const gtfsRev = [...sharedGtfs].reverse().join("|");
  return fwd === gtfsFwd || fwd === gtfsRev;
}

function unionGtfsStations(lineMap, routeCodes) {
  const codes = new Set(routeCodes);
  const stations = [];
  for (const line of lineMap.lines ?? []) {
    if (!codes.has(line.routeShortName)) {
      continue;
    }
    stations.push(...(line.stations ?? []));
  }
  return unique(stations);
}

function lineLabelsForStation(published, station) {
  const labels = [];
  const seen = new Set();
  const stationKey = normalizeKey(station);
  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => normalizeKey(name) === stationKey);
    if (!onLine && stationKey === "central") {
      // D1 prints Brisbane Central
      const aliasOnLine = (line.stations ?? []).some((name) => normalizeKey(name) === "central");
      if (!aliasOnLine) {
        continue;
      }
    } else if (!onLine) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      if (SUPPRESSED_LABEL_ENDS.some((name) => normalizeKey(name) === normalizeKey(terminus))) {
        continue;
      }
      if (normalizeKey(terminus) === stationKey) {
        continue;
      }
      const label = `${line.number} towards ${displayName(terminus)}`;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      labels.push(label);
    }
  }
  return labels.sort((a, b) => a.localeCompare(b));
}

function main() {
  const published = loadJson("qa/fixtures/brisbane/published-network.json");
  const lineMap = loadJson("lib/cities/brisbane/line-map.json");
  const catalog = loadJson("lib/cities/brisbane/stations.json");
  const failures = [];

  const liveGate = assertCityLive("brisbane");
  if (!liveGate || liveGate.ok !== true) {
    failures.push("C0: assertCityLive(brisbane) must pass (city is live)");
  }

  const gtfsCodes = new Set((lineMap.lines ?? []).map((line) => line.routeShortName));
  const mappedCodes = new Set();

  for (const line of published.lines ?? []) {
    const codes = line.gtfsRouteIdsIfKnown ?? [];
    const present = codes.filter((code) => gtfsCodes.has(code));
    if (present.length < 1) {
      failures.push(`C1: published ${line.number} maps to no GTFS route (looked for ${codes.join(", ")})`);
    }
    for (const code of codes) {
      mappedCodes.add(code);
      if (!gtfsCodes.has(code)) {
        failures.push(`C1: published ${line.number} lists missing GTFS route ${code}`);
      }
    }
  }

  for (const line of lineMap.lines ?? []) {
    const code = line.routeShortName;
    if (mappedCodes.has(code)) {
      continue;
    }
    if (DOCUMENTED_UNMAPPED_ROUTES.includes(code)) {
      continue;
    }
    failures.push(`C1: GTFS route ${code} is not mapped to a published T-line and is not documented`);
  }

  for (const line of published.lines ?? []) {
    const publishedStations = unique(line.stations ?? []);
    const gtfsStations = unionGtfsStations(lineMap, line.gtfsRouteIdsIfKnown ?? []);
    const documented = DOCUMENTED_STATION_DIFFS[line.number] ?? {
      extraGtfs: [],
      extraPublished: [],
      id: "none",
      reason: "",
    };
    const onlyPublished = setDiff(publishedStations, gtfsStations);
    const onlyGtfs = setDiff(gtfsStations, publishedStations);
    const unexpectedPublished = setDiff(onlyPublished, documented.extraPublished);
    const unexpectedGtfs = setDiff(onlyGtfs, documented.extraGtfs);

    if (unexpectedPublished.length || unexpectedGtfs.length) {
      failures.push(
        [
          `C2 ${line.number}: station set mismatch (${documented.id || "undocumented"})`,
          `  published-only: ${unexpectedPublished.join(", ") || "—"}`,
          `  gtfs-only: ${unexpectedGtfs.join(", ") || "—"}`,
          documented.reason ? `  documented: ${documented.reason}` : "  document in oracle-clash-report / DOCUMENTED_STATION_DIFFS",
        ].join("\n")
      );
    }

    const gtfsByCode = (line.gtfsRouteIdsIfKnown ?? [])
      .map((code) => (lineMap.lines ?? []).find((entry) => entry.routeShortName === code))
      .filter(Boolean);
    for (const gtfsLine of gtfsByCode) {
      if (!relativeOrderOk(publishedStations, gtfsLine.stations ?? [])) {
        failures.push(
          `C3 ${line.number}/${gtfsLine.routeShortName}: shared-station order disagrees\n  published: ${publishedStations.join(" → ")}\n  gtfs: ${(gtfsLine.stations ?? []).join(" → ")}`
        );
      }
    }
  }

  const lineStations = new Set();
  for (const line of lineMap.lines ?? []) {
    for (const station of line.stations ?? []) {
      lineStations.add(normalizeKey(station));
    }
  }
  for (const station of catalog.stations ?? []) {
    if (!lineStations.has(normalizeKey(station.name))) {
      failures.push(`C4: catalog station ${station.name} appears on no GTFS line`);
    }
    if (!Array.isArray(station.stopIds) || station.stopIds.length === 0) {
      failures.push(`C4: catalog station ${station.name} has empty stopIds`);
    }
  }

  const frozenGroups = JSON.stringify(FROZEN_SHORT_TURN_GROUPS);
  const shippedGroups = JSON.stringify(lineMap.shortTurnGroups ?? {});
  if (shippedGroups !== frozenGroups) {
    failures.push("C5: shortTurnGroups changed — freeze empty until a short-turn proposal is reviewed");
  }
  if (Object.keys(lineMap.proposedShortTurnGroups ?? {}).length > 0 && Object.keys(lineMap.shortTurnGroups ?? {}).length > 0) {
    failures.push("C5: proposedShortTurnGroups must not be auto-accepted into shortTurnGroups");
  }
  const proposedKeys = Object.keys(lineMap.proposedShortTurnGroups ?? {}).sort();
  const frozenProposed = [...FROZEN_PROPOSED_SHORT_TURN_KEYS].sort();
  const newProposals = proposedKeys.filter((key) => !frozenProposed.includes(key));
  if (newProposals.length) {
    failures.push(`C5: new short-turn proposals until reviewed: ${newProposals.join(", ")}`);
  }

  const frozenPairs = lineMap.doNotGroup ?? [];
  for (const pair of frozenPairs) {
    for (const [canonical, members] of Object.entries(lineMap.shortTurnGroups ?? {})) {
      const names = [canonical, ...(members ?? [])];
      const hasA = names.some((name) => normalizeKey(name) === normalizeKey(pair.a));
      const hasB = names.some((name) => normalizeKey(name) === normalizeKey(pair.b));
      if (hasA && hasB) {
        failures.push(`C6: frozen doNotGroup ${pair.a}–${pair.b} merged under ${canonical}`);
      }
    }
  }

  for (const station of H6_STATIONS) {
    const labels = lineLabelsForStation(published, station);
    if (labels.length === 0) {
      failures.push(`C7: ${station} has no line+terminus labels`);
    }
    if (labels.length > DIRECTION_CEILING) {
      failures.push(`C7: ${station} has ${labels.length} labels (ceiling ${DIRECTION_CEILING}): ${labels.join("; ")}`);
    }
  }

  if (LABEL_EXPECTATIONS.length > 0) {
    for (const row of LABEL_EXPECTATIONS) {
      const labels = lineLabelsForStation(published, row.station);
      const missing = setDiff(row.labels, labels);
      const extra = setDiff(labels, row.labels);
      if (missing.length || extra.length) {
        failures.push(
          `LABEL ${row.station}: missing ${missing.join(", ") || "—"} extra ${extra.join(", ") || "—"}`
        );
      }
    }
  }

  if (failures.length) {
    console.error("brisbane-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}\n`);
    }
    fail(`${failures.length} conformance check(s) failed`);
  }

  console.log("brisbane-line-map-conformance: ok");
  console.log(`  C1–C7 passed. LABEL_EXPECTATIONS ${LABEL_EXPECTATIONS.length} station(s).`);
  console.log(`  Central labels (${lineLabelsForStation(published, "Central").length}): ${lineLabelsForStation(published, "Central").join("; ")}`);
}

main();
