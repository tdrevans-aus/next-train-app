/**
 * Build lib/cities/uk-west-midlands/stations.json (74 NR + 35 Metro).
 * CRS from uk-coding-brief.md / National Rail. Camp Hill: MOV, KIH, PIR.
 *
 * 4 Sep 2026: 17 of the original 75 CRS codes were wrong (they resolved at Darwin
 * to Bushey, Thatcham, Warminster, Whittlesea ... — see qa/uk-west-midlands-dogfood-gate.mjs
 * catalog sweep). 16 corrected against live Darwin stationName; Willenhall (WLE was
 * Whittlesea) has no Darwin CRS yet — new station, not yet in the feed — so it is
 * held in NOT_YET_IN_DARWIN below and excluded from the catalog until it resolves.
 * lat/lng from NaPTAN (CRS / Metro id join).
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadUkNaptanIndex } from "./lib/uk-naptan.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** name, crs, borough */
const RAIL = [
  ["Acocks Green", "ACG", "Birmingham"],
  ["Adderley Park", "ADD", "Birmingham"],
  ["Aston", "AST", "Birmingham"],
  ["Birmingham Moor Street", "BMO", "Birmingham"],
  ["Birmingham New Street", "BHM", "Birmingham"],
  ["Birmingham Snow Hill", "BSW", "Birmingham"],
  ["Blake Street", "BKT", "Birmingham"],
  ["Bordesley", "BBS", "Birmingham"],
  ["Bournville", "BRV", "Birmingham"],
  ["Butlers Lane", "BUL", "Birmingham"],
  ["Chester Road", "CRD", "Birmingham"],
  ["Duddeston", "DUD", "Birmingham"],
  ["Erdington", "ERD", "Birmingham"],
  ["Five Ways", "FWY", "Birmingham"],
  ["Four Oaks", "FOK", "Birmingham"],
  ["Gravelly Hill", "GVH", "Birmingham"],
  ["Hall Green", "HLG", "Birmingham"],
  ["Hamstead", "HSD", "Birmingham"],
  ["Jewellery Quarter", "JEQ", "Birmingham"],
  ["Kings Norton", "KNN", "Birmingham"],
  ["Lea Hall", "LEH", "Birmingham"],
  ["Longbridge", "LOB", "Birmingham"],
  ["Northfield", "NFD", "Birmingham"],
  ["Perry Barr", "PRY", "Birmingham"],
  ["Selly Oak", "SLY", "Birmingham"],
  ["Small Heath", "SMA", "Birmingham"],
  ["Spring Road", "SRI", "Birmingham"],
  ["Stechford", "SCF", "Birmingham"],
  ["Sutton Coldfield", "SUT", "Birmingham"],
  ["Tyseley", "TYS", "Birmingham"],
  ["University", "UNI", "Birmingham"],
  ["Witton", "WTT", "Birmingham"],
  ["Wylde Green", "WYL", "Birmingham"],
  ["Yardley Wood", "YRD", "Birmingham"],
  ["Berkswell", "BKW", "Solihull"],
  ["Birmingham International", "BHI", "Solihull"],
  ["Dorridge", "DDG", "Solihull"],
  ["Earlswood (West Midlands)", "EWD", "Solihull"],
  ["Hampton-in-Arden", "HIA", "Solihull"],
  ["Marston Green", "MGN", "Solihull"],
  ["Olton", "OLT", "Solihull"],
  ["Shirley", "SRL", "Solihull"],
  ["Solihull", "SOL", "Solihull"],
  ["Whitlocks End", "WTE", "Solihull"],
  ["Widney Manor", "WMR", "Solihull"],
  ["Bescot Stadium", "BSC", "Sandwell"],
  ["Cradley Heath", "CRA", "Sandwell"],
  ["Dudley Port", "DDP", "Sandwell"],
  ["Langley Green", "LGG", "Sandwell"],
  ["Old Hill", "OHL", "Sandwell"],
  ["Rowley Regis", "ROW", "Sandwell"],
  ["Sandwell & Dudley", "SAD", "Sandwell"],
  ["Smethwick Galton Bridge", "SGB", "Sandwell"],
  ["Smethwick Rolfe Street", "SMR", "Sandwell"],
  ["Tame Bridge Parkway", "TAB", "Sandwell"],
  ["The Hawthorns", "THW", "Sandwell"],
  ["Tipton", "TIP", "Sandwell"],
  ["Bloxwich", "BLX", "Walsall"],
  ["Bloxwich North", "BWN", "Walsall"],
  ["Darlaston", "DAS", "Walsall"],
  ["Walsall", "WSL", "Walsall"],
  ["Coseley", "CSY", "Dudley"],
  ["Lye", "LYE", "Dudley"],
  ["Stourbridge Junction", "SBJ", "Dudley"],
  ["Stourbridge Town", "SBT", "Dudley"],
  ["Canley", "CNL", "Coventry"],
  ["Coventry", "COV", "Coventry"],
  ["Coventry Arena", "CAA", "Coventry"],
  ["Tile Hill", "THL", "Coventry"],
  ["Wolverhampton", "WVH", "Wolverhampton"],
  ["Moseley Village", "MOV", "Birmingham"],
  ["Kings Heath", "KIH", "Birmingham"],
  ["Pineapple Road", "PIR", "Birmingham"],
  ["Kidderminster", "KID", "Worcestershire"],
];

