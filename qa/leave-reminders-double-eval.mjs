/**
 * CAPACITOR-Z — leave-reminders.js must tolerate classic-script re-eval
 * without SyntaxError on LEAVE_REMINDER_SETTINGS_KEY.
 * Usage: node qa/leave-reminders-double-eval.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const code = fs.readFileSync(path.join(root, "public/leave-reminders.js"), "utf8");

function makeContext() {
  const document = {
    readyState: "complete",
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
  };
  const localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
  };
  const sessionStorage = {
    getItem() {
      return null;
    },
  };
  const ctx = {
    console,
    document,
    localStorage,
    sessionStorage,
    Boolean,
    Number,
    Math,
    Object,
    JSON,
    Set,
    Map,
    Promise,
    setTimeout,
    clearTimeout,
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  return vm.createContext(ctx);
}

const ctx = makeContext();
try {
  vm.runInContext(code, ctx, { filename: "leave-reminders.js" });
  vm.runInContext(code, ctx, { filename: "leave-reminders.js" });
} catch (error) {
  console.error(`FAIL ${error.name}: ${error.message}`);
  process.exit(1);
}

if (typeof ctx.nextTrainLeaveReminders?.loadReminderSettings !== "function") {
  console.error("FAIL nextTrainLeaveReminders bridge missing after double eval");
  process.exit(1);
}

if (Object.prototype.hasOwnProperty.call(ctx, "LEAVE_REMINDER_SETTINGS_KEY")) {
  console.error("FAIL LEAVE_REMINDER_SETTINGS_KEY leaked onto global");
  process.exit(1);
}

console.log("PASS leave-reminders-double-eval");
