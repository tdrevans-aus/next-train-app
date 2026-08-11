/**
 * Active hours — clearing one side clears the pair on Save (no alert).
 * Usage: node qa/active-hours-clear-pair.mjs
 */
import { chromium } from "playwright";
import { pickStationCombobox, waitForDetailStationCombobox } from "./helpers/station-combobox.mjs";

const BASE = "http://localhost:3000";

function setActiveHoursInPage(page, from, until) {
  return page.evaluate(
    ({ from, until }) => {
      function setField(inputId, displayId, fieldId, clearId, value) {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        const field = document.getElementById(fieldId);
        const clear = document.getElementById(clearId);
        field.dataset.empty = value ? "false" : "true";
        input.value = value;
        display.textContent = value;
        if (clear) {
          clear.hidden = !value;
        }
      }

      setField(
        "detail-default-from",
        "detail-default-from-display",
        "detail-default-from-field",
        "detail-default-from-clear",
        from
      );
      setField(
        "detail-default-until",
        "detail-default-until-display",
        "detail-default-until-field",
        "detail-default-until-clear",
        until
      );
    },
    { from, until }
  );
}

async function dismissCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible()) {
    await skip.click();
    await page.waitForTimeout(300);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.nextTrainApp.enterJourneyMode());
  await page.waitForTimeout(400);
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(500);

  await page.locator('[data-template="custom"]').click();
  await page.waitForTimeout(800);
  await dismissCoach(page);
  await waitForDetailStationCombobox(page);

  await page.locator("#detail-journey-name").fill("No hours trip");
  await pickStationCombobox(page, {
    rootSelector: "#detail-station-combobox",
    inputSelector: "#detail-station-input",
    listboxSelector: "#detail-station-listbox",
    station: "Edgewater Stn",
  });
  await page.waitForTimeout(800);
  await page.selectOption("#detail-direction-select", { index: 1 });
  await setActiveHoursInPage(page, "06:00", "09:00");
  await page.waitForTimeout(150);

  let dialogMessage = "";
  page.on("dialog", async (dialog) => {
    dialogMessage = dialog.message();
    await dialog.dismiss();
  });

  await page.locator("#detail-default-from-clear").click();
  await page.waitForTimeout(200);

  const afterClear = await page.evaluate(() => ({
    fromEmpty: document.getElementById("detail-default-from-field")?.dataset.empty === "true",
    untilEmpty: document.getElementById("detail-default-until-field")?.dataset.empty === "true",
  }));

  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(1500);

  const saved = await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}");
    const journey = settings.journeys?.find((j) => j.name === "No hours trip");
    return {
      defaultFrom: journey?.defaultFrom ?? null,
      defaultUntil: journey?.defaultUntil ?? null,
      detailStillOpen: !document.getElementById("settings-detail-view").hidden,
    };
  });

  await browser.close();

  const pass =
    !dialogMessage &&
    afterClear.fromEmpty &&
    afterClear.untilEmpty &&
    saved.defaultFrom === "" &&
    saved.defaultUntil === "" &&
    !saved.detailStillOpen;

  if (pass) {
    console.log("PASS — clear Active from clears until and saves with both blank");
  } else {
    console.error("FAIL", { dialogMessage, afterClear, saved });
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
