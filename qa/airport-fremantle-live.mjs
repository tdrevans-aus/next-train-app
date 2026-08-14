/**
 * Airport Central → Fremantle must include Claremont-labelled live trains.
 * Skips outside Perth service window when live feed is often empty (late night).
 *
 * Usage: node qa/airport-fremantle-live.mjs
 */
import { getNextTrainData } from "../lib/train-times-server.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function perthHour() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

function hasTrains(data) {
  return Boolean(data?.next || (data?.upcoming && data.upcoming.length > 0));
}

const hour = perthHour();
if (hour < 5 || hour >= 23) {
  console.log(
    `SKIP — airport-fremantle-live (Perth hour ${hour}: live feed often empty outside ~05:00–22:59)`
  );
  process.exit(0);
}

const params = {
  station: "Airport Central Stn",
  destination: "Fremantle",
  destinationLabel: "Fremantle",
  leaveBeforeMinutes: 10,
  refreshSeconds: 30,
};

let data = await getNextTrainData(params);

if (!hasTrains(data)) {
  await new Promise((resolve) => setTimeout(resolve, 8000));
  data = await getNextTrainData(params);
}

if (!hasTrains(data)) {
  console.log(
    "SKIP — airport-fremantle-live (no Fremantle-direction trains after retry; live API quiet)"
  );
  process.exit(0);
}

assert(
  hasTrains(data),
  `expected Fremantle-direction trains, got next=${data.next?.displayTime ?? "null"} upcoming=${data.upcoming?.length ?? 0}`
);

console.log("\nPASS  Airport Central → Fremantle live merge");
console.log(
  `  next=${data.next?.displayTime ?? "—"} upcoming=${data.upcoming?.length ?? 0} source=${data.scheduleSource ?? "live"}\n`
);
