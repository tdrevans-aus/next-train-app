/**
 * Multi-city session: Sydney, Brisbane, and Adelaide use production Vercel APIs.
 * Local debug can still probe a LAN dev server. Never silent-switch after an explicit pick.
 */
(function () {
  const LIVE_CITY = "perth";
  const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "amsterdam", "rotterdam", "vancouver", "canberra", "gold-coast", "newcastle", "auckland", "stockholm", "goteborg", "wellington", "malmo", "uppsala", "helsinki", "oslo", "uk-west-midlands", "west-of-england", "east-midlands", "liverpool-city-region", "solent", "south-wales", "west-yorkshire", "thames-valley", "greater-anglia", "rest-of-wales", "rest-of-scotland", "london-se-national-rail", "southwest", "greater-manchester", "south-yorkshire", "north-east", "glasgow", "cumbria"];
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const SETTINGS_KEY = "nextTrainSettings";

  const COUNTRIES = [
    {
      id: "au",
      name: "Australia",
      regions: [
        { id: "adelaide", name: "Adelaide", timeZone: "Australia/Adelaide" },
        { id: "brisbane", name: "Brisbane", timeZone: "Australia/Brisbane" },
        { id: "canberra", name: "Canberra", timeZone: "Australia/Sydney" },
        { id: "gold-coast", name: "Gold Coast", timeZone: "Australia/Brisbane" },
        { id: "melbourne", name: "Melbourne", timeZone: "Australia/Melbourne", comingSoon: true },
        { id: "newcastle", name: "Newcastle", timeZone: "Australia/Sydney" },
        { id: "perth", name: "Perth", timeZone: "Australia/Perth" },
        { id: "sydney", name: "Sydney", timeZone: "Australia/Sydney" },
      ],
    },
    {
      id: "nz",
      name: "New Zealand",
      regions: [
        { id: "auckland", name: "Auckland", timeZone: "Pacific/Auckland" },
        { id: "wellington", name: "Wellington", timeZone: "Pacific/Auckland" },
      ],
    },
    {
      id: "gb",
      name: "United Kingdom",
      regions: [
        { id: "cumbria", name: "Cumbria", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "east-midlands", name: "East Midlands", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "edinburgh", name: "Edinburgh", timeZone: "Europe/London", comingSoon: true, feed: "darwin" },
        { id: "glasgow", name: "Glasgow", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "greater-anglia", name: "Greater Anglia", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "greater-manchester", name: "Greater Manchester", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "liverpool-city-region", name: "Liverpool City Region", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "uk-london-tfl", name: "London", timeZone: "Europe/London" },
        { id: "london-se-national-rail", name: "London & South East National Rail", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "north-east", name: "North East (Tyne and Wear)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "rest-of-scotland", name: "Rest of Scotland", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "rest-of-wales", name: "Rest of Wales", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "solent", name: "Solent (Southampton / Portsmouth)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "south-wales", name: "South Wales", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "south-yorkshire", name: "South Yorkshire", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "southwest", name: "Southwest", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "thames-valley", name: "Thames Valley (Reading / Oxford)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "uk-west-midlands", name: "West Midlands", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "west-of-england", name: "West of England", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "west-yorkshire", name: "West Yorkshire", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
      ],
    },
    {
      id: "nl",
      name: "Netherlands",
      regions: [
        { id: "amsterdam", name: "Amsterdam", timeZone: "Europe/Amsterdam" },
        { id: "rotterdam", name: "Rotterdam", timeZone: "Europe/Amsterdam" },
      ],
    },
    {
      id: "se",
      name: "Sweden",
      regions: [
        { id: "goteborg", name: "Göteborg", timeZone: "Europe/Stockholm" },
        { id: "malmo", name: "Malmö", timeZone: "Europe/Stockholm" },
        { id: "stockholm", name: "Stockholm", timeZone: "Europe/Stockholm" },
        { id: "uppsala", name: "Uppsala", timeZone: "Europe/Stockholm" },
      ],
    },
    {
      id: "no",
      name: "Norway",
      regions: [
        { id: "oslo", name: "Oslo", timeZone: "Europe/Oslo" },
      ],
    },
    {
      id: "ca",
      name: "Canada",
      regions: [
        { id: "vancouver", name: "Vancouver", timeZone: "America/Vancouver" },
      ],
    },
    {
      id: "fi",
      name: "Finland",
      regions: [
        { id: "helsinki", name: "Helsinki", timeZone: "Europe/Helsinki", comingSoon: false },
      ],
    },

  ];

  const CITY_BOUNDS = {
    sydney: { minLat: -34.15, maxLat: -33.45, minLng: 150.6, maxLng: 151.35 },
    newcastle: { minLat: -32.94, maxLat: -32.91, minLng: 151.75, maxLng: 151.80 },
    perth: { minLat: -32.8, maxLat: -31.4, minLng: 115.55, maxLng: 116.25 },
    "gold-coast": { minLat: -28.13, maxLat: -27.90, minLng: 153.32, maxLng: 153.46 },
    brisbane: { minLat: -28.2, maxLat: -27.0, minLng: 152.6, maxLng: 153.6 },
    adelaide: { minLat: -35.3, maxLat: -34.55, minLng: 138.35, maxLng: 138.85 },
    "uk-london-tfl": { minLat: 51.28, maxLat: 51.7, minLng: -0.52, maxLng: 0.35 },
    amsterdam: { minLat: 52.28, maxLat: 52.43, minLng: 4.75, maxLng: 5.05 },
    rotterdam: { minLat: 51.82, maxLat: 52.12, minLng: 4.08, maxLng: 4.60 },
    vancouver: { minLat: 49.0, maxLat: 49.35, minLng: -123.3, maxLng: -122.7 },
    canberra: { minLat: -35.32, maxLat: -35.16, minLng: 149.10, maxLng: 149.17 },
    auckland: { minLat: -37.12, maxLat: -36.72, minLng: 174.62, maxLng: 175.05 },
    stockholm: { minLat: 58.85, maxLat: 59.60, minLng: 17.50, maxLng: 18.40 },
    goteborg: { minLat: 57.55, maxLat: 57.85, minLng: 11.75, maxLng: 12.25 },
    wellington: { minLat: -41.45, maxLat: -40.80, minLng: 174.75, maxLng: 175.70 },
    malmo: { minLat: 55.30, maxLat: 56.75, minLng: 12.60, maxLng: 15.55 },
    uppsala: { minLat: 59.30, maxLat: 60.75, minLng: 16.80, maxLng: 18.60 },
    helsinki: { minLat: 60.13, maxLat: 60.25, minLng: 24.62, maxLng: 25.16 },
    oslo: { minLat: 59.60, maxLat: 60.25, minLng: 10.40, maxLng: 11.20 },
    "uk-west-midlands": { minLat: 52.25, maxLat: 52.70, minLng: -2.35, maxLng: -1.45 },
    "west-of-england": { minLat: 50.90, maxLat: 51.95, minLng: -3.20, maxLng: -2.10 },
    "east-midlands": { minLat: 52.25, maxLat: 53.28, minLng: -1.47, maxLng: -0.65 },
    "greater-anglia": { minLat: 52.0, maxLat: 52.9, minLng: 0.0, maxLng: 1.4 },
    "greater-manchester": { minLat: 53.35, maxLat: 53.55, minLng: -2.35, maxLng: -2.10 },
    "south-yorkshire": { minLat: 53.30, maxLat: 53.62, minLng: -1.58, maxLng: -1.25 },
    "north-east": { minLat: 54.85, maxLat: 55.80, minLng: -2.10, maxLng: -1.35 },
    "liverpool-city-region": { minLat: 53.25, maxLat: 53.43, minLng: -3.02, maxLng: -2.85 },
    solent: { minLat: 50.75, maxLat: 51.55, minLng: -2.30, maxLng: -0.05 },
    "south-wales": { minLat: 51.30, maxLat: 51.70, minLng: -3.65, maxLng: -2.70 },
    "west-yorkshire": { minLat: 53.65, maxLat: 53.95, minLng: -2.40, maxLng: -1.30 },
    "thames-valley": { minLat: 51.0, maxLat: 52.0, minLng: -1.5, maxLng: -0.5 },
    "rest-of-wales": { minLat: 51.55, maxLat: 53.4, minLng: -5.5, maxLng: -2.6 },
    "rest-of-scotland": { minLat: 55.4, maxLat: 58.6, minLng: -5.5, maxLng: -2.0 },
    "london-se-national-rail": { minLat: 50.7, maxLat: 51.7, minLng: -0.5, maxLng: 0.8 },
    southwest: { minLat: 50.5, maxLat: 51.3, minLng: -4.7, maxLng: -3.0 },
    glasgow: { minLat: 55.80, maxLat: 55.92, minLng: -4.40, maxLng: -4.15 },
    cumbria: { minLat: 54.00, maxLat: 55.00, minLng: -3.30, maxLng: -2.20 },
  };

  function dogfood() {
    return window.NextTrainBrisbaneDogfood || window.NextTrainPlannedCityDogfood;
  }

  function regionById(regionId) {
    for (const country of COUNTRIES) {
      const region = country.regions.find((entry) => entry.id === regionId);
      if (region) {
        return { country, region };
      }
    }
    return null;
  }

  function countryById(countryId) {
    return COUNTRIES.find((country) => country.id === countryId) ?? COUNTRIES[0];
  }

  function inBounds(lat, lng, box) {
    return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
  }

  function hintCityFromCoords(lat, lng) {
    for (const [id, box] of Object.entries(CITY_BOUNDS)) {
      if (inBounds(lat, lng, box)) {
        return id;
      }
    }
    return null;
  }

  const TFL_OPEN_DATA_LINE = "Powered by TfL Open Data";
  const VANCOUVER_TRANSLINK_DISCLAIMER =
    "Some of the data used in this product or service is provided by permission of TransLink. TransLink assumes no responsibility for the accuracy or currency of the Data used in this product or service.";
  const RDG_LDB_LINE =
    "Live departure data © Rail Delivery Group, via the Rail Data Marketplace. Times may change — check station displays.";

  function isDarwinCityId(cityId) {
    const id = String(cityId || "").toLowerCase();
    const found = regionById(id);
    return Boolean(found && found.region.feed === "darwin");
  }

  function feedAttributionForCity(cityId) {
    const id = String(cityId || "").toLowerCase();
    if (id === "vancouver") {
      return { text: VANCOUVER_TRANSLINK_DISCLAIMER, required: true };
    }
    if (id === "uk-london-tfl") {
      return { text: TFL_OPEN_DATA_LINE, required: false };
    }
    if (isDarwinCityId(id)) {
      return { text: RDG_LDB_LINE, required: true };
    }
    return null;
  }

  function syncFeedAttribution(cityId) {
    const el = document.getElementById("attribution");
    if (!el) {
      return;
    }
    const city = String(cityId || readSavedCity() || LIVE_CITY).toLowerCase();
    const attr = feedAttributionForCity(city);
    if (!attr) {
      el.textContent = "";
      el.hidden = true;
      el.classList.remove("is-required");
      return;
    }
    el.textContent = attr.text;
    el.hidden = false;
    el.classList.toggle("is-required", Boolean(attr.required));
  }

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function readSavedCity() {
    const city = String(readStore().savedCity || "").toLowerCase();
    return regionById(city)?.region.comingSoon ? "" : city;
  }

  function readSavedCountry() {
    const fromStore = String(readStore().savedCountry || "").toLowerCase();
    if (countryById(fromStore)?.id === fromStore) {
      return fromStore;
    }
    return regionById(readSavedCity())?.country.id ?? "au";
  }

  function readRegionExplicit() {
    return readStore().regionExplicit === true;
  }

  function persistRegion({ city, country, explicit }) {
    const patch = {
      savedCity: city,
      savedCountry: country || regionById(city)?.country.id || "au",
    };
    if (explicit !== undefined) {
      patch.regionExplicit = Boolean(explicit);
    }
    const persist = window.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist(patch);
      return;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readStore(), ...patch }));
  }

  function isRegionOpen(region) {
    if (!region || region.comingSoon) {
      return false;
    }
    return true;
  }

  function firstOpenRegion(countryId) {
    return countryById(countryId).regions.find((region) => isRegionOpen(region)) ?? null;
  }

  function readRegionMismatchDismissed() {
    return String(readStore().regionMismatchDismissed || "");
  }

  function dismissRegionMismatch(savedCity, detectedCity) {
    const patch = {
      regionMismatchDismissed: `${savedCity}>${detectedCity}`,
    };
    const persist = window.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist(patch);
      return;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readStore(), ...patch }));
  }

  function clearRegionMismatchDismissed() {
    const persist = window.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist({ regionMismatchDismissed: "" });
      return;
    }
    const store = readStore();
    delete store.regionMismatchDismissed;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(store));
  }

  function bindRegionMismatchDialog() {
    const dialog = document.getElementById("region-mismatch-dialog");
    const body =
      document.getElementById("region-mismatch-body") ||
      document.getElementById("region-mismatch-dialog-body");
    const switchBtn = document.getElementById("region-mismatch-switch-btn");
    const keepBtn =
      document.getElementById("region-mismatch-keep-btn") ||
      document.getElementById("region-mismatch-dismiss-btn");
    if (!dialog || !body || !switchBtn || !keepBtn) {
      return;
    }

    let pending = null;

    function closeDialog() {
      window.nextTrainApp?.closeAppDialog?.(dialog);
      pending = null;
    }

    switchBtn.addEventListener("click", () => {
      const next = pending;
      closeDialog();
      if (next?.detectedCity) {
        clearRegionMismatchDismissed();
        void applyCity(next.detectedCity, { persist: true, explicit: true });
      }
    });

    keepBtn.addEventListener("click", () => {
      const next = pending;
      closeDialog();
      if (next?.savedCity && next?.detectedCity) {
        dismissRegionMismatch(next.savedCity, next.detectedCity);
      }
    });

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      const next = pending;
      closeDialog();
      if (next?.savedCity && next?.detectedCity) {
        dismissRegionMismatch(next.savedCity, next.detectedCity);
      }
    });

    return {
      open(savedCity, detectedCity) {
        pending = { savedCity, detectedCity };
        const savedLabel = regionDisplayName(savedCity);
        const detectedLabel = regionDisplayName(detectedCity);
        body.textContent = `Your location looks like ${detectedLabel}, but the app is set to ${savedLabel}. Switch region?`;
        switchBtn.textContent = `Switch to ${detectedLabel}`;
        keepBtn.textContent = `Keep ${savedLabel}`;
        window.nextTrainApp?.openAppDialog?.(dialog);
      },
    };
  }

  let regionMismatchDialog = null;

  async function maybePromptRegionMismatch({ locateCity, skip } = {}) {
    let shouldSkip = false;
    try {
      shouldSkip = typeof skip === "function" ? Boolean(skip()) : Boolean(skip);
    } catch {
      shouldSkip = false;
    }
    if (shouldSkip) {
      return false;
    }
    const explicit = readRegionExplicit();
    if (!explicit) {
      console.log("[NextTrainCitySession] Mismatch check skipped: not explicit");
      return false;
    }
    const savedCity = readSavedCity() || LIVE_CITY;
    const locate = locateCity || geolocateHint;
    console.log("[NextTrainCitySession] Mismatch check: locating...");
    const detectedCity = await locate();
    console.log(`[NextTrainCitySession] Mismatch check: saved=${savedCity}, detected=${detectedCity}`);
    if (!detectedCity || detectedCity === savedCity) {
      return false;
    }
    const detectedRegion = regionById(detectedCity)?.region;
    if (!isRegionOpen(detectedRegion)) {
      return false;
    }
    const pairKey = `${savedCity}>${detectedCity}`;
    if (readRegionMismatchDismissed() === pairKey) {
      console.log(`[NextTrainCitySession] Mismatch check: dismissed already (${pairKey})`);
      return false;
    }
    if (!regionMismatchDialog) {
      regionMismatchDialog = bindRegionMismatchDialog();
    }
    if (!regionMismatchDialog) {
      console.warn("[NextTrainCitySession] Mismatch check: no dialog bound");
      return false;
    }
    console.log(`[NextTrainCitySession] Mismatch check: opening dialog for ${detectedCity}`);
    regionMismatchDialog.open(savedCity, detectedCity);
    return true;
  }

  async function geolocateHint() {
    // Jim brief: wait for app stability before requesting permissions on cold boot.
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation?.getCurrentPosition) {
          reject(new Error("no geo"));
          return;
        }
        const isTestActive = sessionStorage.getItem("nextTrainTestMode") === "1" || window.location.search.includes("test=1");
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: isTestActive ? 2500 : 4000,
          maximumAge: 300000,
        });
      });
      return hintCityFromCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      return null;
    }
  }

  function fillCountrySelect(select, countryId) {
    if (!select) {
      return;
    }
    select.replaceChildren();
    for (const country of COUNTRIES) {
      const option = document.createElement("option");
      option.value = country.id;
      option.textContent = country.name;
      const hasOpen = country.regions.some((region) => isRegionOpen(region));
      if (!hasOpen) {
        option.textContent = `${country.name} (Coming Soon)`;
      }
      select.append(option);
    }
    select.value = countryId;
  }

  function fillRegionSelect(select, countryId, regionId) {
    if (!select) {
      return;
    }
    select.replaceChildren();
    const country = countryById(countryId);
    const hasOpen = country.regions.some((region) => isRegionOpen(region));
    for (const region of country.regions) {
      const option = document.createElement("option");
      option.value = region.id;
      if (region.comingSoon) {
        option.textContent = `${region.name} (Coming Soon)`;
        // Keep the label visible when a country has no live city yet (Sweden).
        // Still disabled beside live siblings (Melbourne next to Perth).
        option.disabled = hasOpen;
      } else {
        option.textContent = region.name;
      }
      select.append(option);
    }
    const open = firstOpenRegion(countryId);
    const soon = country.regions.find((region) => region.comingSoon);
    const wantedOpen = country.regions.some(
      (region) => region.id === regionId && isRegionOpen(region)
    );
    const wanted = wantedOpen ? regionId : open?.id ?? soon?.id ?? "";
    if (wanted && ![...select.options].some((option) => option.value === wanted && !option.disabled)) {
      select.value = open?.id ?? select.options[0]?.value ?? "";
    } else {
      select.value = wanted;
    }
  }

  function regionDisplayName(city) {
    return regionById(city)?.region.name || "Perth";
  }

  function syncRegionSummaries() {
    const savedCity = readSavedCity();
    const explicit = readRegionExplicit();
    let label;
    if (savedCity || explicit) {
      label = regionDisplayName(savedCity || LIVE_CITY);
    } else {
      // Jim brief: don't show the hint in the label automatically on first load.
      // Let the user see "Choose..." until they pick or a mismatch prompt fires.
      label = "Choose...";
    }
    document.querySelectorAll("[data-region-summary]").forEach((el) => {
      el.textContent = label;
    });
  }

  function syncRegionControls() {
    const countryId = readSavedCountry();
    const savedCity = readSavedCity() || LIVE_CITY;
    document.querySelectorAll("[data-region-country]").forEach((select) => {
      fillCountrySelect(select, countryId);
    });
    document.querySelectorAll("[data-region-city]").forEach((select) => {
      fillRegionSelect(select, countryId, savedCity);
    });
    syncRegionSummaries();
  }

  function closeRegionScreen() {
    const setup = document.getElementById("region-setup");
    if (!setup) {
      return;
    }
    setup.hidden = true;
    document.body.classList.remove("region-setup-active");
    window.NextTrainAds?.syncOverlaySuppression?.();
  }

  function openRegionScreen() {
    const setup = document.getElementById("region-setup");
    if (!setup) {
      return;
    }
    window.nextTrainApp?.closeMenuDialogOnly?.();
    syncRegionControls();
    setup.hidden = false;
    document.body.classList.add("region-setup-active");
    window.NextTrainAds?.syncOverlaySuppression?.();
  }

  async function applyCity(city, { persist = true, explicit = false } = {}) {
    const match = regionById(city);
    if (!match || !isRegionOpen(match.region)) {
      city = LIVE_CITY;
    }
    const countryId = match?.country.id || regionById(city)?.country.id || "au";

    // Save the pick immediately. Catalog mount can be slow or fail; snapping
    // the saved region back to Perth made the picker look like it ignored the tap.
    if (persist) {
      persistRegion({
        city,
        country: countryId,
        explicit: explicit || readRegionExplicit(),
      });
    }
    if (explicit) {
      clearRegionMismatchDismissed();
      document.dispatchEvent(new CustomEvent("nexttrain:region-explicit"));
    }
    syncRegionControls();
    syncFeedAttribution(city);

    const dogfoodApi = dogfood();
    // In-memory mount state, not localStorage. After a reload the JS session is
    // fresh even when the saved city is unchanged — skipping mount then leaves
    // Sydney/London catalogs empty.
    const mountedCity = dogfoodApi?.getCity?.() || "";
    let mountOk = true;
    if (MULTI_CITY_IDS.includes(city)) {
      if (mountedCity !== city) {
        console.log(`[NextTrainCitySession] Mounting multi-city: ${city}`);
        try {
          mountOk = Boolean(await dogfoodApi?.mount?.(city));
        } catch (error) {
          console.error(`[NextTrainCitySession] Failed to mount: ${city}`, error);
          mountOk = false;
        }
        if (!mountOk) {
          console.error(`[NextTrainCitySession] Catalog failed for ${city}; region stays saved`);
        }
      }
    } else if (mountedCity) {
      console.log(`[NextTrainCitySession] Unmounting to live city: ${city}`);
      dogfoodApi?.unmount?.();
      try {
        window.nextTrainStationCombobox?.replaceStationsCache?.(null);
        const listPromise = window.nextTrainStationCombobox?.getStationsList?.();
        if (explicit) {
          await listPromise;
        }
      } catch {
        /* perth list reloads on next getStationsList */
      }
    }
    document.dispatchEvent(
      new CustomEvent("nexttrain:city-changed", { detail: { city, country: countryId } })
    );
    syncRegionControls();
    return mountOk;
  }

  async function onCountryChange(select) {
    const countryId = select.value;
    const open = firstOpenRegion(countryId);
    document.querySelectorAll("[data-region-country]").forEach((el) => {
      el.value = countryId;
    });
    document.querySelectorAll("[data-region-city]").forEach((el) => {
      fillRegionSelect(el, countryId, open?.id);
    });
    if (open) {
      await applyCity(open.id, { persist: true, explicit: true });
    }
  }

  async function onCityChange(select) {
    const city = select.value;
    if (!regionById(city) || !isRegionOpen(regionById(city).region)) {
      syncRegionControls();
      return;
    }
    await applyCity(city, { persist: true, explicit: true });
  }

  function bindControls() {
    document.querySelectorAll("[data-region-country]").forEach((select) => {
      select.addEventListener("change", () => {
        void onCountryChange(select);
      });
    });
    document.querySelectorAll("[data-region-city]").forEach((select) => {
      select.addEventListener("change", () => {
        void onCityChange(select);
      });
    });
    document.getElementById("menu-region-btn")?.addEventListener("click", () => {
      openRegionScreen();
    });
    document.getElementById("region-setup-back-btn")?.addEventListener("click", closeRegionScreen);
    document.getElementById("region-setup-done-btn")?.addEventListener("click", closeRegionScreen);
    document.addEventListener("nexttrain:menu-open", () => syncRegionControls());
  }

  let initPromise = null;
  let currentHint = null;

  async function init() {
    if (initPromise) {
      return initPromise;
    }
    initPromise = runInit();
    try {
      return await initPromise;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  }

  async function runInit() {
    bindControls();
    // Do not probe every live city before first paint. Sydney/Brisbane catalogs
    // parse large GTFS fixtures and were blocking Near me on Perth cold start.

    const explicit = readRegionExplicit();
    let initialCity = readSavedCity() || LIVE_CITY;

    if (!explicit) {
      // Background city detection — don't block initial paint.
      // Jim brief: compare lat/lng to CITY_BOUNDS on device. Do not download other city catalog until confirmed.
      void (async () => {
        const hint = await geolocateHint();
        if (hint) {
          currentHint = hint;
          syncRegionSummaries();
        }
        if (hint && hint !== initialCity && isRegionOpen(regionById(hint)?.region)) {
          // Note: we don't applyCity(hint) here because that would download the catalog.
          // App will call scheduleRegionMismatchPrompt after first paint.
        }
      })();
    }

    // Only load the catalog for the active city.
    // Jim brief: don't block boot on the catalog fetch.
    const applyPromise = applyCity(initialCity, { persist: !explicit, explicit: false });
    if (!explicit) {
      void applyPromise;
    } else {
      await applyPromise;
    }

    syncRegionControls();
    syncFeedAttribution(initialCity);
    return initialCity;
  }

  window.NextTrainCitySession = {
    init,
    applyCity,
    readSavedCity,
    readSavedCountry,
    readRegionExplicit,
    hintCityFromCoords,
    geolocateHint,
    readActiveHint() {
      return currentHint;
    },
    maybePromptRegionMismatch,
    regionDisplayName,
    regionById,
    readActiveTimeZone() {
      const city = readSavedCity() || LIVE_CITY;
      return regionById(city)?.region.timeZone || "Australia/Perth";
    },
    markRegionExplicit() {
      const city = readSavedCity() || LIVE_CITY;
      persistRegion({
        city,
        country: readSavedCountry(),
        explicit: true,
      });
    },
    syncRegionControls,
    syncFeedAttribution,
    feedAttributionForCity,
    VANCOUVER_TRANSLINK_DISCLAIMER,
    TFL_OPEN_DATA_LINE,
    RDG_LDB_LINE,
    openRegionScreen,
    closeRegionScreen,
    COUNTRIES,
    LIVE_CITY,
    MULTI_CITY_IDS,
    VERCEL_ORIGIN,
  };
})();
