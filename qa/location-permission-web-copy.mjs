/**
 * jim-brief-location-permission-web-copy — locationPermissionHelpMessage()
 * must show distinct, actionable copy for iOS-native, other-native (Android),
 * and plain-web visitors — not Android app-Settings instructions to web users.
 * Usage: node qa/location-permission-web-copy.mjs
 */
import { chromium } from "playwright";
import { ensureDevServer, stopDevServer } from "./helpers/dev-server.mjs";

import { BASE } from "./helpers/dev-server.mjs";

async function readMessage(page, platform) {
  // Playwright serializes addInitScript's argument through structured clone,
  // which drops function properties — build the Capacitor stub's methods
  // inside the init script itself rather than passing them in as data.
  await page.addInitScript((platformArg) => {
    if (platformArg === null) {
      // Plain web: no Capacitor global at all until index.html's own shim
      // runs (which itself reports isNativePlatform() === false).
      return;
    }
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => platformArg,
    };
  }, platform);
  await page.goto(`${BASE}/?test=1`);
  await page.waitForFunction(() => Boolean(window.nextTrainApp?.locationPermissionHelpMessage));
  return page.evaluate(() => window.nextTrainApp.locationPermissionHelpMessage());
}

async function run() {
  let spawned;
  const browser = await chromium.launch({ headless: true });
  try {
    spawned = await ensureDevServer();

    const webContext = await browser.newContext();
    const webPage = await webContext.newPage();
    const webMessage = await readMessage(webPage, null);
    await webContext.close();

    const androidContext = await browser.newContext();
    const androidPage = await androidContext.newPage();
    const androidMessage = await readMessage(androidPage, "android");
    await androidContext.close();

    const iosContext = await browser.newContext();
    const iosPage = await iosContext.newPage();
    const iosMessage = await readMessage(iosPage, "ios");
    await iosContext.close();

    const results = { webMessage, androidMessage, iosMessage };

    const pass =
      // Web copy must not mention Android's app-Settings path, and must
      // point at the fallback that always works.
      !/Settings → Apps/.test(webMessage) &&
      /choose a station below/i.test(webMessage) &&
      // Android-native keeps its existing OS-Settings instructions.
      /Settings → Apps → Next Train/.test(androidMessage) &&
      // iOS-native keeps its existing distinct copy.
      /While Using the App/.test(iosMessage) &&
      // All three branches must be genuinely different strings.
      new Set([webMessage, androidMessage, iosMessage]).size === 3;

    if (!pass) {
      console.error("FAIL", results);
      process.exit(1);
    }
    console.log("PASS location-permission-web-copy:", results);
  } finally {
    await browser.close();
    await stopDevServer(spawned);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
