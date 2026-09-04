/**
 * FB-50 follow-up: board rows / hero show " · to <printed terminus>" when the chosen
 * direction is a hub chip and the trip carries `printedDestination`; nothing changes
 * for trips without it. Uses the `hub` fixture (lib/fixtures.js).
 * Usage: node qa/hub-printed-destination-render.mjs   (dev server on :3000)
 */
import { chromium } from "playwright";
import { BASE, armJourneyLeaveCard } from "./helpers/journey-smoke.mjs";

async function readBoard(page, fixture) {
  await page.goto(`${BASE}/?reset=1&fixture=${fixture}&station=Edgewater%20Stn&direction=Perth`);
  await armJourneyLeaveCard(page, { minutesFromNowFallback: 18 });
  await page.waitForFunction(
    () => document.querySelectorAll("#upcoming-departures-list .upcoming-departures-meta").length > 0,
    null,
    { timeout: 30000 }
  );
  return page.evaluate(() => ({
    hero: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    metas: [...document.querySelectorAll("#upcoming-departures-list .upcoming-departures-meta")].map(
      (el) => el.textContent.trim()
    ),
  }));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  let failed = false;
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    const hub = await readBoard(page, "hub");
    const suffixRe = / · to (Stratford-upon-Avon|Whitlocks End|Dorridge)$/;
    const hubOk =
      hub.metas.length > 0 &&
      hub.metas.every((t) => /^Pl 1 · /.test(t) && suffixRe.test(t)) &&
      suffixRe.test(hub.hero);

    const normal = await readBoard(page, "normal");
    const normalOk =
      normal.metas.length > 0 &&
      normal.metas.every((t) => !t.includes(" · to ")) &&
      !normal.hero.includes(" · to ");

    if (hubOk && normalOk && pageErrors.length === 0) {
      console.log(
        `hub-printed-destination-render: ok (${hub.metas.length} hub rows carry printed terminus, hero "${hub.hero}", normal fixture unchanged)`
      );
    } else {
      failed = true;
      console.error("hub-printed-destination-render: FAIL", { hub, normal, pageErrors });
    }
  } finally {
    await browser.close();
  }
  if (failed) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("hub-printed-destination-render: crashed", error);
  process.exitCode = 1;
});
