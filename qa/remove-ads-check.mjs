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
  const nativeNoBridge = await page.evaluate(() => ({
    sectionHidden: document.getElementById("menu-ad-free-section")?.hidden === true,
    removeHidden: document.getElementById("menu-remove-ads-btn")?.hidden === true,
    statusHidden: document.getElementById("menu-ad-free-status")?.hidden === true,
    billingHintHidden: document.getElementById("menu-ad-free-billing-hint")?.hidden === true,
    webHintHidden: document.getElementById("menu-ad-free-web-hint")?.hidden === true,
    linkHidden: document.getElementById("ad-remove-link-wrap")?.hidden === true,
  }));
  await page.evaluate(() => {
    document.getElementById("ad-remove-link-wrap").hidden = false;
    document.getElementById("ad-remove-link")?.click();
  });
  await page.waitForTimeout(600);
  const silentFail = await page.evaluate(() => ({
    toast: document.getElementById("app-toast")?.textContent ?? null,
    toastVisible: document.getElementById("app-toast")?.classList.contains("app-toast--visible"),
  }));

  // Entitled must still show status (never hide whole section)
  await page.evaluate(() => {
    localStorage.setItem("nextTrainAdFreeCache", "1");
  });
  // Force entitled via public refresh path isn't enough without re-init; poke through render after setting internal cache by purchase toast path:
  // Re-read: ensureInit already ran; apply by calling restore path won't work. Use evaluate to set via refresh after mocking purchases.
  await page.evaluate(async () => {
    // Simulate entitled UI path directly: cache + re-init is hard; call render after flipping via apply isn't exported.
    // Trigger purchaseAdFree early return toast after faking entitled through refreshEntitlement with mock.
    window.NextTrainAdFreeNative = {
      getInAppPurchases: async () => [{ productIdentifier: "com.tdrevans.nexttrain.adfree", isActive: true }],
      purchaseIncludesProduct: (purchases, id) =>
        purchases.some((p) => p.productIdentifier === id),
      restoreInAppPurchases: async () => [
        { productIdentifier: "com.tdrevans.nexttrain.adfree", isActive: true },
      ],
      purchaseInAppProduct: async () => ({}),
      isBillingSupported: async () => true,
    };
    await window.NextTrainAdFree.refreshEntitlement({ silent: true });
    await window.NextTrainAdFree.renderMenuAdFree();
  });
  const entitledUi = await page.evaluate(() => ({
    sectionHidden: document.getElementById("menu-ad-free-section")?.hidden === true,
    statusHidden: document.getElementById("menu-ad-free-status")?.hidden === true,
    removeHidden: document.getElementById("menu-remove-ads-btn")?.hidden === true,
    restoreHidden: document.getElementById("menu-restore-purchase-btn")?.hidden === true,
  }));

  console.log("\nSimulated native (no bridge):");
  console.log(JSON.stringify({ nativeNoBridge, silentFail }, null, 2));
  const noBridgeUiOk =
    nativeNoBridge.sectionHidden === false &&
    nativeNoBridge.removeHidden === true &&
    nativeNoBridge.billingHintHidden === false &&
    nativeNoBridge.webHintHidden === true;
  const toastOk = silentFail.toastVisible && silentFail.toast?.includes("aren't available");
  console.log(noBridgeUiOk ? "PASS  billing hint shown when bridge missing" : "FAIL  menu empty when bridge missing");
  console.log(
    toastOk
      ? "PASS  toast shown when bridge missing"
      : "FAIL  silent or wrong toast when bridge missing"
  );

  console.log("\nSimulated entitled:");
  console.log(JSON.stringify(entitledUi, null, 2));
  const entitledOk =
    entitledUi.sectionHidden === false &&
    entitledUi.statusHidden === false &&
    entitledUi.removeHidden === true &&
    entitledUi.restoreHidden === false;
  console.log(entitledOk ? "PASS  entitled shows Ad-free status" : "FAIL  entitled hides status");

  if (pageErrors.length) {
    console.log("\nConsole errors (first 3):");
    pageErrors.slice(0, 3).forEach((e) => console.log(" -", e.slice(0, 120)));
  }

  await browser.close();
  process.exit(webPass && noBridgeUiOk && toastOk && entitledOk ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
