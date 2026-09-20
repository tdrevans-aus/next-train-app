/**
 * Brussels (STIB/MIVB) metro direction model — line + terminus.
 *
 * docs/brussels-d1/direction-model-memo.md, Option A (Tim signed off): Arts-Loi / Kunst-Wet
 * is a **through-cross** hub (metro 1 x 2 x 5 x 6) — metro 1/5 run E-W, metro 2/6 run the
 * inner-ring loop N-S through the same building. Inbound/outbound vs "City"/"Centre" is false
 * there, so chips are always `${line} + ${official printed terminus}` (e.g.
 * `1 + Stockel / Stokkel`, `6 + Roi Baudouin / Koning Boudewijn`), matching the Stockholm/
 * Helsinki/Oslo "+" convention. Arts-Loi / Kunst-Wet is a locked hub *stop string* — it must
 * never be emitted as a direction token ("to Arts-Loi" / "to City" / "to Centre").
 *
 * Line 2's two far ends are **Simonis** and **Elisabeth** — two distinct printed terminus
 * boxes on the same complex, never collapsed into one chip name (docs/brussels-d1/hazard-pack.md
 * H4). Line 6's far ends are **Roi Baudouin / Koning Boudewijn** and **Elisabeth**. Unlike
 * Helsinki/Oslo's forbidden-terminus lists, Simonis and Elisabeth ARE real, official line
 * termini here — they are only forbidden as a stand-in for the Arts-Loi / Kunst-Wet hub
 * identity, never forbidden as a direction chip.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export const BRUSSELS_HUB = "Arts-Loi / Kunst-Wet";
export const BRUSSELS_TIME_ZONE = "Europe/Brussels";

/**
 * Pure marketing/CBD synonyms — never a real STIB/MIVB metro station, must never resolve.
 * docs/brussels-d1/published-network.json printedInnerCityNames.doNotUse (the marketing-token
 * subset only — the real-station subset of that list, e.g. Simonis / Elisabeth / Gare du
 * Midi / Rogier, stays resolvable; it is only forbidden as a stand-in for the hub, see
 * isForbiddenHubProxy below).
 */
const FORBIDDEN_STATION_NAMES = new Set(
  [
    "Downtown",
    "Centre",
    "Centrum",
    "City",
    "CBD",
    "Brussels",
    "Bruxelles",
    "Brussel",
    "bru",
    "stib",
    "belgium",
    "to City",
    "to Arts-Loi",
    "to Centre",
  ].map((value) => value.trim().toLowerCase())
);

/**
 * Real stations that must never be used AS the Arts-Loi / Kunst-Wet hub identity (they are
 * other buildings, other line combinations, or a different mode mix) — docs/brussels-d1
 * hazard-pack.md doNotGroup + printedInnerCityNames.doNotUse. These stay fully resolvable as
 * their own stations/chips; this list only guards hub *aliasing*, not station resolution or
 * terminus chips.
 */
const FORBIDDEN_HUB_PROXY_NAMES = new Set(
  [
    "Gare du Midi",
    "Zuidstation",
    "Gare du Midi / Zuidstation",
    "Gare Centrale",
    "Centraal Station",
    "Gare Centrale / Centraal Station",
    "De Brouckère",
    "Rogier",
    "Gare du Nord",
    "Noordstation",
    "Simonis",
    "Elisabeth",
    "Beekkant",
    "Gare de l'Ouest",
    "Weststation",
  ].map((value) => value.trim().toLowerCase())
);

export function foldKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Blocks station *resolution* — marketing tokens that are never a real metro station. */
export function isForbiddenCollapseName(value) {
  return FORBIDDEN_STATION_NAMES.has(String(value || "").trim().toLowerCase());
}

/** Blocks using a real station name as a stand-in for the Arts-Loi / Kunst-Wet hub. */
export function isForbiddenHubProxy(value) {
  return FORBIDDEN_HUB_PROXY_NAMES.has(String(value || "").trim().toLowerCase());
}

export function loadLineMap() {
  return JSON.parse(readFileSync(join(ROOT, "lib/cities/brussels/line-map.json"), "utf8"));
}

/**
 * Split a locked D1 bilingual name ("Stockel / Stokkel") into its FR and NL halves.
 * Same-in-both-languages names (Beekkant, Simonis, Elisabeth, Schuman, ...) have no
 * " / " and fold to themselves for both.
 */
export function bilingualHalves(name) {
  const [fr, nl] = String(name || "").split(" / ");
  return { fr: fr ?? "", nl: nl ?? fr ?? "" };
}

/**
 * Official printed termini per line (docs/brussels-d1/published-network.json). GTFS
 * trip_headsign is FR-only, ALL CAPS, single-word-per-station-name (e.g. "GARE DE L'OUEST",
 * "STOCKEL", "SIMONIS", "ELISABETH") — this builds a fold(headsign) -> locked bilingual
 * terminus string index so the adapter can recover the correct D1 chip text.
 */
