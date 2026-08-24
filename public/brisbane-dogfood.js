/**
 * Multi-city catalog + API params for Sydney, Brisbane, and Adelaide.
 * Release builds load station catalogs from production Vercel; debug/local can probe LAN dev server.
 */
(function () {
  const STORAGE_KEY = "nextTrainDogfoodOrigin";
  const LIVE_AU_CITIES = ["sydney", "brisbane", "adelaide"];
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const state = {
    ready: false,
    origin: "",
    city: "",
    stations: [],
    coords: {},
    available: { sydney: true, brisbane: true, adelaide: true },
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

  async function loadCatalogFromDevBoard(origin, city) {
    const url = `${origin}/api/dev/board?city=${encodeURIComponent(city)}&list=1`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Dogfood catalog HTTP ${response.status}`);
    }
    const body = await response.json();
    return parseCatalogRows(body.stations);
  }

  async function loadCatalogFromProduction(city) {
    const origin = productionOrigin();
    const url = `${origin}/api/city-stations?city=${encodeURIComponent(city)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`City catalog HTTP ${response.status}`);
    }
    const body = await response.json();
    return parseCatalogRows(body.stations);
  }

  function parseCatalogRows(rows) {
    const stations = [];
    const coords = {};
    const list = Array.isArray(rows) ? rows : [];
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
    }
    return { stations, coords };
  }

  async function loadCatalog(city) {
    const origin = state.origin || (await resolveOrigin());
    if (origin && (await canProbe())) {
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
    state.ready = true;
    for (const city of LIVE_AU_CITIES) {
      try {
        const catalog = await loadCatalog(city);
        state.available[city] = catalog.stations.length > 0;
        state[`${city}Catalog`] = catalog;
      } catch {
        state.available[city] = false;
      }
    }
    return { ...state.available, origin: state.origin };
  }

  async function mount(city) {
    const id = String(city || "").toLowerCase();
    if (!id) {
      return Boolean(state.active);
    }
    if (!LIVE_AU_CITIES.includes(id)) {
      state.active = false;
      state.city = "";
      state.stations = [];
      state.coords = {};
      return false;
    }
    if (!state.ready) {
      await probe();
    }
    let catalog = state[`${id}Catalog`];
    if (!catalog?.stations?.length) {
      try {
        catalog = await loadCatalog(id);
        state[`${id}Catalog`] = catalog;
      } catch {
        catalog = null;
      }
    }
    if (!catalog?.stations?.length) {
      state.active = false;
      state.city = "";
      return false;
    }
    state.city = id;
    state.stations = catalog.stations;
    state.coords = catalog.coords;
    state.active = true;
    window.nextTrainStationCombobox?.replaceStationsCache?.(catalog.stations);
    return true;
  }

  function unmount() {
    state.active = false;
    state.city = "";
    state.stations = [];
    state.coords = {};
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
    isCityAvailable: (city) => LIVE_AU_CITIES.includes(String(city || "").toLowerCase()),
    applyParams(params) {
      if (state.active && state.city) {
        params.set("city", state.city);
      }
      return params;
    },
  };

  window.NextTrainPlannedCityDogfood = api;
  window.NextTrainBrisbaneDogfood = api;
})();
