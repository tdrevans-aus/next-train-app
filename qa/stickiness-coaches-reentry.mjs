/**
 * CAPACITOR-13 — stickiness-coaches.js must survive double evaluation.
 * Classic scripts share one global lexical env; top-level `const ENGAGEMENT_KEY`
 * used to throw SyntaxError on re-eval.
 * Usage: node qa/stickiness-coaches-reentry.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const code = fs.readFileSync(path.join(root, "public/stickiness-coaches.js"), "utf8");

function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console,
    Boolean,
    Date,
    Intl,
    JSON,
    Error,
    setTimeout() {},
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
    },
    document: {
      readyState: "complete",
      addEventListener() {},
      getElementById() {
        return null;
      },
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return { sandbox, store };
}

const { sandbox } = makeSandbox();
const ctx = vm.createContext(sandbox);

vm.runInContext(code, ctx, { filename: "stickiness-coaches.js" });
const first = ctx.window.nextTrainStickinessCoaches;
if (!first || typeof first.readEngagement !== "function") {
  throw new Error("first eval did not expose nextTrainStickinessCoaches");
}

const openAfterFirst = first.readEngagement().appOpenCount;

try {
  vm.runInContext(code, ctx, { filename: "stickiness-coaches.js" });
} catch (error) {
  throw new Error(`second eval threw: ${error.name}: ${error.message}`);
}

const second = ctx.window.nextTrainStickinessCoaches;
if (second !== first) {
  throw new Error("second eval replaced nextTrainStickinessCoaches (expected idempotent early return)");
}

const openAfterSecond = second.readEngagement().appOpenCount;
if (openAfterSecond !== openAfterFirst) {
  throw new Error(
    `appOpenCount changed on re-eval (${openAfterFirst} → ${openAfterSecond}); init must be idempotent`
  );
}

console.log("PASS stickiness-coaches-reentry");
