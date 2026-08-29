/**
 * Multi-city catalog + API params for Sydney, Brisbane, and Adelaide.
 * Release builds load station catalogs from production Vercel; debug/local can probe LAN dev server.
 */
(function () {
  const STORAGE_KEY = "nextTrainDogfoodOrigin";
  const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "amsterdam", "rotterdam", "vancouver", "canberra", "gold-coast", "newcastle", "auckland", "stockholm", "goteborg", "wellington"];
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const SETTINGS_KEY = "nextTrainSettings";
  const state = {
    ready: false,
    origin: "",
    city: "",
    stations: [],
    coords: {},
    directionsByStation: {},
    available: { sydney: true, brisbane: true, adelaide: true, "uk-london-tfl": true, amsterdam: true, rotterdam: true, vancouver: true, canberra: true, "gold-coast": true, newcastle: true, auckland: true, stockholm: true, goteborg: true, wellington: true },
  };

  async function isDebugNative() {
    if (!window.Capacitor?.isNativePlatform?.()) {
      return false;
    }
    const started = Date.now();
    while (Date.now() - started < 8000) {
      try {
        const plugin = window.Capacitor.Plugins?.WidgetSync;
        if (plugin?.isDebugBuild) {
          const result = await plugin.isDebugBuild();
          return Boolean(result?.debug);
        }
      } catch {
        /* bridge not ready */
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
  }

  function isLocalWeb() {
    return location.hostname === "localhost" || location.hostname === "127.0.0.1";
  }

  async function canProbe() {
    return (await isDebugNative()) || (!window.Capacitor?.isNativePlatform?.() && isLocalWeb());
  }

  function productionOrigin() {
    if (window.Capacitor?.isNativePlatform?.()) {
      return VERCEL_ORIGIN;
    }
    return "";
  }

  async function resolveOrigin() {
    const stored = String(localStorage.getItem(STORAGE_KEY) || "").trim();
    if (stored) {
      return stored.replace(/\/$/, "");
    }
    if (isLocalWeb() && !window.Capacitor?.isNativePlatform?.()) {
      return "";
    }
    if (!(await canProbe())) {
      return "";
    }
    try {
      const response = await fetch("/dogfood-origin.json", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        return String(data.origin || "").replace(/\/$/, "");
      }
    } catch {
      /* ignore */
    }
    return "http://10.0.2.2:3000";
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadCatalogFromDevBoard(origin, city) {
    const url = `${origin}/api/dev/board?city=${encodeURIComponent(city)}&list=1`;
    const body = await fetchJsonWithTimeout(url);
    return parseCatalogRows(body.stations);
  }

  async function loadCatalogFromProduction(city) {
    const origin = productionOrigin();
    const url = `${origin}/api/city-stations?city=${encodeURIComponent(city)}`;
    const body = await fetchJsonWithTimeout(url, 8000);
    return parseCatalogRows(body.stations);
  }

  async function loadCatalogFromBundle(city) {
    const body = await fetchJsonWithTimeout(
      `/city-catalogs/${encodeURIComponent(city)}.json`,
      4000
    );
    return parseCatalogRows(body.stations ?? body);
  }

  async function loadDirectionsMap(city) {
    try {
      const body = await fetchJsonWithTimeout(
        `/city-directions/${encodeURIComponent(city)}.json`,
        4000
      );
      if (body && typeof body === "object" && !Array.isArray(body)) {
        return body;
      }
    } catch {
      /* older APKs / cities without a generated file */
    }
    return {};
  }

  function parseCatalogRows(rows) {
    const stations = [];
    const coords = {};
    const directionsByStation = {};
    const list = Array.isArray(rows) ? rows : (Array.isArray(rows?.stops) ? rows.stops : (Array.isArray(rows?.stations) ? rows.stations : []));
    for (const row of list) {
      const name = typeof row === "string" ? row : row?.name;
      if (!name) {
        continue;
      }
      stations.push(name);
      const lat = Number(row?.lat);
      const lng = Number(row?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords[name] = { lat, lng };
      }
      if (Array.isArray(row?.directions) && row.directions.length) {
        directionsByStation[name] = row.directions.slice();
      }
    }
    return { stations, coords, directionsByStation };
  }

  async function loadCatalog(city) {
    try {
      const bundled = await loadCatalogFromBundle(city);
      if (bundled.stations.length) {
        return bundled;
      }
    } catch {
      /* Sydney/London have no bundled catalog */
    }
    const origin = state.origin || (await resolveOrigin());
    if (origin && (await canProbe()) && !window.Capacitor?.isNativePlatform?.()) {
      try {
        const catalog = await loadCatalogFromDevBoard(origin, city);
        if (catalog.stations.length) {
          state.origin = origin;
          return catalog;
        }
      } catch {
        /* fall through to production catalog */
      }
    }
    return loadCatalogFromProduction(city);
  }

  async function probe() {
    // Multi-city probe is disabled in production to avoid loading unrelated city catalogs.
    // mount(city) will load the specific city catalog when needed.
    state.ready = true;
    return { ...state.available, origin: state.origin };
  }

  async function mount(city) {
    const id = String(city || "").toLowerCase();
    console.log(`[NextTrainDogfood] mount(${id})`);
    if (!id) {
      return Boolean(state.active);
    }
    if (!MULTI_CITY_IDS.includes(id)) {
      console.warn(`[NextTrainDogfood] City not in multi-city list: ${id}`);
      state.active = false;
      state.city = "";
      state.stations = [];
      state.coords = {};
      state.directionsByStation = {};
      return false;
    }
    // Load only this city. probe() walks every live catalog (Sydney/Brisbane GTFS
    // fixtures) and must not run on the Perth cold-start path.
    let catalog = state[`${id}Catalog`];
    if (!catalog?.stations?.length) {
      try {
        console.log(`[NextTrainDogfood] loading catalog for ${id}...`);
        catalog = await loadCatalog(id);
        state[`${id}Catalog`] = catalog;
      } catch (error) {
        console.error(`[NextTrainDogfood] Failed to load catalog for ${id}:`, error);
        catalog = null;
      }
    }
    if (!catalog?.stations?.length) {
      console.error(`[NextTrainDogfood] No stations found for ${id}`);
      state.active = false;
      state.city = "";
      return false;
    }
    const directionMap = await loadDirectionsMap(id);
    state.city = id;
    state.stations = catalog.stations;
    state.coords = catalog.coords;
    state.directionsByStation = {
      ...directionMap,
      ...(catalog.directionsByStation ?? {}),
    };
    state.active = true;
    state.ready = true;
    console.log(`[NextTrainDogfood] city mounted: ${id} (${catalog.stations.length} stations)`);
    window.nextTrainStationCombobox?.replaceStationsCache?.(catalog.stations);
    return true;
  }

  function unmount() {
    state.active = false;
    state.city = "";
    state.stations = [];
    state.coords = {};
    state.directionsByStation = {};
  }

  async function loadCoordsForCity(city) {
    const catalog = await loadCatalog(String(city || "").toLowerCase());
    return catalog.coords ?? {};
  }

  async function loadStationNamesForCity(city) {
    const catalog = await loadCatalog(String(city || "").toLowerCase());
    return catalog.stations ?? [];
  }

  const api = {
    probe,
    mount,
    unmount,
    canProbe,
    isActive: () => Boolean(state.active),
    getCity: () => state.city,
    getOrigin: () => state.origin,
    getStations: () => state.stations,
    getCoords: () => state.coords,
    getDirectionsForStation(station) {
      const name = String(station || "").trim();
      if (!name) {
        return [];
      }
      const fromCatalog = state.directionsByStation?.[name];
      if (Array.isArray(fromCatalog) && fromCatalog.length) {
        return fromCatalog.slice();
      }
      return [];
    },
    loadCoordsForCity,
    loadStationNamesForCity,
    isCityAvailable: (city) => MULTI_CITY_IDS.includes(String(city || "").toLowerCase()),
    applyParams(params) {
      if (state.active && state.city && !params.has("city")) {
        const station = params.get("station");
        if (station && state.stations.includes(station)) {
          params.set("city", state.city);
        }
      }
      return params;
    },
  };

  window.NextTrainPlannedCityDogfood = api;
  window.NextTrainBrisbaneDogfood = api;
})();
