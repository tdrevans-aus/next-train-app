/**
 * Trace the app's own geolocation wrapper inside the running WebView, and verify
 * which build of geo-bundle.js is actually loaded on the device.
 * Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
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
    socket.addEventListener("error", () => reject(new Error("socket error")));
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.consoleAPICalled") {
      const text = message.params.args
        .map((arg) => (arg.value !== undefined ? String(arg.value) : arg.description ?? ""))
        .join(" ");
      console.log(`    [console.${message.params.type}] ${text}`);
      return;
    }
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

async function evaluate(client, label, expression, timeout = 120000) {
  const started = Date.now();
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout,
  });

  if (result.exceptionDetails) {
    console.log(`${label} [${Date.now() - started}ms]: THREW ${result.exceptionDetails.exception?.description ?? "unknown"}`);
    return;
  }

  console.log(`${label} [${Date.now() - started}ms]: ${JSON.stringify(result.result.value)}`);
}

async function run() {
  const page = await findPage();
  console.log(`Attached to ${page.title} (${page.url})\n`);
  const client = createClient(page.webSocketDebuggerUrl);
  await client.send("Runtime.enable");

  await evaluate(
    client,
    "bundleMarkers",
    `(async () => {
      const source = await (await fetch("/geo-bundle.js")).text();
      return JSON.stringify({
        bytes: source.length,
        hasWithDeadline: source.includes("withDeadline"),
        hasNavigatorAttemptLog: source.includes("navigator.geolocation attempt"),
        hasFallingBackLog: source.includes("Falling back to navigator.geolocation"),
        hasResetCache: source.includes("resetLocationPermissionCache"),
        androidSoftTimeout5000: source.includes("8000") && source.includes("5000"),
        timeoutLiterals: (source.match(/(?:\\?\\?|:)\\s*(?:isIos\\(\\)\\s*\\?\\s*)?\\d{4,5}/g) || []).slice(0, 20)
      });
    })()`
  );

  console.log("\n--- calling window.NextTrainGeo.getCurrentPosition (the app's real path) ---");
  await evaluate(
    client,
    "NextTrainGeo.getCurrentPosition",
    `(async () => {
      const started = Date.now();
      try {
        const result = await window.NextTrainGeo.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        });
        return JSON.stringify({ ms: Date.now() - started, coords: result?.coords ?? null });
      } catch (error) {
        return JSON.stringify({
          ms: Date.now() - started,
          errorMessage: String(error?.message ?? error),
          errorCode: String(error?.code ?? "")
        });
      }
    })()`
  );

  console.log("\n--- nearby state after that call ---");
  await evaluate(
    client,
    "nearbyState",
    `JSON.stringify({
      session: window.nextTrainNearby?.getNearbySession?.() ?? null,
      loadingState: window.nextTrainNearby?.shouldShowNearbyLoadingState?.() ?? null,
      errorKind: window.nextTrainNearby?.getNearbyErrorKind?.() ?? null,
      routeText: document.getElementById("route")?.textContent?.trim() ?? null,
      lastGpsCache: localStorage.getItem("nextTrainLastGps"),
      lastStationCache: localStorage.getItem("nextTrainLastNearbyStation")
    })`
  );

  client.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
