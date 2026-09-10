/**
 * FB-61 (docs/jim-brief-fb61-branch-reachable-chips.md) — offline, deterministic gate: every
 * direction chip `marketingLabelsForStation()` offers at a catalog station must be reachable
 * from that station's own branch/segment/line-membership in the city's line-map/topology data.
 *
 * Deliberately built OFFLINE, not against a live board: a gate that depends on live service is
 * flaky and service-hours-dependent (the brief explicitly rejects that shape). This instead
 * re-derives reachability directly from each city's static line-map/published-network data,
 * independently of the product code path that builds the chip list, so it would also catch a
 * regression in that code path itself, not just a data error.
 *
 * Scope: the three cities FB-61 confirmed and fixed/investigated — uk-london-tfl (DLR branch
 * structure, the confirmed defect, fixed here), stockholm and oslo (both already modelled
 * per-branch via a per-line-number `stations` array; live cross-checks during this brief found
 * their two named examples — Abrahamsberg "Gröna linjen + Farsta strand" and Ammerud
 * "4 + Bergkrystallen" — are in fact genuinely reachable services, not the bug, so nothing
 * changed there; this gate still runs against them to prove their existing model holds and to
 * catch a future regression). NOT a general 33-city rewrite — see the brief for why.
 *
 * No network calls. All data is read from files already checked into the repo.
 *
 * Usage: node qa/branch-reachable-chips-gate.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
  marketingLabelsForStation as londonLabelsForStation,
  terminiReachableFromStation,
  normalizeLineKey,
} from "../lib/cities/uk-london-tfl/marketing-directions.js";
import {
  marketingLabelsForStation as stockholmLabelsForStation,
  marketingLabel as stockholmMarketingLabel,
  MARKETING_ENDS as STOCKHOLM_MARKETING_ENDS,
  foldKey as stockholmFoldKey,
  loadLineMap as loadStockholmLineMap,
} from "../lib/cities/stockholm/marketing-directions.js";
import {
  marketingLabelsForStation as osloLabelsForStation,
  marketingLabel as osloMarketingLabel,
  foldKey as osloFoldKey,
  loadLineMap as loadOsloLineMap,
} from "../lib/cities/oslo/marketing-directions.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

let failures = 0;
function fail(message) {
  console.error(`  FAIL ${message}`);
  failures++;
}

// --------------------------------------------------------------------------------------------
// London (uk-london-tfl) — independent reachability check against published-network.json,
// re-derived from the raw segments/termini data rather than by trusting
// terminiReachableFromStation's own output.
// --------------------------------------------------------------------------------------------

function fold(value) {
  return String(value || "").trim().toLowerCase();
}

function londonChipReachable(chip, station, publishedNetwork) {
  for (const line of publishedNetwork.lines ?? []) {
    const lineName = String(line.name || "").trim();
    if (!lineName) {
      continue;
    }
    if (line.loop) {
      // Loop chips are the bare line name — no terminus to check for branch reachability.
      if (chip === lineName) {
        return true;
      }
      continue;
    }
    if (chip !== lineName && !chip.startsWith(`${lineName} `)) {
      continue;
    }
    const terminus = chip === lineName ? "" : chip.slice(lineName.length + 1);
    if (!terminus) {
      continue;
    }
    if (Array.isArray(line.segments) && line.segments.length > 0) {
      for (const segment of line.segments) {
        const stationNames = (segment.stations ?? []).map(fold);
        const terminiNames = (segment.termini ?? []).map(fold);
        if (stationNames.includes(fold(station)) && terminiNames.includes(fold(terminus))) {
          return true;
        }
        const extra = segment.extraTerminus;
        if (extra && extra.name) {
          const extraStationNames = (extra.stations ?? []).map(fold);
          if (extraStationNames.includes(fold(station)) && fold(extra.name) === fold(terminus)) {
            return true;
          }
        }
      }
      // A line with segments defined must satisfy reachability through a segment — no fallback
      // to the flat `termini` list, otherwise this whole check is a no-op for that line.
      continue;
    }
    // No segment data for this line: fall back to the flat line-family termini list (the
    // pre-FB-61 model, still correct for every London line except DLR — see the brief for why
    // only DLR needed real branch data added).
    if ((line.termini ?? []).some((t) => fold(t) === fold(terminus))) {
      return true;
    }
  }
  return false;
}

function checkLondon() {
  console.log("\n=== uk-london-tfl ===");
  const publishedNetwork = loadJson("qa/fixtures/uk-london-tfl/published-network.json");
  const stopsPack = loadJson("lib/cities/uk-london-tfl/stops.json");

  let checked = 0;
  for (const stop of stopsPack.stops ?? []) {
    const station = stop.name;
    const chips = londonLabelsForStation(station);
    for (const chip of chips) {
      checked++;
      if (!londonChipReachable(chip, station, publishedNetwork)) {
        fail(`uk-london-tfl: "${station}" offers "${chip}" but no segment/termini in published-network.json reaches it from there`);
      }
    }
  }
  console.log(`  checked ${checked} offered chips across ${stopsPack.stops?.length ?? 0} catalog stations`);

  // Acceptance criterion 1: Abbey Road no longer offers DLR Bank / DLR Lewisham, and does offer
  // its three genuinely reachable termini.
  const abbeyRoad = londonLabelsForStation("Abbey Road").filter((c) => c.startsWith("DLR "));
  const expectedAbbeyRoad = ["DLR Beckton", "DLR Stratford International", "DLR Woolwich Arsenal"];
  if (JSON.stringify([...abbeyRoad].sort()) !== JSON.stringify([...expectedAbbeyRoad].sort())) {
    fail(`Abbey Road DLR chips must be exactly ${JSON.stringify(expectedAbbeyRoad)}, got ${JSON.stringify(abbeyRoad)}`);
  } else {
    console.log(`  OK   Abbey Road DLR chips: ${JSON.stringify(abbeyRoad)}`);
  }
  if (abbeyRoad.includes("DLR Bank") || abbeyRoad.includes("DLR Lewisham")) {
    fail("Abbey Road must not offer DLR Bank or DLR Lewisham (FB-61 confirmed defect)");
  }

  return { normalizeLineKey };
}

// --------------------------------------------------------------------------------------------
// Stockholm — independent reachability check against line-map.json's per-line `stations` array.
// --------------------------------------------------------------------------------------------

function stockholmChipReachable(chip, station, lineMap) {
  const stationKey = stockholmFoldKey(station);
  for (const line of lineMap.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => stockholmFoldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    for (const terminus of STOCKHOLM_MARKETING_ENDS[line.number] ?? line.termini ?? []) {
      const label = stockholmMarketingLabel(line.number, terminus);
      if (label.toLowerCase() === chip.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

function checkStockholm() {
  console.log("\n=== stockholm ===");
  const lineMap = loadStockholmLineMap();
  const stations = loadJson("lib/cities/stockholm/stations.json");

  let checked = 0;
  for (const row of stations.stations ?? []) {
    const station = row.name;
    const chips = stockholmLabelsForStation(station, lineMap);
    for (const chip of chips) {
      checked++;
      if (!stockholmChipReachable(chip, station, lineMap)) {
        fail(`stockholm: "${station}" offers "${chip}" but no line's stations/termini reaches it from there`);
      }
    }
  }
  console.log(`  checked ${checked} offered chips across ${stations.stations?.length ?? 0} catalog stations`);

  // FB-61's named Stockholm example, checked directly: Abrahamsberg's real chips. Live SL
  // Transport API cross-check during this brief (10 Sep 2026, transport.integration.sl.se,
  // site 9110) showed a genuinely scheduled "18 -> Farsta strand" departure from Abrahamsberg —
  // the brief's claimed defect does not reproduce against real topology or a live board, so this
  // asserts the current (unchanged) chip set stays intact rather than trimming it.
  const abrahamsberg = stockholmLabelsForStation("Abrahamsberg", lineMap);
  if (!abrahamsberg.includes("Gröna linjen + Farsta strand")) {
    fail('stockholm: "Abrahamsberg" must still offer "Gröna linjen + Farsta strand" — live SL data confirms this is a real, reachable service (see PR notes); do not re-introduce the over-trim regression');
  } else {
    console.log('  OK   Abrahamsberg still offers "Gröna linjen + Farsta strand" (confirmed real, not trimmed)');
  }
}

// --------------------------------------------------------------------------------------------
// Oslo — independent reachability check against line-map.json's per-line `stations` array.
// --------------------------------------------------------------------------------------------

function osloChipReachable(chip, station, lineMap) {
  const stationKey = osloFoldKey(station);
  for (const line of lineMap.lines ?? []) {
    const onLine = (line.stations ?? []).some((name) => osloFoldKey(name) === stationKey);
    if (!onLine) {
      continue;
    }
    for (const terminus of line.termini ?? []) {
      const label = osloMarketingLabel(line.number, terminus);
      if (label.toLowerCase() === chip.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

function checkOslo() {
  console.log("\n=== oslo ===");
  const lineMap = loadOsloLineMap();
  const stations = loadJson("lib/cities/oslo/stations.json");

  let checked = 0;
  for (const row of stations.stations ?? []) {
    const station = row.name;
    const chips = osloLabelsForStation(station, lineMap);
    for (const chip of chips) {
      checked++;
      if (!osloChipReachable(chip, station, lineMap)) {
        fail(`oslo: "${station}" offers "${chip}" but no line's stations/termini reaches it from there`);
      }
    }
  }
  console.log(`  checked ${checked} offered chips across ${stations.stations?.length ?? 0} catalog stations`);

  // FB-61's named Oslo example, checked directly: Ammerud's real chips. Live Entur JourneyPlanner
  // v3 cross-check during this brief (10 Sep 2026, api.entur.io, NSR:StopPlace:59518) showed
  // genuinely scheduled "4 -> Bergkrystallen via Storo" and "4 -> Vestli" departures from
  // Ammerud, and docs/oslo-d1/oracle-clash-report.md's locked D1 route description ("4 Vestli -
  // Bergkrystallen ... Grorudbanen via Løren to Sinsen") independently agrees line 4 serves the
  // Grorudbanen (Ammerud's branch). The brief's claimed defect does not reproduce — this asserts
  // the current (unchanged) chip set stays intact rather than trimming it.
  const ammerud = osloLabelsForStation("Ammerud", lineMap);
  if (!ammerud.includes("4 + Bergkrystallen")) {
    fail('oslo: "Ammerud" must still offer "4 + Bergkrystallen" — live Entur data and the locked D1 oracle report confirm this is a real, reachable service; do not re-introduce the over-trim regression');
  } else {
    console.log('  OK   Ammerud still offers "4 + Bergkrystallen" (confirmed real, not trimmed)');
  }
}

// --------------------------------------------------------------------------------------------
// Prove-by-construction: the checker itself must catch an unreachable chip. Constructed data,
// no real catalog/topology involved — this is a unit test of the reachability mechanism, not a
// re-run of the real-data checks above.
// --------------------------------------------------------------------------------------------

function checkProofByConstruction() {
  console.log("\n=== proof by construction (synthetic data) ===");

  // A two-branch synthetic line, same shape as DLR's real segments: "Central" is on branch A
  // only (A <-> Hub), "Central" is NOT on branch B (Hub <-> Far). The old (pre-FB-61) model
  // would offer every line-family terminus regardless of branch — i.e. it would also offer
  // "Test Far" at "Central", which is unreachable. The fixed model (terminiReachableFromStation)
  // must exclude it.
  const syntheticLine = {
    name: "Test",
    termini: ["A", "Far"], // the old flat/full-family list — deliberately includes the unreachable one
    segments: [
      { termini: ["A", "Hub"], stations: ["A", "Central", "Hub"] },
      { termini: ["Hub", "Far"], stations: ["Hub", "Mid", "Far"] },
    ],
  };

  const reachableFromCentral = terminiReachableFromStation(syntheticLine, "Central");
  if (reachableFromCentral.includes("Far")) {
    fail('synthetic: terminiReachableFromStation("Central") must not include "Far" (different branch) — the mechanism failed to trim an unreachable terminus');
  } else if (!reachableFromCentral.includes("Hub")) {
    fail('synthetic: terminiReachableFromStation("Central") must include "Hub" (same branch) — over-trimmed a genuinely reachable terminus');
  } else {
    console.log(`  OK   synthetic branch-only station "Central" -> ${JSON.stringify(reachableFromCentral)} (excludes cross-branch "Far", the reverse-Sydney over-trim risk)`);
  }

  // Now prove the independent gate-level checker (not the product function) also catches it:
  // simulate the OLD, unfixed behaviour offering "Test Far" at "Central" and show
  // londonChipReachable correctly reports it as unreachable.
  const publishedNetworkStub = { lines: [syntheticLine] };
  const wouldBeOffered = "Test Far";
  if (londonChipReachable(wouldBeOffered, "Central", publishedNetworkStub)) {
    fail(`synthetic: londonChipReachable must reject "${wouldBeOffered}" at "Central" (constructed unreachable chip) — the gate failed to catch it by construction`);
  } else {
    console.log(`  OK   gate correctly rejects constructed unreachable chip "${wouldBeOffered}" at "Central"`);
  }

  // And the reverse — a genuinely reachable chip on the same branch must not be rejected.
  const genuinelyReachable = "Test Hub";
  if (!londonChipReachable(genuinelyReachable, "Central", publishedNetworkStub)) {
    fail(`synthetic: londonChipReachable must accept "${genuinelyReachable}" at "Central" (same branch) — false negative would be an over-trim`);
  } else {
    console.log(`  OK   gate correctly accepts genuinely reachable chip "${genuinelyReachable}" at "Central"`);
  }
}

checkLondon();
checkStockholm();
checkOslo();
checkProofByConstruction();

if (failures > 0) {
  console.error(`\nbranch-reachable-chips-gate: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nbranch-reachable-chips-gate: ok");
