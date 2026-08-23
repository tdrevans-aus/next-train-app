/**
 * Lock E3 Band into Play 512 + Android launcher mipmaps.
 * Usage: node store-assets/export-locked-icon.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconSvg = fs.readFileSync(path.join(root, "public", "icon.svg"), "utf8");
const fgSvg = fs.readFileSync(
  path.join(root, "store-assets", "icon-foreground-adaptive.svg"),
  "utf8"
);
const exportsDir = path.join(root, "store-assets", "exports");
const res = path.join(root, "android", "app", "src", "main", "res");
const iosIcon = path.join(
  root,
  "ios",
  "App",
  "App",
  "Assets.xcassets",
  "AppIcon.appiconset",
  "AppIcon-512@2x.png"
);

const densities = [
  { dir: "mipmap-mdpi", launcher: 48, foreground: 108 },
  { dir: "mipmap-hdpi", launcher: 72, foreground: 162 },
  { dir: "mipmap-xhdpi", launcher: 96, foreground: 216 },
  { dir: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
  { dir: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
];

async function shotSvg(page, svg, size, outPath, bg = "transparent") {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!DOCTYPE html><html><body style="margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${bg}">
      <div style="width:${size}px;height:${size}px">${svg.replace(
        /viewBox="0 0 (\d+) (\d+)"/,
        `viewBox="0 0 $1 $2" width="${size}" height="${size}"`
      )}</div>
    </body></html>`,
    { waitUntil: "load" }
  );
  await page.waitForTimeout(40);
  await page.locator("svg").screenshot({ path: outPath, type: "png", omitBackground: bg === "transparent" });
}

const browser = await chromium.launch();
const page = await browser.newPage();

await shotSvg(page, iconSvg, 512, path.join(exportsDir, "play-icon-512.png"), "#EEF3F2");
console.log("wrote play-icon-512.png");

fs.mkdirSync(path.dirname(iosIcon), { recursive: true });
await shotSvg(page, iconSvg, 1024, iosIcon, "#EEF3F2");
console.log("wrote ios AppIcon-512@2x.png");

for (const d of densities) {
  const dir = path.join(res, d.dir);
  fs.mkdirSync(dir, { recursive: true });
  await shotSvg(page, iconSvg, d.launcher, path.join(dir, "ic_launcher.png"), "#EEF3F2");
  await shotSvg(page, iconSvg, d.launcher, path.join(dir, "ic_launcher_round.png"), "#EEF3F2");
  await shotSvg(page, fgSvg, d.foreground, path.join(dir, "ic_launcher_foreground.png"), "transparent");
  console.log("wrote", d.dir);
}

await browser.close();
console.log("done");
