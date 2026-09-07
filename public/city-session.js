/**
 * Multi-city session: Sydney, Brisbane, and Adelaide use production Vercel APIs.
 * Local debug can still probe a LAN dev server. Never silent-switch after an explicit pick.
 */
(function () {
  const LIVE_CITY = "perth";
  const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "canberra", "gold-coast", "newcastle", "stockholm", "goteborg", "malmo", "uppsala", "helsinki", "oslo", "uk-west-midlands", "west-of-england", "east-midlands", "liverpool-city-region", "solent", "south-wales", "west-yorkshire", "thames-valley", "greater-anglia", "rest-of-wales", "rest-of-scotland", "london-se-national-rail", "southwest", "greater-manchester", "south-yorkshire", "north-east", "glasgow", "edinburgh", "cumbria"];
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
      id: "gb-eng",
      name: "England",
      regions: [
        // Listed in the order the picker shows them (alphabetical by display name).
        // Names lead with the place a rider would look for — "Manchester", not
        // "Greater Manchester" under G (Tim, 6 Sep 2026). Ids are unchanged; only the
        // label and position moved. United Kingdom split into England/Scotland/Wales
        // countries 7 Sep 2026 (docs/jim-brief-picker-countries-england-scotland-wales.md)
        // — region ids, timeZones, comingSoon, and feed fields are unchanged.
        { id: "cumbria", name: "Cumbria", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "greater-anglia", name: "East Anglia", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "east-midlands", name: "East Midlands", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "liverpool-city-region", name: "Liverpool City Region", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "uk-london-tfl", name: "London", timeZone: "Europe/London" },
        { id: "london-se-national-rail", name: "London & South East National Rail", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "greater-manchester", name: "Manchester", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "north-east", name: "North East (Tyne and Wear)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "solent", name: "Solent (Southampton / Portsmouth)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "southwest", name: "South West (Devon / Cornwall)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "south-yorkshire", name: "South Yorkshire", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "thames-valley", name: "Thames Valley (Reading / Oxford)", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "uk-west-midlands", name: "West Midlands", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "west-of-england", name: "West of England", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "west-yorkshire", name: "West Yorkshire", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
      ],
    },
    {
      id: "fi",
      name: "Finland",
      regions: [
        { id: "helsinki", name: "Helsinki", timeZone: "Europe/Helsinki", comingSoon: false },
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
      id: "gb-sct",
      name: "Scotland",
      regions: [
        // "Scotland (…)" prefix dropped inside a Scotland-only list — redundant (Tim, 6 Sep 2026).
        { id: "rest-of-scotland", name: "Aberdeen / Inverness / Dundee", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "edinburgh", name: "Edinburgh", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "glasgow", name: "Glasgow", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
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
      id: "gb-wls",
      name: "Wales",
      regions: [
        { id: "rest-of-wales", name: "North, Mid & West Wales", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
        { id: "south-wales", name: "South Wales", timeZone: "Europe/London", comingSoon: false, feed: "darwin" },
      ],
    },
  ];

  // Order rule (7 Sep 2026, docs/jim-brief-city-bounds-order-after-geocode.md):
  // hintCityFromCoords() returns the FIRST matching box in object order. Where
  // one region's box geometrically contains a smaller region's box (or a
  // smaller region's stations), the smaller/more specific box MUST be
  // declared before the larger one, or every GPS hint inside the smaller
  // region silently resolves to the larger one instead. Enforced by
  // qa/uk-city-bounds-overlap-gate.mjs's containment-order check — that gate
  // fails the build if this is violated, so don't reorder without rerunning it.
  const CITY_BOUNDS = {
    sydney: { minLat: -34.15, maxLat: -33.45, minLng: 150.6, maxLng: 151.35 },
    newcastle: { minLat: -32.94, maxLat: -32.91, minLng: 151.75, maxLng: 151.80 },
    perth: { minLat: -32.8, maxLat: -31.4, minLng: 115.55, maxLng: 116.25 },
    "gold-coast": { minLat: -28.13, maxLat: -27.90, minLng: 153.32, maxLng: 153.46 },
    brisbane: { minLat: -28.2, maxLat: -27.0, minLng: 152.6, maxLng: 153.6 },
    adelaide: { minLat: -35.3, maxLat: -34.55, minLng: 138.35, maxLng: 138.85 },
    "uk-london-tfl": { minLat: 51.28, maxLat: 51.7, minLng: -0.52, maxLng: 0.35 },
    canberra: { minLat: -35.32, maxLat: -35.16, minLng: 149.10, maxLng: 149.17 },
    stockholm: { minLat: 58.85, maxLat: 59.60, minLng: 17.50, maxLng: 18.40 },
    goteborg: { minLat: 57.55, maxLat: 57.85, minLng: 11.75, maxLng: 12.25 },
    malmo: { minLat: 55.30, maxLat: 56.75, minLng: 12.60, maxLng: 15.55 },
    uppsala: { minLat: 59.30, maxLat: 60.75, minLng: 16.80, maxLng: 18.60 },
    helsinki: { minLat: 60.13, maxLat: 60.25, minLng: 24.62, maxLng: 25.16 },
    oslo: { minLat: 59.60, maxLat: 60.25, minLng: 10.40, maxLng: 11.20 },
    "uk-west-midlands": { minLat: 52.25, maxLat: 52.70, minLng: -2.35, maxLng: -1.45 },
    // south-wales is listed BEFORE west-of-england so hintCityFromCoords's
    // first-match lookup resolves the Severn-estuary stations correctly:
    // Newport (NWP, lat 51.589, lng -3.0005) geometrically falls inside
    // BOTH boxes below (West of England's own catalog needs Taunton at lng
    // -3.10, which is further west than Newport, so no single rectangle can
    // hold Taunton while excluding Newport by longitude alone) — south-wales
    // being checked first is what actually resolves Newport correctly, not
    // the box shape. Widened 7 Sep 2026 (docs/south-wales-d1/jim-handoff.md
    // re-scope) to cover all 16 catalog stations incl. Swansea (-3.94),
    // Neath (-3.81), Port Talbot Parkway (-3.78), Merthyr Tydfil (51.74),
    // Rhymney (51.76), with a small margin.
    "south-wales": { minLat: 51.35, maxLat: 51.80, minLng: -4.05, maxLng: -2.70 },
    // Western edge pulled back from -3.20 to -3.15 (7 Sep 2026) — just west
    // of Taunton (-3.1028, West of England's own westernmost catalog
    // station) so Cardiff (-3.179) and Barry Island (-3.273) no longer fall
    // in this box. Newport (-3.0005) still does, geometrically, because
    // Taunton is further west than Newport and both must fit — but since
    // south-wales precedes this entry above, hintCityFromCoords resolves
    // Newport to south-wales before it ever reaches this box. Trade-off
    // documented rather than solved with unsupported multi-box logic.
    // minLat raised from 50.90 to 51.20 (7 Sep 2026, uk-catalog-geocode fix):
    // West of England's own catalogued stations (lib/cities/west-of-england/
    // stations.json) are Westbury (51.267), Bath Spa, Bristol Temple Meads,
    // Chepstow, Gloucester — all >= 51.267 — except Taunton (51.023), which
    // is a boundary through-running station also catalogued in Southwest
    // (docs/jim-brief-city-bounds-order-after-geocode.md item 2); Southwest
    // is Taunton's home region for the GPS hint. The old 50.90 floor put
    // Taunton inside this box too, so a rider standing there got hinted into
    // West of England instead. 51.20 sits just south of Westbury and north
    // of Taunton, so Taunton now falls out of this box entirely (see
    // "west-of-england" allow-list entry below for Taunton's own catalog
    // listing, which now legitimately resolves to southwest instead).
    "west-of-england": { minLat: 51.20, maxLat: 51.95, minLng: -3.15, maxLng: -2.10 },
    "east-midlands": { minLat: 52.25, maxLat: 53.28, minLng: -1.47, maxLng: -0.65 },
    // minLat/minLng/maxLng widened 7 Sep 2026 (uk-catalog-geocode): Colchester, Stansted
    // Airport, Bishops Stortford (lat), Peterborough (lng), Great Yarmouth/Lowestoft (lng)
    // are real, NaPTAN-verified catalog stations the old box excluded.
    "greater-anglia": { minLat: 51.80, maxLat: 52.9, minLng: -0.30, maxLng: 1.8 },
    // maxLat widened 7 Sep 2026 (uk-catalog-geocode): Walsden (WDN, 53.696) is a real,
    // NaPTAN-verified boundary station the old 53.55 ceiling excluded.
    "greater-manchester": { minLat: 53.35, maxLat: 53.70, minLng: -2.35, maxLng: -2.10 },
    "south-yorkshire": { minLat: 53.30, maxLat: 53.62, minLng: -1.58, maxLng: -1.25 },
    "north-east": { minLat: 54.85, maxLat: 55.80, minLng: -2.10, maxLng: -1.35 },
    // Box widened 7 Sep 2026 (uk-catalog-geocode): the 98-station rescope (Merseyrail +
    // National Rail) reaches well beyond the original 5-point estimate this box was drawn
    // from (see docs/liverpool-city-region-d1/jim-handoff.md item 3) — Earlestown, Garswood,
    // Heswall, Upton (Merseyside), Meols Cop etc. are real, NaPTAN-verified stations.
    "liverpool-city-region": { minLat: 53.25, maxLat: 53.70, minLng: -3.10, maxLng: -2.55 },
    solent: { minLat: 50.75, maxLat: 51.55, minLng: -2.30, maxLng: -0.05 },
    // minLat widened 7 Sep 2026 (uk-catalog-geocode): Denby Dale (53.573) and Huddersfield
    // (53.649) are real, NaPTAN-verified catalog stations the old 53.65 floor excluded.
    "west-yorkshire": { minLat: 53.55, maxLat: 53.95, minLng: -2.40, maxLng: -1.30 },
    // Box widened 7 Sep 2026 (uk-catalog-geocode): Swindon/Westbury (lng) and Banbury (lat)
    // are real, NaPTAN-verified catalog stations the old box excluded.
    "thames-valley": { minLat: 51.0, maxLat: 52.10, minLng: -2.25, maxLng: -0.5 },
    "rest-of-wales": { minLat: 51.55, maxLat: 53.4, minLng: -5.5, maxLng: -2.6 },
    // glasgow and edinburgh are listed BEFORE rest-of-scotland (7 Sep 2026,
    // uk-catalog-geocode fix — docs/jim-brief-city-bounds-order-after-geocode.md
    // item 1): both cities' boxes below sit entirely inside rest-of-scotland's
    // much larger (55.4-58.6, -5.9 to -2.0) box. With rest-of-scotland listed
    // first (as it was), every Glasgow/Edinburgh GPS hint silently resolved to
    // rest-of-scotland instead of the city-specific region. Per the order rule
    // above (contained box first), these two now precede it.
    glasgow: { minLat: 55.80, maxLat: 55.92, minLng: -4.40, maxLng: -4.15 },
    // maxLat widened from 55.98 to 55.985 (7 Sep 2026, uk-catalog-geocode):
    // Ocean Terminal (55.980204) is a real, NaPTAN-verified catalog station
    // that the old 55.98 ceiling excluded by a fraction of a degree.
    edinburgh: { minLat: 55.88, maxLat: 55.985, minLng: -3.38, maxLng: -3.05 },
    // minLng widened 7 Sep 2026 (uk-catalog-geocode): Kyle of Lochalsh (-5.71) and Mallaig
    // (-5.83) are real, NaPTAN-verified stations the old -5.5 floor excluded.
    "rest-of-scotland": { minLat: 55.4, maxLat: 58.6, minLng: -5.9, maxLng: -2.0 },
    "london-se-national-rail": { minLat: 50.7, maxLat: 51.7, minLng: -0.5, maxLng: 0.8 },
    // minLat/minLng widened 7 Sep 2026 (uk-catalog-geocode): Penzance/Truro/St Erth/St
    // Austell/Plymouth/Totnes are real, NaPTAN-verified stations the old 50.5/-4.7 floor
    // excluded (the box was drawn well east/north of Devon & Cornwall's actual extent).
    southwest: { minLat: 50.05, maxLat: 51.3, minLng: -5.6, maxLng: -3.0 },
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
    const found = regionById(city);
    // No matching picker region at all (e.g. a retired city — release-1 scope cut,
    // 7 Sep 2026) degrades the same way a comingSoon region does: fall through to the
    // caller's default rather than surfacing a city the app can no longer resolve.
    if (!found || found.region.comingSoon) {
      return "";
    }
    return city;
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
      // No pick and no GPS-followed region yet (runInit applies an open GPS hint
      // as a non-explicit saved city, which lands in the branch above).
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
      // Compare lat/lng to CITY_BOUNDS on device; only the confirmed region's
      // catalog is downloaded.
      void (async () => {
        const hint = await geolocateHint();
        if (hint) {
          currentHint = hint;
          syncRegionSummaries();
        }
        if (hint && hint !== initialCity && isRegionOpen(regionById(hint)?.region)) {
          // First load (or any load while the rider has never picked a region):
          // follow the GPS. Until 6 Sep 2026 this branch was deliberately empty and
          // the app stayed on Perth, so a rider opening the app in Manchester got
          // Perth stations in My Routes/Journeys and a Perth-only card in Near me.
          // The pick stays non-explicit, so a later trip elsewhere re-follows the
          // GPS, and an explicit pick in the region screen still wins for good.
          console.log(`[NextTrainCitySession] First load: following GPS region ${hint}`);
          try {
            await applyCity(hint, { persist: true, explicit: false });
          } catch (error) {
            console.warn(`[NextTrainCitySession] Could not follow GPS region ${hint}`, error);
          }
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
