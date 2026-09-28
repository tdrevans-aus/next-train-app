/**
 * Native (Capacitor) country-wide station picker.
 *
 * loadCountryStations used to fetch a relative `/api/country-stations` URL.
 * On the web that hits the page origin. In the Capacitor webview it never
 * reaches Vercel, the failure was swallowed, and Region = All painted the
 * active region's catalog (Adelaide, the first open Australian region).
 *
 * This stubs a native shell after the page has booted as web (so the rest of
 * the app still talks to the local dev server) and checks:
 * - the country-stations request goes to the production origin
 * - the same export the Near me region hint uses (loadCountryStations) does too
 * - Region = All renders stations from every city in the response
 * - a failed load while All is selected shows "Couldn't load all stations"
 *   instead of one region's stations
 * - a failed load while a specific region is selected still shows that region
 * - the web build keeps a same-origin request
 *
 * Usage: node qa/native-country-stations.mjs
 */
import { chromium } from "playwright";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";
import { openJourneySetup } from "./helpers/travel-library.mjs";

const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
const LOAD_ERROR = "Couldn't load all stations";

const AU_FIXTURE = {
  country: "au",
  regions: [
    { id: "adelaide", displayName: "Adelaide" },
    { id: "sydney", displayName: "Sydney" },
    { id: "melbourne", displayName: "Melbourne" },
  ],
  stations: [
    {
      name: "ZzAdelaide Central",
      lat: -34.92,
      lng: 138.6,
      liveFeed: true,
      region: { id: "adelaide", displayName: "Adelaide" },
    },
    {
      name: "ZzSydney Central",
      lat: -33.86,
      lng: 151.21,
      liveFeed: true,
      region: { id: "sydney", displayName: "Sydney" },
    },
    {
      name: "ZzMelbourne Central",
      lat: -37.81,
      lng: 144.96,
      liveFeed: true,
      region: { id: "melbourne", displayName: "Melbourne" },
    },
  ],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countryStationsRequests(urls) {
  return urls.filter((url) => url.includes("/api/country-stations"));
}

async function bootPage(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const urls = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/country-stations")) {
      urls.push(url);
    }
  });
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForFunction(
    () =>
      Boolean(window.nextTrainStationCombobox?.loadCountryStations) &&
      Boolean(window.NextTrainCitySession?.applyCity) &&
      Boolean(window.nextTrainApp?.openJourneysLibrary),
    null,
    { timeout: 60000 }
  );
  return { context, page, urls };
}

/**
 * Adelaide has no bundled catalog, so mount it while the page still uses the
 * dev server. Stubbing native first would send that catalog fetch to Vercel.
 * Other production-origin calls (a board refresh after the stub) are handed
 * back to the dev server; country-stations is answered by `handler`.
 */
