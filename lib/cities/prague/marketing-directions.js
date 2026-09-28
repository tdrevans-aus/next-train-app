/**
 * Prague (PID Metro A/B/C) — hub lock, doNotGroup guards, and the "line + terminus" direction
 * model recommended by docs/prague-d1/direction-model-memo.md (§3 recommendation A: `A + Depo
 * Hostivař`, `B + Zličín`, `C + Háje`).
 *
 * Hub lock: Muzeum (A x C, beneath Wenceslas Square / National Museum) — never a direction
 * token ("to Muzeum" / "to City" / "to Centre"). Unlike Vienna's Karlsplatz or Brussels' single
 * cross, Prague's interchange structure is a TRIANGLE of three separate two-line nodes, no
 * single station sees all three lines:
 *   - Muzeum   (A x C) — hub lock. Line B does not call here.
 *   - Můstek   (A x B) — doNotGroup vs Muzeum. Line C does not call here.
 *   - Florenc  (B x C) — doNotGroup vs Muzeum and Můstek. Line A does not call here.
 * Each line is a simple two-end trunk (no loop, no branch, no compass-heading ambiguity) — see
 * direction-model-memo.md section 2 — so, unlike Vienna's U2/Karlsplatz correction, no line here
 * terminates at its own hub-triangle node, and no self-terminus chip synthesis is needed for
 * Muzeum/Můstek/Florenc themselves.
 *
 * DIACRITICS ARE LOAD-BEARING (hazard-pack.md "Diacritics lock"): a stripped-diacritic string
 * (`Mustek`, `Namesti Miru`) is a DIFFERENT, WRONG string here, not a rename-equivalent the way
 * Brussels' FR/NL stacking is. Unlike every other city's marketing-directions.js in this repo
 * (Vienna, Dublin, Boston, ...), foldKey() below deliberately does NOT strip combining
 * diacritical marks — it only trims/lowercases/collapses whitespace. Station names must match
 * with their full diacritic form intact; do not copy the NFKD-strip pattern from other cities.
 *
 * ## Correction, 28 Sep 2026 (docs/jim-brief-prague-line-c-short-turn.md, Jim PR #488 live check)
 *
 * hazard-pack.md H5 flagged nested/partial-route short-turns as an unverified gap
 * (`shortTurns: []` was an assumed-empty default, not a confirmed one). Confirmed real against
 * the live Golemio departureboards feed at ~03:53-04:10 Europe/Prague (early-morning short-turn
 * window) on 28 Sep 2026:
 *   - Line C, southbound (Letňany -> Háje direction): some trips terminate short at
 *     **Pražského povstání** (headsign `"Pražského povstání"`, exact diacritics, seen departing
 *     Muzeum and other stations north of it).
 *   - Line C, northbound (Háje -> Letňany direction): some trips originate at Háje and terminate
 *     short at **Chodov**, just two stops north (headsign `"Chodov"`, seen departing Háje and
 *     Opatov).
 *   - Lines A and B: no short-turn headsigns observed over the same live poll (every A departure
 *     read Nemocnice Motol/Depo Hostivař, every B departure read Zličín/Černý Most) — `shortTurns:
 *     []` stays correct for A/B for now, but is still a live-sample-of-one, not an exhaustive
 *     schedule audit; re-check if a future pack revisits this.
 * Both C short-turns are added to `LINE_TERMINI.c` as first-class terminus chips (same "real
 * short-turns get promoted, not left as a bare line label" call as Washington's Huntington /
 * Wiehle-Reston East, PR #482) — a bare `"C"` chip never matches a rider's saved direction, and
 * `resolveTerminus`/`mapLineTerminusDestination` already refuse to fabricate an unrecognized
 * headsign, so leaving these two out only produced an under-specified fallback, never a wrong one.
 * `resolveTerminus` is driven by the live headsign, so production boards are automatically
 * correct without further change (a station only ever sees a chip for a trip that genuinely
 * passes it). The exhaustive dogfood-picker listing (`marketingLabelsForStation`) is not
 * automatically correct that way, since it lists a chip for every terminus of every line at a
 * station regardless of whether that specific short-turn actually reaches that station — see
 * `LINE_STATION_ORDER`/`SHORT_TURN_DIRECTION`/`isTerminusReachableFromStation` below, which
 * restrict each short-turn chip to the stations it can actually reach (never offered at the
 * short-turn terminus itself, or on the wrong side of it).
 *
 * @see docs/prague-d1/direction-model-memo.md
 * @see docs/prague-d1/hazard-pack.md
 * @see docs/prague-d1/published-network.json
 * @see docs/jim-brief-prague-line-c-short-turn.md
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stationCatalog = JSON.parse(readFileSync(join(__dirname, "stations.json"), "utf8"));

export const PRAGUE_HUB = "Muzeum";
/** Europe/Prague HAS DST (CEST/CET) — hazard-pack.md H7. Do not copy Perth/Brisbane/Auckland
 * no-DST handling. */
