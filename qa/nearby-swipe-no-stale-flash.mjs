/**
 * Near me hero swipe must not flash a stale train while a board fetch is in flight.
 * Usage: node qa/nearby-swipe-no-stale-flash.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

async function swipeHeroLeft(page) {
  const hero = page.locator("#hero");
  const box = await hero.boundingBox();
  if (!box) {
    throw new Error("hero not visible");
  }

  const startX = box.x + box.width * 0.82;
  const endX = box.x + box.width * 0.18;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 10 });
  await page.mouse.up();
}

function clockFromHero(text) {
  return text?.split("·")[0]?.trim() ?? "";
}

async function run() {
  let serverChild = null;
  let browser = null;
  try {
    serverChild = await ensureDevServer();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Delay board fetches so a swipe can race an in-flight refresh.
    await page.route("**/api/next-train?**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.evaluate(async () => {
      localStorage.setItem("nextTrainOnboardingDone", "1");
      await window.nextTrainApp.enterNearbyMode();
    });
    await page.waitForFunction(() => {
      const text = document.getElementById("depart-display-time")?.textContent ?? "";
      return /\d{1,2}:\d{2}/.test(text);
    }, null, { timeout: 25000 });

    const beforeClock = clockFromHero(await page.locator("#depart-display-time").textContent());
    const sequence = [beforeClock];

    await swipeHeroLeft(page);
    for (let i = 0; i < 8; i += 1) {
      await page.waitForTimeout(80);
      const clock = clockFromHero(await page.locator("#depart-display-time").textContent());
      if (clock && clock !== sequence[sequence.length - 1]) {
        sequence.push(clock);
      }
    }

    await swipeHeroLeft(page);
    for (let i = 0; i < 16; i += 1) {
      await page.waitForTimeout(80);
      const clock = clockFromHero(await page.locator("#depart-display-time").textContent());
      if (clock && clock !== sequence[sequence.length - 1]) {
        sequence.push(clock);
      }
    }

    const afterClock = clockFromHero(await page.locator("#depart-display-time").textContent());
    if (afterClock && afterClock !== sequence[sequence.length - 1]) {
      sequence.push(afterClock);
    }

    const uniqueClock = [...new Set(sequence)];
    let flashedBackward = false;
    let maxIndex = -1;
    for (const clock of sequence) {
      const idx = uniqueClock.indexOf(clock);
      if (idx < maxIndex) {
        flashedBackward = true;
        break;
      }
      maxIndex = Math.max(maxIndex, idx);
    }

    const moved = beforeClock && afterClock && beforeClock !== afterClock;
    if (moved && !flashedBackward && uniqueClock.length >= 2) {
      console.log("PASS — nearby swipe kept hero advancing without stale flash", {
        before: beforeClock,
        after: afterClock,
        sequence: uniqueClock,
      });
    } else {
      console.error("FAIL — nearby swipe stale flash", {
        before: beforeClock,
        after: afterClock,
        moved,
        flashedBackward,
        sequence,
      });
      process.exitCode = 1;
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    stopDevServer(serverChild);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
