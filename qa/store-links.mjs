/**
 * Store links: About page buttons + mobile-web "Get the app" banner
 * (docs/jim-brief-store-links.md). Usage: node qa/store-links.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer, BASE } from "./helpers/dev-server.mjs";

const IOS = "https://apps.apple.com/app/id6803145625";
const ANDROID = "https://play.google.com/store/apps/details?id=com.tdrevans.nexttrain";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const failures = [];
function check(ok, msg) {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
}

const NATIVE_STUB = () => {
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android" };
};

async function newPage(browser, { ua, viewport, colorScheme = "light", native = false }) {
  const ctx = await browser.newContext({ userAgent: ua, viewport, colorScheme });
  const page = await ctx.newPage();
  if (native) await page.addInitScript(NATIVE_STUB);
  return { ctx, page };
}

async function aboutLinks(page) {
  await page.goto(`${BASE}/about.html`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const vis = (id) => {
      const el = document.getElementById(id);
      return el && !el.hidden && el.offsetParent !== null ? el.getAttribute("href") : null;
    };
    const sec = document.getElementById("store-links-section");
    return {
      sectionVisible: Boolean(sec && !sec.hidden && sec.offsetParent !== null),
      ios: vis("store-link-ios"),
      android: vis("store-link-android"),
    };
  });
}

async function bannerState(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  return page.evaluate(() => {
    const bar = document.getElementById("store-banner");
    return bar ? { href: document.getElementById("store-banner-link")?.getAttribute("href") } : null;
  });
}

async function main() {
  const server = await ensureDevServer();
  const browser = await chromium.launch();
  try {
    for (const scheme of ["light", "dark"]) {
      for (const [label, ua, viewport] of [
        ["desktop", DESKTOP_UA, DESKTOP],
        ["mobile", IPHONE_UA, PHONE],
      ]) {
        const { ctx, page } = await newPage(browser, { ua, viewport, colorScheme: scheme });
        const r = await aboutLinks(page);
        check(
          r.sectionVisible && r.ios === IOS && r.android === ANDROID,
          `about ${label}/${scheme}: both store buttons with correct URLs (${JSON.stringify(r)})`
        );
        await ctx.close();
      }
    }

    {
      const { ctx, page } = await newPage(browser, { ua: ANDROID_UA, viewport: PHONE, native: true });
      const r = await aboutLinks(page);
      check(!r.sectionVisible && !r.ios && !r.android, `about native: no store section (${JSON.stringify(r)})`);
      await ctx.close();
    }

    for (const [label, ua, viewport, expected] of [
      ["iPhone", IPHONE_UA, PHONE, IOS],
      ["Android", ANDROID_UA, PHONE, ANDROID],
      ["desktop", DESKTOP_UA, DESKTOP, null],
    ]) {
      const { ctx, page } = await newPage(browser, { ua, viewport });
      const s = await bannerState(page);
      if (expected) {
        check(s?.href === expected, `index ${label}: banner points at ${expected} (got ${s?.href})`);
        await page.click("#store-banner-dismiss");
        check((await page.$("#store-banner")) === null, `index ${label}: banner removed on dismiss`);
        const again = await bannerState(page);
        check(again === null, `index ${label}: stays dismissed after reload`);
      } else {
        check(s === null, `index ${label}: no banner`);
      }
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage(browser, { ua: ANDROID_UA, viewport: PHONE, native: true });
      const s = await bannerState(page);
      check(s === null, "index native (Capacitor stubbed): no banner");
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage(browser, { ua: IPHONE_UA, viewport: DESKTOP });
      const s = await bannerState(page);
      check(s === null, "index iPhone UA at desktop width: no banner");
      await ctx.close();
    }
  } finally {
    await browser.close();
    if (server) stopDevServer(server.child ?? server);
  }
  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\nstore-links: all checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
