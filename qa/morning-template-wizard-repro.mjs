/**
 * Repro: Morning template wizard opens on first setup tap (onboarding path).
 * Usage: node qa/morning-template-wizard-repro.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function runWizardPath({ geoDelayMs = 0, label }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.addInitScript((delay) => {
    const orig = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (success, error, options) => {
      setTimeout(() => {
        orig((pos) => success(pos), (err) => error?.(err), options);
      }, delay);
    };
  }, geoDelayMs);

  await page.goto(`${BASE}/?reset=1&fixture=normal`);
  // nearby geo + 4s onboarding delay
  await page.waitForTimeout(geoDelayMs + 6000);

  if (!(await page.locator("#onboarding-step-1").isVisible())) {
    await browser.close();
    return { label, error: "onboarding step 1 never appeared", geoDelayMs };
  }

  await page.locator("#onboarding-got-it-btn").click();
  await page.waitForTimeout(300);
  await page.locator("#onboarding-setup-btn").click();
  await page.waitForTimeout(600);

  const events = [];
  const t1 = Date.now();

  for (let ms = 250; ms <= geoDelayMs + 4000; ms += 250) {
    await page.waitForTimeout(250);
    const snap = await page.evaluate(() => ({
      detailOpen: !document.getElementById("settings-detail-view").hidden,
      coachOpen: !document.getElementById("template-route-coach").hidden,
      listHidden: document.getElementById("settings-list-view").hidden,
    }));
    events.push({ event: "poll", ms: Date.now() - t1, ...snap });
    if (snap.detailOpen && snap.coachOpen) {
      break;
    }
  }

  const afterFirst = await page.evaluate(() => ({
    detailOpen: !document.getElementById("settings-detail-view").hidden,
    coachOpen: !document.getElementById("template-route-coach").hidden,
    journeyName:
      JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.[0]?.name ?? null,
  }));

  const final = afterFirst;

  await browser.close();
  return {
    label,
    geoDelayMs,
    afterSetup: afterFirst,
    final,
    events,
  };
}

const results = [
  await runWizardPath({ geoDelayMs: 0, label: "instant geo" }),
  await runWizardPath({ geoDelayMs: 2000, label: "2s geo (template)" }),
  await runWizardPath({ geoDelayMs: 5000, label: "5s geo (template)" }),
];

for (const r of results) {
  console.log("\n===", r.label, "===");
  if (r.error) {
    console.log("ERROR:", r.error);
    continue;
  }
  console.log("after setup:", r.afterSetup);
  console.log("final:", r.final);
  const firstDetail = r.events.find((e) => e.detailOpen);
  console.log(
    "detail opened after ms:",
    firstDetail ? firstDetail.ms : "never",
    "(geo delay:",
    r.geoDelayMs,
    ")"
  );
}
