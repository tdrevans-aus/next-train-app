var NextTrainAdFreeNative = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/@capgo/native-purchases/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    NativePurchasesWeb: () => NativePurchasesWeb
  });
  var import_core, NativePurchasesWeb;
  var init_web = __esm({
    "node_modules/@capgo/native-purchases/dist/esm/web.js"() {
      import_core = __require("@capacitor/core");
      NativePurchasesWeb = class extends import_core.WebPlugin {
        async restorePurchases() {
          console.error("restorePurchases only mocked in web");
        }
        async getProducts(options) {
          console.error("getProducts only mocked in web " + options);
          return { products: [] };
        }
        async getProduct(options) {
          console.error("getProduct only mocked in web " + options);
          return { product: {} };
        }
        async purchaseProduct(options) {
          console.error("purchaseProduct only mocked in web" + options);
          return { transactionId: "transactionId" };
        }
        async isBillingSupported() {
          console.error("isBillingSupported only mocked in web");
          return { isBillingSupported: false };
        }
        async getPluginVersion() {
          console.warn("Cannot get plugin version in web");
          return { version: "default" };
        }
        async getPurchases(options) {
          console.error("getPurchases only mocked in web " + options);
          return { purchases: [] };
        }
        async manageSubscriptions() {
          console.error("manageSubscriptions only mocked in web");
        }
        async presentOfferCodeRedeemSheet() {
          console.error("presentOfferCodeRedeemSheet only mocked in web");
        }
        async acknowledgePurchase(options) {
          void options;
          console.error("acknowledgePurchase only mocked in web");
        }
        async consumePurchase(options) {
          void options;
          throw new Error("consumePurchase is only available on Android");
        }
        async getStorefront() {
          console.error("getStorefront only mocked in web");
          return { countryCode: "" };
        }
        async getAppTransaction() {
          console.error("getAppTransaction only mocked in web");
          return {
            appTransaction: {
              originalAppVersion: "1.0.0",
              originalPurchaseDate: (/* @__PURE__ */ new Date()).toISOString(),
              bundleId: "com.example.app",
              appVersion: "1.0.0",
              environment: null
            }
          };
        }
        async isEntitledToOldBusinessModel(options) {
          void options;
          console.error("isEntitledToOldBusinessModel only mocked in web");
          return {
            isOlderVersion: false,
            originalAppVersion: "1.0.0"
          };
        }
      };
    }
  });

  // public/ad-free-native.mjs
  var ad_free_native_exports = {};
  __export(ad_free_native_exports, {
    PURCHASE_TYPE: () => PURCHASE_TYPE,
    getInAppProduct: () => getInAppProduct,
    getInAppPurchases: () => getInAppPurchases,
    isBillingSupported: () => isBillingSupported,
    purchaseInAppProduct: () => purchaseInAppProduct,
    purchaseIncludesProduct: () => purchaseIncludesProduct,
    restoreInAppPurchases: () => restoreInAppPurchases
  });

  // node_modules/@capgo/native-purchases/dist/esm/index.js
  var import_core2 = __require("@capacitor/core");

  // node_modules/@capgo/native-purchases/dist/esm/definitions.js
  var ATTRIBUTION_NETWORK;
  (function(ATTRIBUTION_NETWORK2) {
    ATTRIBUTION_NETWORK2[ATTRIBUTION_NETWORK2["APPLE_SEARCH_ADS"] = 0] = "APPLE_SEARCH_ADS";
    ATTRIBUTION_NETWORK2[ATTRIBUTION_NETWORK2["ADJUST"] = 1] = "ADJUST";
    ATTRIBUTION_NETWORK2[ATTRIBUTION_NETWORK2["APPSFLYER"] = 2] = "APPSFLYER";
    ATTRIBUTION_NETWORK2[ATTRIBUTION_NETWORK2["BRANCH"] = 3] = "BRANCH";
    ATTRIBUTION_NETWORK2[ATTRIBUTION_NETWORK2["TENJIN"] = 4] = "TENJIN";
    ATTRIBUTION_NETWORK2[ATTRIBUTION_NETWORK2["FACEBOOK"] = 5] = "FACEBOOK";
  })(ATTRIBUTION_NETWORK || (ATTRIBUTION_NETWORK = {}));
  var PURCHASE_TYPE;
  (function(PURCHASE_TYPE2) {
    PURCHASE_TYPE2["INAPP"] = "inapp";
    PURCHASE_TYPE2["SUBS"] = "subs";
  })(PURCHASE_TYPE || (PURCHASE_TYPE = {}));
  var BILLING_FEATURE;
  (function(BILLING_FEATURE2) {
    BILLING_FEATURE2[BILLING_FEATURE2["SUBSCRIPTIONS"] = 0] = "SUBSCRIPTIONS";
    BILLING_FEATURE2[BILLING_FEATURE2["SUBSCRIPTIONS_UPDATE"] = 1] = "SUBSCRIPTIONS_UPDATE";
    BILLING_FEATURE2[BILLING_FEATURE2["IN_APP_ITEMS_ON_VR"] = 2] = "IN_APP_ITEMS_ON_VR";
    BILLING_FEATURE2[BILLING_FEATURE2["SUBSCRIPTIONS_ON_VR"] = 3] = "SUBSCRIPTIONS_ON_VR";
    BILLING_FEATURE2[BILLING_FEATURE2["PRICE_CHANGE_CONFIRMATION"] = 4] = "PRICE_CHANGE_CONFIRMATION";
  })(BILLING_FEATURE || (BILLING_FEATURE = {}));
  var PRORATION_MODE;
  (function(PRORATION_MODE2) {
    PRORATION_MODE2[PRORATION_MODE2["UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY"] = 0] = "UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY";
    PRORATION_MODE2[PRORATION_MODE2["IMMEDIATE_WITH_TIME_PRORATION"] = 1] = "IMMEDIATE_WITH_TIME_PRORATION";
    PRORATION_MODE2[PRORATION_MODE2["IMMEDIATE_AND_CHARGE_PRORATED_PRICE"] = 2] = "IMMEDIATE_AND_CHARGE_PRORATED_PRICE";
    PRORATION_MODE2[PRORATION_MODE2["IMMEDIATE_WITHOUT_PRORATION"] = 3] = "IMMEDIATE_WITHOUT_PRORATION";
    PRORATION_MODE2[PRORATION_MODE2["DEFERRED"] = 4] = "DEFERRED";
  })(PRORATION_MODE || (PRORATION_MODE = {}));
  var PACKAGE_TYPE;
  (function(PACKAGE_TYPE2) {
    PACKAGE_TYPE2["UNKNOWN"] = "UNKNOWN";
    PACKAGE_TYPE2["CUSTOM"] = "CUSTOM";
    PACKAGE_TYPE2["LIFETIME"] = "LIFETIME";
    PACKAGE_TYPE2["ANNUAL"] = "ANNUAL";
    PACKAGE_TYPE2["SIX_MONTH"] = "SIX_MONTH";
    PACKAGE_TYPE2["THREE_MONTH"] = "THREE_MONTH";
    PACKAGE_TYPE2["TWO_MONTH"] = "TWO_MONTH";
    PACKAGE_TYPE2["MONTHLY"] = "MONTHLY";
    PACKAGE_TYPE2["WEEKLY"] = "WEEKLY";
  })(PACKAGE_TYPE || (PACKAGE_TYPE = {}));
  var INTRO_ELIGIBILITY_STATUS;
  (function(INTRO_ELIGIBILITY_STATUS2) {
    INTRO_ELIGIBILITY_STATUS2[INTRO_ELIGIBILITY_STATUS2["INTRO_ELIGIBILITY_STATUS_UNKNOWN"] = 0] = "INTRO_ELIGIBILITY_STATUS_UNKNOWN";
    INTRO_ELIGIBILITY_STATUS2[INTRO_ELIGIBILITY_STATUS2["INTRO_ELIGIBILITY_STATUS_INELIGIBLE"] = 1] = "INTRO_ELIGIBILITY_STATUS_INELIGIBLE";
    INTRO_ELIGIBILITY_STATUS2[INTRO_ELIGIBILITY_STATUS2["INTRO_ELIGIBILITY_STATUS_ELIGIBLE"] = 2] = "INTRO_ELIGIBILITY_STATUS_ELIGIBLE";
  })(INTRO_ELIGIBILITY_STATUS || (INTRO_ELIGIBILITY_STATUS = {}));

  // node_modules/@capgo/native-purchases/dist/esm/index.js
  var NativePurchases = (0, import_core2.registerPlugin)("NativePurchases", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.NativePurchasesWeb())
  });

  // public/ad-free-native.mjs
  async function isBillingSupported() {
    try {
      const { isBillingSupported: supported } = await NativePurchases.isBillingSupported();
      return Boolean(supported);
    } catch {
      return false;
    }
  }
  async function getInAppProduct(productId) {
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [productId],
      productType: PURCHASE_TYPE.INAPP
    });
    return products?.[0] ?? null;
  }
  async function purchaseInAppProduct(productId) {
    return NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
      quantity: 1
    });
  }
  async function getInAppPurchases() {
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.INAPP
    });
    return purchases ?? [];
  }
  async function restoreInAppPurchases() {
    await NativePurchases.restorePurchases();
    return getInAppPurchases();
  }
  function purchaseIncludesProduct(purchases, productId) {
    return purchases.some(
      (purchase) => purchase.productIdentifier === productId && purchase.isActive !== false && purchase.isRevoked !== true
    );
  }
  return __toCommonJS(ad_free_native_exports);
})();
