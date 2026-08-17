/**
 * Journey count cap + overlap save with 4 journeys (web repro for System UI ANR context).
 * Usage: node qa/journey-cap-repro.mjs
 */
import { chromium } from "playwright";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import { pickStationCombobox } from "./helpers/station-combobox.mjs";

const BASE = "http://localhost:3000";

async function dismissCoach(page) {
  for (let i = 0; i < 5; i++) {
    const open = await page.evaluate(
      () => !document.getElementById("template-route-coach").hidden
    );
    if (!open) break;
    await page.locator("#template-wizard-primary-btn").click();
    await page.waitForTimeout(200);
  }
}

async function setOptionalTime(page, fieldId, value) {
  await page.evaluate(
    ({ fieldId, value }) => {
      const field = document.getElementById(fieldId);
      const input = field?.querySelector(".optional-time-input");
      if (!input) {
        return;
      }
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { fieldId, value }
  );
  await page.waitForTimeout(150);
}

async function setOptionalTimes(page, from, until) {
  await page.evaluate(
    ({ from, until }) => {
      const setTime = (inputId, displayId, fieldId, clearId, value) => {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        const field = document.getElementById(fieldId);
        const clear = document.getElementById(clearId);
        if (!input) return;
        input.value = value;
        if (display) display.textContent = value;
        if (field) field.dataset.empty = "false";
        if (clear) clear.hidden = false;
      };
      setTime(
        "detail-default-from",
        "detail-default-from-display",
        "detail-default-from-field",
        "detail-default-from-clear",
        from
      );
      setTime(
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

async function addCustomJourney(page, { name, station, direction, from, until, preferred }) {
  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
  await page.waitForTimeout(500);

  const gate = await page.evaluate(() => {
    const capHint = document.getElementById("journey-templates-cap-hint");
    const setup = document.getElementById("journey-setup-btn");
    const templates = document.getElementById("journey-templates");
    const atCap = Boolean(capHint && !capHint.hidden) || Boolean(setup?.hidden);
    return {
      atCap,
      templatesHidden: templates?.hidden ?? true,
    };
  });
  if (gate.atCap) {
    return { added: false, reason: "at-cap" };
  }
  if (gate.templatesHidden) {
    return { added: false, reason: "templates-hidden" };
  }

  await openCustomJourneyCreate(page);
  await page.waitForTimeout(800);
  await dismissCoach(page);

  await page.fill("#detail-journey-name", name);
  await pickStationCombobox(page, {
    rootSelector: "#detail-station-combobox",
    inputSelector: "#detail-station-input",
    listboxSelector: "#detail-station-listbox",
    station,
  });
  await page.selectOption("#detail-direction-select", { label: direction });
  const targetTime = preferred ?? from;
  await setOptionalTime(page, "detail-preferred-field", targetTime);
  await setOptionalTimes(page, from, until);

  let dialogMessage = "";
  page.once("dialog", async (dialog) => {
    dialogMessage = dialog.message();
    await dialog.dismiss();
  });

  const saveStart = Date.now();
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(800);
  const saveMs = Date.now() - saveStart;

  if (dialogMessage) {
    return { added: false, saveMs, overlapError: "", reason: dialogMessage };
  }

  const overlapError = await page.evaluate(() => {
    const el = document.getElementById("detail-active-hours-error");
    return el && !el.hidden ? el.textContent.trim() : "";
  });

  const persisted = await page.evaluate((journeyName) => {
    const journeys = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys ?? [];
    return journeys.some((journey) => journey.name === journeyName);
  }, name);

  if (!persisted) {
    return { added: false, saveMs, overlapError, reason: "not-persisted" };
  }

  const onList = await page.evaluate(
    () => !document.getElementById("settings-list-view").hidden
  );
  if (!onList) {
    await page.locator("#settings-back").click();
    await page.waitForTimeout(400);
  }

  return { added: true, saveMs, overlapError };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -31.77, longitude: 115.99 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(2000);

  const overlapBatch = [
    {
      name: "J1 overlap test",
      station: "Edgewater Stn",
      direction: "Perth",
      from: "06:00",
      until: "09:00",
      preferred: "07:30",
    },
    {
      name: "J2 overlap test",
      station: "Warwick Stn",
      direction: "Perth",
      from: "06:30",
      until: "09:30",
      preferred: "08:00",
    },
    {
      name: "J3 overlap test",
      station: "Canning Bridge Stn",
      direction: "Mandurah",
      from: "15:00",
      until: "18:00",
      preferred: "16:30",
    },
    {
      name: "J4 overlap test",
      station: "Bull Creek Stn",
      direction: "Mandurah",
      from: "15:30",
      until: "18:30",
      preferred: "17:00",
    },
  ];

  const overlapResults = [];
  for (const j of overlapBatch) {
    overlapResults.push(await addCustomJourney(page, j));
  }

  const afterOverlapBatch = await page.evaluate(() => ({
    persisted: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.length ?? 0,
    templatesHidden: document.getElementById("journey-templates").hidden,
    listItems: document.querySelectorAll(".journey-list-item").length,
  }));

  // Cap test: six non-overlapping hour slots on weekdays.
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1500);

  const capResults = [];
  for (let i = 0; i < 5; i++) {
    const from = `${String(6 + i).padStart(2, "0")}:00`;
    const until = `${String(7 + i).padStart(2, "0")}:00`;
    const preferred = `${String(6 + i).padStart(2, "0")}:30`;
    capResults.push(
      await addCustomJourney(page, {
        name: `Cap journey ${i + 1}`,
        station: "Edgewater Stn",
        direction: "Perth",
        from,
        until,
        preferred,
      })
    );
  }

  const after5 = await page.evaluate(() => ({
    persisted: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.length ?? 0,
    templatesHidden: document.getElementById("journey-templates").hidden,
    capHintVisible: !document.getElementById("journey-templates-cap-hint")?.hidden,
    listItems: document.querySelectorAll(".journey-list-item").length,
  }));

  const sixthAttempt = await addCustomJourney(page, {
    name: "Cap journey 6",
    station: "Murdoch Stn",
    direction: "Perth",
    from: "18:00",
    until: "19:00",
    preferred: "18:30",
  });

  const final = await page.evaluate(() => {
    const journeys = JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys ?? [];
    const templates = document.getElementById("journey-templates");
    const hint = document.querySelector(".journey-templates-hint");
    const bodyText = document.body.innerText;
    return {
      persisted: journeys.length,
      templatesHidden: templates?.hidden ?? true,
      hintText: hint?.textContent?.trim() ?? "",
      listItems: document.querySelectorAll(".journey-list-item").length,
      hasCapMessage:
        /maximum|limit|up to 5|5 journey/i.test(bodyText) ||
        document.querySelector("[data-journey-cap]") !== null,
    };
  });

  await browser.close();

  const maxSaveMs = Math.max(
    ...overlapResults.map((r) => r.saveMs ?? 0),
    ...capResults.map((r) => r.saveMs ?? 0),
    0
  );
  const overlapOn4th = overlapResults[3]?.overlapError ?? "";

  console.log("\nJourney cap + 4-journey overlap repro\n");
  console.log("Overlap batch results:", overlapResults);
  console.log("After overlap batch:", afterOverlapBatch);
  console.log("Cap add results (5):", capResults);
  console.log("After 5:", after5);
  console.log("6th attempt:", sixthAttempt);
  console.log("Final:", final);
  console.log(`Max save click duration: ${maxSaveMs}ms`);
  if (overlapOn4th) {
    console.log(`4th journey overlap error: ${overlapOn4th.slice(0, 120)}…`);
  }

  const capOk =
    after5.persisted === 5 &&
    after5.capHintVisible &&
    sixthAttempt.added === false &&
    sixthAttempt.reason === "at-cap" &&
    final.persisted === 5 &&
    final.hasCapMessage;

  const webNoHang = maxSaveMs < 5000;

  console.log(
    webNoHang
      ? "\nPASS  Web save did not hang (<5s per journey).\n"
      : "\nFAIL  Web save slow — possible main-thread block.\n"
  );
  console.log(
    capOk
      ? "PASS  Cap enforced at 5 (cap hint shown, count ≤5).\n"
      : "FAIL  Cap UX/count unexpected.\n"
  );
  console.log(
    final.hasCapMessage
      ? "NOTE  Explicit cap message shown."
      : "NOTE  No explicit cap message.\n"
  );

  process.exit(webNoHang && capOk ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
