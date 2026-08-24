/**
 * Darwin normalizeEtd unit checks — docs/uk-provider-design.md §4
 * Usage: node qa/uk-normalize-etd.mjs
 */
import { normalizeEtd } from "../lib/providers/uk-darwin.js";

const failures = [];
const now = new Date("2026-08-23T12:00:00.000Z");

function assert(label, condition) {
  if (!condition) {
    failures.push(label);
  }
}

const onTime = normalizeEtd("14:30", "On time", now);
assert("on time uses std", onTime.displayTime === "14:30" && onTime.status === "On time");
assert("on time not cancelled", !onTime.cancelled);

const cancelled = normalizeEtd("14:30", "Cancelled", now);
assert("cancelled flag", cancelled.cancelled && cancelled.displayTime === "Cancelled");

const delayed = normalizeEtd("14:30", "Delayed", now);
assert("delayed status", delayed.status === "Delayed" && delayed.displayTime === "Delayed");

const etdTime = normalizeEtd("14:30", "14:45", now);
assert("etd HH:MM", etdTime.displayTime === "14:45");

const star = normalizeEtd("14:30", "14:45*", now);
assert("etd star", star.status === "14:45*");

const noReport = normalizeEtd("14:30", "No report", now);
assert("no report falls back", noReport.liveDeparture && noReport.displayTime === "14:30");

if (failures.length) {
  console.error("uk-normalize-etd failures:\n");
  for (const f of failures) {
    console.error(`- ${f}`);
  }
  process.exit(1);
}

console.log("uk-normalize-etd: ok");
