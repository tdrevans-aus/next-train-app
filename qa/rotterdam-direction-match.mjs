import { tripMatchesMarketingChip } from "../lib/cities/rotterdam/marketing-directions.js";

const chip = "Metro A + Binnenhof";
const alreadyMapped = { destination: chip, routeShortName: "A" };
const headsign = { destination: "Binnenhof", routeShortName: "A" };
const strandChip = "Metro B + Hoek van Holland Strand";
const strandHeadsign = { destination: "Hoek v Holland Strand", routeShortName: "B" };

if (!tripMatchesMarketingChip(alreadyMapped, chip)) {
  console.error("rotterdam-direction-match: remapped chip must still match");
  process.exit(1);
}
if (!tripMatchesMarketingChip(headsign, chip)) {
  console.error("rotterdam-direction-match: GTFS headsign must match chip");
  process.exit(1);
}
if (!tripMatchesMarketingChip(strandHeadsign, strandChip)) {
  console.error("rotterdam-direction-match: Hoek v Holland Strand must match Strand chip");
  process.exit(1);
}
if (tripMatchesMarketingChip({ destination: "Nesselande", routeShortName: "A" }, chip)) {
  console.error("rotterdam-direction-match: A to Nesselande must not match Binnenhof");
  process.exit(1);
}
console.log("rotterdam-direction-match: ok");