async function installApiRoutes(page, handler) {
  await page.route("**/api/country-stations**", handler);
  await page.route(`${VERCEL_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/country-stations") {
      await handler(route);
      return;
    }
    await route.continue({ url: `${BASE}${url.pathname}${url.search}` });
  });
}

function fulfillCountryStations(route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(AU_FIXTURE),
  });
}

async function stubNativeShell(page) {
  await page.evaluate(() => {
    window.Capacitor.isNativePlatform = () => true;
    window.Capacitor.getPlatform = () => "android";
    window.nextTrainStationCombobox.invalidateCountryStationsCache();
  });
}

async function selectRegionAll(page) {
  await page.evaluate(async () => {
    await window.NextTrainCitySession.applyCity("adelaide", { persist: true, explicit: true });
    const select = document.querySelector("[data-region-city]");
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function selectRegionAdelaide(page) {
  await page.evaluate(async () => {
    await window.NextTrainCitySession.applyCity("adelaide", { persist: true, explicit: true });
  });
}

async function openStationSearch(page) {
  await openJourneySetup(page);
  await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
  await page.locator("#detail-station-combobox .station-combobox-input").click();
  await page.locator("#detail-station-combobox .station-combobox-search-input").waitFor({
    state: "visible",
    timeout: 15000,
  });
}

async function readPicker(page) {
  return page.evaluate(() => {
    const options = [...document.querySelectorAll("#detail-station-listbox .station-combobox-option")].map(
      (el) => ({
        value: el.dataset.value || "",
        region: el.dataset.region || "",
        text: el.textContent.trim(),
      })
    );
    const error = document.querySelector("#detail-station-listbox [data-country-load-error]");
    return {
      options,
      error: error?.textContent?.trim() || "",
      filter: window.NextTrainCitySession.readRegionFilter(),
    };
  });
}

async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  try {
    spawned = await ensureDevServer();

    // 1. Web: country-stations stays on the page origin, and All lists every
    // city in the response — not the active region alone.
    {
      const { context, page, urls } = await bootPage(browser);
      await installApiRoutes(page, fulfillCountryStations);
      await selectRegionAll(page);
      await openStationSearch(page);
      await page.locator("#detail-station-combobox .station-combobox-search-input").fill("Zz");
      await page.waitForFunction(
        () => document.querySelectorAll("#detail-station-listbox .station-combobox-option").length >= 3,
        null,
        { timeout: 15000 }
      );
      const picker = await readPicker(page);
      const values = picker.options.map((option) => option.value);
      const pageOrigin = new URL(page.url()).origin;
      const hits = countryStationsRequests(urls);
      assert(picker.filter === "", `web Region filter should be All, got ${JSON.stringify(picker.filter)}`);
      assert(
        values.includes("ZzSydney Central") &&
          values.includes("ZzMelbourne Central") &&
          values.includes("ZzAdelaide Central"),
        `web All should list every fixture city, got ${JSON.stringify(values)}`
      );
      assert(hits.length > 0, "web picker never requested /api/country-stations");
      assert(
        hits.every((url) => new URL(url).origin === pageOrigin),
        `web country-stations must stay on the page origin, got ${JSON.stringify(hits)}`
      );
      assert(
        hits.every((url) => !url.startsWith(VERCEL_ORIGIN)),
        `web country-stations must not use the production origin, got ${JSON.stringify(hits)}`
      );
      console.log("PASS web All lists every city via the page origin", hits[0]);
      await context.close();
    }

    // 2. Native: the picker and the shared loadCountryStations export (Near me
    // region hint) both request the production origin, and All lists every city.
    {
      const { context, page, urls } = await bootPage(browser);
      await installApiRoutes(page, fulfillCountryStations);
      // Mount Adelaide on the dev server first, then flip the shell and drop
      // any country list cached before the flip so the picker has to refetch.
      await selectRegionAll(page);
      await stubNativeShell(page);
      const before = urls.length;
      await openStationSearch(page);
      await page.locator("#detail-station-combobox .station-combobox-search-input").fill("Zz");
      await page.waitForFunction(
        () => document.querySelectorAll("#detail-station-listbox .station-combobox-option").length >= 3,
        null,
        { timeout: 15000 }
      );
      const hint = await page.evaluate(() => window.nextTrainStationCombobox.loadCountryStations("gb-eng"));
      const picker = await readPicker(page);
      const values = picker.options.map((option) => option.value);
      const hits = countryStationsRequests(urls.slice(before));
      assert(picker.filter === "", `native Region filter should be All, got ${JSON.stringify(picker.filter)}`);
      assert(
        values.includes("ZzSydney Central") &&
          values.includes("ZzMelbourne Central") &&
          values.includes("ZzAdelaide Central"),
        `native All should list every fixture city, got ${JSON.stringify(values)}`
      );
      assert(
        hits.some((url) => url.startsWith(`${VERCEL_ORIGIN}/api/country-stations?country=au`)),
        `native picker should fetch ${VERCEL_ORIGIN}/api/country-stations?country=au, got ${JSON.stringify(hits)}`
      );
      assert(
        hits.some((url) => url.startsWith(`${VERCEL_ORIGIN}/api/country-stations?country=gb-eng`)),
        `native loadCountryStations should fetch the production origin, got ${JSON.stringify(hits)}`
      );
      assert(hint && Array.isArray(hint.stations), "loadCountryStations should resolve the native response");
      console.log(
        "PASS native All lists every city via the production origin",
        hits.filter((url) => url.startsWith(VERCEL_ORIGIN)).join(" ")
      );
      await context.close();
    }

    // 3. Native + All + failed load: a clear message, not one region's stations.
    {
      const { context, page } = await bootPage(browser);
      await installApiRoutes(page, (route) => route.abort("failed"));
      await selectRegionAll(page);
      await stubNativeShell(page);
      await openStationSearch(page);
      await page.waitForSelector("#detail-station-listbox [data-country-load-error]", { timeout: 15000 });
      await page.locator("#detail-station-combobox .station-combobox-search-input").fill("Sydney");
      const picker = await readPicker(page);
      assert(picker.error === LOAD_ERROR, `expected load error, got ${JSON.stringify(picker)}`);
      assert(
        picker.options.length === 0,
        `All must not fall back to one region when the country list fails, got ${JSON.stringify(picker.options)}`
      );
      console.log("PASS native All shows the load error instead of one region");
      await context.close();
    }

    // 4. Native + a chosen region + failed load: that region's own list remains.
    {
      const { context, page } = await bootPage(browser);
      await installApiRoutes(page, (route) => route.abort("failed"));
      await selectRegionAdelaide(page);
      await stubNativeShell(page);
      await openStationSearch(page);
      await page.waitForFunction(
        () => document.querySelectorAll("#detail-station-listbox .station-combobox-option").length > 0,
        null,
        { timeout: 15000 }
      );
      const picker = await readPicker(page);
      assert(picker.filter === "adelaide", `expected Adelaide filter, got ${JSON.stringify(picker.filter)}`);
      assert(!picker.error, `a chosen region should not show the All load error, got ${JSON.stringify(picker.error)}`);
      assert(picker.options.length > 0, "Adelaide's own station list should still render");
      console.log("PASS native region filter still shows that region when the country list fails", picker.options.length);
      await context.close();
    }
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
