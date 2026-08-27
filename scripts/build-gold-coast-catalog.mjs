import { readFileSync, writeFileSync } from "fs";
import { parseCsv } from "../lib/providers/gtfs/csv.js";

const stops = parseCsv(readFileSync("qa/fixtures/gold-coast/gtfs/stops.txt", "utf8"));
const parents = stops.filter((s) => !s.parent_station && !/turnback|relief/i.test(s.stop_name));
const usedStopIds = new Set(parseCsv(readFileSync("qa/fixtures/gold-coast/gtfs/stop_times.txt", "utf8")).map((row) => row.stop_id));
const children = new Map();
for (const s of stops) {
  const p = s.parent_station || s.stop_id;
  if (!usedStopIds.has(s.stop_id) && s.stop_id !== p) {
    continue;
  }
  if (!children.has(p)) {
    children.set(p, []);
  }
  children.get(p).push(s.stop_id);
}

function product(gtfsName) {
  const name = gtfsName
    .replace(/\s*\(southport\)\s*/i, " ")
    .replace(/\s+station\b/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const aliases = [gtfsName];
  if (name === "Gold Coast University Hospital") {
    aliases.push("GCUH", "University Hospital");
  }
  if (name === "Second Avenue") {
    aliases.push("Second Avenue Burleigh");
  }
  if (name === "Griffith University") {
    aliases.push("Griffith University (Southport)", "Griffith University station (Southport)");
  }
  if (name === "Queen Street") {
    aliases.push("Queen Street (Southport)", "Queen Street station (Southport)");
  }
  return [name, [...new Set(aliases.filter((a) => a !== name))]];
}

const ORDER = [
  "Helensvale",
  "Parkwood",
  "Parkwood East",
  "Gold Coast University Hospital",
  "Griffith University",
  "Queen Street",
  "Nerang Street",
  "Southport",
  "Southport South",
  "Broadwater Parklands",
  "Main Beach",
  "Surfers Paradise North",
  "Cypress Avenue",
  "Cavill Avenue",
  "Surfers Paradise",
  "Northcliffe",
  "Florida Gardens",
  "Broadbeach North",
  "Broadbeach South",
  "Mermaid Beach",
  "Mermaid Beach South",
  "Nobby Beach",
  "Miami North",
  "Miami",
  "Christine Avenue",
  "Second Avenue",
  "Burleigh Heads",
];

const byProduct = new Map();
for (const p of parents) {
  const [name, aliases] = product(p.stop_name);
  byProduct.set(name, {
    name,
    aliases,
    stopIds: [...new Set(children.get(p.stop_id) || [p.stop_id])],
    lat: Number(p.stop_lat),
    lng: Number(p.stop_lon),
  });
}

const missing = ORDER.filter((n) => !byProduct.has(n));
if (missing.length) {
  throw new Error(`missing ${missing.join(", ")} have ${[...byProduct.keys()].join(" | ")}`);
}

const stations = ORDER.map((n) => byProduct.get(n));
writeFileSync(
  "lib/cities/gold-coast/stations.json",
  `${JSON.stringify({ city: "gold-coast", status: "live", timeZone: "Australia/Brisbane", dst: false, stations }, null, 2)}\n`
);
console.log("stations", stations.length);
