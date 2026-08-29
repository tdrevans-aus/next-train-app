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
import {
  fetchStationBoard as fetchGoldCoastBoard,
  listCatalogStations as listGoldCoastStations,
} from "./providers/gold-coast.js";
import {
  fetchStationBoard as fetchNewcastleBoard,
  listCatalogStations as listNewcastleStations,
} from "./providers/newcastle.js";
import {
  fetchStationBoard as fetchAucklandBoard,
  listCatalogStations as listAucklandStations,
} from "./providers/auckland.js";
import {
  fetchStationBoard as fetchWellingtonBoard,
  listCatalogStations as listWellingtonStations,
} from "./providers/wellington.js";
import {
  fetchStationBoard as fetchStockholmBoard,
  listCatalogStations as listStockholmStations,
} from "./providers/stockholm.js";
import {
  fetchStationBoard as fetchGoteborgBoard,
  listCatalogStations as listGoteborgStations,
} from "./providers/goteborg.js";
import {
  fetchStationBoard as fetchAmsterdamBoard,
  listCatalogStations as listAmsterdamStations,
} from "./providers/amsterdam.js";
import {
  fetchStationBoard as fetchRotterdamBoard,
  listCatalogStations as listRotterdamStations,
} from "./providers/rotterdam.js";
import {
  fetchStationBoard as fetchVancouverBoard,
  listCatalogStations as listVancouverStations,
} from "./providers/vancouver.js";
import { MissingProviderApiKeyError, MissingActGtfsCredentialsError } from "./providers/gtfs/auth.js";
import { MissingPtvCredentialsError } from "./providers/ptv/client.js";
import { listBrisbaneDogfoodStations } from "./cities/brisbane/dogfood-next-train.js";
import { listSydneyDogfoodStations } from "./cities/sydney/dogfood-next-train.js";
import { listAdelaideDogfoodStations } from "./cities/adelaide/dogfood-next-train.js";
import { listAmsterdamDogfoodStations } from "./cities/amsterdam/dogfood-next-train.js";
import { listRotterdamDogfoodStations } from "./cities/rotterdam/dogfood-next-train.js";
import { listVancouverDogfoodStations } from "./cities/vancouver/dogfood-next-train.js";
import { listCanberraDogfoodStations } from "./cities/canberra/dogfood-next-train.js";
import { listGoldCoastDogfoodStations } from "./cities/gold-coast/dogfood-next-train.js";
import { listNewcastleDogfoodStations } from "./cities/newcastle/dogfood-next-train.js";
import { listAucklandDogfoodStations } from "./cities/auckland/dogfood-next-train.js";

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
  "gold-coast": {
    fetchBoard: fetchGoldCoastBoard,
    listStations: listGoldCoastStations,
  },
  newcastle: {
    fetchBoard: fetchNewcastleBoard,
    listStations: listNewcastleStations,
  },
  auckland: {
    fetchBoard: fetchAucklandBoard,
    listStations: listAucklandStations,
  },
  wellington: {
    fetchBoard: fetchWellingtonBoard,
    listStations: listWellingtonStations,
  },
  stockholm: {
    fetchBoard: fetchStockholmBoard,
    listStations: listStockholmStations,
  },
  goteborg: {
    fetchBoard: fetchGoteborgBoard,
    listStations: listGoteborgStations,
  },
  amsterdam: {
    fetchBoard: fetchAmsterdamBoard,
    listStations: listAmsterdamStations,
  },
  rotterdam: {
    fetchBoard: fetchRotterdamBoard,
    listStations: listRotterdamStations,
  },
  vancouver: {
    fetchBoard: fetchVancouverBoard,
    listStations: listVancouverStations,
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
          : id === "amsterdam"
            ? listAmsterdamDogfoodStations()
          : id === "rotterdam"
            ? listRotterdamDogfoodStations()
          : id === "vancouver"
            ? listVancouverDogfoodStations()
          : id === "canberra"
            ? listCanberraDogfoodStations()
          : id === "gold-coast"
            ? listGoldCoastDogfoodStations()
          : id === "newcastle"
            ? listNewcastleDogfoodStations()
          : id === "auckland"
            ? listAucklandDogfoodStations()
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
