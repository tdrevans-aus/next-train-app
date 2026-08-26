/**
 * CAPACITOR-1B — getTemplateWizardHoursStep must stay defined for classic-script /
 * global callers after FB-25 extracted (and deferred) template-wizard.js.
 * Usage: node qa/template-wizard-hours-step-global.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForFunction(() => typeof getTemplateWizardHoursStep === "function");

  const beforeDeferred = await page.evaluate(() => ({
    hoursNoName: getTemplateWizardHoursStep({ useNameStep: false }),
    hoursWithName: getTemplateWizardHoursStep({ useNameStep: true }),
    maxNoName: getTemplateWizardMaxStep({ useNameStep: false }),
    timeNoName: getTemplateWizardTimeStep({ useNameStep: false }),
    reminderNoName: getTemplateWizardReminderStep({ useNameStep: false }),
    routeNoName: getTemplateWizardRouteStep({ useNameStep: false }),
    appHours: window.nextTrainApp?.getTemplateWizardHoursStep?.({ useNameStep: false }),
  }));

  if (beforeDeferred.hoursNoName !== 4 || beforeDeferred.hoursWithName !== 5) {
    throw new Error(`shim hours step got ${JSON.stringify(beforeDeferred)}`);
  }
  if (
    beforeDeferred.maxNoName !== 4 ||
    beforeDeferred.timeNoName !== 2 ||
    beforeDeferred.reminderNoName !== 3 ||
    beforeDeferred.routeNoName !== 1
  ) {
    throw new Error(`shim sibling steps got ${JSON.stringify(beforeDeferred)}`);
  }
  if (beforeDeferred.appHours !== 4) {
    throw new Error(`nextTrainApp hours shim got ${beforeDeferred.appHours}`);
  }

  await page.evaluate(async () => {
    await window.NextTrainDeferred?.load?.();
    await window.NextTrainDeferred?.whenReady?.();
  });
  await page.waitForFunction(
    () => typeof window.nextTrainTemplateWizard?.getTemplateWizardHoursStep === "function"
  );

  const afterLoad = await page.evaluate(() => {
    const mod = window.nextTrainTemplateWizard;
    const ctx = { useNameStep: true };
    const globalHours = getTemplateWizardHoursStep(ctx);
    const modHours = mod.getTemplateWizardHoursStep(ctx);
    const windowHours = window.getTemplateWizardHoursStep(ctx);
    // Bare identifier must not throw (the CAPACITOR-1B failure mode).
    let threw = null;
    try {
      void getTemplateWizardHoursStep();
    } catch (error) {
      threw = String(error?.message ?? error);
    }
    return {
      globalHours,
      modHours,
      windowHours,
      same: globalHours === modHours && modHours === windowHours,
      threw,
      hoursNoName: mod.getTemplateWizardHoursStep({ useNameStep: false }),
    };
  });

  if (afterLoad.threw) {
    throw new Error(afterLoad.threw);
  }
  if (!afterLoad.same) {
    throw new Error(`module/global mismatch ${JSON.stringify(afterLoad)}`);
  }
  if (afterLoad.modHours !== 5 || afterLoad.hoursNoName !== 4) {
    throw new Error(`module hours steps got ${JSON.stringify(afterLoad)}`);
  }

  // Drive wizard via API (avoids journeys-dialog paths unrelated to this crash).
  await page.evaluate(() => {
    window.nextTrainTemplateWizard.showTemplateRouteCoach({
      templateKey: "morning",
      journey: {
        name: "Morning into town",
        station: "Edgewater",
        direction: "To Perth",
        defaultFrom: "06:00",
        defaultUntil: "09:00",
      },
      nearest: { station: "Edgewater", distanceKm: 0.2 },
      configured: true,
    });
  });

  await page.waitForFunction(() => !document.getElementById("template-route-coach")?.hidden);

  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.nextTrainTemplateWizard.advanceTemplateWizard());
    await page.waitForTimeout(100);
  }

  const crash = pageErrors.find((msg) => /getTemplateWizardHoursStep is not defined/i.test(msg));
  if (crash) {
    throw new Error(crash);
  }
  // Ignore unrelated pin TDZ noise if journeys chrome still fires it; this test owns HoursStep only.
  const hoursErrors = pageErrors.filter((msg) => /getTemplateWizardHoursStep/i.test(msg));
  if (hoursErrors.length) {
    throw new Error(`hours-step page errors: ${hoursErrors.join("; ")}`);
  }

  console.log("PASS template-wizard-hours-step-global");
  await browser.close();
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
