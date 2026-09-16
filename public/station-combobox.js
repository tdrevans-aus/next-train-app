(function (global) {
  let stationsCache = null;
  let nearbyStationsCache = null;
  let detailStationCombobox = null;
  let nearbyStationCombobox = null;
  let deps = {};

  async function fetchLocalJson(path, timeoutMs = 4000) {
    const fetchPromise = (async () => {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
      }
      return await response.json();
    })();

    const timeoutPromise = new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`Timed out loading ${path}`)), timeoutMs);
    });

    return Promise.race([fetchPromise, timeoutPromise]);
  }

  async function getNearbyStationsList() {
    if (deps.getNearbyStationsList) {
      nearbyStationsCache = await deps.getNearbyStationsList();
      return nearbyStationsCache;
    }
    return getStationsList();
  }

  function getNearbyStationsCache() {
    return nearbyStationsCache;
  }

  function replaceNearbyStationsCache(names) {
    if (names == null) {
      nearbyStationsCache = null;
      return nearbyStationsCache;
    }
    nearbyStationsCache = Array.isArray(names) ? names : [];
    return nearbyStationsCache;
  }

  function planningCityId() {
    return String(
      window.NextTrainBrisbaneDogfood?.getCity?.() ||
        window.NextTrainCitySession?.readSavedCity?.() ||
        ""
    )
      .trim()
      .toLowerCase();
  }

  function isMultiCityCatalog(city) {
    const ids = window.NextTrainCitySession?.MULTI_CITY_IDS;
    return Array.isArray(ids) && ids.includes(city);
  }

  // Per-region operator names for the picker's "same printed name, different
  // mode" disambiguation (docs/jim-brief-donotgroup-picker-disambiguation.md).
  // Reuses the exact operator names already used throughout each region's
  // own lib/cities/<region>/stations.json notes/class prose — not invented
  // copy. "train" is National Rail everywhere in these UK catalogs; each
  // region's own metro/tram system has one name used for all its metro-mode
  // doNotGroup entries, so this is keyed by region, not by station.
  const REGION_MODE_LABELS = {
    "liverpool-city-region": { train: "National Rail", metro: "Merseyrail" },
    "east-midlands": { train: "National Rail", metro: "NET tram" },
    "greater-manchester": { train: "National Rail", metro: "Metrolink" },
    "south-yorkshire": { train: "National Rail", metro: "Supertram" },
    "north-east": { train: "National Rail", metro: "Tyne and Wear Metro" },
    glasgow: { train: "National Rail", metro: "Subway" },
    edinburgh: { train: "National Rail", metro: "Trams" },
    "uk-west-midlands": { train: "National Rail", metro: "West Midlands Metro" },
  };

  function modeDisplayLabel(city, mode) {
    const known = REGION_MODE_LABELS[city]?.[mode];
    if (known) {
      return known;
    }
    const raw = String(mode || "").trim();
    if (!raw) {
      return "";
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  /** Map of printed name -> every mode seen for that name, in catalog order,
   * for the currently-active multi-city catalog (empty for non-multi-city
   * boards, where doNotGroup pairs with an identical name don't occur). */
  function stationModesByNameForCurrentCity() {
    const city = planningCityId();
    if (!isMultiCityCatalog(city)) {
      return {};
    }
    return window.NextTrainBrisbaneDogfood?.getStationModesByName?.() ?? {};
  }

  /** Given the full ordered list of names about to be rendered (post-filter,
   * so duplicate entries always travel together — see brief), returns a
   * parallel array of disambiguation suffixes ("" when a name is unique). */
  function disambiguationSuffixesFor(names) {
    const modesByName = stationModesByNameForCurrentCity();
    const city = planningCityId();
    const counts = {};
    for (const name of names) {
      counts[name] = (counts[name] || 0) + 1;
    }
    const occurrenceSeen = {};
    return names.map((name) => {
      if (counts[name] <= 1) {
        return "";
      }
      const modes = modesByName[name];
      if (!Array.isArray(modes) || modes.length < 2) {
        return "";
      }
      const occurrence = occurrenceSeen[name] || 0;
      occurrenceSeen[name] = occurrence + 1;
      const mode = modes[occurrence];
      const label = modeDisplayLabel(city, mode);
      return label ? ` — ${label}` : "";
    });
  }

  // docs/jim-brief-country-wide-station-picker.md — the "Choose station"
  // combobox searches the whole country, not just the active region. Cached
  // in memory + localStorage per country id (with a fetchedAt "version" so a
  // second visit opens instantly and a stale cache expires on its own).
  const countryStationsCache = new Map();
  const COUNTRY_CACHE_KEY_PREFIX = "nextTrainCountryStations:";
  const COUNTRY_CACHE_TTL_MS = 60 * 60 * 1000;

  function readCountryCacheFromStorage(countryId) {
    try {
      const raw = localStorage.getItem(COUNTRY_CACHE_KEY_PREFIX + countryId);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.stations) || typeof parsed.fetchedAt !== "number") {
        return null;
      }
      if (Date.now() - parsed.fetchedAt > COUNTRY_CACHE_TTL_MS) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCountryCacheToStorage(countryId, payload) {
    try {
      localStorage.setItem(COUNTRY_CACHE_KEY_PREFIX + countryId, JSON.stringify(payload));
    } catch {
      /* storage unavailable/full — memory cache for this session still works */
    }
  }

  /** Fetches (or returns cached) { countryId, regions, stations, fetchedAt } for a country. */
  async function loadCountryStations(countryId) {
    const id = String(countryId || "").trim().toLowerCase();
    if (!id) {
      return null;
    }
    const inMemory = countryStationsCache.get(id);
    if (inMemory && Date.now() - inMemory.fetchedAt < COUNTRY_CACHE_TTL_MS) {
      return inMemory;
    }
    const fromStorage = readCountryCacheFromStorage(id);
    if (fromStorage) {
      countryStationsCache.set(id, fromStorage);
      return fromStorage;
    }
    try {
      const response = await fetch(`/api/country-stations?country=${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`country-stations ${response.status}`);
      }
      const data = await response.json();
      const payload = {
        countryId: id,
        regions: Array.isArray(data.regions) ? data.regions : [],
        stations: Array.isArray(data.stations) ? data.stations : [],
        fetchedAt: Date.now(),
      };
      countryStationsCache.set(id, payload);
      writeCountryCacheToStorage(id, payload);
      return payload;
    } catch (error) {
      console.warn("Could not load /api/country-stations", error);
      return inMemory || null;
    }
  }

  function comingSoonRegionsForCountry(countryId) {
    const id = String(countryId || "").trim().toLowerCase();
    const country = (window.NextTrainCitySession?.COUNTRIES ?? []).find((entry) => entry.id === id);
    if (!country) {
      return [];
    }
    return country.regions
      .filter((region) => region.comingSoon)
      .map((region) => ({ id: region.id, name: region.name }));
  }

  async function getStationsList() {
    const city = planningCityId();
    const dogfoodApi = window.NextTrainBrisbaneDogfood;

    if (isMultiCityCatalog(city)) {
      // mount() itself is race-proof (a monotonic token discards stale writes),
      // but a call here can still lose the race to a newer getStationsList()
      // call for a *different* city that started after this one. Retry a bounded
      // number of times so we never hand back another city's station list —
      // if we can't converge on our own city, return an empty list rather than
      // silently wrong data. See docs/jim-brief-station-combobox-mount-race.md.
      if (dogfoodApi) {
        for (let attempt = 0; dogfoodApi.getCity?.() !== city && attempt < 3; attempt += 1) {
          await dogfoodApi.mount?.(city);
        }
      }
      const dogfood = dogfoodApi?.getCity?.() === city ? (dogfoodApi?.getStations?.() ?? []) : [];
      stationsCache = dogfood;
      return stationsCache;
    }

    if (dogfoodApi?.isActive?.()) {
      const dogfood = dogfoodApi.getStations?.() ?? [];
      if (dogfood.length) {
        stationsCache = dogfood;
        return stationsCache;
      }
    }

    if (stationsCache) {
      return stationsCache;
    }

    const collapseStationList = deps.collapseStationList;
    try {
      const list = collapseStationList(await fetchLocalJson("/stations.json"));
      if (window.NextTrainBrisbaneDogfood?.isActive?.()) {
        const dogfood = window.NextTrainBrisbaneDogfood.getStations?.() ?? [];
        stationsCache = dogfood.length ? dogfood : list;
      } else {
        stationsCache = list;
      }
    } catch (error) {
      console.warn("Could not load stations.json", error);
      stationsCache = collapseStationList([
        "Edgewater Stn",
        "Joondalup Stn",
        "Perth Underground Stn",
        "Mandurah Stn",
      ]);
    }

    return stationsCache;
  }

  function replaceStationsCache(names) {
    if (names == null) {
      stationsCache = null;
      detailStationCombobox?.clearLocalStationsCache?.();
      nearbyStationCombobox?.clearLocalStationsCache?.();
      return stationsCache;
    }
    stationsCache = Array.isArray(names) ? names : [];
    detailStationCombobox?.clearLocalStationsCache?.();
    nearbyStationCombobox?.clearLocalStationsCache?.();
    return stationsCache;
  }

  function invalidateStationPickerCaches() {
    stationsCache = null;
    nearbyStationsCache = null;
    detailStationCombobox?.clearLocalStationsCache?.();
    nearbyStationCombobox?.clearLocalStationsCache?.();
  }

  function getStationsCache() {
    return stationsCache;
  }

  function replaceSelectOptions(selectEl, options) {
    selectEl.replaceChildren();

    for (const { value, label, disabled, selected } of options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      if (disabled) {
        option.disabled = true;
      }
      if (selected) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    }
  }

  function renderStationOptions(selectEl, selectedStation) {
    const stations = stationsCache ?? [];
    replaceSelectOptions(selectEl, [
      {
        value: "",
        label: "Choose station…",
        disabled: true,
        selected: !selectedStation,
      },
      ...stations.map((name) => ({
        value: name,
        label: deps.formatStationLabel(name),
        selected: name === selectedStation,
      })),
    ]);
  }

  function filterStationsByQuery(query) {
    const stations = stationsCache ?? [];
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) {
      return stations;
    }

    return stations.filter((name) =>
      deps.formatStationLabel(name).toLowerCase().includes(normalized)
    );
  }

  function ensureStationsLoaded() {
    if (stationsCache?.length) {
      return Promise.resolve(stationsCache);
    }
    return getStationsList();
  }

  function createStationCombobox(root, { onChange, required = false, hideFooterOnOpen = false, loadStations } = {}) {
    const trigger = root?.querySelector(".station-combobox-input");
    const list = root?.querySelector(".station-combobox-list");
    if (!trigger || !list) {
      return null;
    }

    const shouldHideFooter =
      hideFooterOnOpen || root.id === "detail-station-combobox";

    let dropdown = root.querySelector(".station-combobox-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "station-combobox-dropdown";
      list.parentNode.insertBefore(dropdown, list);
      dropdown.appendChild(list);
    }

    let searchInput = dropdown.querySelector(".station-combobox-search-input");
    if (!searchInput) {
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "station-combobox-search-input";
      searchInput.placeholder = "Type a station";
      searchInput.setAttribute("autocomplete", "off");
      searchInput.setAttribute("aria-label", "Search stations");
      searchInput.hidden = true;
      dropdown.insertBefore(searchInput, list);
    }

    const isDetailPicker = root.id === "detail-station-combobox";
    const isNearbyPicker = root.id === "nearby-station-combobox";
    const resolveStationsList = loadStations || (isNearbyPicker ? getNearbyStationsList : getStationsList);
    let localStationsCache = null;
    let localCacheCity = "";
    // docs/jim-brief-country-wide-station-picker.md: only the primary
    // "Choose station" combobox (detail picker) goes country-wide; the
    // nearby-mode manual override keeps searching the active region only.
    let countryData = null;
    let selectedValue = "";
    let activeIndex = -1;
    let suppressBlurClose = false;
    let suppressOpenUntil = 0;
    let mode = "closed";
    let detailPositionListeners = [];

    function clearDetailDropdownPositionListeners() {
      for (const [target, event, handler] of detailPositionListeners) {
        target.removeEventListener(event, handler);
      }
      detailPositionListeners = [];
    }

    function resetDetailDropdownPosition() {
      if (!isDetailPicker) {
        return;
      }
      clearDetailDropdownPositionListeners();
      dropdown.style.position = "";
      dropdown.style.left = "";
      dropdown.style.width = "";
      dropdown.style.right = "";
      dropdown.style.top = "";
      dropdown.style.zIndex = "";
    }

    function syncDetailDropdownPosition() {
      if (!isDetailPicker || mode === "closed" || dropdown.hidden) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const gap = 4;
      dropdown.style.position = "fixed";
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.width = `${rect.width}px`;
      dropdown.style.right = "auto";
      dropdown.style.top = `${Math.round(rect.bottom + gap)}px`;
      dropdown.style.zIndex = "10002";
    }

    function bindDetailDropdownPositionListeners() {
      if (!isDetailPicker) {
        return;
      }

      clearDetailDropdownPositionListeners();
      const handler = () => syncDetailDropdownPosition();
      const scrollRoot = document.querySelector("#settings-detail-view .settings-detail-scroll");
      const dialog = document.getElementById("journeys-dialog");

      for (const target of [window, scrollRoot, dialog]) {
        if (!target) {
          continue;
        }
        target.addEventListener("scroll", handler, { passive: true });
        detailPositionListeners.push([target, "scroll", handler]);
      }

      window.addEventListener("resize", handler);
      detailPositionListeners.push([window, "resize", handler]);
    }

    function canOpenPicker() {
      return Date.now() >= suppressOpenUntil;
    }

    function markPickerJustClosed() {
      suppressOpenUntil = Date.now() + 350;
    }

    function setFooterHidden(hidden) {
      if (!shouldHideFooter) {
        return;
      }
      const detailView = document.getElementById("settings-detail-view");
      if (!detailView) {
        return;
      }
      detailView.classList.toggle("station-picker-open", Boolean(hidden));
    }

    function setExpanded(expanded) {
      trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
      root.classList.toggle("station-combobox--open", expanded);
      dropdown.hidden = !expanded;
      list.hidden = !expanded;
    }

    function updateTriggerLabel() {
      trigger.value = selectedValue ? deps.formatStationLabel(selectedValue) : "";
      trigger.placeholder = selectedValue ? "" : "Choose station";
    }

    function closeList({ restoreSelection = true } = {}) {
      mode = "closed";
      setExpanded(false);
      activeIndex = -1;
      searchInput.hidden = true;
      searchInput.value = "";
      setFooterHidden(false);
      resetDetailDropdownPosition();
      if (restoreSelection) {
        updateTriggerLabel();
      }
    }

    function filterLocalStationsByQuery(query) {
      const stations = localStationsCache ?? [];
      const normalized = String(query || "").trim().toLowerCase();
      if (!normalized) {
        return stations;
      }

      return stations.filter((name) =>
        deps.formatStationLabel(name).toLowerCase().includes(normalized)
      );
    }

    function ensureLocalStationsLoaded() {
      const city = planningCityId();
      const legacyPromise =
        localStationsCache?.length && localCacheCity === city
          ? Promise.resolve(localStationsCache)
          : resolveStationsList().then((list) => {
              localStationsCache = Array.isArray(list) ? list : [];
              localCacheCity = city;
              return localStationsCache;
            });

      if (!isDetailPicker) {
        return legacyPromise;
      }

      // Country-wide catalog for the primary "Choose station" combobox
      // (docs/jim-brief-country-wide-station-picker.md). The legacy
      // single-region list above still loads in parallel as a fallback for
      // when the country fetch fails or the active region has no country
      // mapping (renderList falls back to it when countryData is empty).
      const countryId = String(window.NextTrainCitySession?.readSavedCountry?.() || "").toLowerCase();
      const countryPromise =
        countryData && countryData.countryId === countryId
          ? Promise.resolve(countryData)
          : loadCountryStations(countryId).then((data) => {
              countryData = data;
              return countryData;
            });

      return Promise.all([legacyPromise, countryPromise]).then(() => localStationsCache);
    }

    function clearLocalStationsCache() {
      localStationsCache = null;
      localCacheCity = "";
      countryData = null;
    }

    function renderList(query = "") {
      if (isDetailPicker && countryData?.stations?.length) {
        renderCountryList(query);
        return;
      }
      const matches = filterLocalStationsByQuery(query);
      list.innerHTML = "";

      if (mode === "browse") {
        const searchRow = document.createElement("li");
        searchRow.className = "station-combobox-search";
        searchRow.setAttribute("role", "option");
        searchRow.textContent = "Search stations";
        searchRow.addEventListener("mousedown", (event) => {
          event.preventDefault();
          suppressBlurClose = true;
        });
        searchRow.addEventListener("click", () => {
          enterSearchMode();
        });
        list.appendChild(searchRow);
      }

      if (!matches.length) {
        const empty = document.createElement("li");
        empty.className = "station-combobox-empty";
        empty.textContent = mode === "search" ? "No stations match" : "No stations available";
        empty.setAttribute("aria-disabled", "true");
        list.appendChild(empty);
        activeIndex = -1;
        if (mode === "search") {
          appendCoverageRow();
        }
        return;
      }

      const optionOffset = mode === "browse" ? 1 : 0;
      // Two catalog entries can share a printed name (doNotGroup pairs, e.g.
      // Liverpool Lime Street's National Rail vs Merseyrail presence). Compute
      // suffixes across the whole visible list so duplicate rows stay
      // distinguishable instead of two identical, unpickable-apart options.
      const suffixes = disambiguationSuffixesFor(matches);
      matches.forEach((name, index) => {
        const item = document.createElement("li");
        item.className = "station-combobox-option";
        item.setAttribute("role", "option");
        item.dataset.value = name;
        item.textContent = deps.formatStationLabel(name) + suffixes[index];
        if (name === selectedValue) {
          item.setAttribute("aria-selected", "true");
        }
        const optionIndex = index + optionOffset;
        if (optionIndex === activeIndex) {
          item.classList.add("station-combobox-option--active");
        }
        item.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          suppressBlurClose = true;
        });
        item.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          suppressBlurClose = true;
        });
        item.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectStation(name);
        });
        list.appendChild(item);
      });
      if (mode === "search") {
        appendCoverageRow();
      }
    }

    /**
     * docs/jim-brief-country-wide-station-picker.md — country-wide render path for
     * the primary "Choose station" combobox. Region filter narrows the dataset;
     * an empty query shows "Your routes"/"Near you" then the region-grouped list
     * with sticky headers; a query flattens to tagged results across the country.
     */
    function activeRegionFilter() {
      return window.NextTrainCitySession?.readRegionFilter?.() || "";
    }

    function labelForStation(station) {
      return deps.formatStationLabel(station.name);
    }

    function appendGroupHeader(label, { sticky = false, disabled = false } = {}) {
      const header = document.createElement("li");
      header.className = "station-combobox-group-header";
      if (sticky) {
        header.classList.add("station-combobox-group-header--sticky");
      }
      if (disabled) {
        header.classList.add("station-combobox-group-header--coming-soon");
      }
      header.setAttribute("role", "presentation");
      header.setAttribute("aria-disabled", "true");
      header.textContent = label;
      list.appendChild(header);
    }

    function appendCountryStationRows(
      stations,
      { showTag, rowCounter = { value: 0 }, distanceByName = null }
    ) {
      const names = stations.map((station) => station.name);
      // The existing same-name/different-mode suffix (e.g. Liverpool Lime
      // Street's National Rail vs Merseyrail rows) only applies within a
      // single active region's own catalog — cross-region name collisions
      // are already disambiguated by the region tag instead.
      const suffixes = showTag ? names.map(() => "") : disambiguationSuffixesFor(names);
      stations.forEach((station, index) => {
        const item = document.createElement("li");
        item.className = "station-combobox-option";
        item.setAttribute("role", "option");
        item.dataset.value = station.name;
        item.dataset.region = station.region?.id || "";
        item.textContent = labelForStation(station) + suffixes[index];
        if (showTag && station.region?.displayName) {
          const tag = document.createElement("span");
          tag.className = "station-combobox-region-tag";
          tag.textContent = ` · ${station.region.displayName}`;
          item.appendChild(tag);
        }
        const distanceKmValue = distanceByName?.get(station.name);
        if (typeof distanceKmValue === "number" && Number.isFinite(distanceKmValue)) {
          const distance = document.createElement("span");
          distance.className = "station-combobox-distance";
          distance.dataset.distanceKm = String(distanceKmValue);
          distance.textContent = ` · ${formatNearYouDistance(distanceKmValue)}`;
          item.appendChild(distance);
        }
        if (station.name === selectedValue) {
          item.setAttribute("aria-selected", "true");
        }
        if (rowCounter.value === activeIndex) {
          item.classList.add("station-combobox-option--active");
        }
        rowCounter.value += 1;
        item.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          suppressBlurClose = true;
        });
        item.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          suppressBlurClose = true;
        });
        item.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          void selectCountryStation(station.name, station.region?.id || "");
        });
        list.appendChild(item);
      });
    }

    /** "Your routes" — stations from saved journeys, de-duplicated, most recent first. */
    function buildYourRoutesGroup(scoped) {
      const journeys =
        typeof deps.getConfiguredJourneys === "function" ? deps.getConfiguredJourneys() : [];
      if (!Array.isArray(journeys) || !journeys.length) {
        return [];
      }
      const byName = new Map(scoped.map((station) => [station.name, station]));
      const ordered = [...journeys].sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));
      const seen = new Set();
      const result = [];
      for (const journey of ordered) {
        const name = journey?.station;
        if (!name || seen.has(name)) {
          continue;
        }
        const station = byName.get(name);
        if (!station) {
          continue;
        }
        seen.add(name);
        result.push(station);
      }
      return result;
    }

    const NEAR_YOU_STALE_MS = 30 * 60 * 1000;
    const NEAR_YOU_COUNT = 5;

    function toRadiansLocal(value) {
      return (value * Math.PI) / 180;
    }

    function haversineDistanceKm(lat1, lng1, lat2, lng2) {
      const earthRadiusKm = 6371;
      const dLat = toRadiansLocal(lat2 - lat1);
      const dLng = toRadiansLocal(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadiansLocal(lat1)) * Math.cos(toRadiansLocal(lat2)) * Math.sin(dLng / 2) ** 2;
      return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatNearYouDistance(km) {
      if (km < 10) {
        return `${km.toFixed(1)} km`;
      }
      return `${Math.round(km)} km`;
    }

    /**
     * docs/jim-brief-picker-near-you-nearest-five.md: reads the app-wide
     * last-known-position cache (public/app.js, written only by existing
     * geolocation call sites — this never makes a geolocation call itself).
     * A fresh (<30 min) cache is used to compute the five nearest liveFeed
     * stations by haversine distance; a missing/stale cache falls back to
     * today's single-row behaviour (the last resolved Near me station).
     */
    function readFreshLastKnownPosition() {
      const cache = window.nextTrainLastPosition?.read?.();
      if (
        !cache ||
        !Number.isFinite(cache.lat) ||
        !Number.isFinite(cache.lng) ||
        !Number.isFinite(cache.timestamp)
      ) {
        return null;
      }
      if (Date.now() - cache.timestamp > NEAR_YOU_STALE_MS) {
        return null;
      }
      return cache;
    }

    function buildNearYouGroup(scoped) {
      const position = readFreshLastKnownPosition();
      if (position) {
        const rows = scoped
          .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
          .map((station) => ({
            station,
            distanceKm: haversineDistanceKm(position.lat, position.lng, station.lat, station.lng),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, NEAR_YOU_COUNT);
        return { rows, usingPosition: true };
      }

      const cache = window.nextTrainNearby?.readLastNearbyStationCache?.();
      if (!cache?.station) {
        return { rows: [], usingPosition: false };
      }
      const station = scoped.find((entry) => entry.name === cache.station);
      return { rows: station ? [{ station, distanceKm: null }] : [], usingPosition: false };
    }

    /**
     * A station that can never produce a board must never be offered, in
     * the country-wide list exactly as in the region list — this is the one
     * shared point every group and search result below flows through, using
     * the same predicate parseCatalogRows (public/brisbane-dogfood.js)
     * applies to the region list, so the two paths can't drift again.
     * Filtering here (not only server-side/at fetch time) also covers a
     * list cached in localStorage from before this fix shipped.
     * docs/jim-brief-country-list-hides-no-live-feed-stops.md
     */
    function isLiveFeedCountryStation(station) {
      const predicate = window.NextTrainBrisbaneDogfood?.isLiveFeedRow;
      return typeof predicate === "function" ? predicate(station) : station?.liveFeed !== false;
    }

    function renderCountryList(query) {
      const normalized = String(query || "").trim().toLowerCase();
      const filterRegion = activeRegionFilter();
      const allStations = (countryData?.stations ?? []).filter(isLiveFeedCountryStation);
      const scoped = filterRegion
        ? allStations.filter((station) => station.region?.id === filterRegion)
        : allStations;

      list.innerHTML = "";
      activeIndex = normalized ? 0 : -1;

      if (normalized) {
        const matches = scoped.filter((station) =>
          labelForStation(station).toLowerCase().includes(normalized)
        );
        if (!matches.length) {
          const empty = document.createElement("li");
          empty.className = "station-combobox-empty";
          const comingSoon = comingSoonRegionsForCountry(countryData?.countryId).map((r) => r.name);
          empty.textContent = comingSoon.length
            ? `No match. Coming soon in this country: ${comingSoon.join(", ")}`
            : "No stations match";
          empty.setAttribute("aria-disabled", "true");
          list.appendChild(empty);
          appendCoverageRow();
          return;
        }
        appendCountryStationRows(matches, { showTag: !filterRegion });
        appendCoverageRow();
        return;
      }

      let anyRows = false;
      const rowCounter = { value: 0 };

      const yourRoutes = buildYourRoutesGroup(scoped);
      if (yourRoutes.length) {
        anyRows = true;
        appendGroupHeader("Your routes");
        appendCountryStationRows(yourRoutes, { showTag: !filterRegion, rowCounter });
      }

      const nearYou = buildNearYouGroup(scoped);
      if (nearYou.rows.length) {
        anyRows = true;
        appendGroupHeader("Near you");
        appendCountryStationRows(
          nearYou.rows.map((entry) => entry.station),
          {
            // The fresh-position nearest-5 path always carries a region tag
            // (it can span regions even under a filter — see brief). The
            // fallback single row keeps today's showTag behaviour.
            showTag: nearYou.usingPosition || !filterRegion,
            rowCounter,
            distanceByName: new Map(nearYou.rows.map((entry) => [entry.station.name, entry.distanceKm])),
          }
        );
      }

      const byRegion = new Map();
      for (const station of scoped) {
        const key = station.region?.id || "";
        if (!byRegion.has(key)) {
          byRegion.set(key, { displayName: station.region?.displayName || key, stations: [] });
        }
        byRegion.get(key).stations.push(station);
      }
      const regionGroups = [...byRegion.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
      for (const group of regionGroups) {
        anyRows = true;
        group.stations.sort((a, b) => labelForStation(a).localeCompare(labelForStation(b)));
        // Region already named by the sticky header, so the tag is redundant here.
        appendGroupHeader(group.displayName, { sticky: true });
        appendCountryStationRows(group.stations, { showTag: false, rowCounter });
      }

      if (!filterRegion) {
        for (const region of comingSoonRegionsForCountry(countryData?.countryId)) {
          anyRows = true;
          appendGroupHeader(`${region.name} (Coming Soon)`, { sticky: true, disabled: true });
        }
      }

      if (!anyRows) {
        const empty = document.createElement("li");
        empty.className = "station-combobox-empty";
        empty.textContent = "No stations available";
        empty.setAttribute("aria-disabled", "true");
        list.appendChild(empty);
      }
    }

    /**
     * Picking a country-wide row sets the active region silently (brief #6)
     * before the selection fires onChange, so direction lookups etc. see the
     * newly-mounted region's catalog rather than racing it.
     */
    async function selectCountryStation(name, regionId) {
      if (regionId && regionId !== planningCityId()) {
        try {
          await window.NextTrainCitySession?.applyCity?.(regionId, { persist: true, explicit: false });
        } catch (error) {
          console.warn("[station-combobox] Could not switch region for station pick", error);
        }
      }
      selectStation(name);
    }

    /**
     * Entry point A (docs/jim-brief-help-coverage-notes.md) — a final, non-selectable
     * "Can't find your station?" row that opens Help scrolled to the coverage entry for
     * the active region. Shared handler for entry point B (the "?" icon button) too.
     */
    function appendCoverageRow() {
      if (!window.NextTrainHelpCoverage) {
        return;
      }
      const region = planningCityId();
      const row = document.createElement("li");
      row.className = "station-combobox-coverage-row station-picker-coverage-row";
      row.setAttribute("role", "option");
      row.setAttribute("aria-disabled", "true");
      row.textContent = `Can't find your station? See what's covered in ${window.NextTrainHelpCoverage.regionLabel(region)}`;
      row.addEventListener("mousedown", (event) => {
        event.preventDefault();
        suppressBlurClose = true;
      });
      row.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeList({ restoreSelection: true });
        window.NextTrainHelpCoverage.open();
      });
      list.appendChild(row);
    }

    function openBrowse() {
      // docs/jim-brief-country-wide-station-picker.md #2: the search field is
      // now the primary interaction for the "Choose station" combobox —
      // opening it goes straight to search mode (keyboard up on mobile)
      // instead of an intermediate "Search stations" row.
      if (isDetailPicker) {
        enterSearchMode();
        return;
      }
      mode = "browse";
      activeIndex = -1;
      searchInput.hidden = true;
      searchInput.value = "";
      setExpanded(true);
      setFooterHidden(true);
      void ensureLocalStationsLoaded().then(() => {
        // The country-wide fetch (docs/jim-brief-country-wide-station-picker.md)
        // is a real network round trip, unlike the old in-memory catalog read —
        // by the time it resolves the rider (or a fast Playwright test) may
        // already have typed a query, so re-render against the CURRENT search
        // value rather than unconditionally blanking it back to "".
        renderList(searchInput.hidden ? "" : searchInput.value);
        if (isDetailPicker) {
          syncDetailDropdownPosition();
          bindDetailDropdownPositionListeners();
          window.requestAnimationFrame(syncDetailDropdownPosition);
        }
      });
    }

    function enterSearchMode() {
      mode = "search";
      activeIndex = 0;
      setExpanded(true);
      setFooterHidden(true);
      searchInput.hidden = false;
      searchInput.value = "";
      void ensureLocalStationsLoaded().then(() => {
        // See the matching comment in openBrowse() above — don't clobber a
        // query the rider already typed while this was still in flight.
        renderList(searchInput.value);
        if (isDetailPicker) {
          syncDetailDropdownPosition();
          bindDetailDropdownPositionListeners();
          window.requestAnimationFrame(syncDetailDropdownPosition);
        }
        window.setTimeout(() => {
          searchInput.focus();
        }, 0);
      });
    }

    function selectStation(name, { silent = false } = {}) {
      selectedValue = name || "";
      updateTriggerLabel();
      closeList({ restoreSelection: false });
      markPickerJustClosed();
      if (shouldHideFooter) {
        document.getElementById("settings-detail-view")?.classList.remove("station-picker-open");
      }
      if (!silent && typeof onChange === "function") {
        onChange(selectedValue);
      }
    }

    function setValue(name, { silent = false } = {}) {
      selectStation(name, { silent });
    }

    function getValue() {
      return selectedValue;
    }

    function focus() {
      openBrowse();
    }

    function getFocusableOptions() {
      return [...list.querySelectorAll(".station-combobox-option, .station-combobox-search")];
    }

    trigger.readOnly = true;
    updateTriggerLabel();

    trigger.addEventListener("pointerdown", (event) => {
      if (mode === "closed" && canOpenPicker()) {
        event.preventDefault();
        openBrowse();
      }
    });

    trigger.addEventListener("click", (event) => {
      if (mode === "closed" && canOpenPicker()) {
        event.preventDefault();
        openBrowse();
      }
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mode !== "closed") {
        event.preventDefault();
        closeList();
        return;
      }

      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        if (mode === "closed") {
          openBrowse();
        }
      }
    });

    searchInput.addEventListener("input", () => {
      activeIndex = 0;
      renderList(searchInput.value);
    });

    searchInput.addEventListener("keydown", (event) => {
      const options = getFocusableOptions();
      if (event.key === "Escape") {
        event.preventDefault();
        closeList();
        trigger.focus();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!options.length) {
          return;
        }
        activeIndex = Math.min(activeIndex + 1, options.length - 1);
        renderList(searchInput.value);
        options[activeIndex]?.scrollIntoView({ block: "nearest" });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!options.length) {
          return;
        }
        activeIndex = Math.max(activeIndex - 1, 0);
        renderList(searchInput.value);
        options[activeIndex]?.scrollIntoView({ block: "nearest" });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const pick = options[activeIndex >= 0 ? activeIndex : 0];
        if (pick?.classList.contains("station-combobox-search")) {
          return;
        }
        if (pick?.dataset.value) {
          if (isDetailPicker && countryData?.stations?.length) {
            void selectCountryStation(pick.dataset.value, pick.dataset.region || "");
          } else {
            selectStation(pick.dataset.value);
          }
        }
      }
    });

    searchInput.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (suppressBlurClose) {
          suppressBlurClose = false;
          return;
        }
        if (mode !== "closed" && !root.contains(document.activeElement)) {
          closeList();
        }
      }, 120);
    });

    document.addEventListener("pointerdown", (event) => {
      if (!root.contains(event.target)) {
        closeList();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mode !== "closed") {
        event.preventDefault();
        closeList();
        trigger.focus();
      }
    });

    if (isDetailPicker) {
      // Region filter changed (Region screen's select) while the list is
      // open — re-render immediately against the new scope.
      document.addEventListener("nexttrain:region-filter-changed", () => {
        if (mode !== "closed") {
          renderList(searchInput.hidden ? "" : searchInput.value);
        }
      });
    }

    return {
      getValue,
      setValue,
      focus,
      openBrowse,
      closeList,
      enterSearchMode,
      clearLocalStationsCache,
      required,
      trigger,
      searchInput,
      list,
    };
  }

  function initStationComboboxes() {
    const {
      detailStationComboboxRoot,
      detailDirectionSelect,
      loadDirectionsForSelect,
      syncDetailNearestStationChrome,
      nearbyStationComboboxRoot,
      isNearbyModeActive,
      applyNearbyManualStation,
    } = deps;

    if (detailStationComboboxRoot) {
      detailStationCombobox = createStationCombobox(detailStationComboboxRoot, {
        required: true,
        hideFooterOnOpen: true,
        onChange: (station) => {
          void loadDirectionsForSelect(detailDirectionSelect, station);
          const state = deps.getDetailNearestState ? deps.getDetailNearestState() : deps.detailNearestState;
          if (!station) {
            syncDetailNearestStationChrome({ error: false, hint: "" });
          } else if (!state || !state.loading) {
            syncDetailNearestStationChrome({ error: false, hint: "" });
          }
        },
      });
    }

    if (nearbyStationComboboxRoot) {
      nearbyStationCombobox = createStationCombobox(nearbyStationComboboxRoot, {
        onChange: (station) => {
          if (station && isNearbyModeActive()) {
            void applyNearbyManualStation(station);
          }
        },
      });
    }

    void getStationsList();

    document.addEventListener("nexttrain:city-changed", () => {
      invalidateStationPickerCaches();
      void getStationsList();
    });
  }

  function setStationComboboxValue(combobox, station) {
    combobox?.setValue(station || "", { silent: true });
  }

  function init(nextDeps = {}) {
    deps = nextDeps;
    initStationComboboxes();
  }

  const api = {
    init,
    fetchLocalJson,
    getStationsList,
    getNearbyStationsList,
    loadCountryStations,
    getStationsCache,
    getNearbyStationsCache,
    replaceStationsCache,
    invalidateStationPickerCaches,
    replaceNearbyStationsCache,
    replaceSelectOptions,
    renderStationOptions,
    filterStationsByQuery,
    createStationCombobox,
    initStationComboboxes,
    setStationComboboxValue,
    getDetailCombobox: () => detailStationCombobox,
    getNearbyCombobox: () => nearbyStationCombobox,
    disambiguationSuffixesFor,
    modeDisplayLabel,
  };

  global.nextTrainStationCombobox = api;
})(window);
