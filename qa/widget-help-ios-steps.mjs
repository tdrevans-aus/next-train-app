/**
 * Offline — iPad add-widget "Show steps".
 *
 * Steps are a numbered list. After they are shown, the Show steps button is
 * hidden so a second tap is not a dead control.
 *
 * Usage: node qa/widget-help-ios-steps.mjs
 */
import { readFileSync } from "fs";
import { createContext, runInContext } from "vm";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "public/index.html"), "utf8");
const css = readFileSync(join(root, "public/styles/journey-detail.css"), "utf8");
const widgetJs = readFileSync(join(root, "public/widget.js"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const stepsBlock = html.match(/<ol id="widget-help-steps"[\s\S]*?<\/ol>/);
assert(stepsBlock, "widget help is missing the steps list");
const items = [...stepsBlock[0].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) =>
  match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
);
assert(items.length >= 4, `expected numbered steps, found ${items.length}`);
assert(
  /\.widget-help-steps\s*\{[^}]*list-style:\s*decimal/.test(css),
  "steps list must use decimal numbering"
);

function makeElement(id, tag) {
  const element = {
    id,
    tag,
    hidden: false,
    className: "",
    classList: {
      contains() {
        return false;
      },
    },
    textContent: "",
    children: [],
    append() {},
    addEventListener() {},
    setAttribute() {},
    getAttribute() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  return element;
}

const byId = new Map();
function ensure(id, tag = "div") {
  if (!byId.has(id)) {
    byId.set(id, makeElement(id, tag));
  }
  return byId.get(id);
}

const dialog = ensure("widget-help-dialog", "dialog");
dialog.showModal = () => {};
dialog.close = () => {};
ensure("widget-help-manual", "p").hidden = true;
ensure("widget-help-steps", "ol").hidden = true;
ensure("widget-help-pin-first", "div").hidden = false;
ensure("widget-help-already-have", "div").hidden = true;
ensure("widget-help-title", "h2");
ensure("widget-help-pin-btn", "button");
ensure("widget-help-show-steps-btn", "button").hidden = true;
ensure("widget-help-add-another-btn", "button").hidden = true;
ensure("widget-help-done-btn", "button");

const documentStub = {
  readyState: "loading",
  hidden: false,
  getElementById(id) {
    return byId.get(id) ?? null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
  createElement: makeElement,
};

const windowStub = {
  document: documentStub,
  Capacitor: {
    isNativePlatform() {
      return true;
    },
    getPlatform() {
      return "ios";
    },
    registerPlugin() {
      return {
        async getWidgetInstanceCount() {
          return { count: 0 };
        },
        async requestPinWidget() {
          return { requested: false };
        },
      };
    },
  },
  nextTrainApp: {
    openAppDialog() {},
  },
  sessionStorage: {
    getItem() {
      return null;
    },
    setItem() {},
  },
  localStorage: {
    getItem() {
      return "{}";
    },
  },
  setTimeout() {
    return 0;
  },
  console,
};
windowStub.window = windowStub;

const context = createContext(windowStub);
runInContext(widgetJs, context, { filename: "widget.js" });

const steps = ensure("widget-help-steps");
const showStepsBtn = ensure("widget-help-show-steps-btn");

await context.nextTrainWidget.openWidgetHelpDialog();
assert(showStepsBtn.hidden === false, "Show steps should be available before the list is open");
assert(steps.hidden === true, "steps should stay hidden until Show steps is tapped");

context.nextTrainWidget.showWidgetHelpSteps();
assert(steps.hidden === false, "Show steps should reveal the list");
assert(showStepsBtn.hidden === true, "Show steps should hide once the list is visible");

context.nextTrainWidget.showWidgetHelpSteps();
assert(showStepsBtn.hidden === true, "showing steps again must leave the button hidden");

console.log("widget-help-ios-steps: ok");
