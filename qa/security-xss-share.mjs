/**
 * Share URL XSS hardening — hostile station param must not persist or execute.
 * Usage: node qa/security-xss-share.mjs
 */
import { chromium } from "playwright";

import { BASE } from "./helpers/dev-server.mjs";
const ATTACK_STATION = "<img src=x onerror=alert(1)>";
const VALID_STATION = "Edgewater Stn";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let alertFired = false;
  page.on("dialog", async (dialog) => {
    alertFired = true;
    await dialog.dismiss();
  });

  // First, a plain reset+test load to start from clean storage — deliberately
  // WITHOUT the station param, so this doesn't itself go through the
  // fast-path branch being tested against below.
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(500);

  // The attack URL itself must NOT carry reset=1: D-05 (docs/dwayne-security-
  // review-play-3.0.0.md, fixed in #380) made `?reset=1` a dev/QA-only fast
  // path (applyTestQueryParams in public/app.js) that persists URL settings
  // synchronously, before the station catalog loads, and skips the later
  // catalog-validated readUrlSettings() re-check entirely
  // (urlSettingsAppliedDuringReset guards it off). A real rider's share URL
  // is never opened with reset=1 — it goes through readUrlSettings(), which
  // rejects any station not present in the loaded catalog. Exercise that
  // production-reachable path here rather than the reset=1 shortcut, which
  // this test used to hit before the D-05 fix landed.
  await page.goto(
    `${BASE}/?test=1&fixture=normal&station=${encodeURIComponent(ATTACK_STATION)}&direction=Perth`
  );
  await page.waitForTimeout(2000);

  const hostileResult = await page.evaluate((attackStation) => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journeys = settings.journeys ?? [];
    const hasAttackJourney = journeys.some((journey) => journey.station === attackStation);
    const attackImg = document.querySelector('img[src="x"]');
    return {
      journeyCount: journeys.length,
      hasAttackJourney,
      attackImgPresent: Boolean(attackImg),
    };
  }, ATTACK_STATION);

  if (alertFired) {
    console.error("FAIL — alert fired from hostile share URL");
    process.exitCode = 1;
  }

  if (hostileResult.hasAttackJourney || hostileResult.journeyCount > 0) {
    console.error("FAIL — hostile station persisted in settings", hostileResult);
    process.exitCode = 1;
  }

  if (hostileResult.attackImgPresent) {
    console.error("FAIL — attack img node present in DOM");
    process.exitCode = 1;
  }

  await page.goto(
    `${BASE}/?reset=1&test=1&fixture=normal&station=${encodeURIComponent(VALID_STATION)}&direction=Perth`
  );
  await page.waitForTimeout(2000);

  const validResult = await page.evaluate((validStation) => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journeys = settings.journeys ?? [];
    return {
      journeyCount: journeys.length,
      station: journeys[0]?.station ?? "",
      routeVisible: document.getElementById("route")?.textContent?.includes("Edgewater") ?? false,
    };
  }, VALID_STATION);

  if (validResult.journeyCount !== 1 || validResult.station !== VALID_STATION) {
    console.error("FAIL — valid share URL did not create journey", validResult);
    process.exitCode = 1;
  }

  if (process.exitCode) {
    await browser.close();
    return;
  }

  console.log("PASS — hostile share URL ignored; valid Edgewater share URL creates journey");
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
