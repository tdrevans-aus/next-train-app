/**
 * Export Play Store PNGs: app icon 512×512 + feature graphic 1024×500.
 * Usage: node store-assets/export-play-pngs.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "store-assets");
const exportsDir = path.join(assets, "exports");

async function shot(page, htmlFile, outName, size) {
  const url = pathToFileURL(path.join(assets, htmlFile)).href;
  await page.setViewportSize(size);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(400);
  const target = htmlFile.includes("feature") ? "#stage" : "body";
  await page.locator(target).screenshot({
    path: path.join(exportsDir, outName),
    type: "png",
  });
  console.log("wrote", outName);
}

const browser = await chromium.launch();
const page = await browser.newPage();

await shot(page, "icon-export.html", "play-icon-512.png", { width: 512, height: 512 });
await shot(page, "feature-graphic.html", "play-feature-graphic-1024x500.png", {
  width: 1024,
  height: 500,
});

await browser.close();
console.log("done → store-assets/exports/");
