/**
 * Evaluate diagnostics inside the running Android WebView via Chrome DevTools Protocol.
 * Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 * Usage: node qa/devtools-probe.mjs
 */

const DEVTOOLS_HTTP = "http://localhost:9222/json";

async function findPage() {
  const response = await fetch(DEVTOOLS_HTTP);
  const pages = await response.json();
  const page = pages.find((entry) => entry.type === "page");
  if (!page) {
    throw new Error("No debuggable page found");
  }
  return page;
}

function createClient(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve());
    socket.addEventListener("error", (event) => reject(new Error(`socket error: ${event?.message ?? "unknown"}`)));
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(message.error.message));
      return;
    }
    entry.resolve(message.result);
  });

  async function send(method, params = {}) {
    await ready;
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  return { send, close: () => socket.close() };
}

async function evaluate(client, label, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 40000,
  });

  if (result.exceptionDetails) {
    console.log(`${label}: THREW ${result.exceptionDetails.exception?.description ?? "unknown"}`);
    return;
  }

  console.log(`${label}: ${JSON.stringify(result.result.value)}`);
}

async function run() {
  const page = await findPage();
  console.log(`Attached to ${page.title} (${page.url})\n`);
  const client = createClient(page.webSocketDebuggerUrl);

  await evaluate(
    client,
    "platform",
    `JSON.stringify({
      platform: window.Capacitor?.getPlatform?.() ?? null,
      isNative: window.Capacitor?.isNativePlatform?.() ?? null,
      geoPluginAvailable: window.Capacitor?.isPluginAvailable?.("Geolocation") ?? null,
      hasNextTrainGeo: Boolean(window.NextTrainGeo),
      nextTrainGeoKeys: window.NextTrainGeo ? Object.keys(window.NextTrainGeo) : [],
      hasNavigatorGeo: Boolean(navigator.geolocation)
    })`
  );

  await evaluate(
    client,
    "nearbyState",
    `JSON.stringify({
      nearbyActive: window.nextTrainNearby?.isNearbyModeActive?.() ?? null,
      session: window.nextTrainNearby?.getNearbySession?.() ?? null,
      loadingState: window.nextTrainNearby?.shouldShowNearbyLoadingState?.() ?? null,
      errorKind: window.nextTrainNearby?.getNearbyErrorKind?.() ?? null,
      routeText: document.getElementById("route")?.textContent?.trim() ?? null,
      heroText: document.getElementById("depart-display-time")?.textContent?.trim() ?? null,
      updatedText: document.getElementById("updated")?.textContent?.trim() ?? null
    })`
  );

  await evaluate(
    client,
    "permissionCheck",
    `(async () => {
      const started = Date.now();
      try {
        const status = await window.Capacitor.Plugins.Geolocation.checkPermissions();
        return JSON.stringify({ ms: Date.now() - started, status });
      } catch (error) {
        return JSON.stringify({ ms: Date.now() - started, error: String(error?.message ?? error) });
      }
    })()`
  );

  await evaluate(
    client,
    "capacitorGetCurrentPosition",
    `(async () => {
      const started = Date.now();
      try {
        const position = await window.Capacitor.Plugins.Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000
        });
        return JSON.stringify({
          ms: Date.now() - started,
          lat: position?.coords?.latitude ?? null,
          lng: position?.coords?.longitude ?? null
        });
      } catch (error) {
        return JSON.stringify({
          ms: Date.now() - started,
          errorMessage: String(error?.message ?? error),
          errorCode: String(error?.code ?? "")
        });
      }
    })()`
  );

  await evaluate(
    client,
    "navigatorGetCurrentPosition",
    `(async () => {
      const started = Date.now();
      return await new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        setTimeout(() => finish(JSON.stringify({ ms: Date.now() - started, outcome: "NO CALLBACK after 12s" })), 12000);
        try {
          navigator.geolocation.getCurrentPosition(
            (position) => finish(JSON.stringify({
              ms: Date.now() - started,
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })),
            (error) => finish(JSON.stringify({
              ms: Date.now() - started,
              errorMessage: String(error?.message ?? error),
              errorCode: error?.code ?? null
            })),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        } catch (error) {
          finish(JSON.stringify({ ms: Date.now() - started, threw: String(error?.message ?? error) }));
        }
      });
    })()`
  );

  await evaluate(
    client,
    "appFindNearestStation",
    `(async () => {
      const started = Date.now();
      try {
        const nearest = await window.nextTrainApp.findNearestStation({ allowSessionShortcut: false });
        return JSON.stringify({ ms: Date.now() - started, nearest });
      } catch (error) {
        return JSON.stringify({ ms: Date.now() - started, errorMessage: String(error?.message ?? error) });
      }
    })()`
  );

  client.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
