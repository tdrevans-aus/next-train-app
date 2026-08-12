/**
 * Active hours wizard step — coach card must not overlap highlighted fields.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(800);
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(200);
  await page.locator("#journeys-btn").click();
  await page.waitForTimeout(400);
  await page.locator('[data-template="morning"]').click();
  await page.waitForTimeout(2000);

  for (let i = 0; i < 3; i++) {
    await page.locator("#template-wizard-primary-btn").click();
    await page.waitForTimeout(300);
  }

  const result = await page.evaluate(() => {
    const card = document.querySelector("#template-route-coach .onboarding-coach-card");
    const fromBtn = document.getElementById("detail-default-from-display");
    const cardZ = card ? getComputedStyle(card).zIndex : null;
    const scrimZ = getComputedStyle(
      document.querySelector("#template-route-coach .onboarding-coach-scrim")
    ).zIndex;
    const highlightZ = getComputedStyle(document.getElementById("detail-journey-window")).zIndex;
    const cardRect = card.getBoundingClientRect();
    const fromRect = fromBtn.getBoundingClientRect();
    const overlap =
      cardRect.bottom > fromRect.top &&
      cardRect.top < fromRect.bottom &&
      cardRect.right > fromRect.left &&
      cardRect.left < fromRect.right;
    const midX = (Math.max(cardRect.left, fromRect.left) + Math.min(cardRect.right, fromRect.right)) / 2;
    const midY = (Math.max(cardRect.top, fromRect.top) + Math.min(cardRect.bottom, fromRect.bottom)) / 2;
    const stack = overlap ? document.elementsFromPoint(midX, midY) : [];
    const cardAboveFields =
      stack.length > 0 && (stack[0] === card || card.contains(stack[0]));

    return {
      cardZ,
      scrimZ,
      highlightZ,
      overlap,
      cardAboveFields,
      topElement: stack[0]?.id || stack[0]?.className?.slice?.(0, 40),
      step3Visible: !document.getElementById("template-wizard-step-3").hidden,
    };
  });

  if (!result.step3Visible) {
    console.error("FAIL — not on Active hours step", result);
    process.exitCode = 1;
  } else if (result.overlap) {
    console.error("FAIL — coach card overlaps Active hours fields", result);
    process.exitCode = 1;
  } else if (result.cardZ !== "22") {
    console.error("FAIL — card z-index expected 22", result);
    process.exitCode = 1;
  } else if (result.overlap && result.cardAboveFields) {
    console.error("FAIL — fields paint above coach card at overlap", result);
    process.exitCode = 1;
  } else {
    console.log("PASS — Active hours coach does not cover fields", result);
  }

  await browser.close();
}

run();
