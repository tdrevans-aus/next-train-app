/**
 * D5 — Offline Sydney line-map conformance (published D1 vs GTFS line-map).
 * Usage: node qa/sydney-line-map-conformance.mjs
 *
 * LABEL_EXPECTATIONS: line + terminus (Tim lock 2026-08-23). City Circle is not a terminus.
 * Central (Trains) does not share chips with Central Metro (M1).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { assertCityLive } from "../lib/providers/registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MARKETING_ENDS = {
  M1: ["Tallawong", "Sydenham"],
  T1: ["Berowra", "Emu Plains", "Richmond"],
  T2: ["Leppington", "Parramatta"],
  T3: ["Liverpool", "Lidcombe"],
  T4: ["Bondi Junction", "Waterfall", "Cronulla"],
  T5: ["Leppington", "Richmond"],
  T6: ["Bankstown", "Lidcombe"],
  T7: ["Lidcombe", "Olympic Park"],
  T8: ["Macarthur"],
  T9: ["Hornsby", "Gordon"],
  // NSW TrainLink intercity + Hunter (14 Sep 2026, API-in-scope fill,
  // docs/jim-brief-sydney-intercity-fill.md) — mirrors
  // lib/cities/sydney/marketing-directions.js MARKETING_ENDS.
  BMT: ["Central", "Lithgow"],
  CCN: ["Central", "Newcastle Interchange"],
  SCO: ["Central", "Bomaderry"],
  SHL: ["Central", "Goulburn"],
  HUN: ["Dungog", "Scone"],
};

const SPLIT_PLACE_NAMES = ["central", "martin place", "epping", "chatswood", "sydenham"];

const LABEL_EXPECTATIONS = [
  {
    station: "Central",
    labels: [
      "T1 Berowra",
      "T1 Emu Plains",
      "T1 Richmond",
      "T2 Leppington",
      "T2 Parramatta",
      "T3 Lidcombe",
      "T3 Liverpool",
      "T4 Bondi Junction",
      "T4 Cronulla",
      "T4 Waterfall",
      "T8 Macarthur",
      "T9 Gordon",
      "T9 Hornsby",
      "BMT Lithgow",
      "CCN Newcastle Interchange",
      "SCO Bomaderry",
      "SHL Goulburn",
    ],
  },
  {
    station: "Central Metro",
    labels: ["M1 Sydenham", "M1 Tallawong"],
  },
];

const H6_STATIONS = [
  "Central",
  "Central Metro",
  "Town Hall",
  "Wynyard",
  "Museum",
  "Redfern",
  "Martin Place",
  "Martin Place Metro",
];

// Raised 16 -> 20 (14 Sep 2026, docs/jim-brief-sydney-intercity-fill.md): Central legitimately
// gains 4 more chips (BMT/CCN/SCO/SHL) on top of the 13 T-line ones already there.
const DIRECTION_CEILING = 20;

const DOCUMENTED_STATION_DIFFS = {
  T1: {
    id: "C3-T1-variants",
    reason:
      "Longest T1 GTFS pattern is a western/city run; D1 is North Shore + Western + Richmond. Union extras include Inner West / City Circle / Olympic Park overlay trips on T1 codes",
    extraGtfs: [
      "Ashfield",
      "Croydon",
      "Homebush",
      "Flemington",
      "Museum",
      "St James",
      "Circular Quay",
      "Olympic Park",
    ],
    extraPublished: [],
  },
  T2: {
    id: "C3-T2-shared-pdf",
    reason:
      "T2+T3 share one PDF. GTFS T2 trips overlay T3 Regents Park / T8 south / T6 Bankstown / Olympic Park",
    extraGtfs: [
      "Berala",
      "Regents Park",
      "Sefton",
      "Chester Hill",
      "Leightonfield",
      "Villawood",
      "Carramar",
      "Olympic Park",
      "Bankstown",
      "Yagoona",
      "Birrong",
      "Campbelltown",
      "Leumeah",
      "Minto",
      "Ingleburn",
      "Macquarie Fields",
    ],
    extraPublished: [],
  },
  T4: {
    id: "C3-2",
    reason: "T4 PDF/GTFS includes Helensburgh SCO and some City Circle / Sydenham-path overlays; D1 T4 excludes Helensburgh",
    extraGtfs: [
      "Erskineville",
      "St Peters",
      "Museum",
      "St James",
      "Circular Quay",
      "Wynyard",
      "Helensburgh",
    ],
    extraPublished: [],
  },
  T5: {
    id: "C3-T5-overlays",
    reason: "Some T5 GTFS trips continue onto T1 west / T8 south corridors",
    extraGtfs: [
      "Doonside",
      "Rooty Hill",
      "Mount Druitt",
      "St Marys",
      "Werrington",
      "Kingswood",
      "Penrith",
      "Macarthur",
      "Campbelltown",
    ],
    extraPublished: [],
  },
  T6: {
    id: "C3-T6-homebush",
    reason: "Some T6 trips continue to Homebush; D1 shuttle is Bankstown–Lidcombe",
    extraGtfs: ["Homebush"],
    extraPublished: [],
  },
  T7: {
    id: "H3-T7-events",
    reason: "D1 PDF is Lidcombe–Olympic Park shuttle; GTFS includes event through-running",
    extraGtfs: [
      "Blacktown",
      "Seven Hills",
      "Westmead",
      "Parramatta",
      "Granville",
      "Central",
      "Redfern",
      "Strathfield",
    ],
    extraPublished: [],
  },
  T8: {
    id: "C3-T8-tempe",
    reason: "Some T8 GTFS patterns serve Tempe (Illawarra) in addition to Airport / Sydenham paths",
    extraGtfs: ["Tempe"],
    extraPublished: [],
  },
  T9: {
    id: "C3-T9-overlays",
    reason: "Longest T9 pattern is Hornsby–City; other T9 trips overlay Inner West and T1 North Shore",
    extraGtfs: [
      "Ashfield",
      "Summer Hill",
      "Lewisham",
      "Petersham",
      "Stanmore",
      "Newtown",
      "Macdonaldtown",
      "Berowra",
      "Mount Kuring-gai",
      "Mount Colah",
      "Asquith",
      "Waitara",
      "Wahroonga",
      "Warrawee",
      "Turramurra",
      "Pymble",
      "Croydon",
    ],
    extraPublished: [],
  },
};

const DOCUMENTED_ORDER_SKIP = {
  T2: "C3-T2-circle: D1 lists City Circle linearly; longest T2 GTFS pattern is a loop/overlay",
  T3: "C3-T3-circle: D1 lists City Circle linearly; longest T3 GTFS pattern is a loop",
  T8: "C3-T8-circle: D1 lists Airport path then Circle; longest T8 GTFS pattern is a loop/overlay",
};

const FROZEN_SHORT_TURN_GROUPS = {};

const FROZEN_PROPOSED_SHORT_TURN_KEYS = [
  "M1:Sydenham",
  "T1:Penrith",
  "T2:City Circle Via Town Hall",
  "T2:Wynyard",
  "T3:City Circle Via Regents Park",
  "T5:Richmond",
  "T6:Lidcombe",
  "T7:Olympic Park",
  "T8:City Circle Via Town Hall",
  "T9:Hornsby Via Strathfield",
  "T9:North Sydney",
];

const MODE_SPLIT_PAIRS = [
  ["Central", "Central Metro"],
  ["Martin Place", "Martin Place Metro"],
  ["Epping", "Epping Metro"],
  ["Chatswood", "Chatswood Metro"],
  ["Sydenham", "Sydenham Metro"],
];

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+station$/i, "")
    .replace(/\s+stn$/i, "");
}

function displayName(value) {
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

function lineServesPublishedStation(line, stationKey) {
  const metroStation = stationKey.endsWith(" metro");
  const baseKey = metroStation ? stationKey.replace(/ metro$/, "") : stationKey;
  if (line.number === "M1") {
    if (SPLIT_PLACE_NAMES.includes(stationKey)) {
      return false;
    }
    const matchKey = metroStation ? baseKey : stationKey;
    return (line.stations ?? []).some((name) => normalizeKey(name) === matchKey);
  }
  if (metroStation) {
    return false;
  }
  return (line.stations ?? []).some((name) => normalizeKey(name) === stationKey);
}

function lineLabelsForStation(published, station) {
  const labels = [];
  const seen = new Set();
  const stationKey = normalizeKey(station);
  for (const line of published.lines ?? []) {
    if (!lineServesPublishedStation(line, stationKey)) {
      continue;
    }
    for (const terminus of MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      if (normalizeKey(terminus) === stationKey || normalizeKey(terminus) === stationKey.replace(/ metro$/, "")) {
        continue;
      }
      const label = `${line.number} ${displayName(terminus)}`;
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
  const published = loadJson("qa/fixtures/sydney/published-network.json");
  const lineMap = loadJson("lib/cities/sydney/line-map.json");
  const catalog = loadJson("lib/cities/sydney/stations.json");
  const failures = [];

  const liveGate = assertCityLive("sydney");
  if (!liveGate || liveGate.ok !== true) {
    failures.push("C0: assertCityLive(sydney) must pass (city is live)");
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
    failures.push(`C1: GTFS route ${code} is not mapped to a published T/M line`);
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
      if (DOCUMENTED_ORDER_SKIP[line.number]) {
        continue;
      }
      const orderStations = gtfsLine.longestStations ?? gtfsLine.stations ?? [];
      if (!relativeOrderOk(publishedStations, orderStations)) {
        failures.push(
          `C3 ${line.number}/${gtfsLine.routeShortName}: shared-station order disagrees on longest pattern`
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
    const key = normalizeKey(station.name).replace(/ metro$/, "");
    const catalogKey = normalizeKey(station.name);
    if (!lineStations.has(catalogKey) && !lineStations.has(key)) {
      failures.push(`C4: catalog station ${station.name} appears on no GTFS line`);
    }
    if (!Array.isArray(station.stopIds) || station.stopIds.length === 0) {
      failures.push(`C4: catalog station ${station.name} has empty stopIds`);
    }
  }

  for (const [trainName, metroName] of MODE_SPLIT_PAIRS) {
    const train = (catalog.stations ?? []).find((row) => row.name === trainName);
    const metro = (catalog.stations ?? []).find((row) => row.name === metroName);
    if (!train || !metro) {
      failures.push(`C2: missing catalog split ${trainName} / ${metroName}`);
      continue;
    }
    const overlap = train.stopIds.filter((id) => metro.stopIds.includes(id));
    if (overlap.length) {
      failures.push(`C2: ${trainName} and ${metroName} share stopIds ${overlap.join(", ")}`);
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

  for (const row of LABEL_EXPECTATIONS) {
    const labels = lineLabelsForStation(published, row.station);
    const missing = setDiff(row.labels, labels);
    const extra = setDiff(labels, row.labels);
    if (missing.length || extra.length) {
      failures.push(`LABEL ${row.station}: missing ${missing.join(", ") || "—"} extra ${extra.join(", ") || "—"}`);
    }
  }

  if (failures.length) {
    console.error("sydney-line-map-conformance failures:\n");
    for (const failure of failures) {
      console.error(`- ${failure}\n`);
    }
    fail(`${failures.length} conformance check(s) failed`);
  }

  console.log("sydney-line-map-conformance: ok");
  console.log(`  C1–C7 passed. LABEL_EXPECTATIONS ${LABEL_EXPECTATIONS.length} station(s).`);
  console.log(
    `  Central labels (${lineLabelsForStation(published, "Central").length}): ${lineLabelsForStation(published, "Central").join("; ")}`
  );
}

main();
