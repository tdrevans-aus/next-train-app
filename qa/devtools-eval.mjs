/**
 * Evaluate an arbitrary expression inside the running WebView.
 * Requires: adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 * Usage: node qa/devtools-eval.mjs "JSON.stringify({ foo: 1 })"
 */

import fs from "fs";

const DEVTOOLS_HTTP = "http://localhost:9222/json";

// Shell quoting mangles inline JS, so allow the expression to come from a file.
const args = process.argv.slice(2);
const fileFlagIndex = args.indexOf("--file");
const EXPRESSION =
  fileFlagIndex !== -1
    ? fs.readFileSync(args[fileFlagIndex + 1], "utf8")
    : args.join(" ");

if (!EXPRESSION.trim()) {
  console.error("Provide an expression to evaluate, or --file <path>.");
  process.exit(1);
}

async function findPage() {
  const response = await fetch(DEVTOOLS_HTTP);
  const pages = await response.json();
  const page = pages.find((entry) => entry.type === "page");
  if (!page) {
    throw new Error("No debuggable page found");
  }
  return page;
}

async function run() {
  const page = await findPage();
  const socket = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("error", () => reject(new Error("socket error")));
  });

  const result = await new Promise((resolve, reject) => {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id === 1) {
        if (message.error) {
          reject(new Error(message.error.message));
          return;
        }
        resolve(message.result);
      }
    });
    socket.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
          expression: EXPRESSION,
          awaitPromise: true,
          returnByValue: true,
          timeout: 30000,
        },
      })
    );
  });

  if (result.exceptionDetails) {
    console.log(`THREW: ${result.exceptionDetails.exception?.description ?? "unknown"}`);
  } else {
    console.log(result.result.value);
  }

  socket.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
