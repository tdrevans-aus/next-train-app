/**
 * Stockholm chip matching: colour family / Pendeltåg number + terminus, line
 * identity baked into the mapped string, 43X folded to passenger 43, shorts
 * kept live and unfolded (D1 shortTurnGroups is deliberately empty), and the
 * three-central lock never collapsed.
 * Usage: node qa/stockholm-direction-match.mjs
 */
import {
  mapStockholmDestination,
  tripMatchesMarketingChip,
} from "../lib/cities/stockholm/marketing-directions.js";

function fail(message) {
  console.error(`stockholm-direction-match: ${message}`);
  process.exit(1);
}

// Adapter-remapped trips (destination already in chip form) must still match.
if (!tripMatchesMarketingChip({ destination: "Röda linjen + Norsborg", routeShortName: "13" }, "Röda linjen + Norsborg")) {
  fail("remapped chip must still match");
}
// Raw SL headsigns fold to family + terminus.
if (!tripMatchesMarketingChip({ destination: "Norsborg", routeShortName: "13" }, "Röda linjen + Norsborg")) {
  fail("raw Norsborg headsign on 13 must match the red chip");
}
if (!tripMatchesMarketingChip({ destination: "Norsborg T-bana", routeShortName: "13" }, "Röda linjen + Norsborg")) {
  fail("T-bana suffix must fold away");
}
if (!tripMatchesMarketingChip({ destination: "Hjulsta", routeShortName: "10" }, "Blå linjen + Hjulsta")) {
  fail("Hjulsta on 10 must match the blue chip");
}
// Terminus is part of the identity within a colour family (13 vs 14 share red).
if (tripMatchesMarketingChip({ destination: "Fruängen", routeShortName: "14" }, "Röda linjen + Norsborg")) {
  fail("14 to Fruängen must not match the Norsborg chip");
}
// Pendeltåg chips carry the passenger number — 41 is not the 40 chip.
if (!tripMatchesMarketingChip({ destination: "Södertälje centrum", routeShortName: "41" }, "Pendeltåg 41 + Södertälje centrum")) {
  fail("41 to Södertälje centrum must match its own chip");
}
if (tripMatchesMarketingChip({ destination: "Södertälje centrum", routeShortName: "41" }, "Pendeltåg 40 + Södertälje centrum")) {
  fail("41 to Södertälje centrum must not match the 40 chip");
}
// 43X skip-stop folds to passenger 43 (D1: nested, not a separate row).
if (!tripMatchesMarketingChip({ destination: "Kallhäll", routeShortName: "43X" }, "Pendeltåg 43 + Kallhäll")) {
  fail("43X must fold to the Pendeltåg 43 chip");
}
if (mapStockholmDestination("Kallhäll", "43X") !== "Pendeltåg 43 + Kallhäll") {
  fail("mapStockholmDestination must print 43X as Pendeltåg 43");
}
// Shorts stay live and unfolded: 18 to Alvik is Alvik, never Hässelby strand.
if (!tripMatchesMarketingChip({ destination: "Alvik", routeShortName: "18" }, "Gröna linjen + Alvik")) {
  fail("18 short to Alvik must match Gröna linjen + Alvik");
}
if (tripMatchesMarketingChip({ destination: "Alvik", routeShortName: "18" }, "Gröna linjen + Hässelby strand")) {
  fail("18 short to Alvik must not claim the Hässelby strand chip");
}
// Arlanda station-name variants fold to the map name.
if (mapStockholmDestination("Arlanda centralstation", "40") !== "Pendeltåg 40 + Arlanda central") {
  fail("Arlanda centralstation must fold to Arlanda central");
}
if (!tripMatchesMarketingChip({ destination: "Uppsala C", routeShortName: "40" }, "Pendeltåg 40 + Uppsala C")) {
  fail("40 to Uppsala C must match its chip");
}
// The three-central lock: never leak a bare Stockholm Central chip.
if (!/Stockholms central$/.test(mapStockholmDestination("Stockholm C", "40"))) {
  fail("Stockholm C headsign must normalise to Stockholms central, not a hub");
}
if (tripMatchesMarketingChip({ destination: "Stockholm C", routeShortName: "40" }, "Pendeltåg 40 + Stockholm City")) {
  fail("Stockholm C must not collapse into Stockholm City");
}
if (tripMatchesMarketingChip({ destination: "T-Centralen", routeShortName: "40" }, "Pendeltåg 40 + Stockholm City")) {
  fail("T-Centralen must not collapse into Stockholm City");
}

console.log("stockholm-direction-match: ok");
