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

async function addCustomJourney(page, { name, station, direction, from, until }) {
  await page.evaluate(() => window.nextTrainApp.openJourneys());
  await page.waitForTimeout(500);

  const templatesHidden = await page.evaluate(
    () => document.getElementById("journey-templates").hidden
  );
  const atCap = await page.evaluate(() => {
    const capHint = document.getElementById("journey-templates-cap-hint");
    return capHint && !capHint.hidden;
  });
  if (templatesHidden || atCap) {
    return { added: false, reason: atCap ? "at-cap" : "templates-hidden" };
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
  await page.selectOption("#detail-direction-select", direction);
  await setOptionalTimes(page, from, until);

  const saveStart = Date.now();
  await page.locator("#detail-done-btn").click();
  await page.waitForTimeout(800);
  const saveMs = Date.now() - saveStart;

  const overlapError = await page.evaluate(() => {
    const el = document.getElementById("detail-active-hours-error");
    return el && !el.hidden ? el.textContent.trim() : "";
  });

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
    },
    {
      name: "J2 overlap test",
      station: "Warwick Stn",
      direction: "Perth",
      from: "06:00",
      until: "09:00",
    },
    {
      name: "J3 overlap test",
      station: "Canning Bridge Stn",
      direction: "Mandurah",
      from: "15:00",
      until: "18:00",
    },
    {
      name: "J4 overlap test",
      station: "Bull Creek Stn",
      direction: "Mandurah",
      from: "15:00",
      until: "18:00",
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
  for (let i = 0; i < 6; i++) {
    const from = `${String(6 + i).padStart(2, "0")}:00`;
    const until = `${String(7 + i).padStart(2, "0")}:00`;
    capResults.push(
      await addCustomJourney(page, {
        name: `Cap journey ${i + 1}`,
        station: "Edgewater Stn",
        direction: "Perth",
        from,
        until,
      })
    );
  }

  const after6 = await page.evaluate(() => ({
    persisted: JSON.parse(localStorage.getItem("nextTrainSettings") || "{}").journeys?.length ?? 0,
    templatesHidden: document.getElementById("journey-templates").hidden,
    capHintVisible: !document.getElementById("journey-templates-cap-hint")?.hidden,
    listItems: document.querySelectorAll(".journey-list-item").length,
  }));

  const seventhAttempt = await addCustomJourney(page, {
    name: "Cap journey 7",
    station: "Murdoch Stn",
    direction: "Perth",
    from: "18:00",
    until: "19:00",
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
  console.log("Cap add results (6):", capResults);
  console.log("After 6:", after6);
  console.log("7th attempt:", seventhAttempt);
  console.log("Final:", final);
  console.log(`Max save click duration: ${maxSaveMs}ms`);
  if (overlapOn4th) {
    console.log(`4th journey overlap error: ${overlapOn4th.slice(0, 120)}…`);
  }

  const capOk =
    after6.persisted === 6 &&
    !after6.templatesHidden &&
    after6.capHintVisible &&
    seventhAttempt.added === false &&
    seventhAttempt.reason === "at-cap" &&
    final.persisted === 6 &&
    final.hasCapMessage;

  const webNoHang = maxSaveMs < 5000;

  console.log(
    webNoHang
      ? "\nPASS  Web save did not hang (<5s per journey).\n"
      : "\nFAIL  Web save slow — possible main-thread block.\n"
  );
  console.log(
    capOk
      ? "PASS  Cap enforced at 6 (cap hint shown, count ≤6).\n"
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
