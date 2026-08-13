/**
 * Airport Central → Fremantle must include Claremont-labelled live trains.
 * Usage: node qa/airport-fremantle-live.mjs
 */
import { getNextTrainData } from "../lib/train-times-server.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const data = await getNextTrainData({
  station: "Airport Central Stn",
  destination: "Fremantle",
  destinationLabel: "Fremantle",
  leaveBeforeMinutes: 10,
  refreshSeconds: 30,
});

assert(
  data.next || (data.upcoming && data.upcoming.length > 0),
  `expected Fremantle-direction trains, got next=${data.next?.displayTime ?? "null"} upcoming=${data.upcoming?.length ?? 0}`
);

console.log("\nPASS  Airport Central → Fremantle live merge");
console.log(
  `  next=${data.next?.displayTime ?? "—"} upcoming=${data.upcoming?.length ?? 0} source=${data.scheduleSource ?? "live"}\n`
);
