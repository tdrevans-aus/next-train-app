import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const stops = parseCsv(readFileSync(join(ROOT, "qa/fixtures/rotterdam/gtfs/stops.txt"), "utf8"));
const published = JSON.parse(readFileSync(join(ROOT, "qa/fixtures/rotterdam/published-network.json"), "utf8"));

function foldKey(value) {
  return String(value || "")
    .replace(/^rotterdam,\s+/i, "")
    .replace(/^schiedam,\s+/i, "")
    .replace(/^den haag,\s+/i, "")
    .replace(/^'s-gravenhage,\s+/i, "")
    .replace(/^capelle aan den ijssel,\s+/i, "")
    .replace(/^spijkenisse,\s+/i, "")
    .replace(/^vlaardingen,\s+/i, "")
    .replace(/^maassluis,\s+/i, "")
    .replace(/^hoek van holland,\s+/i, "")
    .replace(/^pijnacker,\s+/i, "")
    .replace(/^berkel en rodenrijs,\s+/i, "")
    .replace(/^lansingerland,\s+/i, "")
    .replace(/^voorburg,\s+/i, "")
    .replace(/^leidschendam,\s+/i, "")
    .replace(/^nootdorp,\s+/i, "")
    .replace(/^hoogvliet rotterdam,\s+/i, "")
    .replace(/^pernis,\s+/i, "")
    .replace(/^rhoon,\s+/i, "")
    .replace(/^poortugaal,\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL = [];
const seenNames = new Set();
for (const line of published.lines ?? []) {
  for (const name of line.stations ?? []) {
    if (!seenNames.has(name)) {
      seenNames.add(name);
      CANONICAL.push(name);
    }
  }
}

const ALIASES = {
  "Meijersplein/Airport": ["Meijersplein / Airport", "Meijersplein"],
  "Hoek van Holland Strand": ["Hoek v Holland Strand", "Strand"],
  "Hoek van Holland Haven": ["Hoek v Holland Haven", "Haven"],
  "De Tochten": ["Tochten"],
  "Voorburg 't Loo": ["'t Loo", "Voorburg t Loo"],
  Alexander: ["Rotterdam Alexander"],
};

const byFold = new Map(CANONICAL.map((name) => [foldKey(name), name]));
for (const [name, aliases] of Object.entries(ALIASES)) {
  for (const alias of aliases) {
    byFold.set(foldKey(alias), name);
  }
}

const groups = new Map();
for (const stop of stops) {
  if (/^onbekend$/i.test(stop.stop_name) || /station alexander ns/i.test(stop.stop_name)) {
    continue;
  }
  const folded = foldKey(stop.stop_name);
  const canonical = byFold.get(folded);
  if (!canonical) {
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
mkdirSync(join(ROOT, "lib/cities/rotterdam"), { recursive: true });
writeFileSync(
  join(ROOT, "lib/cities/rotterdam/stations.json"),
  `${JSON.stringify({ city: "rotterdam", status: "live", timeZone: "Europe/Amsterdam", dst: true, stations }, null, 2)}\n`
);
console.log("stations", stations.length, "beurs ids", groups.get("Beurs").stopIds.length);
