/**
 * Export locked Play feature graphic 1024×500.
 * Usage: node store-assets/export-feature-graphics.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const assets = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(assets, "exports", "play-feature-graphic-1024x500.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });

await page.goto(pathToFileURL(path.join(assets, "feature-graphic.html")).href, {
  waitUntil: "networkidle",
});
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(500);
await page.locator("#stage").screenshot({ path: out, type: "png" });
console.log("wrote", out);

await browser.close();
