/**
 * GTFS-RT bindings vendored for Vercel (node_modules is not always traced).
 */
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const bindings = require(join(dirname(fileURLToPath(import.meta.url)), "gtfs-realtime-bindings/gtfs-realtime.js"));

export default bindings;
