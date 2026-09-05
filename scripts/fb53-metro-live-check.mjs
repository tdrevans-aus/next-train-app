import { fetchMetroStopBoard } from "../lib/providers/uk-metro-wm.js";

const stops = ["Jewellery Quarter", "The Hawthorns"];

for (const stop of stops) {
  console.log(`\n=== ${stop} ===`);
  try {
    const board = await fetchMetroStopBoard(stop);
    console.log(`lastUpdate: ${board.lastUpdate}`);
    console.log(`trips: ${board.trips.length}`);
    for (const t of board.trips.slice(0, 10)) {
      console.log(JSON.stringify(t));
    }
  } catch (err) {
    console.error(`ERROR: ${err.name}: ${err.message}`);
  }
}
