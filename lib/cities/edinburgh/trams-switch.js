/**
 * The Edinburgh Trams switch. One field, one place: `tramsLive` on the
 * `edinburgh` entry in lib/providers/registry.js. It is `true` since the
 * 25 Oct 2026 flip; setting it back to false returns every Edinburgh surface
 * (boards, /api/directions, /api/city-stations, /api/country-stations,
 * /api/cities, Near me, the UK region catalog) to National Rail only. The
 * status of the city itself stays `live` for National Rail — this switch is
 * scoped to the tram mode only.
 *
 * Why a registry field rather than an environment variable: the flip is a
 * reviewed one-line PR (lazy-consensus window, revertable), and an env var
 * would let a deployment setting silently change what riders see.
 */
import { getCity } from "../../providers/registry.js";

export function isEdinburghTramsLive() {
  return getCity("edinburgh")?.tramsLive === true;
}
