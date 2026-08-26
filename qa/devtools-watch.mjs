/**
 * Watch the running WebView for exceptions and nearby-mode state changes.
 * Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 * Usage: node qa/devtools-watch.mjs [seconds]
 */

const DEVTOOLS_HTTP = "http://localhost:9222/json";
const WATCH_SECONDS = Number(process.argv[2] ?? 20);

async function findPage() {
  const response = await fetch(DEVTOOLS_HTTP);
  const pages = await response.json();
  const page = pages.find((entry) => entry.type === "page");
  if (!page) {
    throw new Error("No debuggable page found");
  }
  return page;
}

function createClient(url, onEvent) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve());
    socket.addEventListener("error", () => reject(new Error("socket error")));
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method) {
      onEvent(message);
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

const STATE_EXPRESSION = `JSON.stringify({
  nearbyActive: window.nextTrainNearby?.isNearbyModeActive?.() ?? null,
  station: window.nextTrainNearby?.getNearbySession?.()?.station ?? null,
  loadingState: window.nextTrainNearby?.shouldShowNearbyLoadingState?.() ?? null,
  errorKind: window.nextTrainNearby?.getNearbyErrorKind?.() ?? null,
  routeText: document.getElementById("route")?.textContent?.trim() ?? null,
  heroText: document.getElementById("depart-display-time")?.textContent?.trim() ?? null,
  hasStationCache: Boolean(localStorage.getItem("nextTrainLastNearbyStation")),
  hasGpsCache: Boolean(localStorage.getItem("nextTrainLastGps"))
})`;

async function readState(client) {
  const result = await client.send("Runtime.evaluate", {
    expression: STATE_EXPRESSION,
    returnByValue: true,
  });
  return result.result?.value ?? "<no state>";
}

async function run() {
  const page = await findPage();
  console.log(`Attached to ${page.title} (${page.url})\n`);

  const seenExceptions = new Set();

  const client = createClient(page.webSocketDebuggerUrl, (message) => {
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      const text = details.exception?.description ?? details.text ?? "unknown";
      const key = text.split("\n")[0];
      const marker = seenExceptions.has(key) ? "(repeat)" : "(NEW)";
      seenExceptions.add(key);
      console.log(`\n!! EXCEPTION ${marker}\n${text}\n`);
      return;
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      const text = message.params.args
        .map((arg) => (arg.value !== undefined ? String(arg.value) : arg.description ?? ""))
        .join(" ");
      if (text.trim()) {
        console.log(`\n!! console.error\n${text}\n`);
      }
    }
  });

  await client.send("Runtime.enable");

  console.log(`state @0s: ${await readState(client)}`);

  const started = Date.now();
  while ((Date.now() - started) / 1000 < WATCH_SECONDS) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const elapsed = Math.round((Date.now() - started) / 1000);
    console.log(`state @${elapsed}s: ${await readState(client)}`);
  }

  client.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
