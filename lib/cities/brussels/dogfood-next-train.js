/**
 * Brussels next-train payload for local testers and the eventual live flip.
 *
 * Registry status stays `planned` — this is the pre-flip dogfood wiring pass
 * (docs/brussels-d1/jim-handoff.md "Flip follow-through" section). Mark/Tim's
 * flip call, not made here.
 *
 * Single agency (STIB/MIVB metro 1/2/5/6), single mode, static GTFS only —
 * same shape as Malmö/Uppsala's dogfood modules, reusing
 * lib/providers/brussels.js's fetchStationBoard() verbatim (not forked
 * here). The live BMC Waiting Time / Vehicle Positions JSON operation path
 * is still unconfirmed (see lib/providers/brussels.js file header) so every
 * board this returns carries `realtime: false` — schedule-only, not a
 * silent live-vs-scheduled swap.
 *
 * SNCB/NMBS domestic rail at Gare Centrale / Gare du Midi / Gare de l'Ouest
 * is `in` per docs/brussels-d1/oracle-clash-report.md's Board eligibility
 * section (walk-up, no compulsory reservation) and has a real, confirmed,
 * free real-time source (iRail liveboard API, no key — verified live 19 Sep
 * 2026 against Brussels-Central) — but is NOT wired here. Doing it cleanly
 * needs a second provider surface, station-name mapping (iRail's
 * "Brussels-Central"/"Brussels-South/Brussels-Midi"/"Brussels-West" against
 * this catalog's FR/NL locked names), and a doNotGroup-by-mode catalog
 * entry (SNCB is a distinct building/platform section from the metro at all
 * three stations, same shape as South Yorkshire's Sheffield Station rail
 * vs Supertram split) — genuine scope beyond this dispatch-wiring pass, not
 * a missing key or a broken call. Left out rather than faked; see
 * docs/brussels-d1/jim-handoff.md and the registry `notes` for Mark.
 */
import {
  BRUSSELS_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/brussels.js";
import { EMPTY_BOARD_HORIZON_MINUTES } from "../../providers/gtfs/board.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  tripMatchesMarketingChip,
} from "./marketing-directions.js";

export function listBrusselsDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

export function getBrusselsDogfoodDirections(station) {
  return {
    directions: marketingLabelsForStation(station),
    source: "brussels-marketing-ends",
  };
}

export async function getBrusselsDogfoodNextTrain({
  station,
  destination,
  destinationLabel,
  leaveBeforeMinutes,
  refreshSeconds,
  skipTrains = 0,
  now = new Date(),
  staticData,
}) {
  // `staticData` — same offline-fixture escape hatch fetchStationBoard()
  // itself documents (lib/providers/brussels.js file header): undefined in
  // every real production call, only supplied by qa/brussels-dogfood-gate.mjs
  // so it can drive this exact pipeline against a committed fixture instead
  // of copy-pasting it.
  let board = await fetchStationBoard(station, { now, staticData });
  let matching = (board.trips ?? []).filter((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
  if (matching.length === 0) {
    // Same widen-then-refilter fallback as Malmö/Uppsala: a valid, locked
    // chip with nothing in the near horizon (e.g. off-peak line-6 tail)
    // should not report "no trains" when the schedule has later ones.
    board = await fetchStationBoard(station, {
      now,
      horizonMinutes: EMPTY_BOARD_HORIZON_MINUTES,
      staticData,
    });
    matching = (board.trips ?? []).filter((trip) =>
      tripMatchesMarketingChip(trip, destination)
    );
  }
  const remapped = matching.map((trip) => ({ ...trip, destination }));
  const upcoming = pickUpcomingProviderTrips(remapped, destination, now);

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
    timeZone: BRUSSELS_TIMEZONE,
  });
}
