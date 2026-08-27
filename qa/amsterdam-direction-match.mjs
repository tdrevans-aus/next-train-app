import { tripMatchesMarketingChip } from "../lib/cities/amsterdam/marketing-directions.js";

const chip = "M51 + Isolatorweg";
const alreadyMapped = { destination: chip, routeShortName: "51" };
const headsign = { destination: "Isolatorweg", routeShortName: "51" };

if (!tripMatchesMarketingChip(alreadyMapped, chip)) {
  console.error("amsterdam-direction-match: remapped chip must still match");
  process.exit(1);
}
if (!tripMatchesMarketingChip(headsign, chip)) {
  console.error("amsterdam-direction-match: GTFS headsign must match chip");
  process.exit(1);
}
console.log("amsterdam-direction-match: ok");
