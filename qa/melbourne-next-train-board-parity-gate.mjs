/**
 * Melbourne: the saved-route endpoint (/api/next-train) must agree with the board
 * (docs/jim-brief-eaglemont-next-train-vs-board.md, 8 Oct 2026).
 *
 * Eaglemont -> "Flinders Street" (bare hub label, no "<Line> Line + " prefix for the #440 alias
 * table to catch) returned next=null while the board showed "Flinders Street (Hurstbridge Line)".
 *
 * Fixture-backed (no network, no key): a synthetic Melbourne board for several Hurstbridge /
 * Mernda group stations is pushed through the same pure board->next-train step production uses.
 * For every chip with >= 1 board trip, the canonical label, the retired "<Line> + hub" label (via
 * the real server-side alias canonicalizer) and the bare hub label must all return the same,
 * non-null next train. Also asserts a bare hub label echoes the canonical chip when unambiguous
 * (Eaglemont) and never invents a train when the station has no hub-bound trip.
 */
import { canonicalizeDirectionConfig } from "../lib/cities/direction-label-aliases.js";
import { nextTrainFromBoard } from "../lib/cities/melbourne/dogfood-next-train.js";

function assert(cond, msg) {
  if (!cond) {
    console.error(`melbourne-next-train-board-parity-gate: FAIL — ${msg}`);
    process.exit(1);
  }
}

const now = new Date("2026-10-08T10:00:00.000Z");
const at = (min) => new Date(now.getTime() + min * 60000);
let seq = 0;
function trip(destination, min, line) {
  seq += 1;
  return {
    tripId: `02-FIX--${seq}`,
    stopId: "1",
    liveDeparture: at(min).toISOString(),
    scheduledDeparture: at(min).toISOString(),
    displayTime: "00:00",
    scheduledDisplayTime: "00:00",
    platform: "1",
    destination,
    stopHeadsign: "",
    routeShortName: line,
    routeLongName: `${line} Line`,
    routeDesc: "",
    status: "On time",
    cancelled: false,
    realtime: true,
  };
}

/** station -> { line(s) with hub chips, outbound chips } */
const boards = {
  Eaglemont: [trip("Flinders Street (Hurstbridge Line)", 37, "Hurstbridge"), trip("Eltham", 12, "Hurstbridge"), trip("Hurstbridge", 16, "Hurstbridge")],
  Ivanhoe: [trip("Flinders Street (Hurstbridge Line)", 22, "Hurstbridge"), trip("Hurstbridge", 9, "Hurstbridge")],
  Rosanna: [trip("Flinders Street (Hurstbridge Line)", 5, "Hurstbridge"), trip("Eltham", 11, "Hurstbridge")],
  Macleod: [trip("Flinders Street (Hurstbridge Line)", 14, "Hurstbridge"), trip("Hurstbridge", 3, "Hurstbridge")],
  "Clifton Hill": [
    trip("Flinders Street (Hurstbridge Line)", 18, "Hurstbridge"),
    trip("Flinders Street (Mernda Line)", 7, "Mernda"),
    trip("Mernda", 10, "Mernda"),
  ],
};

let checked = 0;
for (const [station, trips] of Object.entries(boards)) {
  const board = { stationName: station, lastUpdate: now.toISOString(), trips };
  const chips = [...new Set(trips.map((t) => t.destination))];
  for (const chip of chips) {
    const forms = [chip];
    const m = chip.match(/^Flinders Street \((.+) Line\)$/);
    if (m) forms.push(`${m[1]} Line + Flinders Street`, "Flinders Street");
    const expected = trips
      .filter((t) => t.destination === chip)
      .sort((a, b) => new Date(a.liveDeparture) - new Date(b.liveDeparture))[0];
    for (const form of forms) {
      const config = canonicalizeDirectionConfig("melbourne", { station, destination: form, destinationLabel: form });
      const res = nextTrainFromBoard(board, { ...config, leaveBeforeMinutes: 5, refreshSeconds: 60, now });
      checked += 1;
      if (form === "Flinders Street" && station === "Clifton Hill") {
        // Two hub chips: bare label is ambiguous, must return the soonest of them (Mernda, +7).
        assert(res.next, `${station} bare "Flinders Street" returned no train though the board has hub trips`);
        assert(
          res.next.departure === at(7).toISOString(),
          `${station} bare "Flinders Street" must return the soonest hub-bound train across lines`
        );
        continue;
      }
      assert(res.next, `${station} "${form}" returned next=null but the board has a "${chip}" trip`);
      assert(
        res.next.departure === expected.liveDeparture,
        `${station} "${form}" returned ${res.next.departure}, board's "${chip}" next is ${expected.liveDeparture}`
      );
      if (form === "Flinders Street") {
        assert(res.config.destination === chip, `${station} bare hub label must echo canonical "${chip}", got "${res.config.destination}"`);
      }
    }
  }
}

// No hub-bound trip on the board: the bare label must not invent one.
const noHub = nextTrainFromBoard(
  { stationName: "Eaglemont", lastUpdate: now.toISOString(), trips: [trip("Eltham", 12, "Hurstbridge")] },
  { station: "Eaglemont", destination: "Flinders Street", leaveBeforeMinutes: 5, refreshSeconds: 60, now }
);
assert(noHub.next === null, "bare hub label must stay null when the board has no hub-bound trip");

console.log(`melbourne-next-train-board-parity-gate: ok (${checked} chip/label-form checks across ${Object.keys(boards).length} stations)`);
