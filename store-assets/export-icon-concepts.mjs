/**
 * Export SVG icon concepts to 512 PNG (inline SVG — reliable).
 * Usage: node store-assets/export-icon-concepts.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const concepts = path.join(dir, "icon-concepts");
const outDir = path.join(dir, "exports", "icon-concepts");
fs.mkdirSync(outDir, { recursive: true });

const svgs = fs.readdirSync(concepts).filter((f) => f.endsWith(".svg"));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });

for (const file of svgs) {
  const svg = fs.readFileSync(path.join(concepts, file), "utf8");
  await page.setContent(
    `<!DOCTYPE html><html><body style="margin:0;width:512px;height:512px;overflow:hidden">${svg}</body></html>`,
    { waitUntil: "load" }
  );
  await page.waitForTimeout(50);
  const name = file.replace(/\.svg$/, "-svg.png");
  await page.locator("svg").screenshot({ path: path.join(outDir, name), type: "png" });
  console.log("wrote", name);
}

await browser.close();
