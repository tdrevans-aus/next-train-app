/**
 * docs/jim-brief-retired-city-saved-route-message.md — a rider whose saved city / saved journey
 * belongs to a RETIRED city (Uppsala) must get an honest "no longer covered" message with a
 * picker action, never a Perth board queried with an Uppsala station name; saved data survives.
 *
 * Usage: PORT=<free> QA_BASE=http://localhost:<free> node qa/retired-city-saved-route.mjs
 *        (set SHOT_DIR=<dir> to also write mobile screenshots)
 */
import { chromium } from "playwright";
import { ensureJourneyMode } from "./helpers/journey-smoke.mjs";
import { BASE, ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

let failed = false;
const pass = (id, n) => console.log(`  PASS — ${id}${n ? `: ${n}` : ""}`);
const fail = (id, n) => {
  failed = true;
  console.error(`  FAIL — ${id}${n ? `: ${n}` : ""}`);
};
const check = (ok, id, n) => (ok ? pass(id) : fail(id, n));

const STATION = "Uppsala C";

async function run() {
  const serverChild = await ensureDevServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const boardRequests = [];
    page.on("request", (req) => {
      const url = req.url();
      if (/\/api\/(next-train|board|directions|nearby)/.test(url)) boardRequests.push(url);
    });

    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.evaluate((station) => {
      const jm = window.nextTrainJourneyModel;
      jm.persistSettings({
        settingsSchemaVersion: 2,
        refreshSeconds: 30,
        activeJourneyId: "upp-1",
        savedCity: "uppsala",
        savedCountry: "se",
        regionExplicit: true,
        journeys: [
          { ...jm.upgradeRouteToJourney({ id: "upp-1", name: "To Stockholm", station, direction: "Stockholm" }), id: "upp-1", cityId: "uppsala" },
        ],
      });
      localStorage.setItem("nextTrainOnboardingDone", "1");
    }, STATION);
    boardRequests.length = 0;
    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureJourneyMode(page);
    await page.waitForTimeout(2500);

    const notice = page.locator("#hero-empty-state[data-retired-city]");
    const visible = await notice.isVisible().catch(() => false);
    const text = visible ? (await notice.innerText()).replace(/\s+/g, " ") : "";
    check(
      visible && /Uppsala is no longer covered/i.test(text),
      "message shows for retired saved city",
      `visible=${visible} text=${text}`
    );

    const anyUpp = boardRequests.filter((u) => /Uppsala/i.test(decodeURIComponent(u)));
    check(anyUpp.length === 0, "no board request carries the retired station", anyUpp.join(" | "));

    if (process.env.SHOT_DIR) {
      await page.screenshot({ path: `${process.env.SHOT_DIR}/retired-city-message.png` });
    }

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("nextTrainSettings") || "{}"));
    const kept = (stored.journeys || []).some(
      (j) => j.id === "upp-1" && j.station === "Uppsala C" && j.cityId === "uppsala"
    );
    check(kept, "saved journey still stored", JSON.stringify(stored.journeys));

    const action = page.locator("#hero-empty-add-btn");
    check(await action.isVisible().catch(() => false), "picker action visible");
    await action.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    const pickerOpen = await page.evaluate(() => {
      const el = document.getElementById("region-setup");
      return Boolean(el) && !el.hidden;
    });
    check(pickerOpen, "picker action opens the city picker");
    if (process.env.SHOT_DIR) {
      await page.screenshot({ path: `${process.env.SHOT_DIR}/retired-city-picker.png` });
    }

    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("nextTrainSettings") || "{}"));
    check(
      (after.journeys || []).some((j) => j.id === "upp-1" && j.cityId === "uppsala"),
      "saved journey survives opening the picker"
    );

    // Saved city only (no journey).
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await ctx2.newPage();
    await p2.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(1500);
    await p2.evaluate(() => {
      localStorage.setItem("nextTrainOnboardingDone", "1");
      const raw = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
      raw.savedCity = "uppsala";
      raw.savedCountry = "se";
      raw.regionExplicit = true;
      localStorage.setItem("nextTrainSettings", JSON.stringify(raw));
    });
    await p2.reload({ waitUntil: "domcontentloaded" });
    await p2.waitForTimeout(4000);
    if (process.env.SHOT_DIR) await p2.screenshot({ path: `${process.env.SHOT_DIR}/retired-city-saved-city-only.png` });
    check(
      await p2.locator("#retired-city-banner").isVisible().catch(() => false),
      "message shows for retired saved city with no journey"
    );
    const bannerText = await p2.locator("#retired-city-banner").innerText().catch(() => "");
    check(/Uppsala is no longer covered/i.test(bannerText), "saved-city banner names the city", bannerText);
    const raw2 = await p2.evaluate(() => JSON.parse(localStorage.getItem("nextTrainSettings") || "{}"));
    check(raw2.savedCity === "uppsala", "saved city preserved", String(raw2.savedCity));

    // Control: a fresh install never shows it.
    const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p3 = await ctx3.newPage();
    await p3.goto(`${BASE}/?reset=1&test=1&fixture=normal`, { waitUntil: "domcontentloaded" });
    await p3.waitForTimeout(4000);
    check(
      !(await p3.locator("#retired-city-banner").isVisible().catch(() => false)),
      "no message for a live/default city"
    );
  } finally {
    await browser.close();
    await stopDevServer(serverChild);
  }
  if (failed) process.exit(1);
  console.log("retired-city-saved-route: all checks passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
