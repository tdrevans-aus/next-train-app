/**
 * Multi-city catalog + API params for Sydney, Brisbane, and Adelaide.
 * Release builds load station catalogs from production Vercel; debug/local can probe LAN dev server.
 */
(function () {
  const STORAGE_KEY = "nextTrainDogfoodOrigin";
  const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "amsterdam", "rotterdam", "vancouver", "canberra", "gold-coast", "newcastle", "auckland", "stockholm", "goteborg", "wellington", "malmo", "uppsala", "helsinki", "oslo", "uk-west-midlands", "west-of-england", "east-midlands", "liverpool-city-region", "solent", "south-wales", "west-yorkshire", "thames-valley", "greater-anglia", "rest-of-wales", "rest-of-scotland", "london-se-national-rail", "southwest", "greater-manchester", "south-yorkshire", "north-east", "glasgow", "cumbria"];
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const SETTINGS_KEY = "nextTrainSettings";
  const state = {
    ready: false,
    origin: "",
    city: "",
    stations: [],
    coords: {},
    directionsByStation: {},
    modesByName: {},
    available: { sydney: true, brisbane: true, adelaide: true, "uk-london-tfl": true, amsterdam: true, rotterdam: true, vancouver: true, canberra: true, "gold-coast": true, newcastle: true, auckland: true, stockholm: true, goteborg: true, wellington: true, malmo: true, uppsala: true, helsinki: true, oslo: true, "uk-west-midlands": true, "west-of-england": true, "east-midlands": true, "liverpool-city-region": true, solent: true, "south-wales": true, "west-yorkshire": true, "thames-valley": true, "greater-anglia": true, "rest-of-wales": true, "rest-of-scotland": true, "london-se-national-rail": true, "southwest": true, "greater-manchester": true, "south-yorkshire": true, "north-east": true, glasgow: true, "cumbria": true },
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
    // Some UK region catalogs deliberately carry two entries with the same
    // printed name (doNotGroup pairs, e.g. Liverpool Lime Street's National
    // Rail vs Merseyrail presence) distinguished only by `mode`. Keep every
    // occurrence's mode, in catalog order, so the picker can disambiguate
    // duplicate labels — see docs/jim-brief-donotgroup-picker-disambiguation.md.
    const modesByName = {};
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
      const mode = typeof row === "object" && row ? row.mode : null;
      if (!modesByName[name]) {
        modesByName[name] = [];
      }
      modesByName[name].push(mode || null);
    }
    return { stations, coords, directionsByStation, modesByName };
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

  // Monotonic token so an overlapping mount() call for a different (or the same)
  // city can never clobber a newer call's result. Whichever mount() was *called*
  // most recently owns the right to write `state`, regardless of which call's
  // promises happen to resolve first. See docs/jim-brief-station-combobox-mount-race.md.
  let mountToken = 0;

  async function mount(city) {
    const id = String(city || "").toLowerCase();
    console.log(`[NextTrainDogfood] mount(${id})`);
    const myToken = ++mountToken;
    if (!id) {
      return Boolean(state.active);
    }
    if (!MULTI_CITY_IDS.includes(id)) {
      console.warn(`[NextTrainDogfood] City not in multi-city list: ${id}`);
      if (myToken === mountToken) {
        state.active = false;
        state.city = "";
        state.stations = [];
        state.coords = {};
        state.directionsByStation = {};
        state.modesByName = {};
      }
      return false;
    }
    // Load only this city. probe() walks every live catalog (Sydney/Brisbane GTFS
    // fixtures) and must not run on the Perth cold-start path.
    let catalog = state[`${id}Catalog`];
    if (!catalog?.stations?.length) {
      try {
        console.log(`[NextTrainDogfood] loading catalog for ${id}...`);
        catalog = await loadCatalog(id);
        // Per-city cache, not the shared "active city" state — safe to write
        // even if a newer mount() call has since started.
        state[`${id}Catalog`] = catalog;
      } catch (error) {
        console.error(`[NextTrainDogfood] Failed to load catalog for ${id}:`, error);
        catalog = null;
      }
    }
    if (myToken !== mountToken) {
      // A newer mount() call has started since we began; don't clobber its result.
      return false;
    }
    if (!catalog?.stations?.length) {
      console.error(`[NextTrainDogfood] No stations found for ${id}`);
      state.active = false;
      state.city = "";
      return false;
    }
    const directionMap = await loadDirectionsMap(id);
    if (myToken !== mountToken) {
      // A newer mount() call has started since we began; don't clobber its result.
      return false;
    }
    state.city = id;
    state.stations = catalog.stations;
    state.coords = catalog.coords;
    state.directionsByStation = {
      ...directionMap,
      ...(catalog.directionsByStation ?? {}),
    };
    state.modesByName = catalog.modesByName ?? {};
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
    state.modesByName = {};
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
    // Doesn't disambiguate a picked station, only what a picker can show:
    // for a printed name shared by two doNotGroup catalog entries, returns
    // every mode seen for that name, in catalog order (e.g.
    // ["train", "metro"] for Liverpool Lime Street). See
    // docs/jim-brief-donotgroup-picker-disambiguation.md.
    getStationModesByName: () => state.modesByName,
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
