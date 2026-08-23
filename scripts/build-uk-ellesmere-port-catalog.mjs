/**
 * Build lib/cities/uk-ellesmere-port/stations.json (11 CRS).
 * lat/lng from NaPTAN (CRS join).
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadUkNaptanIndex } from "./lib/uk-naptan.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const STATIONS = [
  ["Ellesmere Port", "ELP", "Home terminus"],
  ["Overpool", "OVE", "Branch"],
  ["Little Sutton", "LTT", "Branch"],
  ["Hooton", "HOO", "Junction"],
  ["Capenhurst", "CPU", "Chester branch"],
  ["Bache", "BAC", "Chester branch"],
  ["Chester", "CTR", "Chester end"],
  ["Liverpool James Street", "LVJ", "Loop"],
  ["Moorfields", "MRF", "Loop / Northern Line"],
  ["Liverpool Lime Street", "LIV", "Loop + mainline interchange"],
  ["Liverpool Central", "LVC", "Loop"],
];

const ALIASES = {
  LVJ: ["James Street"],
  LIV: ["Lime Street"],
  LVC: ["Central"],
};

const naptan = await loadUkNaptanIndex();

const payload = {
  region: "uk-ellesmere-port",
  displayName: "Ellesmere Port corridor",
  timeZone: "Europe/London",
  source: "docs/uk-coding-brief.md Region 2; coords NaPTAN",
  retrievedAt: new Date().toISOString().slice(0, 10),
  feeds: { train: "darwin" },
  notInRegion: [
    "West Kirby",
    "Eastham Rake",
    "Bromborough",
    "Hamilton Square",
    "New Brighton",
    "Stanlow & Thornton",
    "Helsby",
    "Ince & Elton",
  ],
  stops: STATIONS.map(([name, crs, role]) => {
    const { lat, lng } = naptan.coordsForCrs(crs, name);
    return {
      mode: "train",
      name,
      crs,
      role,
      aliases: ALIASES[crs] ?? [],
      lat,
      lng,
    };
  }),
};

const outDir = join(ROOT, "lib/cities/uk-ellesmere-port");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "stations.json"), JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${payload.stops.length} stops`);
