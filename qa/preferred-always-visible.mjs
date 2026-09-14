/**
 * Target train always visible on journey detail (U-13).
 * Usage: node qa/preferred-always-visible.mjs
 */
import { chromium } from "playwright";
import { openJourneyDetail } from "./helpers/journeys-dialog.mjs";
import { seedPersistedJourneys } from "./helpers/travel-library.mjs";

import { BASE } from "./helpers/dev-server.mjs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await seedPersistedJourneys(page, [
    {
      id: "j-custom",
      kind: "journey",
      name: "Custom commute",
      station: "Edgewater Stn",
      direction: "Perth",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      defaultFrom: "",
      defaultUntil: "",
      preferredTrainTime: "",
      remindDays: [1, 2, 3, 4, 5],
      remindMe: false,
    },
  ]);
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(1500);

  await openJourneyDetail(page, "j-custom");
  await page.waitForTimeout(800);

  const initial = await page.evaluate(() => {
    const preferredField = document.getElementById("detail-preferred-field");
    const preferredSection = document.getElementById("detail-preferred-section");
    const reminder = document.getElementById("detail-reminder-section");
    const controls = document.getElementById("detail-remind-controls");
    return {
      preferredVisible: Boolean(preferredSection),
      preferredInExpanded: Boolean(preferredField?.closest("#detail-remind-expanded")),
      reminderInsidePreferred: Boolean(preferredSection?.contains(reminder)),
      remindControlsHidden: controls?.hidden ?? true,
      remindOff: !document.getElementById("detail-remind-me")?.checked,
    };
  });

  if (!initial.preferredVisible || !initial.reminderInsidePreferred) {
    console.error("FAIL — Target section should contain Remind me", initial);
    process.exitCode = 1;
  }

  if (initial.preferredInExpanded || !initial.remindOff) {
    console.error("FAIL — Target should be visible with Remind me off", initial);
    process.exitCode = 1;
  }

  await page.evaluate(() => {
    const display = document.getElementById("detail-preferred-display");
    display?.click();
    const input = document.getElementById("detail-preferred-input");
    if (input) {
      input.value = "07:30";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.waitForTimeout(300);
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(800);

  const afterSave = await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journey = settings.journeys?.[0];
    return {
      preferredTrainTime: journey?.preferredTrainTime ?? "",
      remindMe: journey?.remindMe ?? true,
    };
  });

  if (afterSave.preferredTrainTime !== "07:30" || afterSave.remindMe !== false) {
    console.error("FAIL — preferred should persist with Remind me off", afterSave);
    process.exitCode = 1;
  }

  await seedPersistedJourneys(page, [
    {
      id: "j-custom",
      kind: "journey",
      name: "Custom commute",
      station: "Edgewater Stn",
      direction: "Perth",
      leaveBeforeMinutes: 10,
      useLeaveBefore: true,
      defaultFrom: "",
      defaultUntil: "",
      preferredTrainTime: "",
      remindDays: [1, 2, 3, 4, 5],
      remindMe: true,
    },
  ]);
  await page.goto(`${BASE}/?test=1&fixture=normal`);
  await page.waitForTimeout(1500);
  await openJourneyDetail(page, "j-custom");
  await page.waitForTimeout(500);

  // Save-blocking dialog is no longer reachable through the UI: this is
  // exactly what "Target train always visible" (U-13) means in practice —
  // populateDetailReminderFields() (public/journey-detail.js) fills the
  // target field with defaultPreferredTrainTime() the moment the detail
  // view opens on a journey with Remind me on and no stored target, so the
  // field is never actually empty by the time Save is pressed. The
  // `if (!preferredTrainTime) throw new Error("Choose your target train.")`
  // guard this used to exercise is still in the code as a defence-in-depth
  // check, just no longer triggerable from a stored empty preferredTrainTime
  // — confirmed by reading detail-preferred-input's value here, which is
  // never empty on open. Assert the always-populated behaviour instead of
  // a save-blocking dialog that can no longer fire.
  const targetPrefilled = await page.evaluate(
    () => (document.getElementById("detail-preferred-input")?.value ?? "").length > 0
  );
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(500);

  if (!targetPrefilled) {
    console.error("FAIL — Target train field should be pre-filled with a default when Remind me is on and no target is stored");
    process.exitCode = 1;
  }

  if (process.exitCode) {
    await browser.close();
    return;
  }

  console.log("PASS — Target always visible; persists with Remind me off; always pre-filled with a default when Remind me is on");
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
