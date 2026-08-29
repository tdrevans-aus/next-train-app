/**
 * Göteborg chip matching: line + legend far end, first-halt strings folded to
 * the legend, Centralstationen renamed to Drottningtorget, no cross-line match.
 * Usage: node qa/goteborg-direction-match.mjs
 */
import {
  mapGoteborgDestination,
  tripMatchesMarketingChip,
} from "../lib/cities/goteborg/marketing-directions.js";

function fail(message) {
  console.error(`goteborg-direction-match: ${message}`);
  process.exit(1);
}

// Adapter-remapped trips (destination already in chip form) must still match.
if (!tripMatchesMarketingChip({ destination: "1 + Tynnered", routeShortName: "1" }, "1 + Tynnered")) {
  fail("remapped chip must still match");
}
// Raw GTFS first-halt headsign folds to the map-legend far end.
if (!tripMatchesMarketingChip({ destination: "Opaltorget", routeShortName: "1" }, "1 + Tynnered")) {
  fail("first-halt Opaltorget must fold to legend Tynnered");
}
if (!tripMatchesMarketingChip({ destination: "Komettorget", routeShortName: "7" }, "7 + Bergsjön")) {
  fail("first-halt Komettorget must fold to legend Bergsjön");
}
// Line number is part of the identity: 7 to Tynnered is not the 1 chip.
if (tripMatchesMarketingChip({ destination: "Tynnered", routeShortName: "7" }, "1 + Tynnered")) {
  fail("7 to Tynnered must not match the 1 + Tynnered chip");
}
// Pendeltåg corridors are the Västtågen family.
if (!tripMatchesMarketingChip({ destination: "Kungsbacka", routeShortName: "Kungsbacka" }, "Västtågen + Kungsbacka")) {
  fail("Kungsbacka corridor must match Västtågen + Kungsbacka");
}
if (!tripMatchesMarketingChip({ destination: "Älvängen resecentrum", routeShortName: "Ale" }, "Västtågen + Ale")) {
  fail("Älvängen resecentrum first halt must fold to legend Ale");
}
if (tripMatchesMarketingChip({ destination: "Kungsbacka", routeShortName: "Kungsbacka" }, "Västtågen + Alingsås")) {
  fail("Kungsbacka must not match the Alingsås chip");
}
// Centralstationen was renamed Drottningtorget (15 Jun 2026); never the train hub.
if (mapGoteborgDestination("Centralstationen", "2") !== "2 + Drottningtorget") {
  fail("Centralstationen headsign must map to Drottningtorget");
}
if (tripMatchesMarketingChip({ destination: "Centralstationen", routeShortName: "2" }, "2 + Göteborg Central")) {
  fail("Centralstationen must not collapse into Göteborg Central");
}
if (!tripMatchesMarketingChip({ destination: "Centralstationen", routeShortName: "2" }, "2 + Drottningtorget")) {
  fail("Centralstationen must match the Drottningtorget chip");
}
// Legend fold table spot checks.
if (mapGoteborgDestination("Axel Dahlströms Torg", "2") !== "2 + Högsbotorp") {
  fail("Axel Dahlströms Torg must fold to Högsbotorp");
}
if (mapGoteborgDestination("Mölndals Innerstad", "12") !== "12 + Mölndal") {
  fail("Mölndals Innerstad must fold to Mölndal");
}

console.log("goteborg-direction-match: ok");
