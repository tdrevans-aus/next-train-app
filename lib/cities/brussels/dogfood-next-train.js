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
 *
 * SNCB directions in /api/directions (Part C, 20 Sep 2026,
 * docs/jim-brief-brussels-horizon-and-sncb-directions.md): getBrusselsDogfoodDirections() now
 * ALSO returns SNCB chips (sncbDirectionLabel() — "IC + Oostende" style, see
 * marketing-directions.js) at the three shared stations, fetched live from iRail directly
 * (not via fetchStationBoard(), so a directions listing never depends on STIB's own
 * uptime — an iRail failure here degrades to metro-only chips, same posture as the board's
 * own `partial` degrade, but silent rather than a flagged field since the directions response
 * shape carries no such marker). getBrusselsDogfoodNextTrain() matches a selected SNCB chip
 * the same way it always matched a metro chip — both go through fetchStationBoard(), which
 * still hard-refuses the whole board (including SNCB rows) if STIB itself is down; that
 * board-level coupling predates this pass and is unchanged here.
 */
import {
  BRUSSELS_TIMEZONE,
  fetchStationBoard,
  listCatalogStations,
  resolveCatalogEntry,
  SNCB_SHARED_STATION_IRAIL_NAMES,
} from "../../providers/brussels.js";
import { fetchIrailLiveboardRaw, mapIrailDepartures } from "../../providers/irail.js";
import {
  buildNextTrainResponse,
  pickUpcomingProviderTrips,
} from "../../train-times-core.js";
import {
  marketingLabelsForStation,
  groupedSncbDirectionLabel,
  tripMatchesMarketingChip,
  tripMatchesGroupedSncbDirectionChip,
} from "./marketing-directions.js";

export function listBrusselsDogfoodStations() {
  return listCatalogStations().map((station) => ({
    name: station.name,
    aliases: station.aliases ?? [],
    lat: station.lat ?? null,
    lng: station.lng ?? null,
  }));
}

/**
 * @param {string} station
 * @param {{ irailRawDepartures?: object[] }} [options] test-only escape hatch, same shape as
 *   fetchStationBoard()'s own — see qa/brussels-dogfood-gate.mjs.
 */
export async function getBrusselsDogfoodDirections(station, options = {}) {
  const metroDirections = marketingLabelsForStation(station);

  const catalogEntry = resolveCatalogEntry(station);
  const stationName = catalogEntry?.name ?? String(station);
  const irailStationName = SNCB_SHARED_STATION_IRAIL_NAMES[stationName];

  let sncbDirections = [];
  if (irailStationName) {
    try {
      const irailRaw = await fetchIrailLiveboardRaw(irailStationName, options);
      const sncbTrips = mapIrailDepartures(irailRaw, { timeZone: BRUSSELS_TIMEZONE });
      // Grouped (20 Sep 2026, docs/jim-brief-brussels-scheduled-tail-and-sncb-grouping.md Part 3):
      // an InterCity-family trip collapses to its corridor label ("Ghent / Bruges / Ostend");
      // everything else keeps its own "type + destination" chip. See
      // lib/cities/brussels/marketing-directions.js's groupedSncbDirectionLabel() for the full
      // rationale (why S/L/P are never grouped this way).
      const chips = new Set();
      for (const trip of sncbTrips) {
        const label = groupedSncbDirectionLabel(trip);
        if (label) {
          chips.add(label);
        }
      }
      sncbDirections = [...chips];
    } catch {
      // iRail down — SNCB chips are simply omitted, metro chips are unaffected (matches
      // fetchStationBoard()'s own partial-board posture for a secondary-source outage).
    }
  }

  // Metro first, then the (grouped) SNCB set, each internally sorted — never interleaved
  // (doNotGroup-by-mode; also matches the acceptance criterion for /api/directions ordering).
  const directions = [
    ...[...metroDirections].sort((a, b) => a.localeCompare(b, "fr")),
    ...sncbDirections.sort((a, b) => a.localeCompare(b, "fr")),
  ];

  return {
    directions,
    source: sncbDirections.length ? "brussels-marketing-ends+sncb-irail" : "brussels-marketing-ends",
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
  irailRawDepartures,
  staticData,
}) {
  // `rawResults` — same offline-fixture escape hatch fetchStationBoard()
  // itself documents (lib/providers/brussels.js file header): undefined in
  // every real production call, only supplied by qa/brussels-dogfood-gate.mjs
  // so it can drive this exact live-mapping pipeline against a
  // captured-live fixture instead of copy-pasting it. There is no
  // horizon-widening fallback here — the live WaitingTimes feed only ever
  // returns the next couple of passing times per line, so "nothing in the
  // near horizon" (Malmö/Uppsala's schedule-board concern) doesn't apply.
  // `irailRawDepartures` — same escape hatch, for a destination chip that resolves to an SNCB
  // (mode: "rail") trip at one of the three shared stations.
  const board = await fetchStationBoard(station, { now, rawResults, irailRawDepartures, staticData });
  // A trip is either a metro chip ("line + terminus") or an SNCB chip ("type + destination",
  // doNotGroup-by-mode) — never both, so trying each matcher in turn is safe: a metro trip can
  // never satisfy tripMatchesSncbDirectionChip and vice versa (the two label families are
  // built from disjoint trip shapes, see marketing-directions.js).
  const matching = (board.trips ?? []).filter(
    (trip) => tripMatchesMarketingChip(trip, destination) || tripMatchesGroupedSncbDirectionChip(trip, destination)
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
