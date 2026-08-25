/**
 * CAPACITOR-11 — widget.js must guard classic-script re-entry so top-level
 * `let widgetMenuHintToastTimer` is not redeclared in the global lexical scope.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const widget = fs.readFileSync(path.join(root, "public/widget.js"), "utf8");

assert.match(widget, /\(function\s*\(\)\s*\{/);
assert.match(widget, /if\s*\(\s*window\.nextTrainWidget\s*\)\s*(?:\{[^}]*return|return)/);
assert.match(widget, /let widgetMenuHintToastTimer\s*=\s*null/);
assert.match(widget, /\}\)\(\);\s*$/);

function makeDocument() {
  return {
    readyState: "complete",
    body: { appendChild() {} },
    documentElement: { style: {} },
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    createElement() {
      return {
        style: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        dataset: {},
        setAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        appendChild() {},
        remove() {},
      };
    },
  };
}

const documentRef = makeDocument();
const windowRef = {
  document: documentRef,
  location: { search: "", href: "http://localhost/" },
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  },
  setTimeout() {
    return 1;
  },
  clearTimeout() {},
  addEventListener() {},
  removeEventListener() {},
  Capacitor: undefined,
  NextTrainScripts: undefined,
  NextTrainPro: undefined,
  nextTrainApp: undefined,
  innerWidth: 390,
};
windowRef.window = windowRef;

const sandbox = {
  window: windowRef,
  document: documentRef,
  localStorage: windowRef.localStorage,
  setTimeout: windowRef.setTimeout,
  clearTimeout: windowRef.clearTimeout,
  console,
  Boolean,
  String,
  Number,
  JSON,
  Array,
  Object,
  Math,
  Date,
  Error,
  Promise,
  Map,
  Set,
  parseInt,
  parseFloat,
  isNaN,
  encodeURIComponent,
  decodeURIComponent,
  URL,
  URLSearchParams,
};

vm.runInNewContext(widget, sandbox, { filename: "widget.js" });
assert.equal(typeof sandbox.window.nextTrainWidget, "object");
assert.equal(typeof sandbox.window.nextTrainWidget.showMenuChromeHint, "function");
const firstApi = sandbox.window.nextTrainWidget;

// Re-evaluate in the same realm — must not throw SyntaxError on lexical bindings.
vm.runInNewContext(widget, sandbox, { filename: "widget.js" });
assert.equal(sandbox.window.nextTrainWidget, firstApi);

console.log("PASS  widget-script-reentry");
