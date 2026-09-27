/**
 * Multi-city session: Sydney, Brisbane, and Adelaide use production Vercel APIs.
 * Local debug can still probe a LAN dev server. Never silent-switch after an explicit pick.
 *
 * "Which cities/countries exist" and their GPS bounding boxes now come from the loaded
 * /api/cities manifest (window.CityManifest, public/city-manifest.js) instead of being
 * hand-maintained here (docs/jim-brief-registry-driven-client.md) — a new live city appears
 * without an app release. countries()/isMultiCityId() below are thin accessors over that
 * manifest, kept as named functions since they're called from many places in this file.
 */
(function () {
  const LIVE_CITY = "perth";
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const SETTINGS_KEY = "nextTrainSettings";
  // docs/jim-brief-region-explicit-false-dropped.md: a marker persistRegion()
  // stamps on every write, independent of the regionExplicit value itself, so
  // migrateLegacyRegionExplicit() below can tell "this store has been through
  // post-fix persistRegion() at least once" apart from "genuinely predates
  // #383 (or is a bug-affected store from before this fix shipped)" without
  // relying on the very flag that was the bug. Not the same counter as
  // journey-model.js's SETTINGS_SCHEMA_VERSION, which triggers a destructive
  // one-time journey reset when bumped — this one is inert.
  const REGION_EXPLICIT_SCHEMA_VERSION = 1;

  /** The picker tree ({id, name, regions: [{id, name, timeZone, feed?}]}), in display order. */
  function countries() {
    return window.CityManifest?.countries() ?? [];
  }

  /** True for every live multi-city id (i.e. every live city except perth, which has its
   *  own dedicated path predating the multi-city dogfood catalog). Replaces the old
   *  hardcoded city-id array — see docs/jim-brief-registry-driven-client.md. */
  function isMultiCityId(cityId) {
    const id = String(cityId || "").trim().toLowerCase();
    return id !== "perth" && Boolean(window.CityManifest?.isLiveCity(id));
  }

  function dogfood() {
    return window.NextTrainBrisbaneDogfood || window.NextTrainPlannedCityDogfood;
  }

  function regionById(regionId) {
    for (const country of countries()) {
      const region = country.regions.find((entry) => entry.id === regionId);
      if (region) {
        return { country, region };
      }
    }
    return null;
  }

  function countryById(countryId) {
    const list = countries();
    return list.find((country) => country.id === countryId) ?? list[0];
  }

  function inBounds(lat, lng, box) {
    return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
  }

  // A bounds box is normally a single {minLat,maxLat,minLng,maxLng} rectangle, but may be
  // an array of boxes (added 16 Sep 2026, docs/jim-brief-essex-to-greater-anglia.md round 2)
  // for a region whose catalog forms two or more geographically separate clusters that no
  // single rectangle can bound without also catching an unrelated neighbour — true if
  // lat/lng falls in ANY of them.
  function inAnyBounds(lat, lng, boxOrBoxes) {
    const boxes = Array.isArray(boxOrBoxes) ? boxOrBoxes : [boxOrBoxes];
    return boxes.some((box) => inBounds(lat, lng, box));
  }

  // Order rule (7 Sep 2026, docs/jim-brief-city-bounds-order-after-geocode.md): the manifest
  // returns bounds boxes in the same "smaller/more specific box before the larger containing
  // one" order the old client-side bounds table used — see lib/cities/city-bounds.js and
  // lib/cities/city-manifest.js server-side. hintCityFromCoords() below returns the FIRST
  // matching box in that order. Enforced by qa/uk-city-bounds-overlap-gate.mjs's
  // containment-order check — that gate fails the build if this is violated.
  function hintCityFromCoords(lat, lng) {
    const ids = window.CityManifest?.liveCityIds() ?? [];
    for (const id of ids) {
      const box = window.CityManifest.boundsFor(id);
      if (box && inAnyBounds(lat, lng, box)) {
        return id;
      }
    }
    return null;
  }

  // docs/jim-brief-near-me-nearest-station-region.md — hintCityFromCoords picks
  // the FIRST bounds box that contains the rider, which is wrong wherever
  // regions overlap (Central London: uk-london-tfl is listed before
  // london-se-national-rail, so a rider at King's Cross/Waterloo/Victoria was
  // hinted Tube even standing at a National Rail terminus). Near me already has
  // (or can cheaply fetch) the country-wide station list, each row carrying its
  // own region, so resolve the region from the nearest LIVE-FEED station across
  // every region in that list instead of a bounding box. Radius mirrors the "no
  // station nearby" cutoff Near me itself would apply; beyond it (or with no
  // usable station list) the caller should fall back to hintCityFromCoords.
  const NEAREST_STATION_HINT_RADIUS_KM = 15;

  function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Resolve a region id from the nearest live-feed station in `stations` (the
   * shape `/api/country-stations` returns: `{ name, lat, lng, liveFeed, region:
   * { id, displayName } }`). Returns null — never a bounds-box guess — when no live
   * station is within radiusKm or the list has nothing usable, so callers can
   * fall back to hintCityFromCoords themselves; this function never guesses.
   *
   * Co-location tie rule (docs/jim-brief-near-me-nearest-station-region.md,
   * round 2, Mark's PR #403 FAIL): at an interchange the closer coordinate is
   * usually the metro/tram/TfL entrance, not the National Rail one, so plain
   * "nearest wins" sent a King's Cross/Waterloo rider to uk-london-tfl even
   * though they were standing on top of a Darwin station too. Among
   * candidates co-located with the single nearest one, a Darwin (National
   * Rail) feed wins over a non-Darwin (metro/tram/TfL) one, decided by the
   * region's own `feed` field (isDarwinCityId) — never a London/city-id
   * special case, so Glasgow Queen Street vs Buchanan Street and Newcastle
   * Interchange get the same treatment. When co-located candidates are all
   * the same feed type (e.g. two Darwin stations at a shared interchange),
   * nearest still wins.
   *
   * Round 3 (Mark's FAIL on round 2, PR #403): the round-2 rule measured
   * "distance from the candidate to the RIDER minus distance from the
   * nearest station to the rider <= 250 m" — for a rider standing on top of
   * the nearest stop that is "any Darwin station within 250 m of the rider",
   * which swept in a separate nearby station rather than an interchange (Bank
   * resolved to london-se-national-rail via London Cannon Street, 243 m from
   * the rider but ~280 m from Bank itself). Co-location is now measured
   * STATION-TO-STATION — the distance between the nearest station's own
   * coordinates and the candidate's — with a much tighter CO_LOCATION_STATION_KM
   * radius, since real interchange entrances are metres-to-low-tens-of-metres
   * apart, not hundreds. Verified against real published coordinates: King's
   * Cross St Pancras (Tube) vs London King's Cross (NR) ~129 m apart, London
   * Waterloo (Tube) vs London Waterloo (NR) ~89 m apart — both co-located;
   * Bank (Tube) vs Cannon Street (NR) ~226 m apart — not co-located, so Bank
   * still correctly resolves to uk-london-tfl; Glasgow Queen Street vs
   * Buchanan Street (Subway) ~122 m apart but Buchanan Street is
   * `liveFeed: false` and so is never a candidate regardless of distance.
   */
  const CO_LOCATION_STATION_KM = 0.15;

  function hintCityFromNearestStation(lat, lng, stations, { radiusKm = NEAREST_STATION_HINT_RADIUS_KM } = {}) {
    if (!Array.isArray(stations) || !stations.length || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const candidates = [];
    for (const station of stations) {
      if (!station || station.liveFeed === false) {
        continue;
      }
      const stationLat = Number(station.lat);
      const stationLng = Number(station.lng);
      const regionId = station.region?.id;
      if (!regionId || !Number.isFinite(stationLat) || !Number.isFinite(stationLng)) {
        continue;
      }
      const distanceKm = haversineKm(lat, lng, stationLat, stationLng);
      if (distanceKm > radiusKm) {
        continue;
      }
      candidates.push({ regionId, distanceKm, stationLat, stationLng });
    }
    if (!candidates.length) {
      return null;
    }
    candidates.sort((a, b) => a.distanceKm - b.distanceKm);
    const nearest = candidates[0];
    // Station-to-station, not rider-to-candidate (round 3) — a candidate is
    // co-located only if it sits within CO_LOCATION_STATION_KM of the
    // NEAREST STATION'S coordinates, not the rider's.
    const coLocated = candidates.filter(
      (c) =>
        c === nearest ||
        haversineKm(nearest.stationLat, nearest.stationLng, c.stationLat, c.stationLng) <= CO_LOCATION_STATION_KM
    );
    const darwinCandidate = coLocated.find((c) => isDarwinCityId(c.regionId));
    if (darwinCandidate && !isDarwinCityId(nearest.regionId)) {
      return darwinCandidate.regionId;
    }
    return nearest.regionId;
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
    // 7 Sep 2026): fall through to the caller's default rather than surfacing a
    // city the app can no longer resolve.
    if (!found) {
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

  let legacyRegionExplicitMigrated = false;

  // Pre-PR installs wrote `savedCity` from the old mandatory region picker but
  // never had a `regionExplicit` flag at all (the key is absent, not `false`).
  // Without this, syncRegionControls() below treats that the same as the new
  // GPS-follow path (savedCity set, explicit: false) and resets a stored
  // Stockholm/etc. pick back to "All" on first open after the upgrade
  // (docs/jim-brief-country-wide-station-picker.md Round 2, Mark FAIL #1).
  // Runs once: after it writes the flag, the key exists and this is a no-op.
  //
  // Gated on REGION_EXPLICIT_SCHEMA_VERSION as well as the flag's presence
  // (docs/jim-brief-region-explicit-false-dropped.md): a store that has been
  // through post-fix persistRegion() at least once always carries the
  // schema-version marker, whether regionExplicit is true or false, so a
  // store missing the flag but carrying the marker is a real `false` — never
  // treated as a legacy upgrade again. A store with neither the flag nor the
  // marker is either a genuine pre-#383 legacy install, or (until every
  // device has reloaded once since this fix shipped) an already-affected
  // store from the dropped-`false` bug — those two are indistinguishable
  // from what's on disk, so this still treats them as legacy, same as
  // before. That known gap is deliberate, not an oversight: see the PR
  // description for why it can't be resolved without guessing.
  function migrateLegacyRegionExplicit() {
    if (legacyRegionExplicitMigrated) {
      return;
    }
    legacyRegionExplicitMigrated = true;
    const store = readStore();
    const hasFlag = Object.prototype.hasOwnProperty.call(store, "regionExplicit");
    const hasSchemaMarker = Object.prototype.hasOwnProperty.call(
      store,
      "regionExplicitSchemaVersion"
    );
    const savedCity = String(store.savedCity || "").trim();
    if (!hasFlag && !hasSchemaMarker && savedCity) {
      persistRegion({
        city: savedCity,
        country: store.savedCountry,
        explicit: true,
        source: "migration",
      });
    }
  }

  function persistRegion({ city, country, explicit, source }) {
    const patch = {
      savedCity: city,
      savedCountry: country || regionById(city)?.country.id || "au",
      // Written on every persist, independent of `explicit`'s value, so its
      // mere presence proves "this store has been through post-fix
      // persistRegion() at least once" (see the constant's own comment).
      regionExplicitSchemaVersion: REGION_EXPLICIT_SCHEMA_VERSION,
    };
    if (explicit !== undefined) {
      patch.regionExplicit = Boolean(explicit);
      // Only meaningful when explicit is true — who set it, a rider's own
      // pick or the legacy-upgrade migration above. Used to repair riders
      // affected by a future recurrence of this same bug; today's already-
      // affected riders predate this field, so it can't repair them (PR
      // description).
      if (explicit) {
        patch.regionExplicitSource = source === "migration" ? "migration" : "picker";
      }
    }
    const persist = window.nextTrainJourneyModel?.persistSettings;
    if (typeof persist === "function") {
      persist(patch);
      return;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readStore(), ...patch }));
  }

  // A picker region is in the manifest's countries() tree or it isn't — no "Coming Soon"
  // third state any more (Tim, 27 Sep 2026: "It's either in or out.";
  // docs/jim-brief-no-coming-soon-picker.md). This is now just a null guard
  // for a region that may not resolve (e.g. an unknown/retired city id);
  // kept as a named helper since it's called from many places below.
  function isRegionOpen(region) {
    return Boolean(region);
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
      const isTestActive = sessionStorage.getItem("nextTrainTestMode") === "1" || window.location.search.includes("test=1");
      const geoOptions = {
        timeout: isTestActive ? 2500 : 4000,
        maximumAge: 300000,
      };
      // jim-brief-ios-webkit-location-prompt: in the native shell, navigator.geolocation
      // triggers WebKit's own per-origin "localhost would like to use..." panel on top of
      // the already-granted native iOS permission. Route through the Capacitor bridge
      // (window.NextTrainGeo, loaded via geo-bundle.js ahead of this script) instead —
      // never navigator.geolocation directly — when running inside the app shell.
      const isNativeShell = Boolean(window.Capacitor?.isNativePlatform?.());
      const pos = isNativeShell
        ? await (async () => {
            if (!window.NextTrainGeo?.getCurrentPosition) {
              throw new Error("no native geo bridge");
            }
            return window.NextTrainGeo.getCurrentPosition(geoOptions);
          })()
        : await new Promise((resolve, reject) => {
            if (!navigator.geolocation?.getCurrentPosition) {
              reject(new Error("no geo"));
              return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions);
          });
      // docs/jim-brief-picker-near-you-nearest-five.md: feed the app-wide
      // last-known-position cache from this GPS-follow fix too, not just
      // app.js's getAppGeolocationPosition — never a new geolocation request,
      // just recording the fix this path already made.
      window.nextTrainLastPosition?.write?.(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.timestamp
      );
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
    // Cities are in the picker or they aren't — no "Coming Soon" third state
    // (Tim, 27 Sep 2026; docs/jim-brief-no-coming-soon-picker.md). A country
    // with no open region has no picker entry at all.
    for (const country of countries()) {
      if (!country.regions.some((region) => isRegionOpen(region))) {
        continue;
      }
      const option = document.createElement("option");
      option.value = country.id;
      option.textContent = country.name;
      select.append(option);
    }
    select.value = countryId;
  }

  // docs/jim-brief-country-wide-station-picker.md #1: Region is now an
  // optional filter over the whole country's station list, not a required
  // pick. "All" (value "") is always the first entry. `regionId === ""`
  // (or omitted) selects it; a real region id still narrows the list and
  // sets the active region exactly as before.
  function fillRegionSelect(select, countryId, regionId) {
    if (!select) {
      return;
    }
    select.replaceChildren();
    const country = countryById(countryId);

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    select.append(allOption);

    // Cities are in the picker or they aren't — no "Coming Soon" third state
    // (Tim, 27 Sep 2026; docs/jim-brief-no-coming-soon-picker.md). A region
    // that isn't open yet (isRegionOpen false) is simply omitted here, not
    // shown disabled with a label.
    for (const region of country.regions.filter((region) => isRegionOpen(region))) {
      const option = document.createElement("option");
      option.value = region.id;
      option.textContent = region.name;
      select.append(option);
    }

    if (!regionId) {
      select.value = "";
      return;
    }
    const wantedOpen = country.regions.some(
      (region) => region.id === regionId && isRegionOpen(region)
    );
    select.value = wantedOpen ? regionId : "";
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
    // The Region select shows "All" until the rider has explicitly picked a
    // region (docs/jim-brief-country-wide-station-picker.md #1/AC1) — a
    // GPS-followed or default-Perth savedCity is still tracked internally
    // (boards, journeys, coverage notes all keep working) but the visible
    // filter only shows a specific region once that pick was explicit.
    const explicit = readRegionExplicit();
    const savedCity = readSavedCity();
    const regionFilterValue = explicit ? savedCity || LIVE_CITY : "";
    document.querySelectorAll("[data-region-country]").forEach((select) => {
      fillCountrySelect(select, countryId);
    });
    document.querySelectorAll("[data-region-city]").forEach((select) => {
      fillRegionSelect(select, countryId, regionFilterValue);
    });
    syncRegionSummaries();
  }

  /** Current Region-select filter value: "" for "All", or a region id. */
  function readRegionFilter() {
    const select = document.querySelector("[data-region-city]");
    if (select) {
      return select.value || "";
    }
    return readRegionExplicit() ? readSavedCity() || LIVE_CITY : "";
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
    if (isMultiCityId(city)) {
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
    if (!city) {
      // "All" chosen: the Region select becomes a pure filter again — the
      // active region (boards/journeys/GPS-follow) is untouched, only the
      // "explicit region pick" flag clears so the filter shows "All".
      persistRegion({ city: readSavedCity() || LIVE_CITY, explicit: false });
      syncRegionControls();
      document.dispatchEvent(
        new CustomEvent("nexttrain:region-filter-changed", { detail: { filter: "" } })
      );
      return;
    }
    if (!regionById(city) || !isRegionOpen(regionById(city).region)) {
      syncRegionControls();
      return;
    }
    await applyCity(city, { persist: true, explicit: true });
    document.dispatchEvent(
      new CustomEvent("nexttrain:region-filter-changed", { detail: { filter: city } })
    );
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
    migrateLegacyRegionExplicit();
    // Do not probe every live city before first paint. Sydney/Brisbane catalogs
    // parse large GTFS fixtures and were blocking Near me on Perth cold start.

    const explicit = readRegionExplicit();
    let initialCity = readSavedCity() || LIVE_CITY;

    if (!explicit) {
      // Background city detection — don't block initial paint.
      // Compare lat/lng to each live city's manifest bounds box on device; only the
      // confirmed region's catalog is downloaded.
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
    hintCityFromNearestStation,
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
    readRegionFilter,
    syncFeedAttribution,
    feedAttributionForCity,
    VANCOUVER_TRANSLINK_DISCLAIMER,
    TFL_OPEN_DATA_LINE,
    RDG_LDB_LINE,
    openRegionScreen,
    closeRegionScreen,
    countries,
    LIVE_CITY,
    isMultiCityId,
    VERCEL_ORIGIN,
  };
})();
