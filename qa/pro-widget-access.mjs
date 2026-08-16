/**
 * Widget stays free — no Pro trial lock.
 * Usage: node qa/pro-widget-access.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(2000);

  const fresh = await page.evaluate(async () => {
    localStorage.removeItem("nextTrainAdFreeCache");
    localStorage.removeItem("nextTrainProTrialStartedAt");
    localStorage.removeItem("nextTrainFoundingPro");
    await window.NextTrainAdFree?.ensureInit?.();
    return {
      proGone: typeof window.NextTrainPro === "undefined",
      notEntitled: window.NextTrainAdFree?.isEntitled?.() === false,
      menuCta: document.getElementById("menu-ad-free-cta-title")?.textContent,
    };
  });

  await browser.close();

  const ok =
    fresh.proGone === true &&
    fresh.notEntitled === true &&
    fresh.menuCta === "Remove ads";

  console.log(JSON.stringify(fresh, null, 2));
  console.log(ok ? "\nPASS  widget free / no Pro layer\n" : "\nFAIL  widget free check\n");
  process.exit(ok ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