export const PRAGUE_TIME_ZONE = "Europe/Prague";

/**
 * Tokens that must never resolve as a real Prague station: invented city ids (praha, pida, pid
 * — oracle report explicit instruction), generic hub/city tokens (published-network.json
 * printedInnerCityNames.doNotUse), plus other cities' hub strings that have shown up as
 * cross-city collapse bugs before (doNotGroup proposals table, hazard-pack.md).
 */
const FORBIDDEN_STATION_TOKENS = [
  "Prague",
  "Praha",
  "prague",
  "praha",
  "pida",
  "pid",
  "Downtown",
  "Centre",
  "Centrum",
  "City",
  "CBD",
  "Karlsplatz",
  "Kongens Nytorv",
  "T-Centralen",
  "Brunnsparken",
  "Centraal Station",
  "Waitematā Station",
  "Metro Center",
  "Embarcadero",
  "Arts-Loi",
  "Kunst-Wet",
];

/**
 * Real, separately-catalogued Prague interchange stations that must never stand in for the
 * Muzeum hub identity, even though each is itself a valid station in the catalog — the
 * interchange TRIANGLE (hazard-pack.md H1/H4/H6), not one hub.
 */
const HUB_PROXY_FORBIDDEN = ["Můstek", "Florenc"];

/**
 * Fold case/whitespace ONLY for name comparisons — diacritics are load-bearing here (see file
 * header) and must never be stripped, unlike every other city's foldKey().
 */
export function foldKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isForbiddenCollapseName(name) {
  const needle = foldKey(name);
  if (!needle) {
    return false;
  }
  return FORBIDDEN_STATION_TOKENS.some((entry) => foldKey(entry) === needle);
}

/** True when `name` is a real Prague station that must not be folded into the Muzeum hub
 * identity (Můstek, Florenc — the other two vertices of the interchange triangle). */
export function isForbiddenHubProxy(name) {
  const needle = foldKey(name);
  if (!needle || needle === foldKey(PRAGUE_HUB)) {
    return false;
  }
  return HUB_PROXY_FORBIDDEN.some((entry) => foldKey(entry) === needle);
}

/** Passenger-facing line label — the single printed line letter, per
 * direction-model-memo.md's open question 1 recommendation ({A, B, C} + official terminus, no
 * numeral system, no "Metro A"/"Line A" prefix). */
export const LINE_LABELS = {
  a: "A",
  b: "B",
  c: "C",
};

/**
 * Far printed termini per line (docs/prague-d1/published-network.json lines[].termini). Muzeum,
 * Můstek and Florenc never appear here for any line — each is a hub-triangle stop string, never
 * a direction token, and (unlike Vienna's U2/Karlsplatz) no line actually terminates at any of
 * the three, so no line-qualified hub-bound chip is needed either.
 */
export const LINE_TERMINI = {
  a: ["Nemocnice Motol", "Depo Hostivař"],
  b: ["Zličín", "Černý Most"],
  c: ["Letňany", "Pražského povstání", "Chodov", "Háje"],
};

/**
 * Termini that are genuine short-turns rather than a line's full-length far end — recorded so
 * the correction is traceable in code, not just prose (same bookkeeping role as Washington's
 * SHORT_TURN_TERMINI). Not used to gate matching (a short-turn train is a real, walk-up-eligible
 * service and must appear on a live board like any other) — only for documentation/QA legibility
 * and to drive the reachability filter below.
 */
export const SHORT_TURN_TERMINI = {
  c: ["Pražského povstání", "Chodov"],
};

/**
 * Full in-order station roster per line (docs/prague-d1/published-network.json lines[].stations),
 * needed only to compute which stations a short-turn chip can actually reach (see
 * SHORT_TURN_DIRECTION/isTerminusReachableFromStation below). Only line C's roster is short-turn-
 * relevant today; A and B are included too since neither line is expensive to carry and a future
 * short-turn there gets the same treatment for free.
 */
