/**
 * Share URL XSS hardening — hostile station param must not persist or execute.
 * Usage: node qa/security-xss-share.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
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

  await page.goto(
    `${BASE}/?reset=1&test=1&fixture=normal&station=${encodeURIComponent(ATTACK_STATION)}&direction=Perth`
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
