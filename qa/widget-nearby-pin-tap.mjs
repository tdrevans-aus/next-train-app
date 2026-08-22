/**
 * Widget tap on a later Near me pin must open that departure, not skip 0.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nearby = fs.readFileSync(path.join(root, "public/nearby-mode.js"), "utf8");
const widget = fs.readFileSync(path.join(root, "public/widget.js"), "utf8");
const uiBuilder = fs.readFileSync(
  path.join(root, "android/app/src/main/java/com/tdrevans/nexttrain/WidgetUiBuilder.java"),
  "utf8"
);

assert.match(nearby, /function applyHoldingNearbyPinFocus\(/);
assert.match(nearby, /pendingTapDepartureIso/);
assert.match(nearby, /departureIso = null/);
assert.match(widget, /searchParams\.get\("departure"\)/);
assert.match(widget, /departureIso: target\.departureIso/);
assert.match(uiBuilder, /appendQueryParameter\("departure"/);

console.log("PASS  widget-nearby-pin-tap");
