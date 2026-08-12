import * as Sentry from "@sentry/capacitor";

let enabled = false;
let appOpenTracked = false;

function readReleaseLabel(config) {
  const versionName = String(config?.appVersion || "2.1.0").trim() || "2.1.0";
  const versionCode = Number(config?.appVersionCode);
  const dist = Number.isFinite(versionCode) && versionCode > 0 ? String(versionCode) : undefined;
  return { release: `next-train@${versionName}`, dist };
}

export async function initAnalytics(config = {}) {
  const dsn = String(config?.sentryDsn || "").trim();
  if (!dsn) {
    enabled = false;
    return { enabled: false, provider: "none" };
  }

  const { release, dist } = readReleaseLabel(config);
  const initOptions = {
    dsn,
    release,
    dist,
    enableAutoSessionTracking: true,
    // Prefer JS HTTP transport so events reliably reach Sentry from the WebView.
    // Native transport was accepting capture/flush without envelopes appearing in Issues.
    enableNative: false,
    tracesSampleRate: 0,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb?.data) {
        delete breadcrumb.data.apiKey;
        delete breadcrumb.data.admobAppId;
        delete breadcrumb.data.admobBannerId;
      }
      return breadcrumb;
    },
  };

  try {
    // Always init the Capacitor SDK entrypoint; native bridge disabled above.
    await Sentry.init(initOptions);
    enabled = true;
    return { enabled: true, provider: "sentry", release, dist };
  } catch (error) {
    console.warn("Could not init crash analytics", error);
    enabled = false;
    return { enabled: false, provider: "error" };
  }
}

export function trackEvent(name, props = {}) {
  if (!enabled || !name) {
    return;
  }

  const data = { ...props };
  delete data.apiKey;
  delete data.station;
  delete data.email;

  Sentry.addBreadcrumb({
    category: "event",
    message: String(name),
    data,
    level: "info",
  });
}

export function trackAppOpen() {
  if (appOpenTracked) {
    return;
  }
  appOpenTracked = true;
  trackEvent("app_open");
}

export async function captureTestCrash() {
  if (!enabled) {
    throw new Error("Crash analytics not configured (set sentryDsn in site-config.json)");
  }
  const error = new Error("Next Train test crash (debug)");
  Sentry.captureException(error);
  await Sentry.flush(2000);
  return { sent: true, message: error.message };
}

export function isAnalyticsEnabled() {
  return enabled;
}
