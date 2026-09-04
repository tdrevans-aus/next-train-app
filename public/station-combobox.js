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
      if (localStationsCache?.length && localCacheCity === city) {
        return Promise.resolve(localStationsCache);
      }
      return resolveStationsList().then((list) => {
        localStationsCache = Array.isArray(list) ? list : [];
        localCacheCity = city;
        return localStationsCache;
      });
    }

    function clearLocalStationsCache() {
      localStationsCache = null;
      localCacheCity = "";
    }

    function renderList(query = "") {
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
        return;
      }

      const optionOffset = mode === "browse" ? 1 : 0;
      matches.forEach((name, index) => {
        const item = document.createElement("li");
        item.className = "station-combobox-option";
        item.setAttribute("role", "option");
        item.dataset.value = name;
        item.textContent = deps.formatStationLabel(name);
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
    }

    function openBrowse() {
      mode = "browse";
      activeIndex = -1;
      searchInput.hidden = true;
      searchInput.value = "";
      setExpanded(true);
      setFooterHidden(true);
      void ensureLocalStationsLoaded().then(() => {
        renderList("");
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
      searchInput.hidden = false;
      searchInput.value = "";
      void ensureLocalStationsLoaded().then(() => {
        renderList("");
        if (isDetailPicker) {
          syncDetailDropdownPosition();
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
          selectStation(pick.dataset.value);
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
  };

  global.nextTrainStationCombobox = api;
})(window);
