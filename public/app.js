const SETTINGS_KEY = "nextTrainSettings";

const DEFAULT_SETTINGS = {
  station: "Edgewater Stn",
  direction: "Perth",
  leaveBeforeMinutes: 3,
  refreshSeconds: 30,
};

const routeEl = document.getElementById("route");
const updatedEl = document.getElementById("updated");
const heroEl = document.getElementById("hero");
const leaveTimeEl = document.getElementById("leave-time");
const leaveCountdownEl = document.getElementById("leave-countdown");
const arrivalTimeEl = document.getElementById("arrival-time");
const scheduledTimeEl = document.getElementById("scheduled-time");
const platformEl = document.getElementById("platform");
const statusEl = document.getElementById("status");
const followingSectionEl = document.getElementById("following-section");
const followingEl = document.getElementById("following");
const errorEl = document.getElementById("error");

const settingsBtn = document.getElementById("settings-btn");
const settingsDialog = document.getElementById("settings-dialog");
const settingsForm = document.getElementById("settings-form");
const settingsCancel = document.getElementById("settings-cancel");
const stationSelect = document.getElementById("station-select");
const directionSelect = document.getElementById("direction-select");
const leaveBeforeInput = document.getElementById("leave-before-input");

let settings = { ...DEFAULT_SETTINGS };
let refreshSeconds = DEFAULT_SETTINGS.refreshSeconds;
let refreshTimer = null;
let suppressStationChange = false;
let directionsRequestId = 0;

const DIRECTION_ALIASES = {
  "Perth Underground": "Perth",
  "Perth Underground Stn": "Perth",
  "Perth Stn": "Perth",
};

const PERTH_STATIONS = new Set(["Perth Stn", "Perth Underground Stn"]);

const PERTH_API_STATIONS = ["Perth Underground Stn", "Perth Stn"];

const CANONICAL_PERTH_STATION = "Perth Underground Stn";

function normalizeStation(station) {
  if (!station) {
    return station;
  }
  const trimmed = station.trim();
  if (PERTH_STATIONS.has(trimmed)) {
    return CANONICAL_PERTH_STATION;
  }
  return trimmed;
}

function collapseStationList(stations) {
  const collapsed = [];
  let perthAdded = false;

  for (const name of stations) {
    if (PERTH_STATIONS.has(name)) {
      if (!perthAdded) {
        collapsed.push(CANONICAL_PERTH_STATION);
        perthAdded = true;
      }
      continue;
    }
    collapsed.push(name);
  }

  return collapsed;
}

function formatStationLabel(name) {
  if (PERTH_STATIONS.has(name)) {
    return "Perth";
  }
  return name.replace(/ Stn$/, "");
}

function normalizeDirection(direction) {
  if (!direction) {
    return direction;
  }

  const trimmed = direction.trim();
  if (DIRECTION_ALIASES[trimmed]) {
    return DIRECTION_ALIASES[trimmed];
  }

  const withoutStn = trimmed.replace(/ Stn$/i, "");
  if (DIRECTION_ALIASES[withoutStn]) {
    return DIRECTION_ALIASES[withoutStn];
  }

  return trimmed;
}

function dedupeDirections(directions) {
  const seen = new Set();
  const unique = [];

  for (const direction of directions) {
    const normalized = normalizeDirection(direction);
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(normalized);
  }

  return unique.sort();
}

function migrateSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  if (!merged.direction && merged.destination) {
    merged.direction = merged.destination;
  }
  if (merged.direction) {
    merged.direction = normalizeDirection(merged.direction);
  }
  if (merged.station) {
    merged.station = normalizeStation(merged.station);
  }
  delete merged.destination;
  delete merged.destinationLabel;
  delete merged.endStation;
  return merged;
}

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? migrateSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function readUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const station = params.get("station");
  const direction = params.get("direction") ?? params.get("destination");

  if (!station || !direction) {
    return null;
  }

  return {
    station,
    direction,
    leaveBeforeMinutes:
      Number(params.get("leaveBefore") ?? params.get("leaveBeforeMinutes")) ||
      DEFAULT_SETTINGS.leaveBeforeMinutes,
    refreshSeconds:
      Number(params.get("refresh") ?? params.get("refreshSeconds")) ||
      DEFAULT_SETTINGS.refreshSeconds,
  };
}

