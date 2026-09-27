/**
 * Registry-driven client (docs/jim-brief-registry-driven-client.md).
 *
 * Proves the four scenarios the brief names:
 *  (a) stubbing /api/cities (dev-server-only ?fixture=testville, TESTING.md) with an extra
 *      fake live city makes it appear in window.CityManifest with zero client code change.
 *  (b) after a first successful load, blocking the network and reloading still shows the
 *      cached cities (localStorage nextTrainCityManifest survives an offline reload).
 *  (c) clearing storage AND blocking the network still shows the bundled seed's cities
 *      (public/city-manifest.seed.json).
 *  (d) a saved journey for a city id absent from the (stubbed) manifest still keeps its
 *      cityId — normalizeJourney() never drops it just because a hardcoded/derived list
 *      doesn't currently recognise it.
 *
 * Usage: node qa/registry-driven-client.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

let failed = false;

function pass(id, notes) {
  console.log(`  PASS — ${id}${notes ? `: ${notes}` : ""}`);
}

function fail(id, notes) {
  failed = true;
  console.error(`  FAIL — ${id}${notes ? `: ${notes}` : ""}`);
}

async function run() {
  console.log("registry-driven-client: starting Playwright suite...");
  const serverChild = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });

  try {
    // (a) Fixture stub: a fake extra live city appears with no client code change.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/?test=1&fixture=testville`);
      const result = await page.evaluate(async () => {
        await window.CityManifest.ready();
        return {
          isLive: window.CityManifest.isLiveCity("testville"),
          inCountries: window.CityManifest
            .countries()
            .some((country) => country.regions.some((region) => region.id === "testville")),
          bounds: window.CityManifest.boundsFor("testville"),
        };
      });
      if (result.isLive && result.inCountries && result.bounds) {
        pass("(a) fixture stub: testville appears in the manifest/picker with zero code change");
      } else {
        fail("(a) fixture stub: testville", JSON.stringify(result));
      }
      await context.close();
    }

    // (b) After a first successful load, block the network and reload — cached cities stay.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${BASE}/?test=1&fixture=normal`);
      await page.evaluate(async () => {
        await window.CityManifest.ready();
      });
      const cachedAfterFirstLoad = await page.evaluate(() => localStorage.getItem("nextTrainCityManifest"));
      if (!cachedAfterFirstLoad) {
        fail("(b) manifest cached after first load", "no nextTrainCityManifest key in localStorage");
      } else {
        pass("(b) manifest cached in localStorage after first load");
      }

      await context.route("**/api/cities*", (route) => route.abort());
      await page.reload();
      const afterOffline = await page.evaluate(async () => {
        await window.CityManifest.ready();
        return { isLive: window.CityManifest.isLiveCity("sydney"), source: window.CityManifest._source() };
      });
      if (afterOffline.isLive && afterOffline.source === "cache") {
        pass("(b) cached manifest survives an offline reload", `source=${afterOffline.source}`);
      } else {
        fail("(b) cached manifest survives an offline reload", JSON.stringify(afterOffline));
      }
      await context.close();
    }

    // (c) Clear storage AND block the network — the bundled seed's cities still appear.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await context.route("**/api/cities*", (route) => route.abort());
      await page.goto(`${BASE}/?test=1&fixture=normal`);
      const result = await page.evaluate(async () => {
        await window.CityManifest.ready();
        return { isLive: window.CityManifest.isLiveCity("sydney"), source: window.CityManifest._source() };
      });
      if (result.isLive && result.source === "seed") {
        pass("(c) bundled seed's cities appear with no cache and no network", `source=${result.source}`);
      } else {
        fail("(c) bundled seed fallback", JSON.stringify(result));
      }
      await context.close();
    }

    // (d) A saved journey for a city id absent from the (stubbed) manifest still keeps its
    // cityId — never dropped just because a list doesn't currently recognise it.
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      // testville fixture only adds "testville" — "some-retired-city" is genuinely absent
      // from this manifest, the way a since-retired city would be.
      await page.goto(`${BASE}/?test=1&fixture=testville`);
      const result = await page.evaluate(async () => {
        await window.CityManifest.ready();
        const isLive = window.CityManifest.isLiveCity("some-retired-city");
        const journey = window.nextTrainJourneyModel.normalizeJourney({
          id: "j-retired",
          name: "Old commute",
          cityId: "some-retired-city",
          station: "Some Station",
          direction: "Some Direction",
        });
        return { isLive, cityId: journey.cityId };
      });
      if (result.isLive === false && result.cityId === "some-retired-city") {
        pass("(d) saved journey keeps a cityId absent from the manifest", `cityId=${result.cityId}`);
      } else {
        fail("(d) saved journey cityId preserved", JSON.stringify(result));
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await stopDevServer(serverChild);
  }

  if (failed) {
    console.error("registry-driven-client: FAIL");
    process.exit(1);
  }
  console.log(
    "registry-driven-client: ok (fixture city with zero code change; cache survives an offline reload; seed cities appear with no cache and no network; a saved journey for a manifest-absent city keeps its cityId)"
  );
}

run();