const LINE_STATION_ORDER = {
  a: [
    "Nemocnice Motol", "Petřiny", "Nádraží Veleslavín", "Bořislavka", "Dejvická", "Hradčanská",
    "Malostranská", "Staroměstská", "Můstek", "Muzeum", "Náměstí Míru", "Jiřího z Poděbrad",
    "Flora", "Želivského", "Strašnická", "Skalka", "Depo Hostivař",
  ],
  b: [
    "Zličín", "Stodůlky", "Luka", "Lužiny", "Hůrka", "Nové Butovice", "Jinonice", "Radlická",
    "Smíchovské nádraží", "Anděl", "Karlovo náměstí", "Národní třída", "Můstek",
    "Náměstí Republiky", "Florenc", "Křižíkova", "Invalidovna", "Palmovka", "Českomoravská",
    "Vysočanská", "Kolbenova", "Hloubětín", "Rajská zahrada", "Černý Most",
  ],
  c: [
    "Letňany", "Prosek", "Střížkov", "Ládví", "Kobylisy", "Nádraží Holešovice", "Vltavská",
    "Florenc", "Hlavní nádraží", "Muzeum", "I. P. Pavlova", "Vyšehrad", "Pražského povstání",
    "Pankrác", "Budějovická", "Kačerov", "Roztyly", "Chodov", "Opatov", "Háje",
  ],
};

/**
 * Direction each short-turn terminus's trip actually travels, keyed by line then terminus name:
 *   "south" — the trip travels in increasing LINE_STATION_ORDER index (i.e. toward that line's
 *     higher-index/"southern" full terminus) and stops early. Confirmed live for Pražského
 *     povstání (index 12 on line C): seen departing Muzeum (index 9, i.e. north of it) — only
 *     stations with a LOWER index than the terminus can ever board a trip actually going there.
 *   "north" — the trip travels in decreasing index (toward the lower-index/"northern" full
 *     terminus) and stops early. Confirmed live for Chodov (index 17 on line C): seen departing
 *     Háje (index 19) and Opatov (index 18) — only stations with a HIGHER index than the terminus
 *     can ever board a trip actually going there.
 * A line's two full-length termini (the line's own index-0 and index-last stations) need no entry
 * here — self-terminus exclusion in marketingLabelsForStation already keeps a station from
 * offering a chip naming itself, and every other station is a genuine stop on the way to a full
 * terminus by definition, so nothing further to filter.
 */
const SHORT_TURN_DIRECTION = {
  c: {
    "Pražského povstání": "south",
    Chodov: "north",
  },
};

/**
 * Whether a `terminus` chip for `lineId` can ever be a genuine live destination when boarding at
 * `stationName` — i.e. whether that specific short-turn trip actually passes through this
 * station. Full-length termini (no SHORT_TURN_DIRECTION entry) are always reachable (subject to
 * the separate self-terminus guard). An unrecognized station/terminus name fails closed (not
 * reachable) rather than fabricating a chip the live board could never actually produce.
 */
export function isTerminusReachableFromStation(lineId, terminus, stationName) {
  const dirForLine = SHORT_TURN_DIRECTION[lineId];
  const direction = dirForLine?.[terminus];
  if (!direction) {
    return true;
  }
  const order = LINE_STATION_ORDER[lineId] ?? [];
  const canonicalStation = canonicalStationName(stationName) ?? stationName;
  const stationIdx = order.indexOf(canonicalStation);
  const terminusIdx = order.indexOf(terminus);
  if (stationIdx === -1 || terminusIdx === -1) {
    return false;
  }
  return direction === "south" ? stationIdx < terminusIdx : stationIdx > terminusIdx;
}

/**
 * Golemio departure board's own `route.short_name` ("A"/"B"/"C") -> our line id. These match
 * docs/prague-d1/published-network.json's per-line `gtfsRouteIdsIfKnown` exactly (confirmed
 * against the trimmed PID GTFS static routes.txt at D2 — scripts/trim-prague-gtfs.mjs asserts
 * the kept route_short_name set is exactly {A, B, C}, never D).
 */
export const GOLEMIO_ROUTE_SHORT_NAME_TO_LINE = {
  A: "a",
  B: "b",
  C: "c",
};

const aliasToCanonicalName = new Map();
for (const entry of stationCatalog.stations ?? []) {
  aliasToCanonicalName.set(foldKey(entry.name), entry.name);
  for (const alias of entry.aliases ?? []) {
    aliasToCanonicalName.set(foldKey(alias), entry.name);
  }
}

/** Resolve any catalogued name/alias to the D1 printed (full-diacritic) name, or null if
 * unrecognized — never fabricates a station. */
export function canonicalStationName(name) {
  return aliasToCanonicalName.get(foldKey(name)) ?? null;
}

