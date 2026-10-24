/**
 * The Edinburgh Trams switch. One field, one place: `tramsLive` on the
 * `edinburgh` entry in lib/providers/registry.js. It is absent/false until
 * Mark's flip PR sets it to `true`; with it off, every Edinburgh surface
 * (boards, /api/directions, /api/city-stations, /api/country-stations,
 * /api/cities, Near me, the UK region catalog) is byte-identical to the
 * pre-wiring state, which qa/edinburgh-trams-planned-gate.mjs proves against a
 * golden captured from master. The status of the city itself stays `live` for
 * National Rail — this switch is scoped to the tram mode only.
 *
 * Why a registry field rather than an environment variable: the flip is a
 * reviewed one-line PR (lazy-consensus window, revertable), and an env var
 * would let a deployment setting silently change what riders see.
 */
import { getCity } from "../../providers/registry.js";

export function isEdinburghTramsLive() {
  return getCity("edinburgh")?.tramsLive === true;
}
