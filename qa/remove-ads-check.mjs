/**
 * Remove ads — web expectations + native-bridge diagnostic.
 * Usage: node qa/remove-ads-check.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}/?reset=1&fixture=normal&test=1`);
  await page.waitForTimeout(5000);

  const web = await page.evaluate(async () => {
    const init = await window.NextTrainAdFree?.ensureInit?.();
    return {
      isNative: window.Capacitor?.isNativePlatform?.(),
      hasNativeBridge: !!window.NextTrainAdFreeNative?.purchaseInAppProduct,
      init,
      removeBtnHidden: document.getElementById("menu-remove-ads-btn")?.hidden,
      webHintHidden: document.getElementById("menu-ad-free-web-hint")?.hidden,
      adLinkHidden: document.getElementById("ad-remove-link-wrap")?.hidden,
    };
  });

  console.log("\nRemove ads check — browser\n");
  console.log("Web (expected): buy hidden, Android hint visible, link hidden");
  console.log(JSON.stringify(web, null, 2));

  const webPass =
    web.removeBtnHidden === true &&
    web.webHintHidden === false &&
    web.adLinkHidden === true &&
    web.isNative !== true;

  console.log(webPass ? "PASS  web Remove ads UI" : "FAIL  web Remove ads UI");

  // Broken native bridge (simulates bundle load failure on device)
  await page.evaluate(() => {
    window.Capacitor = { isNativePlatform: () => true };
    window.NextTrainAdFreeNative = undefined;
  });
  await page.evaluate(async () => {
    await window.NextTrainAdFree?.renderMenuAdFree?.();
  });
  const linkHidden = await page.evaluate(
    () => document.getElementById("ad-remove-link-wrap")?.hidden === true
  );
  await page.evaluate(() => {
    document.getElementById("ad-remove-link-wrap").hidden = false;
    document.getElementById("ad-remove-link")?.click();
  });
  await page.waitForTimeout(600);
  const silentFail = await page.evaluate(() => ({
    toast: document.getElementById("app-toast")?.textContent ?? null,
    toastVisible: document.getElementById("app-toast")?.classList.contains("app-toast--visible"),
  }));

  console.log("\nSimulated native (no bridge):");
  console.log(JSON.stringify({ linkHidden, silentFail }, null, 2));
  const toastOk = silentFail.toastVisible && silentFail.toast?.includes("aren't available");
  console.log(
    toastOk
      ? "PASS  toast shown when bridge missing"
      : "FAIL  silent or wrong toast when bridge missing"
  );

  if (pageErrors.length) {
    console.log("\nConsole errors (first 3):");
    pageErrors.slice(0, 3).forEach((e) => console.log(" -", e.slice(0, 120)));
  }

  await browser.close();
  process.exit(webPass && linkHidden && toastOk ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
