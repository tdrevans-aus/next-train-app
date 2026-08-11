/**
 * Reproduce unreliable hero swipe-left on fresh load.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function swipeVariant(page, { deltaX, deltaY, releaseOn }) {
  return page.evaluate(
    ({ deltaX, deltaY, releaseOn }) => {
      const hero = document.getElementById("hero");
      const r = hero.getBoundingClientRect();
      const startX = r.left + r.width / 2;
      const startY = r.top + r.height / 2;
      const endX = startX + deltaX;
      const endY = startY + deltaY;
      const before = document.getElementById("depart-countdown").textContent?.trim();
      const skipBefore = window.nextTrainApp?.getSkipCount?.() ?? null;

      hero.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: startX,
          clientY: startY,
          bubbles: true,
          pointerId: 1,
          pointerType: "touch",
        })
      );

      const target = releaseOn === "document" ? document : hero;
      target.dispatchEvent(
        new PointerEvent("pointerup", {
          clientX: endX,
          clientY: endY,
          bubbles: true,
          pointerId: 1,
          pointerType: "touch",
        })
      );

      const after = document.getElementById("depart-countdown").textContent?.trim();
      return { before, after, changed: before !== after, skipBefore };
    },
    { deltaX, deltaY, releaseOn }
  );
}

async function countSwipesUntilChange(page, label) {
  const before = await page.locator("#depart-countdown").textContent();
  let attempts = 0;
  for (let i = 0; i < 6; i++) {
    attempts += 1;
    const r = await swipeVariant(page, { deltaX: -80, deltaY: 0, releaseOn: "hero" });
    if (r.changed) {
      return { label, attempts, before, after: r.after, mode: "release-on-hero" };
    }
  }
  return { label, attempts, before, after: await page.locator("#depart-countdown").textContent(), failed: true };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();
  const results = [];

  // Fresh load #1 — swipe immediately when hero shows times
  await page.goto(`${BASE}/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await page.waitForFunction(() => {
    const t = document.getElementById("depart-countdown")?.textContent ?? "";
    return /\d+\s*min/i.test(t);
  });
  results.push(await countSwipesUntilChange(page, "fresh-load-1"));

  // Fresh load #2
  await page.goto(`${BASE}/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await page.waitForFunction(() => {
    const t = document.getElementById("depart-countdown")?.textContent ?? "";
    return /\d+\s*min/i.test(t);
  });
  results.push(await countSwipesUntilChange(page, "fresh-load-2"));

  // Short swipe (under 48px threshold)
  await page.goto(`${BASE}/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await page.waitForFunction(() => /\d+\s*min/i.test(document.getElementById("depart-countdown")?.textContent ?? ""));
  const short = await swipeVariant(page, { deltaX: -40, deltaY: 0, releaseOn: "hero" });
  results.push({ label: "short-swipe-40px", ...short });

  // Release outside hero (simulates finger lifting off card edge)
  await page.goto(`${BASE}/?reset=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`);
  await page.waitForFunction(() => /\d+\s*min/i.test(document.getElementById("depart-countdown")?.textContent ?? ""));
  const outside = await swipeVariant(page, { deltaX: -80, deltaY: 50, releaseOn: "document" });
  results.push({ label: "release-outside-hero", ...outside });

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
