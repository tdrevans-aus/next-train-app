/**
 * Offline — iPad/iPhone add-widget "Show steps".
 *
 * On iOS, the numbered steps list is *the* instructions (the add-widget/
 * add-another buttons can't really pin a widget there, so they're hidden and
 * a dedicated "Show steps" button is the sole reveal mechanism). After the
 * list is shown, the button hides so a second tap is not a dead control, and
 * resets when the dialog reopens.
 *
 * On Android the numbered list and its button never appear; "Add widget" /
 * "Add another" keep their real pinning behaviour and labels.
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
assert(
  /id="widget-help-show-steps-btn"/.test(html),
  "widget help is missing the dedicated Show steps button"
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
    scrollIntoView() {},
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

function buildContext({ platform }) {
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
        return platform;
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
  return { context, ensure };
}

// --- iOS: numbered steps are the sole mechanism ---
{
  const { context, ensure } = buildContext({ platform: "ios" });
  const steps = ensure("widget-help-steps");
  const showStepsBtn = ensure("widget-help-show-steps-btn");
  const pinBtn = ensure("widget-help-pin-btn");
  const addAnotherBtn = ensure("widget-help-add-another-btn");

  await context.nextTrainWidget.openWidgetHelpDialog();
  assert(showStepsBtn.hidden === false, "Show steps should be available before the list is open");
  assert(steps.hidden === true, "steps should stay hidden until Show steps is tapped");
  assert(pinBtn.hidden === true, "iOS can't pin a widget — Add widget must not render");
  assert(addAnotherBtn.hidden === true, "iOS can't pin a widget — Add another must not render");

  context.nextTrainWidget.showWidgetHelpSteps();
  assert(steps.hidden === false, "Show steps should reveal the list");
  assert(showStepsBtn.hidden === true, "Show steps should hide once the list is visible");

  context.nextTrainWidget.showWidgetHelpSteps();
  assert(showStepsBtn.hidden === true, "showing steps again must leave the button hidden");

  // Reopening the dialog resets the list and button.
  await context.nextTrainWidget.openWidgetHelpDialog();
  assert(steps.hidden === true, "steps should reset to hidden on reopen");
  assert(showStepsBtn.hidden === false, "Show steps should reset to visible on reopen");
}

// --- Android: no numbered list, no Show steps button, real pinning labels ---
{
  const { context, ensure } = buildContext({ platform: "android" });
  const steps = ensure("widget-help-steps");
  const showStepsBtn = ensure("widget-help-show-steps-btn");
  const pinBtn = ensure("widget-help-pin-btn");

  await context.nextTrainWidget.openWidgetHelpDialog();
  assert(steps.hidden === true, "Android must never show the numbered steps list");
  assert(showStepsBtn.hidden === true, "Android must never show the Show steps button");
  assert(pinBtn.hidden === false, "Android keeps the real Add widget button");
  assert(pinBtn.textContent === "Add widget", "Android must keep the Add widget label");
}

console.log("widget-help-ios-steps: ok");