function buildTerminusIndex(published = loadLineMap()) {
  const index = new Map();
  for (const line of published.lines ?? []) {
    for (const terminus of line.termini ?? []) {
      const { fr, nl } = bilingualHalves(terminus);
      index.set(`${line.number}::${foldKey(fr)}`, terminus);
      if (nl) {
        index.set(`${line.number}::${foldKey(nl)}`, terminus);
      }
    }
  }
  return index;
}

let terminusIndexCache = null;
function terminusIndex() {
  if (!terminusIndexCache) {
    terminusIndexCache = buildTerminusIndex();
  }
  return terminusIndexCache;
}

export function marketingLabel(line, terminus) {
  return `${line} + ${terminus}`;
}

/**
 * @param {string} headsign Raw GTFS `trip_headsign` (FR, ALL CAPS)
 * @param {string} routeShortName 1 | 2 | 5 | 6
 * @returns {string|null} the locked bilingual terminus string, or null when the headsign is
 *   not one of the four lines' official printed termini (overlay/short-turn/depot trip —
 *   hazard-pack.md H5: shortTurns are empty on all four v1 lines, so anything else is out of
 *   scope and the trip should be dropped rather than shown with a fabricated chip).
 */
export function resolveTerminus(headsign, routeShortName) {
  const line = String(routeShortName || "").trim();
  const key = `${line}::${foldKey(headsign)}`;
  return terminusIndex().get(key) ?? null;
}

export function mapBrusselsDestination(headsign, routeShortName) {
  const line = String(routeShortName || "").trim();
  const terminus = resolveTerminus(headsign, line);
  if (!terminus || !line) {
    return null;
  }
  return marketingLabel(line, terminus);
}

/**
 * @param {string} station Printed station name (any of the D1 locked names)
 * @param {object} [published] loadLineMap() result
 */
export function marketingLabelsForStation(station, published = loadLineMap()) {
  const labels = [];
  const seen = new Set();
  const stationKey = foldKey(station);
  if (isForbiddenCollapseName(station)) {
    return [];
  }

  for (const line of published.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => foldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    for (const terminus of line.termini ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      const label = marketingLabel(line.number, terminus);
      const labelKey = label.toLowerCase();
      if (seen.has(labelKey)) {
        continue;
      }
      seen.add(labelKey);
      labels.push(label);
    }
  }

  return labels.sort((a, b) => a.localeCompare(b, "fr"));
}

export function tripMatchesMarketingChip(tripOrDest, chip) {
  const dest = typeof tripOrDest === "string" ? tripOrDest : tripOrDest?.destination ?? "";
  return foldKey(dest) === foldKey(chip);
}

/**
 * SNCB/NMBS direction chip — `${vehicle type} + ${final destination}` (e.g. "IC + Oostende"),
 * the same "code + terminus" '+' convention as the metro chips above (and Stockholm/Malmö/
 * Oslo's national-rail chips), but composed LIVE per iRail departure
 * (lib/providers/irail.js's mapIrailDepartures, `mode: "rail"` trips) rather than from a
 * static per-line map. SNCB has no printed metro-style line map at these three stations and a
 * network-wide destination fan-out (dozens of possible final stations), so a fixed enumeration
 * here would either be wrong or need constant hand-maintenance — same "derive live, don't
 * fabricate a fixed list" call Copenhagen already made for its own DSB Regional/InterCity
 * chips (lib/cities/copenhagen/dogfood-next-train.js file header). This is Tim's Part C
 * direction-model choice (20 Sep 2026,
 * docs/jim-brief-brussels-horizon-and-sncb-directions.md): grouping by vehicle type keeps the
 * chip list at Gare Centrale / Gare du Midi bounded to iRail's live categories (IC, EC, ECD,
 * ICE, L, P, S1/S2/S3/S8/S10, ...) rather than one chip per distinct destination with no type
 * context. doNotGroup-by-mode: this label family is never compared against or merged with a
 * metro "line + terminus" chip (tripMatchesMarketingChip above) — the two are matched by two
 * separate functions, joined only by the caller (dogfood-next-train.js).
 * @param {{ routeShortName?: string, destination?: string, rawDestination?: string }} trip
 * @returns {string|null} `null` when the trip is missing a type or destination (never
 *   fabricated from partial data)
 */
export function sncbDirectionLabel(trip) {
  const type = String(trip?.routeShortName || "").trim().toUpperCase();
  const destination = String(trip?.destination || "").trim();
  if (!type || !destination) {
    return null;
  }
  return `${type} + ${destination}`;
}

/** @param {object} trip a `mode: "rail"` ProviderTrip @param {string} chip an sncbDirectionLabel()-shaped string */
export function tripMatchesSncbDirectionChip(trip, chip) {
  const label = sncbDirectionLabel(trip);
  return label !== null && foldKey(label) === foldKey(chip);
}