const RAIL_ALIASES = {
  BHM: ["Birmingham", "Birmingham New Street Station"],
  BMO: ["Moor Street"],
  BSW: ["Snow Hill"],
  BHI: ["Birmingham International Airport"],
  WVH: ["Wolverhampton Station"],
  JEQ: ["Jewellery Quarter Station"],
  UNI: ["Birmingham University"],
};

const naptan = await loadUkNaptanIndex();

const metroPath = join(ROOT, "lib/cities/uk-west-midlands/metro-stops-source.json");
const metro = JSON.parse(readFileSync(metroPath, "utf8"));
const metroStops = (metro.stops ?? []).map((stop) => {
  const { lat, lng } = naptan.coordsForMetro(stop);
  return {
    mode: "metro",
    name: stop.name,
    catalogId: stop.catalogId,
    // Legacy scalar, consumed by lib/providers/uk-metro-wm.js's exact-match
    // filter. Deliberately left null even where stopIds[] is populated —
    // TfWM's GTFS-RT feed carries one stop_id per directional platform, and
    // this single field can't represent both without silently collapsing
    // one direction off the board. See scripts/enrich-wm-metro-stop-ids.mjs
    // header and docs/uk-west-midlands-d1/oracle-clash-report.md.
    stopId: stop.stopId ?? null,
    // Real TfWM GTFS-RT platform-level stop_ids for this station (both
    // directions where the station has two platforms). Not yet consumed by
    // the adapter — populated ahead of that follow-up so the data is ready.
    stopIds: stop.stopIds ?? undefined,
    // TfWM GTFS static parent-station id (location_type=1). Reference only;
    // never appears in the live trip_updates feed.
    stationId: stop.stationId ?? undefined,
    aliases: stop.aliases ?? [],
    lat,
    lng,
    interchange: stop.interchange ?? undefined,
    note: stop.note ?? undefined,
  };
});

const railStops = RAIL.map(([name, crs, borough]) => {
  const { lat, lng } = naptan.coordsForCrs(crs, name);
  return {
    mode: "train",
    name,
    crs,
    borough,
    aliases: RAIL_ALIASES[crs] ?? [],
    lat,
    lng,
  };
});

if (railStops.length !== 74) {
  throw new Error(`Expected 74 rail stops, got ${railStops.length}`);
}

const payload = {
  region: "uk-west-midlands",
  displayName: "West Midlands",
  timeZone: "Europe/London",
  source: "docs/uk-coding-brief.md — ORR 6329 + Camp Hill + Kidderminster + WM Metro; coords NaPTAN",
  retrievedAt: new Date().toISOString().slice(0, 10),
  feeds: { train: "darwin", metro: "tfwm-gtfs-rt" },
  /** In-region stations with no Darwin CRS yet (opened after the feed's station list); re-check and promote to RAIL when they resolve. */
  notYetInDarwin: ["Willenhall"],
  notInRegion: [
    "Wythall",
    "Hagley",
    "Blakedown",
    "Worcester",
    "Warwick",
    "Leamington",
    "Stafford",
    "Penkridge",
    "Water Orton",
    "Coleshill Parkway",
    "Shenstone",
    "Lichfield City",
    "Lichfield Trent Valley",
    "Barnt Green",
    "Alvechurch",
    "Redditch",
    "Landywood",
    "Cannock",
    "Hednesford",
    "Rugeley",
    "Lapworth",
    "Bermuda Park",
    "Bedworth",
    "Nuneaton",
  ],
  stops: [...railStops, ...metroStops],
};

if (metroStops.length !== 35) {
  throw new Error(`Expected 35 metro stops, got ${metroStops.length}`);
}

const outDir = join(ROOT, "lib/cities/uk-west-midlands");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "stations.json");
writeFileSync(out, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${payload.stops.length} stops to ${out}`);