function saveSettings(next) {
  settings = migrateSettings({ ...settings, ...next });
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  refreshSeconds = settings.refreshSeconds;
}

function buildApiParams() {
  const params = new URLSearchParams({
    station: settings.station,
    direction: settings.direction,
    destination: settings.direction,
    leaveBefore: String(settings.leaveBeforeMinutes),
    refresh: String(settings.refreshSeconds),
  });
  return params;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  try {
    return { ok: response.ok, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      error: "Server returned an invalid response. Restart with: npm start",
    };
  }
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatLeaveMessage(next) {
  const { minutesUntilLeave, minutesLate, leavePhase } = next;

  if (leavePhase === "late") {
    if (minutesLate === 1) {
      return `You're 1 minute late — leave now`;
    }
    return `You're ${minutesLate} minutes late — leave now`;
  }

  if (leavePhase === "now") {
    return "Leave now";
  }

  if (minutesUntilLeave === 1) {
    return "Leave in 1 minute";
  }

  return `Leave in ${minutesUntilLeave} minutes`;
}

function formatHeroLabel(leavePhase) {
  if (leavePhase === "late") {
    return "You should have left";
  }
  if (leavePhase === "now") {
    return "Leave now";
  }
  return "Leave by";
}

function updateHeroState(leavePhase) {
  heroEl.classList.remove("calm", "soon", "urgent", "now", "late");
  heroEl.classList.add(leavePhase === "missed" ? "late" : leavePhase);
}

function formatScheduledLine(next) {
  const scheduled = next.scheduledDisplayTime;
  if (!scheduled) {
    return null;
  }
  if (!next.isDelayed && scheduled === next.displayTime) {
    return null;
  }
  return `Scheduled ${scheduled}`;
}

function setStatusClass(element, statusText) {
  element.classList.remove("on-time", "delayed");
  const normalized = statusText.toLowerCase();
  if (normalized.includes("on time")) {
    element.classList.add("on-time");
  } else if (normalized.includes("delay") || normalized.includes("late")) {
    element.classList.add("delayed");
  }
}

const heroLabelEl = document.querySelector(".hero .label");

function render(data) {
  errorEl.hidden = true;

  const { next, following, lastUpdated } = data;
  routeEl.textContent = `${formatStationLabel(settings.station)} → ${settings.direction}`;
  updatedEl.textContent = lastUpdated ? `Updated ${lastUpdated}` : "Updated just now";

  if (!next) {
    heroEl.className = "hero calm";
    heroLabelEl.textContent = "Leave by";
    leaveTimeEl.textContent = "—";
    leaveCountdownEl.textContent = "No upcoming trains in this direction";
    arrivalTimeEl.textContent = "—";
    scheduledTimeEl.hidden = true;
    platformEl.textContent = "—";
    statusEl.textContent = "—";
    followingSectionEl.hidden = true;
    return;
  }

  heroLabelEl.textContent = formatHeroLabel(next.leavePhase);
  leaveTimeEl.textContent = formatTime(next.leaveBy);
  leaveCountdownEl.textContent = formatLeaveMessage(next);
  arrivalTimeEl.textContent = next.displayTime;
  platformEl.textContent = next.platform;
  statusEl.textContent = next.status;

  const scheduledLine = formatScheduledLine(next);
  if (scheduledLine) {
    scheduledTimeEl.textContent = scheduledLine;
    scheduledTimeEl.hidden = false;
  } else {
    scheduledTimeEl.hidden = true;
  }

  setStatusClass(statusEl, next.status);
  updateHeroState(next.leavePhase);

  if (following) {
    followingSectionEl.hidden = false;
    followingEl.textContent = `${following.displayTime} · Platform ${following.platform} · ${following.status}`;
  } else {
    followingSectionEl.hidden = true;
  }
}

async function fetchNextTrain() {
  try {
    const result = await fetchJson(`/api/next-train?${buildApiParams()}`);

    if (!result.ok) {
      throw new Error(result.data?.error ?? result.error ?? "Could not load train times");
    }

    render(result.data);
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.hidden = false;
    updatedEl.textContent = "Update failed";
  }
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(fetchNextTrain, refreshSeconds * 1000);
}

async function loadStations() {
  const response = await fetch("/stations.json");
  const stations = collapseStationList(await response.json());

  stationSelect.innerHTML = stations
    .map((name) => {
      const label = formatStationLabel(name);
      return `<option value="${name}">${label}</option>`;
    })
    .join("");
}

async function fetchDirectionsFromApi(station) {
  const primary = await fetchJson(`/api/directions?station=${encodeURIComponent(station)}`);

  if (primary.ok && Array.isArray(primary.data.directions)) {
    return primary.data.directions;
  }

  const fallback = await fetchJson(`/api/destinations?station=${encodeURIComponent(station)}`);
  if (fallback.ok && Array.isArray(fallback.data.destinations)) {
    return fallback.data.destinations;
  }

  throw new Error(
    primary.data?.error ??
      fallback.data?.error ??
      primary.error ??
      "Could not load directions"
  );
}

async function loadDirections(station, preferredDirection) {
  const requestId = ++directionsRequestId;
  directionSelect.innerHTML = "<option value=\"\">Loading…</option>";
  directionSelect.disabled = true;

  try {
    const stationsToQuery = PERTH_STATIONS.has(station)
      ? PERTH_API_STATIONS
      : [station];

    const directionLists = await Promise.all(
      stationsToQuery.map((name) => fetchDirectionsFromApi(name))
    );

    if (requestId !== directionsRequestId) {
      return;
    }

    const directions = dedupeDirections(directionLists.flat());
    directionSelect.innerHTML = directions
      .map((dir) => `<option value="${dir}">${dir}</option>`)
      .join("");

    const normalizedPreferred = normalizeDirection(preferredDirection);
    if (normalizedPreferred && directions.includes(normalizedPreferred)) {
      directionSelect.value = normalizedPreferred;
    }
  } catch (error) {
    if (requestId !== directionsRequestId) {
      return;
    }
    directionSelect.innerHTML = `<option value="">${error.message}</option>`;
  }

  if (requestId === directionsRequestId) {
    directionSelect.disabled = false;
  }
}

async function populateSettingsForm() {
  suppressStationChange = true;
  stationSelect.value = settings.station;
  suppressStationChange = false;
  leaveBeforeInput.value = settings.leaveBeforeMinutes;
  await loadDirections(settings.station, settings.direction);
}

function openSettings() {
  populateSettingsForm().then(() => {
    settingsDialog.showModal();
  });
}

function closeSettings() {
  settingsDialog.close();
}

settingsBtn.addEventListener("click", openSettings);
settingsCancel.addEventListener("click", closeSettings);

stationSelect.addEventListener("change", () => {
  if (suppressStationChange) {
    return;
  }
  loadDirections(stationSelect.value);
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  saveSettings({
    station: stationSelect.value,
    direction: normalizeDirection(directionSelect.value),
    leaveBeforeMinutes: Number(leaveBeforeInput.value),
  });

  closeSettings();
  scheduleRefresh();
  fetchNextTrain();
});

async function init() {
  const urlSettings = readUrlSettings();
  if (urlSettings) {
    saveSettings(urlSettings);
  } else {
    settings = readStoredSettings();
    refreshSeconds = settings.refreshSeconds;
  }

  await loadStations();
  scheduleRefresh();
  fetchNextTrain();
}

init();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    fetchNextTrain();
  }
});
