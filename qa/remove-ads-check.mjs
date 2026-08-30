/**
 * Remove ads — web expectations + native-bridge diagnostic.
 * Usage: node qa/remove-ads-check.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}/?reset=1&fixture=normal&test=1`);
  await page.waitForTimeout(5000);

  // CAPACITOR-10: re-injecting the classic script must not redeclare consts.
  const reloadOk = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "ad-free-purchase.js";
        script.onload = () =>
          resolve({
            loaded: true,
            hasApi: typeof window.NextTrainAdFree?.isEntitled === "function",
          });
        script.onerror = () => resolve({ loaded: false, hasApi: false });
        document.head.appendChild(script);
      })
  );
  const redeclareErrors = pageErrors.filter((e) =>
    /AD_FREE_CACHE_KEY|already been declared/i.test(e)
  );
  const reloadPass =
    reloadOk.loaded === true &&
    reloadOk.hasApi === true &&
    redeclareErrors.length === 0;
  console.log(
    reloadPass
      ? "PASS  ad-free-purchase.js safe to re-inject"
      : "FAIL  ad-free-purchase.js re-inject"
  );
  if (!reloadPass) {
    console.error(JSON.stringify({ reloadOk, redeclareErrors }, null, 2));
  }

  const web = await page.evaluate(async () => {
    const api = window.NextTrainAdFree;
    if (!api?.ensureInit || typeof api.refreshEntitlement !== "function") {
      return {
        error: "NextTrainAdFree.refreshEntitlement missing",
        hasAdFree: Boolean(api),
        keys: api ? Object.keys(api) : [],
      };
    }

    const init = await api.ensureInit();
    await api.refreshEntitlement({ silent: true });
    return {
      isNative: window.Capacitor?.isNativePlatform?.(),
      hasNativeBridge: !!window.NextTrainAdFreeNative?.purchaseInAppProduct,
      init,
      sectionHidden: document.getElementById("menu-ad-free-section")?.hidden,
      ctaHidden: document.getElementById("menu-ad-free-cta-btn")?.hidden,
      webHintHidden: document.getElementById("menu-ad-free-web-hint")?.hidden,
      adLinkHidden: document.getElementById("ad-remove-link-wrap")?.hidden,
      listPrice: api.getLocalizedPrice?.(),
    };
  });

  console.log("\nRemove ads check — browser\n");
  if (web.error) {
    console.error(JSON.stringify(web, null, 2));
    await browser.close();
    process.exit(1);
  }

  console.log(JSON.stringify(web, null, 2));

  const webPass =
    web.ctaHidden === true &&
    web.webHintHidden === false &&
    web.adLinkHidden === true &&
    web.isNative !== true &&
    web.listPrice === "A$7.99";

  console.log(webPass ? "PASS  web Remove ads UI" : "FAIL  web Remove ads UI");

  await page.evaluate(() => {
    window.Capacitor = { isNativePlatform: () => true };
    window.NextTrainAdFreeNative = undefined;
  });
  await page.evaluate(async () => {
    await window.NextTrainAdFree?.renderMenuAdFree?.();
  });
  const nativeNoBridge = await page.evaluate(() => ({
    sectionHidden: document.getElementById("menu-ad-free-section")?.hidden === true,
    ctaHidden: document.getElementById("menu-ad-free-cta-btn")?.hidden === true,
    billingHintHidden: document.getElementById("menu-ad-free-billing-hint")?.hidden === true,
    webHintHidden: document.getElementById("menu-ad-free-web-hint")?.hidden === true,
    linkHidden: document.getElementById("ad-remove-link-wrap")?.hidden === true,
    restoreHidden: document.getElementById("menu-restore-purchase-btn")?.hidden === true,
    ctaTitle: document.getElementById("menu-ad-free-cta-title")?.textContent,
  }));
  await page.evaluate(() => {
    document.getElementById("ad-remove-link-wrap").hidden = false;
    document.getElementById("ad-remove-link")?.click();
  });
  await page.waitForTimeout(600);
  const paywallOpen = await page.evaluate(() => ({
    dialogOpen:
      document.getElementById("ad-free-dialog")?.open === true ||
      document.getElementById("ad-free-dialog")?.hasAttribute("open"),
    headline: document.querySelector("#ad-free-dialog h2")?.textContent,
  }));

  await page.evaluate(() => {
    localStorage.setItem("nextTrainAdFreeCache", "1");
  });
  await page.evaluate(async () => {
    window.NextTrainAdFreeNative = {
      getInAppPurchases: async () => [
        { productIdentifier: "com.tdrevans.nexttrain.adfree", isActive: true },
      ],
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
    statusHidden: document.getElementById("menu-ad-free-status-row")?.hidden === true,
    ctaHidden: document.getElementById("menu-ad-free-cta-btn")?.hidden === true,
    restoreHidden: document.getElementById("menu-restore-purchase-btn")?.hidden === true,
    statusTitle: document.getElementById("menu-ad-free-status-title")?.textContent,
  }));

  console.log("\nSimulated native (no bridge):");
  console.log(JSON.stringify({ nativeNoBridge, paywallOpen }, null, 2));
  const noBridgeUiOk =
    nativeNoBridge.sectionHidden === false &&
    nativeNoBridge.ctaHidden === false &&
    nativeNoBridge.webHintHidden === true &&
    nativeNoBridge.restoreHidden === true &&
    nativeNoBridge.ctaTitle === "Remove ads";
  const paywallOk =
    paywallOpen.dialogOpen === true && paywallOpen.headline === "Remove ads";
  console.log(noBridgeUiOk ? "PASS  menu when bridge missing" : "FAIL  menu when bridge missing");
  console.log(paywallOk ? "PASS  sheet opens from ad link" : "FAIL  sheet from ad link");

  console.log("\nSimulated entitled:");
  console.log(JSON.stringify(entitledUi, null, 2));
  const entitledOk =
    entitledUi.sectionHidden === false &&
    entitledUi.statusHidden === false &&
    entitledUi.ctaHidden === true &&
    entitledUi.restoreHidden === false &&
    entitledUi.statusTitle === "Ads removed";
  console.log(entitledOk ? "PASS  entitled shows Ads removed" : "FAIL  entitled status");

  if (pageErrors.length) {
    console.log("\nConsole errors (first 3):");
    pageErrors.slice(0, 3).forEach((e) => console.log(" -", e.slice(0, 120)));
  }

  await browser.close();
  process.exit(
    reloadPass && webPass && noBridgeUiOk && paywallOk && entitledOk ? 0 : 1
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
