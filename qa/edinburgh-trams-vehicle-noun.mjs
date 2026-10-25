/**
 * docs/jim-brief-edinburgh-trams-flip.md item 5 (Mark's caveat 2): the honest empty-state noun
 * ("<Noun> are running but the operator's live feed has no times for this stop...") follows the
 * FOCUSED STATION's mode in a mixed-mode region, not the city's modes. Edinburgh's registry modes are
 * ["train", "metro"], so the old city-level lookup said "trains" for a tram stop in a feed gap.
 *
 * Calls window.nextTrainNearby.nearbyModeVehicleNoun with a stubbed manifest/mode catalog, so no
 * network and no geolocation. Usage: node qa/edinburgh-trams-vehicle-noun.mjs (dev server at BASE).
 */
import { chromium } from "playwright";
import { BASE } from "./helpers/dev-server.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => typeof window.nextTrainNearby?.nearbyModeVehicleNoun === "function");

  const nouns = await page.evaluate(() => {
    const priorManifest = window.CityManifest;
    const priorDogfood = window.NextTrainBrisbaneDogfood;
    const modesByCity = {
      edinburgh: ["train", "metro"],
      dublin: ["tram"],
      perth: ["train"],
      glasgow: ["train", "metro"],
    };
    window.CityManifest = { get: (id) => (modesByCity[id] ? { modes: modesByCity[id] } : null) };
    window.NextTrainBrisbaneDogfood = {
      getStationModesByName: () => ({
        Newhaven: ["metro"],
        "Edinburgh Park Central": ["metro"],
        "Edinburgh Waverley": ["train"],
        Haymarket: ["train"],
        "Edinburgh Park": ["train"],
        "Mixed Name": ["train", "metro"],
      }),
    };
    const noun = window.nextTrainNearby.nearbyModeVehicleNoun;
    const out = {
      tramStop: noun("edinburgh", "Newhaven"),
      tramStopCentral: noun("edinburgh", "Edinburgh Park Central"),
      railStation: noun("edinburgh", "Edinburgh Waverley"),
      sharedNameRail: noun("edinburgh", "Haymarket"),
      railEdinburghPark: noun("edinburgh", "Edinburgh Park"),
      ambiguousName: noun("edinburgh", "Mixed Name"),
      noStation: noun("edinburgh", undefined),
      unknownStation: noun("edinburgh", "Nowhere"),
      dublinTram: noun("dublin", "Red Cow"),
      perthRail: noun("perth", "Perth"),
      glasgowSubwayUnchanged: noun("glasgow", "Kelvinhall"),
    };
    window.CityManifest = priorManifest;
    window.NextTrainBrisbaneDogfood = priorDogfood;
    return out;
  });

  assert(nouns.tramStop === "trams", `Edinburgh tram stop (Newhaven) must read "trams", got ${nouns.tramStop}`);
  assert(nouns.tramStopCentral === "trams", `Edinburgh Park Central must read "trams", got ${nouns.tramStopCentral}`);
  assert(nouns.railStation === "trains", `Edinburgh Waverley (rail) must keep "trains", got ${nouns.railStation}`);
  assert(nouns.sharedNameRail === "trains", `Haymarket (rail, tram withheld) must keep "trains", got ${nouns.sharedNameRail}`);
  assert(nouns.railEdinburghPark === "trains", `Edinburgh Park (rail) must keep "trains", got ${nouns.railEdinburghPark}`);
  assert(nouns.ambiguousName === "trains", `a name that is both rail and tram stays "trains" (conservative), got ${nouns.ambiguousName}`);
  assert(nouns.noStation === "trains" && nouns.unknownStation === "trains", "no or unknown station falls back to the city-level noun");
  assert(nouns.dublinTram === "trams", `Dublin (tram city) must keep "trams", got ${nouns.dublinTram}`);
  assert(nouns.perthRail === "trains", `Perth must keep "trains", got ${nouns.perthRail}`);
  assert(nouns.glasgowSubwayUnchanged === "trains", `Glasgow subway is not a tram system and must keep "trains", got ${nouns.glasgowSubwayUnchanged}`);

  console.log("edinburgh-trams-vehicle-noun: ok (tram stop -> trams, rail stations -> trains, tram cities unchanged)");
} finally {
  await browser.close();
}
