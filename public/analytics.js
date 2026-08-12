(function (global) {
  let initPromise = null;
  let enabled = false;

  async function loadSiteConfig() {
    try {
      const response = await fetch("/site-config.json", { cache: "no-store" });
      if (!response.ok) {
        return {};
      }
      return await response.json();
    } catch {
      return {};
    }
  }

  async function ensureInit() {
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      const config = await loadSiteConfig();
      const native = global.NextTrainAnalyticsNative;
      if (!native?.initAnalytics) {
        enabled = false;
        return { enabled: false };
      }

      const result = await native.initAnalytics(config);
      enabled = Boolean(result?.enabled);
      if (enabled) {
        native.trackAppOpen?.();
      }
      return result;
    })();

    return initPromise;
  }

  function track(name, props) {
    if (!enabled) {
      return;
    }
    global.NextTrainAnalyticsNative?.trackEvent?.(name, props ?? {});
  }

  async function testCrash() {
    await ensureInit();
    return global.NextTrainAnalyticsNative?.captureTestCrash?.();
  }

  global.NextTrainAnalytics = {
    ensureInit,
    track,
    testCrash,
    isEnabled: () => enabled,
  };

  const bootstrap = () => {
    const { waitForCapacitor } = global.NextTrainScripts ?? {};
    if (waitForCapacitor) {
      waitForCapacitor().then(() => ensureInit());
      return;
    }
    ensureInit();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})(window);
