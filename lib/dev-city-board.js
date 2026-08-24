/**
 * Gated dev board for planned-city dogfood (not linked from app).
 * @see docs/jim-brief-brisbane-provider.md · docs/mark-dogfood-brisbane.md
 */

import { getCity } from "./providers/registry.js";
import {
  fetchStationBoard as fetchBrisbaneBoard,
  listCatalogStations as listBrisbaneStations,
} from "./providers/brisbane.js";
import {
  fetchStationBoard as fetchSydneyBoard,
  listCatalogStations as listSydneyStations,
} from "./providers/sydney.js";
import {
  fetchStationBoard as fetchMelbourneBoard,
  listCatalogStations as listMelbourneStations,
} from "./providers/melbourne.js";
import {
  fetchStationBoard as fetchAdelaideBoard,
  listCatalogStations as listAdelaideStations,
} from "./providers/adelaide.js";
import {
  fetchStationBoard as fetchCanberraBoard,
  listCatalogStations as listCanberraStations,
} from "./providers/canberra.js";
import { MissingProviderApiKeyError, MissingActGtfsCredentialsError } from "./providers/gtfs/auth.js";
import { MissingPtvCredentialsError } from "./providers/ptv/client.js";
import { listBrisbaneDogfoodStations } from "./cities/brisbane/dogfood-next-train.js";
import { listSydneyDogfoodStations } from "./cities/sydney/dogfood-next-train.js";
import { listAdelaideDogfoodStations } from "./cities/adelaide/dogfood-next-train.js";

import {
  fetchStopBoard as fetchLondonBoard,
} from "./providers/uk-tfl.js";
import {
  listMultiCityStations,
} from "./cities/live-city-api.js";

/** Cities with a dev-board fetcher — must stay `planned` until Tim flips live. */
const BOARD_FETCHERS = {
  brisbane: {
    fetchBoard: fetchBrisbaneBoard,
    listStations: listBrisbaneStations,
  },
  sydney: {
    fetchBoard: fetchSydneyBoard,
    listStations: listSydneyStations,
  },
  melbourne: {
    fetchBoard: fetchMelbourneBoard,
    listStations: listMelbourneStations,
  },
  adelaide: {
    fetchBoard: fetchAdelaideBoard,
    listStations: listAdelaideStations,
  },
  canberra: {
    fetchBoard: fetchCanberraBoard,
    listStations: listCanberraStations,
  },
  "uk-london-tfl": {
    fetchBoard: fetchLondonBoard,
    listStations: () => listMultiCityStations("uk-london-tfl"),
  },
};

export function isCityProbeAllowed() {
  return String(process.env.ALLOW_CITY_PROBES ?? "").trim() === "1";
}

/**
 * @param {string} cityId
 * @param {string} station
 * @param {{ list?: boolean }} [options]
 */
export async function fetchDevCityBoard(cityId, station, options = {}) {
  const id = String(cityId || "perth").trim().toLowerCase();
  const city = getCity(id);

  if (!city) {
    return { status: 400, body: { error: "Unknown city", city: id } };
  }

  const adapter = BOARD_FETCHERS[id];
  if (!adapter) {
    return {
      status: 404,
      body: { error: "City probe not configured", city: id },
    };
  }

  if (options.list) {
    const stations =
      id === "brisbane"
        ? listBrisbaneDogfoodStations()
        : id === "sydney"
          ? listSydneyDogfoodStations()
          : id === "adelaide"
            ? listAdelaideDogfoodStations()
          : adapter.listStations?.() ?? [];
    return {
      status: 200,
      body: {
        city: id,
        cityStatus: city.status,
        adapterReady: city.adapterReady ?? false,
        timeZone: city.timeZone,
        stations: stations.map((entry) =>
          typeof entry === "string"
            ? entry
            : { name: entry.name, lat: entry.lat ?? null, lng: entry.lng ?? null }
        ),
      },
    };
  }

  const stationQuery = String(station || "").trim();
  if (!stationQuery) {
    return { status: 400, body: { error: "Missing station parameter" } };
  }

  try {
    const board = await adapter.fetchBoard(stationQuery);
    return {
      status: 200,
      body: {
        city: id,
        cityStatus: city.status,
        adapterReady: city.adapterReady ?? false,
        timeZone: city.timeZone,
        station: board.stationName,
        board,
        tripCount: board.trips?.length ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof MissingProviderApiKeyError) {
      return {
        status: 503,
        body: {
          error: error.message,
          envName: error.envName,
          city: id,
        },
      };
    }
    if (error instanceof MissingActGtfsCredentialsError) {
      return {
        status: 503,
        body: {
          error: error.message,
          envNames: error.envNames,
          city: id,
        },
      };
    }
    if (error instanceof MissingPtvCredentialsError) {
      return {
        status: 503,
        body: {
          error: error.message,
          envNames: error.envNames,
          city: id,
        },
      };
    }
    return {
      status: 500,
      body: { error: error?.message ?? "Failed to fetch city board" },
    };
  }
}
