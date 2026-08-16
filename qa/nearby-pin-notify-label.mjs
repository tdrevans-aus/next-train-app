/**
 * Near me pin leave card — C2 copy + compact layout must not regress.
 * Usage: node qa/nearby-pin-notify-label.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..");
const html = readFileSync(join(root, "public/index.html"), "utf8");
const css = readFileSync(join(root, "public/styles/hero.css"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  html.includes('id="nearby-notify-label">Remind me when to leave</span>'),
  'index.html must label the pin remind toggle "Remind me when to leave"'
);
assert(
  !html.includes(">Notify me</span>"),
  'index.html must not use legacy "Notify me" on #nearby-notify-section'
);
assert(
  css.includes(".nearby-pin-leave-footer .nearby-notify-row") &&
    css.includes("inline-flex") &&
    css.includes("width: fit-content") &&
    css.includes("justify-content: flex-start"),
  "hero.css must keep compact nearby-notify-row layout (inline-flex, fit-content, flex-start)"
);
assert(
  !css.match(/\.nearby-pin-leave-footer \.nearby-notify-row[\s\S]*?justify-content:\s*space-between/),
  "hero.css must not use space-between on nearby-notify-row"
);

console.log("PASS  nearby-pin-notify-label (copy + compact layout)");
