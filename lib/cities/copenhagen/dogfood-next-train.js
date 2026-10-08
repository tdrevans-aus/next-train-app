/**
 * Copenhagen next-train payload for local testers, ahead of the eventual flip.
 * Registry status stays `planned` (docs/copenhagen-d1/jim-handoff.md) — this is the
 * pre-flip dogfood wiring pass; Mark/Tim make the flip call, not this file.
 *
 * Directions are derived LIVE from the board's already-computed chips (`M1 + Vestamager`,
 * `M3 + København H (Metro)`, `A + Køge`, `Regionaltog + Helsingør St.`, `Öresundståg +
 * Ronneby`, ...) rather than from a static marketing-directions enumeration. DSB Regional/
 * InterCity/InterCityLyn/Öresundståg carry no printed line code and no confirmed exhaustive
 * destination list (docs/copenhagen-d1/jim-handoff.md open item 5 — "indicative, not
 * exhaustive"), so baking a fixed chip list here would fabricate coverage the D1 pack does
 * not claim. lib/providers/copenhagen.js's tripAllowed()/mapCopenhagenTrip() already do all
 * the per-station board-eligibility filtering and chip composition (including the
 * Metro/S-tog/DSB doNotGroup splits) — this module reuses that verbatim rather than forking
 * it, same "derive live, don't fork" shape as the UK National Rail regions that also have no
 * printed line map (e.g. lib/cities/greater-manchester/dogfood-next-train.js).
 *
 * Schedule-only (static GTFS; no Rejseplanen API 2.0/SIRI-ET key wired — see
 * lib/providers/copenhagen.js and lib/providers/rejseplanen.js file headers).
 * board.realtime is always false here; this module surfaces that honestly (via
 * buildNextTrainResponse's existing lastUpdated/now handling) rather than pretending
 * otherwise. No timetable fallback is invented beyond what the adapter itself already
 * ships — an unresolvable station still throws, same as fetchStationBoard().
 *
 * Confirmed live 20 Sep 2026 against the real Rejseplanen static GTFS.zip (see
 * lib/cities/copenhagen/marketing-directions.js's resolveTerminus/classifyDsbService
 * comments for the two fixes that came out of that check): Metro/S-tog termini resolve
 * correctly (plus one feed-name alias, Lufthavnen/"Københavns Lufthavn"), and
 * Regionaltog/InterCity/InterCityLyn now correctly appear (route_short_name RE/IC/ICL) —
 * they were being silently dropped before that fix, which is exactly the defect class
 * docs/board-eligibility-rule.md exists to catch. EuroCity ("ECE") and České dráhy ("RJ")
 * were confirmed excluded, as verdicted.
 */
import {
  COPENHAGEN_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/copenhagen.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";

/**
 * One board computation per station per ~15 s, shared by every direction. api/board.js fans out
 * one getCopenhagenDogfoodNextTrain() per direction (32 at København H) and each used to redo the
 * full ~190 ms buildBoardForStops + classification serially on the event loop (~6-8 s total).
 * The in-flight promise is cached, so concurrent directions share one computation. Schedule-only,
 * so a 15 s reuse window loses nothing.
 */
const BOARD_REUSE_MS = 15_000;
const boardCache = new Map();
function sharedStationBoard(station, now) {
  const key = String(station ?? "").trim().toLowerCase();
  const hit = boardCache.get(key);
  const t = now instanceof Date ? now.getTime() : Date.now();
  if (hit && Math.abs(t - hit.at) < BOARD_REUSE_MS) {
    return hit.promise;
  }
  const promise = fetchStationBoard(station, { now });
  boardCache.set(key, { at: t, promise });
  promise.catch(() => {
    if (boardCache.get(key)?.promise === promise) boardCache.delete(key);
  });
  if (boardCache.size > 64) boardCache.delete(boardCache.keys().next().value);
  return promise;
}

export function listCopenhagenDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * Directions derived live from the board's own already-computed chip strings — no static
 * per-line enumeration, see file header. Every chip returned here is one tripAllowed() has
 * already approved for this exact station, so it can never surface an excluded operator
 * (EuroCity/SJ/České dráhy/buses) by construction.
 * @param {string} station
 */
export async function getCopenhagenDogfoodDirections(station) {
  const board = await sharedStationBoard(station, new Date());
  const chips = new Set();
  for (const trip of board.trips ?? []) {
    const chip = String(trip?.destination ?? "").trim();
    if (chip) {
      chips.add(chip);
    }
  }
  return {
    directions: [...chips].sort((a, b) => a.localeCompare(b, "da")),
    source: "copenhagen-rejseplanen-schedule",
  };
}

export async function getCopenhagenDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
}) {
  const board = await sharedStationBoard(station, now);
  const matching = (board.trips ?? []).filter(
    (trip) => String(trip?.destination ?? "").trim() === destination
  );
  const upcoming = pickUpcomingProviderTrips(matching, destination, now);

  return buildNextTrainResponse({
    station: board.stationName ?? station,
    destination,
    destinationLabel: destinationLabel ?? destination,
    leaveBeforeMinutes,
    refreshSeconds,
    skipTrains,
    now,
    lastUpdated: board.lastUpdate ? new Date(board.lastUpdate) : now,
    upcomingTrips: upcoming,
    timeZone: COPENHAGEN_TIMEZONE,
  });
}
