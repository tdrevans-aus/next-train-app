/**
 * Brussels next-train payload for local testers and the eventual live flip.
 *
 * Registry status stays `planned` — this is the pre-flip dogfood wiring pass
 * (docs/brussels-d1/jim-handoff.md "Flip follow-through" section). Mark/Tim's
 * flip call, not made here.
 *
 * Single agency (STIB/MIVB metro 1/2/5/6), single mode — LIVE board via the
 * BMC Waiting Times API (confirmed 20 Sep 2026, see lib/providers/brussels.js
 * file header), reusing lib/providers/brussels.js's fetchStationBoard()
 * verbatim (not forked here). Every board this returns carries
 * `realtime: "live"`; a missing STIB_API_KEY or a failed live fetch is a
 * hard error (MissingStibCredentialsError / StibUnavailableError) — there is
 * no timetable fallback (Tim's standing rule, Göteborg PR #332: "no live
 * times, no region").
 *
 * SNCB/NMBS domestic rail at Gare Centrale / Gare du Midi / Gare de l'Ouest
 * is `in` per docs/brussels-d1/oracle-clash-report.md's Board eligibility
 * section (walk-up, no compulsory reservation) and is now wired as a second
 * live source (lib/providers/irail.js, no key) at those three shared
 * stations only — see lib/providers/brussels.js's fetchStationBoard() file
 * header for the full doNotGroup-by-mode / vehicle-filtering story
 * (docs/jim-brief-brussels-flip-readiness.md). This dogfood layer picks
 * `board.trips` up unchanged from fetchStationBoard(); SNCB rows never
 * match a metro marketing chip (tripMatchesMarketingChip below), so they
 * never leak into a per-direction next-train lookup — the doNotGroup split
 * happens naturally, without a separate direction model for SNCB here.
 */
import {
  BRUSSELS_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
} from "../../providers/brussels.js";
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
  rawResults,
}) {
  // `rawResults` — same offline-fixture escape hatch fetchStationBoard()
  // itself documents (lib/providers/brussels.js file header): undefined in
  // every real production call, only supplied by qa/brussels-dogfood-gate.mjs
  // so it can drive this exact live-mapping pipeline against a
  // captured-live fixture instead of copy-pasting it. There is no
  // horizon-widening fallback here — the live WaitingTimes feed only ever
  // returns the next couple of passing times per line, so "nothing in the
  // near horizon" (Malmö/Uppsala's schedule-board concern) doesn't apply.
  const board = await fetchStationBoard(station, { now, rawResults });
  const matching = (board.trips ?? []).filter((trip) =>
    tripMatchesMarketingChip(trip, destination)
  );
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
