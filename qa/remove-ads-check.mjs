/**
 * Pro / Remove ads — web expectations + native-bridge diagnostic.
 * Usage: node qa/remove-ads-check.mjs
 *
 * Respects NextTrainPro.isProMonetizationShipped() (currently parked = false).
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
      proShipped: window.NextTrainPro?.isProMonetizationShipped?.() === true,
      init,
      proState: window.NextTrainPro?.getStateId?.(),
      sectionHidden: document.getElementById("menu-pro-section")?.hidden,
      ctaHidden: document.getElementById("menu-pro-cta-btn")?.hidden,
      webHintHidden: document.getElementById("menu-pro-web-hint")?.hidden,
      adLinkHidden: document.getElementById("ad-remove-link-wrap")?.hidden,
    };
  });

  console.log("\nPro purchase check — browser\n");
  if (web.error) {
    console.error(JSON.stringify(web, null, 2));
    await browser.close();
    process.exit(1);
  }

  console.log(JSON.stringify(web, null, 2));

  // Parked Pro: Menu stays quiet on web. Shipped Pro: CTA hidden, Android hint visible.
  const webPass = web.proShipped
    ? web.ctaHidden === true &&
      web.webHintHidden === false &&
      web.adLinkHidden === true &&
      web.isNative !== true
    : web.sectionHidden === true &&
      web.ctaHidden === true &&
      web.webHintHidden === true &&
      web.adLinkHidden === true &&
      web.isNative !== true;

  console.log(
    webPass
      ? `PASS  web Pro UI (${web.proShipped ? "shipped" : "parked"})`
      : "FAIL  web Pro UI"
  );

  // Force shipped path for Menu / paywall assertions.
  await page.evaluate(() => {
    window.Capacitor = { isNativePlatform: () => true };
    window.NextTrainAdFreeNative = undefined;
    if (window.NextTrainPro) {
      window.NextTrainPro.isProMonetizationShipped = () => true;
    }
  });
  await page.evaluate(async () => {
    await window.NextTrainProPurchase?.renderMenuPro?.();
  });
  const nativeNoBridge = await page.evaluate(() => ({
    sectionHidden: document.getElementById("menu-pro-section")?.hidden === true,
    ctaHidden: document.getElementById("menu-pro-cta-btn")?.hidden === true,
    billingHintHidden: document.getElementById("menu-pro-billing-hint")?.hidden === true,
    webHintHidden: document.getElementById("menu-pro-web-hint")?.hidden === true,
    linkHidden: document.getElementById("ad-remove-link-wrap")?.hidden === true,
  }));
  await page.evaluate(() => {
    document.getElementById("ad-remove-link-wrap").hidden = false;
    document.getElementById("ad-remove-link")?.click();
  });
  await page.waitForTimeout(600);
  const paywallOpen = await page.evaluate(() => ({
    paywallOpen: document.getElementById("pro-paywall-dialog")?.open === true,
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
    if (typeof window.NextTrainAdFree?.refreshEntitlement !== "function") {
      throw new Error("refreshEntitlement undefined");
    }
    await window.NextTrainAdFree.refreshEntitlement({ silent: true });
    await window.NextTrainProPurchase.renderMenuPro();
  });
  const entitledUi = await page.evaluate(() => ({
    sectionHidden: document.getElementById("menu-pro-section")?.hidden === true,
    statusHidden: document.getElementById("menu-pro-status-row")?.hidden === true,
    ctaHidden: document.getElementById("menu-pro-cta-btn")?.hidden === true,
    restoreHidden: document.getElementById("menu-restore-purchase-btn")?.hidden === true,
    proState: window.NextTrainPro?.getStateId?.(),
  }));

  console.log("\nSimulated native (shipped + no bridge):");
  console.log(JSON.stringify({ nativeNoBridge, paywallOpen }, null, 2));
  const noBridgeUiOk =
    nativeNoBridge.sectionHidden === false &&
    nativeNoBridge.ctaHidden === false &&
    nativeNoBridge.webHintHidden === true;
  const paywallOk = paywallOpen.paywallOpen === true;
  console.log(noBridgeUiOk ? "PASS  billing hint shown when bridge missing" : "FAIL  menu when bridge missing");
  console.log(paywallOk ? "PASS  paywall opens from ad link" : "FAIL  paywall from ad link");

  console.log("\nSimulated entitled:");
  console.log(JSON.stringify(entitledUi, null, 2));
  const entitledOk =
    entitledUi.sectionHidden === false &&
    entitledUi.statusHidden === false &&
    entitledUi.ctaHidden === true &&
    entitledUi.restoreHidden === false &&
    entitledUi.proState === "pro_paid";
  console.log(entitledOk ? "PASS  entitled shows Pro status" : "FAIL  entitled Pro status");

  if (pageErrors.length) {
    console.log("\nConsole errors (first 3):");
    pageErrors.slice(0, 3).forEach((e) => console.log(" -", e.slice(0, 120)));
  }

  await browser.close();
  process.exit(webPass && noBridgeUiOk && paywallOk && entitledOk ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
