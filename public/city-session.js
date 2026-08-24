/**
 * Multi-city session: Sydney, Brisbane, and Adelaide use production Vercel APIs.
 * Local debug can still probe a LAN dev server. Never silent-switch after an explicit pick.
 */
(function () {
  const LIVE_CITY = "perth";
  const LIVE_AU_CITIES = ["sydney", "brisbane", "adelaide"];
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const SETTINGS_KEY = "nextTrainSettings";

  const COUNTRIES = [
    {
      id: "au",
      name: "Australia",
      regions: [
        { id: "perth", name: "Perth" },
        { id: "sydney", name: "Sydney" },
        { id: "brisbane", name: "Brisbane" },
        { id: "adelaide", name: "Adelaide" },
        { id: "melbourne", name: "Melbourne", comingSoon: true },
      ],
    },
    {
      id: "gb",
      name: "England",
      regions: [
        { id: "uk-west-midlands", name: "West Midlands", comingSoon: true },
        { id: "uk-ellesmere-port", name: "Ellesmere Port corridor", comingSoon: true },
        { id: "uk-london-tfl", name: "London TfL", comingSoon: true },
      ],
    },
  ];

  const CITY_BOUNDS = {
    sydney: { minLat: -34.15, maxLat: -33.45, minLng: 150.6, maxLng: 151.35 },
    perth: { minLat: -32.8, maxLat: -31.4, minLng: 115.55, maxLng: 116.25 },
    brisbane: { minLat: -28.2, maxLat: -27.0, minLng: 152.6, maxLng: 153.6 },
    adelaide: { minLat: -35.3, maxLat: -34.55, minLng: 138.35, maxLng: 138.85 },
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

  async function geolocateHint() {
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation?.getCurrentPosition) {
          reject(new Error("no geo"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
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
    for (const region of countryById(countryId).regions) {
      const option = document.createElement("option");
      option.value = region.id;
      if (region.comingSoon) {
        option.textContent = `${region.name} (Coming Soon)`;
        option.disabled = true;
      } else {
        option.textContent = region.name;
      }
      select.append(option);
    }
    const open = firstOpenRegion(countryId);
    const wantedOpen = countryById(countryId).regions.some(
      (region) => region.id === regionId && isRegionOpen(region)
    );
    const wanted = wantedOpen ? regionId : open?.id ?? "";
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
    const label = regionDisplayName(readSavedCity() || LIVE_CITY);
    document.querySelectorAll("[data-region-summary]").forEach((el) => {
      el.textContent = label;
    });
  }

  function syncRegionControls() {
    const countryId = readSavedCountry();
    const city = readSavedCity() || LIVE_CITY;
    document.querySelectorAll("[data-region-country]").forEach((select) => {
      fillCountrySelect(select, countryId);
    });
    document.querySelectorAll("[data-region-city]").forEach((select) => {
      fillRegionSelect(select, countryId, city);
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
    const dogfoodApi = dogfood();
    if (LIVE_AU_CITIES.includes(city)) {
      const ok = await dogfoodApi?.mount?.(city);
      if (!ok) {
        return false;
      }
    } else {
      dogfoodApi?.unmount?.();
      city = LIVE_CITY;
      try {
        window.nextTrainStationCombobox?.replaceStationsCache?.(null);
        await window.nextTrainStationCombobox?.getStationsList?.();
      } catch {
        /* perth list reloads on next getStationsList */
      }
    }
    if (persist) {
      persistRegion({
        city,
        country: match?.country.id || "au",
        explicit: explicit || readRegionExplicit(),
      });
    }
    document.dispatchEvent(
      new CustomEvent("nexttrain:city-changed", { detail: { city, country: match?.country.id || "au" } })
    );
    syncRegionControls();
    return true;
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
    document.getElementById("onboarding-region-btn")?.addEventListener("click", () => {
      openRegionScreen();
    });
    document.getElementById("region-setup-back-btn")?.addEventListener("click", closeRegionScreen);
    document.getElementById("region-setup-done-btn")?.addEventListener("click", closeRegionScreen);
    document.addEventListener("nexttrain:menu-open", () => syncRegionControls());
  }

  async function init() {
    bindControls();
    await dogfood()?.probe?.();

    let city = readSavedCity();
    const explicit = readRegionExplicit();

    if (!explicit) {
      const hint = await geolocateHint();
      if (hint && isRegionOpen(regionById(hint)?.region)) {
        city = hint;
      }
    }

    if (city && !isRegionOpen(regionById(city)?.region)) {
      city = LIVE_CITY;
    }
    if (!city) {
      city = LIVE_CITY;
    }

    await applyCity(city, { persist: !explicit, explicit: false });
    syncRegionControls();
    return city;
  }

  window.NextTrainCitySession = {
    init,
    applyCity,
    readSavedCity,
    readSavedCountry,
    readRegionExplicit,
    markRegionExplicit() {
      const city = readSavedCity() || LIVE_CITY;
      persistRegion({
        city,
        country: readSavedCountry(),
        explicit: true,
      });
    },
    syncRegionControls,
    openRegionScreen,
    closeRegionScreen,
    COUNTRIES,
    LIVE_CITY,
    LIVE_AU_CITIES,
    VERCEL_ORIGIN,
  };
})();