/**
 * Resolve a raw Golemio `trip.headsign` string to one of `lineId`'s known printed termini, or
 * null if it doesn't match one. Deliberately narrow — only ever returns a name from
 * LINE_TERMINI, never an arbitrary headsign string, so an unexpected live value (or a hub string
 * like "Muzeum"/"Můstek"/"Florenc"/"Praha"/"Centrum") can never leak into a direction chip.
 */
export function resolveTerminus(headsignOrName, lineId) {
  const termini = LINE_TERMINI[lineId] ?? [];
  const canonical = canonicalStationName(headsignOrName);
  if (canonical && termini.includes(canonical)) {
    return canonical;
  }
  return null;
}

/**
 * "Line + terminus" per docs/prague-d1/direction-model-memo.md §3 recommendation A. Falls back
 * to the bare line label (no "+ X" suffix) when the headsign can't be resolved to a known
 * terminus for that line — this is what guarantees a hub string or any doNotUse token never
 * appears as a direction, without needing a separate forbidden-token check on the label output.
 */
export function mapLineTerminusDestination(headsignOrName, lineId) {
  const label = LINE_LABELS[lineId] ?? lineId;
  const terminus = resolveTerminus(headsignOrName, lineId);
  return terminus ? `${label} + ${terminus}` : label;
}

export function listCatalogStations() {
  return stationCatalog.stations ?? [];
}

/** Single resolver for both lib/providers/prague.js and the dogfood module — exact
 * name/alias match (case/whitespace-insensitive, diacritic-EXACT), never a fabricated station. */
export function resolveCatalogEntry(stationIdOrName) {
  const raw = String(stationIdOrName ?? "").trim();
  if (!raw || isForbiddenCollapseName(raw)) {
    return null;
  }
  const needle = foldKey(raw);
  for (const entry of stationCatalog.stations ?? []) {
    if (foldKey(entry.name) === needle) {
      return entry;
    }
    for (const alias of entry.aliases ?? []) {
      if (foldKey(alias) === needle) {
        return entry;
      }
    }
    if (entry.stopIds?.includes(stationIdOrName)) {
      return entry;
    }
  }
  return null;
}

/**
 * Whether `trip`'s classified destination equals `stationName` itself — a trip terminating at
 * the station being viewed is an arrival, not a boardable departure (the Dublin #484 lesson: no
 * station may ever offer a chip naming itself). Compares against the RESOLVED terminus (or the
 * raw headsign when unresolved), never the already-mapped "Line + Terminus" label — matching
 * lib/cities/dublin/marketing-directions.js's isTerminatingAtStation guard shape.
 */
export function isTerminatingAtStation(terminusOrHeadsign, stationName) {
  const canonicalTerminus = canonicalStationName(terminusOrHeadsign);
  const canonicalStation = canonicalStationName(stationName);
  if (!canonicalTerminus || !canonicalStation) {
    return false;
  }
  return canonicalTerminus === canonicalStation;
}

/**
 * Every direction chip a station could plausibly show (dogfood picker only — production boards
 * derive the chip from the live trip itself via mapLineTerminusDestination). Drops the chip
 * whose terminus is the station's own name, same self-terminus guard as isTerminatingAtStation
 * above (belt-and-braces for the hub-triangle nodes, load-bearing for a real short-turn terminus
 * like Pražského povstání/Chodov, which ARE real catalogued stations). Also drops a short-turn
 * chip for any station that short-turn's trip never actually reaches — see
 * isTerminusReachableFromStation above (e.g. Pankrác, south of Pražského povstání, must never
 * offer "C + Pražského povstání"; Roztyly, north of Chodov, must never offer "C + Chodov").
 */
export function marketingLabelsForStation(stationIdOrName) {
  const entry = resolveCatalogEntry(stationIdOrName);
  if (!entry) {
    return [];
  }
  const stationKey = foldKey(entry.name);
  const labels = [];
  const seen = new Set();
  for (const lineId of entry.lines) {
    const label = LINE_LABELS[lineId] ?? lineId;
    for (const terminus of LINE_TERMINI[lineId] ?? []) {
      if (foldKey(terminus) === stationKey) {
        continue;
      }
      if (!isTerminusReachableFromStation(lineId, terminus, entry.name)) {
        continue;
      }
      const chip = `${label} + ${terminus}`;
      if (seen.has(chip)) {
        continue;
      }
      seen.add(chip);
      labels.push(chip);
    }
  }
  return labels;
}

export function tripMatchesMarketingChip(trip, chip) {
  return String(trip?.destination ?? "") === String(chip ?? "");
}
