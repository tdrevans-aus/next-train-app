import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const stops = parseCsv(readFileSync(join(ROOT, "qa/fixtures/amsterdam/gtfs/stops.txt"), "utf8"));

function foldKey(value) {
  return String(value || "")
    .replace(/^amsterdam,\s+/i, "")
    .replace(/^diemen,\s+/i, "")
    .replace(/^duivendrecht,\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/^burg\.\s+/i, "")
    .replace(/\s+station$/i, "");
}

const CANONICAL = [
  "Isolatorweg",
  "Station Sloterdijk",
  "De Vlugtlaan",
  "Jan van Galenstraat",
  "Postjesweg",
  "Station Lelylaan",
  "Heemstedestraat",
  "Henk Sneevlietweg",
  "Amstelveenseweg",
  "Station Zuid",
  "Station RAI",
  "Overamstel",
  "Van der Madeweg",
  "Station Duivendrecht",
  "Strandvliet",
  "Station Bijlmer ArenA",
  "Bullewijk",
  "Station Holendrecht",
  "Reigersbos",
  "Gein",
  "Centraal Station",
  "Nieuwmarkt",
  "Waterlooplein",
  "Weesperplein",
  "Wibautstraat",
  "Amstelstation",
  "Spaklerweg",
  "Venserpolder",
  "Station Diemen Zuid",
  "Verrijn Stuartweg",
  "Ganzenhoef",
  "Kraaiennest",
  "Gaasperplas",
  "Noord",
  "Noorderpark",
  "Rokin",
  "Vijzelgracht",
  "De Pijp",
  "Europaplein",
];

const ALIASES = {
  "De Vlugtlaan": ["Burg. De Vlugtlaan"],
  "Station Bijlmer ArenA": ["Bijlmer ArenA", "Station Arena", "Arena"],
  "Amstelstation": ["Amstel"],
  "Station Zuid": ["Zuid"],
  "Station RAI": ["RAI"],
  "Station Sloterdijk": ["Sloterdijk"],
  "Station Lelylaan": ["Lelylaan"],
  "Station Holendrecht": ["Holendrecht"],
  "Station Duivendrecht": ["Duivendrecht"],
  "Station Diemen Zuid": ["Diemen Zuid"],
};

const byFold = new Map(CANONICAL.map((name) => [foldKey(name), name]));
for (const [name, aliases] of Object.entries(ALIASES)) {
  for (const alias of aliases) {
    byFold.set(foldKey(alias), name);
  }
}

const groups = new Map();
for (const stop of stops) {
  const folded = foldKey(stop.stop_name);
  const canonical = byFold.get(folded);
  if (!canonical) {
    continue;
  }
  if (/amsterdam centraal/i.test(stop.stop_name) && !/centraal station/i.test(stop.stop_name)) {
    continue;
  }
  const row = groups.get(canonical) ?? {
    name: canonical,
    aliases: [...(ALIASES[canonical] ?? [])],
    stopIds: [],
    lat: null,
    lng: null,
  };
  if (!row.stopIds.includes(stop.stop_id)) {
    row.stopIds.push(stop.stop_id);
  }
  const lat = Number(stop.stop_lat);
  const lng = Number(stop.stop_lon);
  if (row.lat == null && Number.isFinite(lat) && Number.isFinite(lng)) {
    row.lat = lat;
    row.lng = lng;
  }
  groups.set(canonical, row);
}

const missing = CANONICAL.filter((name) => !groups.has(name));
if (missing.length) {
  throw new Error(`Missing GTFS coords for ${missing.join(", ")}`);
}

const stations = CANONICAL.map((name) => groups.get(name));
mkdirSync(join(ROOT, "lib/cities/amsterdam"), { recursive: true });
writeFileSync(
  join(ROOT, "lib/cities/amsterdam/stations.json"),
  `${JSON.stringify({ city: "amsterdam", status: "live", timeZone: "Europe/Amsterdam", dst: true, stations }, null, 2)}\n`
);
console.log("stations", stations.length, "centraal ids", groups.get("Centraal Station").stopIds.length);
