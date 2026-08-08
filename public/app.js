const SETTINGS_KEY = "nextTrainSettings";
const SKIP_KEY = "nextTrainSkip";
const MANUAL_JOURNEY_OVERRIDE_KEY = "nextTrainManualJourneyOverride";

const DEFAULT_SETTINGS = {
  leaveBeforeMinutes: 10,
  refreshSeconds: 30,
};

const SWIPE_HINT_KEY = "nextTrainSwipeHintSeen";
const LEAVE_HINT_KEY = "nextTrainLeaveHintSeen";
const SWIPE_THRESHOLD_PX = 48;
const SWIPE_MAX_VERTICAL_PX = 40;

const routeEl = document.getElementById("route");
const updatedEl = document.getElementById("updated");
const journeySwitcherEl = document.getElementById("journey-switcher");
const journeySwitcherNameEl = document.getElementById("journey-switcher-name");
const journeySwitcherMenuEl = document.getElementById("journey-switcher-menu");
const heroEl = document.getElementById("hero");
const heroDepartLabelEl = document.getElementById("hero-depart-label");
const departCountdownEl = document.getElementById("depart-countdown");
const departDisplayTimeEl = document.getElementById("depart-display-time");
const heroScheduledTimeEl = document.getElementById("hero-scheduled-time");
const swipeHintEl = document.getElementById("swipe-hint");
const heroSwipePrevEl = document.getElementById("hero-swipe-prev");
const heroSwipeNextEl = document.getElementById("hero-swipe-next");
const leaveCardEl = document.getElementById("leave-card");
const leaveBufferEditBtn = document.getElementById("leave-buffer-edit-btn");
const leaveCardLabelEl = document.getElementById("leave-card-label");
const leaveTimeEl = document.getElementById("leave-time");
const leaveCountdownEl = document.getElementById("leave-countdown");
const leaveHintEl = document.getElementById("leave-hint");
const leaveAckBtn = document.getElementById("leave-ack-btn");
const platformEl = document.getElementById("platform");
const statusEl = document.getElementById("status");
const followingSectionEl = document.getElementById("following-section");
const followingNextEl = document.getElementById("following-next");
const errorEl = document.getElementById("error");

const settingsBtn = document.getElementById("settings-btn");
const helpBtn = document.getElementById("help-btn");
const helpDialog = document.getElementById("help-dialog");
const helpCloseBtn = document.getElementById("help-close-btn");
const settingsDialog = document.getElementById("settings-dialog");
const settingsListView = document.getElementById("settings-list-view");
const settingsDetailView = document.getElementById("settings-detail-view");
const settingsCancel = document.getElementById("settings-cancel");
const detailCancelBtn = document.getElementById("detail-cancel-btn");
const settingsBackBtn = document.getElementById("settings-back");
const journeyListEl = document.getElementById("journey-list");
const addJourneyBtn = document.getElementById("add-journey-btn");
const clearAllDataBtn = document.getElementById("clear-all-data-btn");
const deleteJourneyBtn = document.getElementById("delete-journey-btn");
const detailJourneyHeadingEl = document.getElementById("detail-journey-heading");
const detailStationSelect = document.getElementById("detail-station-select");
const detailDirectionSelect = document.getElementById("detail-direction-select");
const detailLeaveBeforeInput = document.getElementById("detail-leave-before-input");
const detailLeaveBeforeValueEl = document.getElementById("detail-leave-before-value");
const detailUseLeaveBeforeInput = document.getElementById("detail-use-leave-before");
const leaveBeforeField = document.getElementById("leave-before-field");
const leaveBeforeControls = document.getElementById("leave-before-controls");
const detailDefaultFromInput = document.getElementById("detail-default-from");
const detailDefaultUntilInput = document.getElementById("detail-default-until");
const detailDefaultFromDisplay = document.getElementById("detail-default-from-display");
const detailDefaultUntilDisplay = document.getElementById("detail-default-until-display");
const detailDefaultFromField = document.getElementById("detail-default-from-field");
const detailDefaultUntilField = document.getElementById("detail-default-until-field");
const detailDefaultFromClear = document.getElementById("detail-default-from-clear");
const detailDefaultUntilClear = document.getElementById("detail-default-until-clear");
const detailNearestBtn = document.getElementById("detail-nearest-btn");
const detailNearestHint = document.getElementById("detail-nearest-hint");

let settings = createDefaultStore();
let refreshSeconds = DEFAULT_SETTINGS.refreshSeconds;
let skipTrains = 0;
let lastRenderedNext = null;
let lastApiData = null;
let stationCoords = null;
let refreshTimer = null;
let countdownTimer = null;
let lastLiveDisplayMinute = null;
let stationsCache = null;
let directionsRequestId = 0;
let settingsDraftJourneys = [];
let editingJourneyId = null;
let editingJourneySnapshot = null;
let journeySwitcherOpen = false;
let activeJourneyNameEdit = null;
let swipeStartX = 0;
let swipeStartY = 0;
let leaveAutoCheckDeparture = null;

const STATION_ARRIVAL_KM = 0.35;
const TRAVELING_SPEED_MS = 2.5;

const DIRECTION_ALIASES = {
  "Perth Underground": "Perth",
  "Perth Underground Stn": "Perth",
  "Perth Stn": "Perth",
};

const PERTH_STATIONS = new Set(["Perth Stn", "Perth Underground Stn"]);
const PERTH_API_STATIONS = ["Perth Underground Stn", "Perth Stn"];
const CANONICAL_PERTH_STATION = "Perth Underground Stn";
const DEFAULT_DIRECTION_LABEL = "Perth";

const API_ORIGIN = window.Capacitor?.isNativePlatform?.()
  ? "https://next-train-app.vercel.app"
  : "";

function apiUrl(path) {
  return `${API_ORIGIN}${path}`;
}

function getActiveFixture() {
  return new URLSearchParams(window.location.search).get("fixture");
}

function appendFixtureQuery(queryString) {
  const fixture = getActiveFixture();
  if (!fixture) {
    return queryString;
  }

  const params = new URLSearchParams(queryString);
  params.set("fixture", fixture);
  return params.toString();
}

function applyTestQueryParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("test") === "1") {
    sessionStorage.setItem("nextTrainTestMode", "1");
  }

  if (params.get("reset") !== "1") {
    return;
  }

  localStorage.clear();
  sessionStorage.clear();
  if (params.get("test") === "1") {
    sessionStorage.setItem("nextTrainTestMode", "1");
  }
  params.delete("reset");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function isTestMode() {
  return sessionStorage.getItem("nextTrainTestMode") === "1";
}

function createJourneyId() {
  return `j-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultJourney(overrides = {}) {
  return {
    id: createJourneyId(),
    name: "Journey",
    station: "",
    direction: "",
    leaveBeforeMinutes: DEFAULT_SETTINGS.leaveBeforeMinutes,
    useLeaveBefore: true,
    defaultFrom: "",
    defaultUntil: "",
    ...overrides,
  };
}

function createDefaultJourneyPair() {
  return [
    createDefaultJourney({
      name: "Daily Commute - in",
      defaultFrom: "06:00",
      defaultUntil: "09:00",
    }),
    createDefaultJourney({
      name: "Daily Commute - out",
      defaultFrom: "15:00",
      defaultUntil: "18:00",
    }),
  ];
}

function createDefaultStore() {
  const journeys = createDefaultJourneyPair();
  return {
    refreshSeconds: DEFAULT_SETTINGS.refreshSeconds,
    activeJourneyId: journeys[0].id,
    journeys,
  };
}

function isUnconfiguredJourney(journey) {
  return !journey?.station || !journey?.direction;
}

function isLegacyPlaceholderJourneyName(name) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "journey" ||
    normalized === "to work" ||
    normalized === "to home" ||
    /^journey \d+$/.test(normalized)
  );
}

function resolveInitialJourneys(rawJourneys = []) {
  const normalized = rawJourneys.map((journey) => normalizeJourney(journey));

  if (!normalized.length) {
    return createDefaultJourneyPair();
  }

  const hasConfigured = normalized.some((journey) => !isUnconfiguredJourney(journey));
  const defaultNames = ["Daily Commute - in", "Daily Commute - out"];

  if (hasConfigured) {
    return normalized.map((journey, index) => {
      if (!isUnconfiguredJourney(journey) || !isLegacyPlaceholderJourneyName(journey.name)) {
        return journey;
      }

      return normalizeJourney({
        ...journey,
        name: defaultNames[index] ?? journey.name,
      });
    });
  }

  if (normalized.length < 2) {
    return createDefaultJourneyPair();
  }

  return normalized.map((journey, index) => {
    if (!isLegacyPlaceholderJourneyName(journey.name)) {
      return journey;
    }

    return normalizeJourney({
      ...journey,
      name: defaultNames[index] ?? journey.name,
    });
  });
}

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

function isDefaultCommuteJourneyName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return normalized === "daily commute - in" || normalized === "daily commute - out";
}

function isLegacyBlankDefaultWindow(defaultFrom, defaultUntil) {
  return defaultFrom === "00:00" && (defaultUntil === "23:59" || defaultUntil === "24:00");
}

function normalizeJourney(raw = {}) {
  let defaultFrom =
    raw.defaultFrom === undefined || raw.defaultFrom === null
      ? ""
      : String(raw.defaultFrom);
  let defaultUntil =
    raw.defaultUntil === "24:00"
      ? "23:59"
      : raw.defaultUntil === undefined || raw.defaultUntil === null
        ? ""
        : String(raw.defaultUntil);

  if (
    isLegacyBlankDefaultWindow(defaultFrom, defaultUntil) &&
    !isDefaultCommuteJourneyName(raw.name)
  ) {
    defaultFrom = "";
    defaultUntil = "";
  }

  return {
    id: raw.id || createJourneyId(),
    name: String(raw.name || "Journey").trim() || "Journey",
    station: raw.station ? normalizeStation(raw.station) : "",
    direction: raw.direction ? normalizeDirection(raw.direction) : "",
    leaveBeforeMinutes:
      Number(raw.leaveBeforeMinutes) || DEFAULT_SETTINGS.leaveBeforeMinutes,
    useLeaveBefore: raw.useLeaveBefore !== false,
    defaultFrom,
    defaultUntil,
  };
}

function legToJourney(leg, name, defaultFrom, defaultUntil) {
  if (!leg?.station || !leg?.direction) {
    return null;
  }
  return normalizeJourney({
    id: createJourneyId(),
    name,
    station: leg.station,
    direction: leg.direction,
    leaveBeforeMinutes: leg.leaveBeforeMinutes,
    defaultFrom,
    defaultUntil,
  });
}

function migrateSettings(raw = {}) {
  if (Array.isArray(raw.journeys) && raw.journeys.length > 0) {
    const journeys = resolveInitialJourneys(raw.journeys);
    const activeJourneyId = journeys.some((j) => j.id === raw.activeJourneyId)
      ? raw.activeJourneyId
      : journeys[0].id;

    return {
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId,
      journeys,
    };
  }

  if (raw.outbound || raw.return) {
    const journeys = [];
    const work = legToJourney(raw.outbound, "To work", "00:00", "12:00");
    const home = legToJourney(raw.return, "To home", "12:00", "23:59");
    if (work) {
      journeys.push(work);
    }
    if (home) {
      journeys.push(home);
    }

    let activeJourneyId = journeys[0]?.id ?? null;
    if (raw.activeLeg === "return" && journeys[1]) {
      activeJourneyId = journeys[1].id;
    }

    return {
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId,
      journeys,
    };
  }

  const direction = raw.direction ?? raw.destination;
  if (raw.station && direction) {
    const journey = legToJourney(
      {
        station: raw.station,
        direction,
        leaveBeforeMinutes: raw.leaveBeforeMinutes,
      },
      "To work",
      "00:00",
      "12:00"
    );

    return {
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId: journey?.id ?? null,
      journeys: journey ? [journey] : [],
    };
  }

  const journeys = createDefaultJourneyPair();
  return {
    refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
    activeJourneyId: journeys[0].id,
    journeys,
  };
}

function getConfiguredJourneys() {
  return settings.journeys.filter((journey) => !isUnconfiguredJourney(journey));
}

function shouldShowJourneySwitcher() {
  return getConfiguredJourneys().length >= 2;
}

function getJourneyById(id) {
  return settings.journeys.find((journey) => journey.id === id) ?? null;
}

function getActiveJourney() {
  const configured = getConfiguredJourneys();
  if (!configured.length) {
    return null;
  }

  const active = getJourneyById(settings.activeJourneyId);
  if (active?.station && active?.direction) {
    return active;
  }

  return configured[0];
}

function hasConfiguredCommute() {
  return getConfiguredJourneys().length > 0;
}

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return createDefaultStore();
    }

    const migrated = migrateSettings(JSON.parse(raw));
    const resolved = {
      ...migrated,
      journeys: resolveInitialJourneys(migrated.journeys).map((journey) =>
        normalizeJourney(journey)
      ),
    };

    if (resolved.journeys.length && !resolved.activeJourneyId) {
      resolved.activeJourneyId = resolved.journeys[0].id;
    }

    return resolved;
  } catch {
    return createDefaultStore();
  }
}

function persistSettings(next) {
  settings = migrateSettings({ ...settings, ...next });
  settings.journeys = settings.journeys.map((journey) => normalizeJourney(journey));
  const configured = getConfiguredJourneys();
  if (!configured.some((journey) => journey.id === settings.activeJourneyId)) {
    settings.activeJourneyId = configured[0]?.id ?? settings.journeys[0]?.id ?? null;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  refreshSeconds = settings.refreshSeconds;
  renderJourneySwitcher();
}

function formatOptionalTimeDisplay(value) {
  if (!value) {
    return "Not set";
  }

  const [hour, minute] = String(value).split(":").map(Number);
  const sample = new Date();
  sample.setHours(hour, minute || 0, 0, 0);
  return sample.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function setOptionalTimeField(input, display, field, clearBtn, value) {
  if (!input || !display || !field) {
    return;
  }

  const normalized = value ? String(value) : "";
  field.dataset.empty = normalized ? "false" : "true";
  input.value = normalized;
  display.textContent = formatOptionalTimeDisplay(normalized);
  if (clearBtn) {
    clearBtn.hidden = !normalized;
  }
}

function readOptionalTimeField(field) {
  if (!field || field.dataset.empty === "true") {
    return "";
  }

  return field.querySelector(".optional-time-input")?.value ?? "";
}

function bindOptionalTimeField(input, display, field, clearBtn) {
  if (!input || !display || !field) {
    return;
  }

  display.addEventListener("click", () => {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  });

  input.addEventListener("change", () => {
    setOptionalTimeField(input, display, field, clearBtn, input.value);
  });

  clearBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOptionalTimeField(input, display, field, clearBtn, "");
  });
}

function journeyUsesLeaveBefore(journey) {
  return journey?.useLeaveBefore !== false;
}

function getEffectiveLeaveBeforeMinutes(journey) {
  if (!journeyUsesLeaveBefore(journey)) {
    return 0;
  }

  return Number(journey?.leaveBeforeMinutes) || DEFAULT_SETTINGS.leaveBeforeMinutes;
}

function formatLeaveBeforeLabel(minutes) {
  const value = Number(minutes) || DEFAULT_SETTINGS.leaveBeforeMinutes;
  return value === 1 ? "1 min" : `${value} min`;
}

function updateLeaveBeforeLabel(minutes = detailLeaveBeforeInput?.value) {
  if (detailLeaveBeforeValueEl) {
    detailLeaveBeforeValueEl.textContent = formatLeaveBeforeLabel(minutes);
  }
}

function syncLeaveBeforeControlsState() {
  const enabled = detailUseLeaveBeforeInput?.checked ?? true;

  if (leaveBeforeField) {
    leaveBeforeField.classList.toggle("leave-before-field--disabled", !enabled);
  }
  if (detailLeaveBeforeInput) {
    detailLeaveBeforeInput.disabled = !enabled;
  }
  if (detailLeaveBeforeValueEl) {
    detailLeaveBeforeValueEl.hidden = !enabled;
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getPerthDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year").value),
    month: Number(parts.find((part) => part.type === "month").value),
    day: Number(parts.find((part) => part.type === "day").value),
  };
}

function departureIsoFromDisplayTime(displayTime, referenceIso) {
  if (!displayTime) {
    return null;
  }

  const [hour, minute] = displayTime.split(":").map(Number);
  const reference = referenceIso ? new Date(referenceIso) : new Date();
  const { year, month, day } = getPerthDateParts(reference);
  let departure = new Date(
    `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00+08:00`
  );

  if (referenceIso && departure < new Date(referenceIso) - 30 * 60 * 1000) {
    departure = new Date(departure.getTime() + 24 * 60 * 60 * 1000);
  }

  return departure.toISOString();
}

function resolveTripDeparture(trip, referenceIso) {
  return trip?.departure ?? trip?.arrival ?? departureIsoFromDisplayTime(trip?.displayTime, referenceIso);
}

function enrichTrip(trip, referenceIso) {
  if (!trip) {
    return trip;
  }

  const departure = resolveTripDeparture(trip, referenceIso);
  return {
    ...trip,
    departure,
    arrival: departure,
  };
}

function normalizeApiTrainData(data) {
  if (!data?.next) {
    return data;
  }

  const nextReference = data.next.departure ?? data.next.arrival;
  const next = enrichTrip(data.next, nextReference);
  const following = data.following
    ? enrichTrip(data.following, next.departure ?? next.arrival)
    : null;

  const upcoming =
    data.upcoming?.length > 0
      ? data.upcoming.map((trip, index) =>
          enrichTrip(
            trip,
            index > 0
              ? resolveTripDeparture(data.upcoming[index - 1], nextReference)
              : nextReference
          )
        )
      : following
        ? [next, following]
        : [next];

  return {
    ...data,
    next,
    following,
    upcoming,
  };
}

function getPerthMinutesSinceMidnight(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  return hour * 60 + minute;
}

function minutesUntilPerthWallClock(isoString) {
  const target = getPerthMinutesSinceMidnight(new Date(isoString));
  const now = getPerthMinutesSinceMidnight();
  let diff = target - now;

  if (diff < -12 * 60) {
    diff += 24 * 60;
  } else if (diff > 12 * 60) {
    diff -= 24 * 60;
  }

  return diff;
}

function getLiveTiming(next) {
  const minutesUntilDeparture = minutesUntilPerthWallClock(
    next.departure ?? next.arrival
  );
  const minutesUntilLeave = minutesUntilPerthWallClock(next.leaveBy);
  const leavePhase = getLeavePhase(minutesUntilLeave, minutesUntilDeparture);

  return {
    minutesUntilDeparture,
    minutesUntilLeave,
    leavePhase,
    minutesLate: minutesUntilLeave < 0 ? Math.abs(minutesUntilLeave) : 0,
  };
}

function hasDefaultWindow(journey) {
  return Boolean(journey?.defaultFrom && journey?.defaultUntil);
}

function parseTimeToMinutes(time) {
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return hour * 60 + (minute || 0);
}

function journeyMatchesTime(journey, minutes) {
  if (!hasDefaultWindow(journey)) {
    return false;
  }

  const from = parseTimeToMinutes(journey.defaultFrom);
  const until = parseTimeToMinutes(journey.defaultUntil);

  if (from === until) {
    return true;
  }
  if (from < until) {
    return minutes >= from && minutes < until;
  }
  return minutes >= from || minutes < until;
}

function getJourneyWindowRanges(journey) {
  if (!hasDefaultWindow(journey)) {
    return [];
  }

  const from = parseTimeToMinutes(journey.defaultFrom);
  const until = parseTimeToMinutes(journey.defaultUntil);
  const dayEnd = 24 * 60;

  if (from === until) {
    return [[0, dayEnd]];
  }
  if (from < until) {
    return [[from, until]];
  }
  return [
    [from, dayEnd],
    [0, until],
  ];
}

function timeRangesOverlap(rangeA, rangeB) {
  return rangeA[0] < rangeB[1] && rangeB[0] < rangeA[1];
}

function journeyDefaultWindowsOverlap(left, right) {
  for (const rangeA of getJourneyWindowRanges(left)) {
    for (const rangeB of getJourneyWindowRanges(right)) {
      if (timeRangesOverlap(rangeA, rangeB)) {
        return true;
      }
    }
  }
  return false;
}

function formatJourneyDefaultWindow(journey) {
  if (!hasDefaultWindow(journey)) {
    return "Not set";
  }
  return `${journey.defaultFrom}–${journey.defaultUntil}`;
}

function findJourneyDefaultWindowConflict(journey, journeys) {
  if (!hasDefaultWindow(journey)) {
    return null;
  }

  if (
    parseTimeToMinutes(journey.defaultFrom) === parseTimeToMinutes(journey.defaultUntil)
  ) {
    const other = journeys.find((entry) => entry.id !== journey.id);
    if (other) {
      return other;
    }
  }

  for (const other of journeys) {
    if (other.id === journey.id || !hasDefaultWindow(other)) {
      continue;
    }
    if (journeyDefaultWindowsOverlap(journey, other)) {
      return other;
    }
  }

  return null;
}

function findScheduledJourneyId() {
  const configured = getConfiguredJourneys();
  if (!configured.length) {
    return null;
  }

  const minutes = getPerthMinutesSinceMidnight();
  const match = configured.find((journey) => journeyMatchesTime(journey, minutes));
  return match?.id ?? null;
}

function findDefaultWindowJourneyAt(minutes = getPerthMinutesSinceMidnight()) {
  return (
    getConfiguredJourneys().find((journey) => journeyMatchesTime(journey, minutes)) ?? null
  );
}

function getDefaultWindowJourneyIds(minutes = getPerthMinutesSinceMidnight()) {
  return getConfiguredJourneys()
    .filter((journey) => journeyMatchesTime(journey, minutes))
    .map((journey) => journey.id);
}

function defaultWindowContextsMatch(storedIds, currentIds) {
  const stored = [...(storedIds ?? [])].sort().join(",");
  const current = [...(currentIds ?? [])].sort().join(",");
  return stored === current;
}

function readManualJourneyOverride() {
  try {
    const raw = sessionStorage.getItem(MANUAL_JOURNEY_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setManualJourneyOverride(journeyId) {
  sessionStorage.setItem(
    MANUAL_JOURNEY_OVERRIDE_KEY,
    JSON.stringify({
      journeyId,
      matchingWindowIds: getDefaultWindowJourneyIds(),
    })
  );
}

function clearManualJourneyOverride() {
  sessionStorage.removeItem(MANUAL_JOURNEY_OVERRIDE_KEY);
}

function isManualOverrideBlockingAuto(scheduledId) {
  const override = readManualJourneyOverride();
  if (!override) {
    return false;
  }

  if (settings.activeJourneyId !== override.journeyId) {
    settings.activeJourneyId = override.journeyId;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  const storedWindowIds =
    override.matchingWindowIds ??
    (override.windowJourneyId ? [override.windowJourneyId] : []);
  const currentWindowIds = getDefaultWindowJourneyIds();

  if (defaultWindowContextsMatch(storedWindowIds, currentWindowIds)) {
    return true;
  }

  if (!scheduledId) {
    return true;
  }

  if (scheduledId === override.journeyId) {
    clearManualJourneyOverride();
    return false;
  }

  clearManualJourneyOverride();
  return false;
}

function maybeAutoSelectJourney() {
  const scheduledId = findScheduledJourneyId();
  if (isManualOverrideBlockingAuto(scheduledId)) {
    return;
  }

  if (!scheduledId || scheduledId === settings.activeJourneyId) {
    return;
  }

  settings.activeJourneyId = scheduledId;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  skipTrains = readSkipState().count;
}

function readUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const station = params.get("station");
  const direction = params.get("direction") ?? params.get("destination");

  if (!station || !direction) {
    return null;
  }

  const journey = createDefaultJourney({
    name: "To work",
    station,
    direction,
    leaveBeforeMinutes:
      Number(params.get("leaveBefore") ?? params.get("leaveBeforeMinutes")) ||
      DEFAULT_SETTINGS.leaveBeforeMinutes,
    defaultFrom: "06:00",
    defaultUntil: "09:00",
  });

  return migrateSettings({
    journeys: [journey],
    activeJourneyId: journey.id,
    refreshSeconds:
      Number(params.get("refresh") ?? params.get("refreshSeconds")) ||
      DEFAULT_SETTINGS.refreshSeconds,
  });
}

function skipStorageKey() {
  const journey = getActiveJourney();
  return `${SKIP_KEY}:${journey?.id ?? "none"}`;
}

function readSkipState() {
  try {
    const raw = sessionStorage.getItem(skipStorageKey());
    if (!raw) {
      return { count: 0, skippedUntil: null, skippedToDeparture: null };
    }

    const parsed = JSON.parse(raw);
    if (parsed.skippedUntil && new Date(parsed.skippedUntil) <= new Date()) {
      clearSkipState();
      return { count: 0, skippedUntil: null, skippedToDeparture: null };
    }

    return {
      count: Math.max(0, Number(parsed.count) || 0),
      skippedUntil: parsed.skippedUntil ?? null,
      skippedToDeparture: parsed.skippedToDeparture ?? null,
    };
  } catch {
    return { count: 0, skippedUntil: null, skippedToDeparture: null };
  }
}

function saveSkipState(count, skippedUntil, skippedToDeparture = null) {
  skipTrains = Math.max(0, count);
  const payload = {
    count: skipTrains,
    skippedUntil: skippedUntil ?? null,
    skippedToDeparture: skippedToDeparture ?? null,
  };
  sessionStorage.setItem(skipStorageKey(), JSON.stringify(payload));
}

function clearSkipState() {
  skipTrains = 0;
  sessionStorage.removeItem(skipStorageKey());
}

function getUpcomingTrips(data) {
  if (!data?.next) {
    return [];
  }
  return normalizeApiTrainData(data).upcoming ?? [];
}

function formatFollowingLine(trip) {
  return `${trip.displayTime} · Platform ${trip.platform} · ${trip.status}`;
}

function getNextThenTrain(data, skipCount = skipTrains) {
  if (!data) {
    return null;
  }

  const normalized = normalizeApiTrainData(data);
  const upcoming = normalized.upcoming ?? [];
  const nextTrip = upcoming[skipCount + 1];

  if (nextTrip) {
    return slimFollowing(nextTrip);
  }

  if (skipCount === 0 && normalized.following) {
    return slimFollowing(normalized.following);
  }

  return null;
}

function renderThenTrains(data) {
  if (!followingSectionEl || !followingNextEl) {
    return;
  }

  const nextTrain = getNextThenTrain(data);

  if (!nextTrain) {
    followingSectionEl.hidden = true;
    followingNextEl.textContent = "";
    return;
  }

  followingSectionEl.hidden = false;
  followingNextEl.textContent = formatFollowingLine(nextTrain);
}

function reconcileSkipWithApi(data) {
  if (skipTrains <= 0 || !data?.next) {
    return;
  }

  const { skippedToDeparture } = readSkipState();
  if (!skippedToDeparture) {
    return;
  }

  const apiNextDeparture = resolveTripDeparture(
    normalizeApiTrainData(data).next
  );
  if (apiNextDeparture && apiNextDeparture === skippedToDeparture) {
    clearSkipState();
  }
}

function getSkippedEarlierTrain(data) {
  if (skipTrains <= 0 || !data) {
    return null;
  }

  const earlierTrip = getUpcomingTrips(data)[skipTrains - 1];
  if (!earlierTrip) {
    return null;
  }

  const journey = getActiveJourney();
  const normalized = normalizeApiTrainData(data);
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;
  return ensureFullNext(
    earlierTrip,
    getEffectiveLeaveBeforeMinutes(journey),
    referenceIso
  );
}

function prepareDisplayData(data) {
  const normalized = normalizeApiTrainData(data);
  reconcileSkipWithApi(normalized);
  return applyClientSkip(normalized);
}

function getLeavePhase(minutesUntilLeave, minutesUntilDeparture) {
  if (minutesUntilDeparture <= 0) {
    return "missed";
  }
  if (minutesUntilLeave < 0) {
    return "late";
  }
  if (minutesUntilLeave <= 0) {
    return "now";
  }
  if (minutesUntilLeave <= 2) {
    return "urgent";
  }
  if (minutesUntilLeave <= 5) {
    return "soon";
  }
  return "calm";
}

function buildNextFromFollowing(following, leaveBeforeMinutes, referenceIso) {
  const departureIso = resolveTripDeparture(
    following,
    referenceIso ?? following?.departure ?? following?.arrival
  );
  if (!departureIso) {
    return null;
  }

  const departure = new Date(departureIso);
  const leaveByMs = departure.getTime() - leaveBeforeMinutes * 60 * 1000;
  const leaveByIso = new Date(leaveByMs).toISOString();
  const timing = getLiveTiming({
    departure: departureIso,
    arrival: departureIso,
    leaveBy: leaveByIso,
  });

  return {
    ...following,
    leaveBy: leaveByIso,
    departure: departureIso,
    arrival: departureIso,
    minutesUntilDeparture: timing.minutesUntilDeparture,
    minutesUntilArrival: timing.minutesUntilDeparture,
    minutesUntilLeave: timing.minutesUntilLeave,
    minutesLate: timing.minutesLate,
    leavePhase: timing.leavePhase,
    isDelayed: Number(following.timingOffsetMinutes ?? 0) >= 2,
  };
}

function slimFollowing(trip) {
  const departure = trip.departure ?? trip.arrival;
  return {
    displayTime: trip.displayTime,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    platform: trip.platform,
    status: trip.status,
    departure,
    arrival: departure,
  };
}

function ensureFullNext(trip, leaveBeforeMinutes, referenceIso) {
  if (!trip) {
    return null;
  }
  if (trip.leaveBy) {
    return trip;
  }
  return buildNextFromFollowing(trip, leaveBeforeMinutes, referenceIso);
}

function applyClientSkip(data) {
  if (!data || skipTrains <= 0) {
    return data;
  }

  const normalized = normalizeApiTrainData(data);
  const journey = getActiveJourney();
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;

  if (!normalized.upcoming?.length) {
    return normalized;
  }

  const skip = Math.min(skipTrains, normalized.upcoming.length - 1);
  const next = ensureFullNext(
    normalized.upcoming[skip] ?? normalized.next,
    getEffectiveLeaveBeforeMinutes(journey),
    referenceIso
  );
  const followingTrip = normalized.upcoming[skip + 1] ?? null;
  const following = getNextThenTrain(normalized, skip) ?? (followingTrip ? slimFollowing(followingTrip) : null);

  return {
    ...normalized,
    next,
    following,
  };
}

function formatJourneyRoute(journey) {
  if (!journey?.station || !journey?.direction) {
    return "Set up...";
  }
  return `${formatStationLabel(journey.station)}, towards ${journey.direction}`;
}

function renderJourneySwitcher() {
  if (!journeySwitcherEl || !journeySwitcherMenuEl) {
    return;
  }

  if (!shouldShowJourneySwitcher()) {
    journeySwitcherEl.hidden = true;
    journeySwitcherMenuEl.hidden = true;
    journeySwitcherOpen = false;
    syncJourneySwitcherA11y();
    return;
  }

  const active = getActiveJourney();
  journeySwitcherEl.hidden = false;
  journeySwitcherNameEl.textContent = active?.name ?? "Journey";

  journeySwitcherMenuEl.innerHTML = "";
  for (const journey of getConfiguredJourneys()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "journey-switcher-option";
    if (journey.id === settings.activeJourneyId) {
      button.classList.add("active");
    }
    button.innerHTML = `${journey.name}<span class="journey-switcher-option-route">${formatJourneyRoute(journey)}</span>`;
    button.addEventListener("click", () => {
      closeJourneySwitcherMenu();
      switchJourney(journey.id);
    });
    journeySwitcherMenuEl.appendChild(button);
  }

  journeySwitcherMenuEl.hidden = !journeySwitcherOpen;
  syncJourneySwitcherA11y();
}

function syncJourneySwitcherA11y() {
  if (!journeySwitcherEl) {
    return;
  }

  journeySwitcherEl.setAttribute("aria-expanded", journeySwitcherOpen ? "true" : "false");
}

function toggleJourneySwitcherMenu() {
  if (!shouldShowJourneySwitcher()) {
    return;
  }
  journeySwitcherOpen = !journeySwitcherOpen;
  journeySwitcherMenuEl.hidden = !journeySwitcherOpen;
  syncJourneySwitcherA11y();
}

function closeJourneySwitcherMenu() {
  journeySwitcherOpen = false;
  if (journeySwitcherMenuEl) {
    journeySwitcherMenuEl.hidden = true;
  }
  syncJourneySwitcherA11y();
}

function switchJourney(journeyId) {
  if (journeyId === settings.activeJourneyId) {
    return;
  }

  const journey = getJourneyById(journeyId);
  if (!journey?.station || !journey?.direction) {
    openJourneyDetail(journeyId);
    return;
  }

  setManualJourneyOverride(journeyId);
  persistSettings({ activeJourneyId: journeyId });
  skipTrains = readSkipState().count;
  closeJourneySwitcherMenu();
  fetchNextTrain();
}

function canSkipToNextTrain() {
  if (!lastApiData) {
    return false;
  }

  const upcoming = getUpcomingTrips(lastApiData);
  return skipTrains < upcoming.length - 1;
}

function canSkipToEarlierTrain() {
  return skipTrains > 0;
}

function skipToNextTrain() {
  if (!canSkipToNextTrain()) {
    return;
  }

  skipTrains += 1;
  const normalized = normalizeApiTrainData(lastApiData);
  const skippedToTrip = normalized.upcoming?.[skipTrains] ?? null;
  const skippedToDeparture = skippedToTrip ? resolveTripDeparture(skippedToTrip) : null;
  saveSkipState(skipTrains, null, skippedToDeparture);
  dismissSwipeHint();

  if (lastApiData) {
    render(applyClientSkip({ ...lastApiData }));
    fetchNextTrain();
  }
}

function skipToEarlierTrain() {
  if (!canSkipToEarlierTrain() || !lastApiData) {
    return;
  }

  skipTrains -= 1;
  if (skipTrains <= 0) {
    clearSkipState();
  } else {
    const normalized = normalizeApiTrainData(lastApiData);
    const skippedToTrip = normalized.upcoming?.[skipTrains] ?? null;
    const skippedToDeparture = skippedToTrip ? resolveTripDeparture(skippedToTrip) : null;
    saveSkipState(skipTrains, null, skippedToDeparture);
  }

  dismissSwipeHint();
  render(applyClientSkip({ ...lastApiData }));
  fetchNextTrain();
}

function buildApiParams() {
  const journey = getActiveJourney();
  if (!journey?.station || !journey?.direction) {
    throw new Error("Journey is not fully configured");
  }

  const params = new URLSearchParams({
    station: journey.station,
    direction: journey.direction,
    destination: journey.direction,
    leaveBefore: String(getEffectiveLeaveBeforeMinutes(journey)),
    refresh: String(settings.refreshSeconds),
  });

  const fixture = getActiveFixture();
  if (fixture) {
    params.set("fixture", fixture);
  }

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
  const { minutesUntilLeave, minutesLate, leavePhase } = getLiveTiming(next);

  if (leavePhase === "late" || leavePhase === "missed") {
    if (minutesLate === 1) {
      return "You're 1 minute late — leave now";
    }
    if (minutesLate > 1) {
      return `You're ${minutesLate} minutes late — leave now`;
    }
    return "You should have left — hurry";
  }

  if (leavePhase === "now") {
    return "Leave now";
  }

  if (minutesUntilLeave === 1) {
    return "Leave in 1 minute";
  }

  return `Leave in ${minutesUntilLeave} minutes`;
}

function formatTrainDepartMessage(next) {
  const minutes = getLiveTiming(next).minutesUntilDeparture;

  if (minutes <= 0) {
    return "Train departing now";
  }
  if (minutes === 1) {
    return "Train departs in 1 minute";
  }
  return `Train departs in ${minutes} minutes`;
}

function leaveAckStorageKey(next) {
  const journey = getActiveJourney();
  const departure = resolveTripDeparture(next);
  return `nextTrainLeaveAck:${journey?.id ?? "none"}:${departure ?? "unknown"}`;
}

function isLeaveAcknowledged(next) {
  if (!next) {
    return false;
  }
  return sessionStorage.getItem(leaveAckStorageKey(next)) === "1";
}

function acknowledgeLeave(next) {
  if (!next) {
    return;
  }
  sessionStorage.setItem(leaveAckStorageKey(next), "1");
  if (leaveAckBtn) {
    leaveAckBtn.hidden = true;
    leaveAckBtn.classList.remove("leave-ack-btn--visible");
  }
  if (lastApiData) {
    render(prepareDisplayData(lastApiData));
  }
}

async function maybeAutoAcknowledgeLeave(next) {
  if (!next || isLeaveAcknowledged(next)) {
    return;
  }

  const { leavePhase } = getLiveTiming(next);
  if (leavePhase !== "late" && leavePhase !== "missed") {
    return;
  }

  const departure = resolveTripDeparture(next);
  if (!departure || leaveAutoCheckDeparture === departure) {
    return;
  }

  leaveAutoCheckDeparture = departure;

  const journey = getActiveJourney();
  if (!journey?.station || !navigator.geolocation) {
    return;
  }

  try {
    const coords = await loadStationCoords();
    const stationPoint = coords[normalizeStation(journey.station)];
    if (!stationPoint) {
      return;
    }

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 60_000,
      });
    });

    const distance = distanceKm(
      position.coords.latitude,
      position.coords.longitude,
      stationPoint.lat,
      stationPoint.lng
    );

    if (distance <= STATION_ARRIVAL_KM) {
      acknowledgeLeave(next);
      return;
    }

    if (typeof position.coords.speed === "number" && position.coords.speed >= TRAVELING_SPEED_MS) {
      acknowledgeLeave(next);
    }
  } catch {
    // Geolocation unavailable or denied — button still works.
  }
}

function formatLeaveCardLabel(leavePhase) {
  if (leavePhase === "late" || leavePhase === "missed") {
    return "You should have left";
  }
  if (leavePhase === "now") {
    return "Leave now";
  }
  return "Leave by";
}

function updateLeaveCardState(leavePhase) {
  if (!leaveCardEl) {
    return;
  }

  leaveCardEl.classList.remove("calm", "soon", "urgent", "now", "late");
  leaveCardEl.classList.add(leavePhase === "missed" ? "late" : leavePhase);
}

function formatScheduledLine(next) {
  const offset = Number(next.timingOffsetMinutes ?? 0);

  if (offset >= 2 && next.scheduledDisplayTime) {
    return `Scheduled ${next.scheduledDisplayTime}`;
  }

  if (offset <= -2) {
    return "Estimated";
  }

  return null;
}

function isOnTimeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .includes("on time");
}

function renderStatusDisplay(next) {
  if (!statusEl) {
    return;
  }

  statusEl.classList.remove("has-scheduled");
  statusEl.replaceChildren();

  if (!next?.status) {
    statusEl.textContent = "—";
    setStatusClass(statusEl, "");
    return;
  }

  if (isOnTimeStatus(next.status) || !next.scheduledDisplayTime) {
    statusEl.textContent = next.status;
    setStatusClass(statusEl, next.status);
    return;
  }

  const statusMain = document.createElement("span");
  statusMain.className = "status-primary";
  statusMain.textContent = next.status;

  const statusScheduled = document.createElement("span");
  statusScheduled.className = "status-scheduled";
  statusScheduled.textContent = `Sched. ${next.scheduledDisplayTime}`;

  statusEl.append(statusMain, statusScheduled);
  statusEl.classList.add("has-scheduled");
  setStatusClass(statusEl, next.status);
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

function formatDepartureCountdown(next) {
  const minutes = getLiveTiming(next).minutesUntilDeparture;

  if (minutes <= 0) {
    return "Now";
  }
  if (minutes === 1) {
    return "1 minute";
  }
  return `${minutes} minutes`;
}

function hasSeenSwipeHint() {
  return localStorage.getItem(SWIPE_HINT_KEY) === "1";
}

function dismissLeaveHint() {
  localStorage.setItem(LEAVE_HINT_KEY, "1");
  if (leaveHintEl) {
    leaveHintEl.hidden = true;
  }
}

function updateLeaveBufferEditBtn() {
  if (!leaveBufferEditBtn) {
    return;
  }

  const journey = getActiveJourney();
  const visible =
    journeyUsesLeaveBefore(journey) &&
    leaveCardEl &&
    !leaveCardEl.hidden &&
    !heroEl?.classList.contains("hero-setup");

  leaveBufferEditBtn.hidden = !visible;
}

function highlightLeaveBeforeField() {
  if (!leaveBeforeField) {
    return;
  }

  leaveBeforeField.classList.remove("leave-before-field--highlight");
  void leaveBeforeField.offsetWidth;
  leaveBeforeField.classList.add("leave-before-field--highlight");

  const removeHighlight = () => {
    leaveBeforeField.classList.remove("leave-before-field--highlight");
    leaveBeforeField.removeEventListener("animationend", removeHighlight);
  };

  leaveBeforeField.addEventListener("animationend", removeHighlight);
  window.setTimeout(removeHighlight, 2400);
}

async function ensureSettingsDraftLoaded() {
  if (settingsDraftJourneys.length > 0) {
    return;
  }

  await populateJourneyListView();
}

function openLeaveBufferSettings() {
  dismissLeaveHint();
  const journey = getActiveJourney();
  if (!journey) {
    openSettings();
    return;
  }

  ensureSettingsDraftLoaded()
    .then(() => populateJourneyDetailForm(journey.id))
    .then(() => {
      showSettingsDetailView();
      if (!settingsDialog.open) {
        settingsDialog.showModal();
      }

      requestAnimationFrame(() => {
        leaveBeforeField?.scrollIntoView({ behavior: "smooth", block: "center" });
        detailUseLeaveBeforeInput?.focus({ preventScroll: true });
        window.setTimeout(highlightLeaveBeforeField, 400);
      });
    });
}

function hasSeenLeaveHint() {
  return localStorage.getItem(LEAVE_HINT_KEY) === "1";
}

function updateLeaveHint() {
  const journey = getActiveJourney();
  const leavePhase = lastRenderedNext ? getLiveTiming(lastRenderedNext).leavePhase : null;
  const hideForLateState =
    leavePhase === "late" ||
    leavePhase === "missed" ||
    (lastRenderedNext && isLeaveAcknowledged(lastRenderedNext));

  if (
    !leaveHintEl ||
    !leaveBufferEditBtn ||
    !journeyUsesLeaveBefore(journey) ||
    hasSeenLeaveHint() ||
    hideForLateState ||
    heroEl?.classList.contains("hero-setup") ||
    leaveCardEl?.hidden
  ) {
    if (leaveHintEl) {
      leaveHintEl.hidden = true;
    }
  } else {
    leaveHintEl.hidden = false;
  }

  updateLeaveBufferEditBtn();
}

function dismissSwipeHint() {
  localStorage.setItem(SWIPE_HINT_KEY, "1");
  if (swipeHintEl) {
    swipeHintEl.hidden = true;
  }
}

function updateSwipeCues() {
  const showPrev = canSkipToEarlierTrain() && !heroEl?.classList.contains("hero-setup");
  const showNext = canSkipToNextTrain() && !heroEl?.classList.contains("hero-setup");

  if (heroSwipePrevEl) {
    heroSwipePrevEl.hidden = !showPrev;
  }
  if (heroSwipeNextEl) {
    heroSwipeNextEl.hidden = !showNext;
  }
}

function updateSwipeHint() {
  if (!swipeHintEl || hasSeenSwipeHint() || heroEl?.classList.contains("hero-setup")) {
    if (swipeHintEl) {
      swipeHintEl.hidden = true;
    }
  } else if (swipeHintEl) {
    swipeHintEl.hidden = false;
  }

  updateSwipeCues();
}

function initHeroSwipe() {
  if (!heroEl) {
    return;
  }

  heroEl.addEventListener(
    "pointerdown",
    (event) => {
      if (heroEl.classList.contains("hero-setup")) {
        return;
      }
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
    },
    { passive: true }
  );

  heroEl.addEventListener("pointerup", (event) => {
    if (heroEl.classList.contains("hero-setup")) {
      return;
    }

    const deltaX = event.clientX - swipeStartX;
    const deltaY = event.clientY - swipeStartY;

    if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL_PX || Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return;
    }

    dismissSwipeHint();

    if (deltaX < 0) {
      skipToNextTrain();
    } else {
      skipToEarlierTrain();
    }
  });
}

function render(data, { stale = false } = {}) {
  lastLiveDisplayMinute = getPerthMinutesSinceMidnight();

  if (!stale) {
    errorEl.hidden = true;
  }
  clearHeroSetupState();
  heroEl?.classList.toggle("stale", stale);
  leaveCardEl?.classList.toggle("stale", stale);

  const { next, lastUpdated } = data;
  const journey = getActiveJourney();
  routeEl.textContent = journey ? formatJourneyRoute(journey) : "Set up your commute";
  updatedEl.textContent = stale
    ? "Update failed — times may be out of date"
    : lastUpdated
      ? `Updated ${lastUpdated}`
      : "Updated just now";

  if (!next) {
    lastRenderedNext = null;
    heroEl.className = "hero calm";
    if (heroDepartLabelEl) {
      heroDepartLabelEl.textContent = "Train departs in";
    }
    if (departCountdownEl) {
      departCountdownEl.textContent = "—";
    }
    if (departDisplayTimeEl) {
      departDisplayTimeEl.textContent = "No upcoming trains";
    }
    if (heroScheduledTimeEl) {
      heroScheduledTimeEl.hidden = true;
    }
    if (leaveCardEl) {
      leaveCardEl.hidden = true;
    }
    if (leaveAckBtn) {
      leaveAckBtn.hidden = true;
    }
    platformEl.textContent = "—";
    statusEl.textContent = "—";
    followingSectionEl.hidden = true;
    updateSwipeHint();
    updateSwipeCues();
    updateLeaveHint();
    renderJourneySwitcher();
    return;
  }

  lastRenderedNext = next;
  const live = getLiveTiming(next);

  heroEl.className = "hero calm";
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = "Train departs in";
  }
  if (departCountdownEl) {
    departCountdownEl.textContent = formatDepartureCountdown(next);
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = next.displayTime;
  }

  const scheduledLine = formatScheduledLine(next);
  if (heroScheduledTimeEl) {
    if (scheduledLine) {
      heroScheduledTimeEl.textContent = scheduledLine;
      heroScheduledTimeEl.hidden = false;
    } else {
      heroScheduledTimeEl.hidden = true;
    }
  }

  const leaveAcknowledged = isLeaveAcknowledged(next);
  const showLeaveCard = journeyUsesLeaveBefore(journey);
  const showLateNag =
    showLeaveCard &&
    !leaveAcknowledged &&
    (live.leavePhase === "late" || live.leavePhase === "missed");

  if (leaveCardEl) {
    leaveCardEl.hidden = !showLeaveCard || leaveAcknowledged;
    leaveCardEl.classList.remove("leave-card--acknowledged");
  }

  if (showLeaveCard && !leaveAcknowledged) {
    if (leaveCardLabelEl) {
      leaveCardLabelEl.textContent = formatLeaveCardLabel(live.leavePhase);
    }
    if (leaveTimeEl) {
      leaveTimeEl.textContent = formatTime(next.leaveBy);
    }
    if (leaveCountdownEl) {
      leaveCountdownEl.textContent = formatLeaveMessage(next);
    }
    updateLeaveCardState(live.leavePhase);
  }

  if (leaveAckBtn) {
    leaveAckBtn.hidden = !showLateNag;
    leaveAckBtn.classList.toggle("leave-ack-btn--visible", showLateNag);
  }

  if (showLateNag) {
    maybeAutoAcknowledgeLeave(next);
  }

  platformEl.textContent = next.platform;
  renderStatusDisplay(next);

  renderThenTrains(lastApiData ?? data);

  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  renderJourneySwitcher();
}

function renderRefreshErrorState() {
  clearHeroSetupState();
  heroEl?.classList.remove("stale");
  leaveCardEl?.classList.remove("stale");

  const journey = getActiveJourney();
  routeEl.textContent = journey ? formatJourneyRoute(journey) : "Set up your commute";
  updatedEl.textContent = "Update failed";
  heroEl.className = "hero calm";
  if (heroDepartLabelEl) {
    heroDepartLabelEl.textContent = "Train departs in";
  }
  if (departCountdownEl) {
    departCountdownEl.textContent = "—";
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.textContent = "Couldn't refresh times";
  }
  if (heroScheduledTimeEl) {
    heroScheduledTimeEl.hidden = true;
  }
  if (leaveCardEl) {
    leaveCardEl.hidden = true;
  }
  platformEl.textContent = "—";
  statusEl.textContent = "—";
  followingSectionEl.hidden = true;
  updateSwipeHint();
  updateSwipeCues();
  updateLeaveHint();
  renderJourneySwitcher();
}

function clearHeroSetupState() {
  if (!heroEl) {
    return;
  }

  heroEl.classList.remove("hero-setup");
  heroEl.removeAttribute("role");
  heroEl.removeAttribute("tabindex");
  heroEl.removeAttribute("aria-label");
  heroEl.onclick = null;
  heroEl.onkeydown = null;

  if (heroDepartLabelEl) {
    heroDepartLabelEl.hidden = false;
  }
  if (departCountdownEl) {
    departCountdownEl.hidden = false;
    departCountdownEl.classList.remove("hero-setup-message");
    departCountdownEl.textContent = "—";
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.hidden = false;
  }
  if (heroScheduledTimeEl) {
    heroScheduledTimeEl.hidden = false;
  }
  if (leaveCardEl) {
    leaveCardEl.hidden = false;
  }
  if (updatedEl) {
    updatedEl.hidden = false;
  }
}

function openSetupFromHero() {
  openSettings(true);
}

function renderSetupCountdownMessage() {
  if (!departCountdownEl) {
    return;
  }

  departCountdownEl.classList.add("hero-setup-message");
  departCountdownEl.replaceChildren();

  const headerIcon = settingsBtn?.querySelector(".settings-icon");
  if (headerIcon) {
    const iconWrap = document.createElement("span");
    iconWrap.className = "setup-settings-icon setup-settings-icon-large";
    iconWrap.appendChild(headerIcon.cloneNode(true));
    departCountdownEl.appendChild(iconWrap);
  }

  const text = document.createElement("span");
  text.className = "hero-setup-text";
  text.textContent = "Tap to get started";
  departCountdownEl.appendChild(text);
}

function renderSetupRequired() {
  errorEl.hidden = true;
  routeEl.textContent = "Set up your commute";
  updatedEl.textContent = "";
  updatedEl.hidden = true;
  heroEl.className = "hero calm hero-setup";
  if (heroDepartLabelEl) {
    heroDepartLabelEl.hidden = true;
  }
  if (departDisplayTimeEl) {
    departDisplayTimeEl.hidden = true;
  }
  if (heroScheduledTimeEl) {
    heroScheduledTimeEl.hidden = true;
  }
  if (leaveCardEl) {
    leaveCardEl.hidden = true;
  }
  renderSetupCountdownMessage();
  heroEl.setAttribute("role", "button");
  heroEl.setAttribute("tabindex", "0");
  heroEl.setAttribute("aria-label", "Set up your first journey");
  heroEl.onclick = openSetupFromHero;
  heroEl.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSetupFromHero();
    }
  };
  platformEl.textContent = "—";
  statusEl.textContent = "—";
  followingSectionEl.hidden = true;
  if (journeySwitcherEl) {
    journeySwitcherEl.hidden = true;
  }
  if (journeySwitcherMenuEl) {
    journeySwitcherMenuEl.hidden = true;
  }
  updateSwipeHint();
  updateLeaveHint();
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function loadStationCoords() {
  if (stationCoords) {
    return stationCoords;
  }

  const response = await fetch("/station-coords.json");
  stationCoords = await response.json();
  return stationCoords;
}

async function pickPerthDirection(station) {
  const directions = await fetchDirectionsFromApi(station);
  const exact = directions.find(
    (direction) => normalizeDirection(direction) === DEFAULT_DIRECTION_LABEL
  );
  if (exact) {
    return normalizeDirection(exact);
  }

  const loose = directions.find((direction) =>
    normalizeDirection(direction).toLowerCase().includes("perth")
  );
  return loose ? normalizeDirection(loose) : null;
}

function isOutboundCommuteJourney(journey) {
  const name = String(journey?.name || "")
    .trim()
    .toLowerCase();
  return name.endsWith(" - out") || name === "to home";
}

async function pickOutboundDirection(nearestStation) {
  const normalizedNearest = normalizeStation(nearestStation);

  if (!PERTH_STATIONS.has(normalizedNearest)) {
    const fromSuburb = await fetchDirectionsFromApi(normalizedNearest);
    const suburbanOutbound = dedupeDirections(fromSuburb)
      .map(normalizeDirection)
      .find(
        (direction) =>
          direction !== DEFAULT_DIRECTION_LABEL &&
          !direction.toLowerCase().includes("perth")
      );
    if (suburbanOutbound) {
      return suburbanOutbound;
    }
  }

  const fromPerth = await fetchDirectionsFromApi(CANONICAL_PERTH_STATION);
  return (
    dedupeDirections(fromPerth)
      .map(normalizeDirection)
      .find(
        (direction) =>
          direction !== DEFAULT_DIRECTION_LABEL &&
          !direction.toLowerCase().includes("perth")
      ) ?? null
  );
}

async function configureInboundJourney(journey, nearestStation) {
  const station = normalizeStation(nearestStation);
  if (PERTH_STATIONS.has(station)) {
    return null;
  }

  const direction = await pickPerthDirection(station);
  if (!direction) {
    return null;
  }

  return normalizeJourney({
    ...journey,
    station,
    direction,
  });
}

async function configureOutboundFromInbound(journey, inboundJourney) {
  if (!inboundJourney?.station || !inboundJourney?.direction) {
    return null;
  }

  const inboundStation = normalizeStation(inboundJourney.station);
  if (PERTH_STATIONS.has(inboundStation)) {
    return null;
  }

  const fromSuburb = await fetchDirectionsFromApi(inboundStation);
  const lineDirection = dedupeDirections(fromSuburb)
    .map(normalizeDirection)
    .find(
      (direction) =>
        direction.toLowerCase() !== inboundJourney.direction.toLowerCase() &&
        !direction.toLowerCase().includes("perth")
    );

  if (!lineDirection) {
    return null;
  }

  return normalizeJourney({
    ...journey,
    station: CANONICAL_PERTH_STATION,
    direction: lineDirection,
  });
}

async function configureOutboundJourney(journey, nearestStation, inboundJourney = null) {
  const fromInbound = await configureOutboundFromInbound(journey, inboundJourney);
  if (fromInbound) {
    return fromInbound;
  }

  const direction = await pickOutboundDirection(nearestStation);
  if (!direction) {
    return null;
  }

  return normalizeJourney({
    ...journey,
    station: CANONICAL_PERTH_STATION,
    direction,
  });
}

async function tryApplyNearestStationDefaults() {
  if (!settings.journeys.some(isUnconfiguredJourney)) {
    return hasConfiguredCommute();
  }

  await getStationsList();

  let station;
  try {
    ({ station } = await findNearestStation());
  } catch {
    return false;
  }

  const journeys = [...settings.journeys];
  let inboundJourney =
    journeys.find((journey) => !isUnconfiguredJourney(journey) && !isOutboundCommuteJourney(journey)) ??
    null;

  for (let index = 0; index < journeys.length; index += 1) {
    const journey = journeys[index];
    if (!isUnconfiguredJourney(journey) || isOutboundCommuteJourney(journey)) {
      continue;
    }

    const configured = (await configureInboundJourney(journey, station)) ?? journey;
    journeys[index] = configured;
    if (!isUnconfiguredJourney(configured)) {
      inboundJourney = configured;
    }
  }

  for (let index = 0; index < journeys.length; index += 1) {
    const journey = journeys[index];
    if (!isUnconfiguredJourney(journey) || !isOutboundCommuteJourney(journey)) {
      continue;
    }

    journeys[index] =
      (await configureOutboundJourney(journey, station, inboundJourney)) ?? journey;
  }

  persistSettings({
    journeys,
    activeJourneyId: settings.activeJourneyId ?? journeys[0]?.id ?? null,
  });

  return hasConfiguredCommute();
}

async function findNearestStation() {
  const coords = await loadStationCoords();
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
  });

  const { latitude, longitude } = position.coords;
  let nearest = null;
  let bestDistance = Infinity;

  for (const [name, point] of Object.entries(coords)) {
    const distance = distanceKm(latitude, longitude, point.lat, point.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = name;
    }
  }

  if (!nearest) {
    throw new Error("Could not find a nearby station");
  }

  return { station: nearest, distanceKm: bestDistance };
}

async function fetchNextTrainFromLiveTimesClient() {
  const client = window.NextTrainTimes;
  if (!client?.getNextTrainData) {
    return null;
  }

  const journey = getActiveJourney();
  if (!journey?.station || !journey?.direction) {
    return null;
  }

  try {
    return await client.getNextTrainData({
      station: journey.station,
      destination: journey.direction,
      destinationLabel: journey.direction,
      leaveBeforeMinutes: getEffectiveLeaveBeforeMinutes(journey),
      refreshSeconds: settings.refreshSeconds,
      skipTrains: 0,
    });
  } catch (error) {
    console.warn("Live times client fallback failed", error);
    return null;
  }
}

async function resolveNextTrainPayload(apiData) {
  if (Array.isArray(apiData?.upcoming) && apiData.upcoming.length > 0) {
    return apiData;
  }

  const clientData = await fetchNextTrainFromLiveTimesClient();
  return clientData ?? apiData;
}

async function fetchNextTrain() {
  if (!hasConfiguredCommute()) {
    renderSetupRequired();
    return;
  }

  clearHeroSetupState();
  maybeAutoSelectJourney();

  try {
    const result = await fetchJson(apiUrl(`/api/next-train?${buildApiParams()}`));

    if (!result.ok) {
      throw new Error(result.data?.error ?? result.error ?? "Could not load train times");
    }

    const payload = await resolveNextTrainPayload(result.data);
    lastApiData = normalizeApiTrainData(payload);
    render(prepareDisplayData(lastApiData));
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.hidden = false;

    if (lastApiData?.next) {
      render(prepareDisplayData(lastApiData), { stale: true });
    } else {
      renderRefreshErrorState();
    }
  }
}

function refreshLiveDisplay(force = false) {
  if (!lastApiData) {
    return;
  }

  const minute = getPerthMinutesSinceMidnight();
  if (!force && minute === lastLiveDisplayMinute) {
    return;
  }

  lastLiveDisplayMinute = minute;
  render(prepareDisplayData(lastApiData));
}

function scheduleLiveDisplayRefresh() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  lastLiveDisplayMinute = getPerthMinutesSinceMidnight();
  countdownTimer = setInterval(() => refreshLiveDisplay(), 1000);
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(fetchNextTrain, refreshSeconds * 1000);
  scheduleLiveDisplayRefresh();
}

async function getStationsList() {
  if (stationsCache) {
    return stationsCache;
  }

  const response = await fetch("/stations.json");
  stationsCache = collapseStationList(await response.json());
  return stationsCache;
}

function renderStationOptions(selectEl, selectedStation) {
  const stations = stationsCache ?? [];
  const parts = [
    `<option value="" disabled${selectedStation ? "" : " selected"}>Choose station…</option>`,
  ];

  for (const name of stations) {
    const label = formatStationLabel(name);
    const selected = name === selectedStation ? " selected" : "";
    parts.push(`<option value="${name}"${selected}>${label}</option>`);
  }

  selectEl.innerHTML = parts.join("");
}

async function fetchDirectionsFromApi(station) {
  const query = appendFixtureQuery(`station=${encodeURIComponent(station)}`);
  const primary = await fetchJson(apiUrl(`/api/directions?${query}`));

  if (primary.ok && Array.isArray(primary.data.directions)) {
    return primary.data.directions;
  }

  const fallback = await fetchJson(apiUrl(`/api/destinations?${query}`));
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

async function loadDirectionsForSelect(selectEl, station, preferredDirection) {
  const requestId = ++directionsRequestId;

  if (!station) {
    selectEl.innerHTML = '<option value="">Choose station first</option>';
    selectEl.disabled = true;
    return;
  }

  selectEl.innerHTML = "<option value=\"\">Loading…</option>";
  selectEl.disabled = true;

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
    selectEl.innerHTML = directions
      .map((dir) => `<option value="${dir}">${dir}</option>`)
      .join("");

    const normalizedPreferred = normalizeDirection(preferredDirection);
    if (normalizedPreferred && directions.includes(normalizedPreferred)) {
      selectEl.value = normalizedPreferred;
    }
  } catch (error) {
    if (requestId !== directionsRequestId) {
      return;
    }
    selectEl.innerHTML = `<option value="">${error.message}</option>`;
  }

  if (requestId === directionsRequestId) {
    selectEl.disabled = false;
  }
}

function showSettingsListView() {
  settingsListView.hidden = false;
  settingsDetailView.hidden = true;
  editingJourneyId = null;
  editingJourneySnapshot = null;
}

function showSettingsDetailView() {
  settingsListView.hidden = true;
  settingsDetailView.hidden = false;
}

function cancelJourneyDetailEdit() {
  if (settingsDraftJourneys.length === 0) {
    reloadSettingsDraftFromStorage();
  }

  if (editingJourneyId && editingJourneySnapshot) {
    const index = settingsDraftJourneys.findIndex((journey) => journey.id === editingJourneyId);
    if (index >= 0) {
      settingsDraftJourneys[index] = editingJourneySnapshot;
    } else {
      settingsDraftJourneys.push(editingJourneySnapshot);
    }
  }

  editingJourneySnapshot = null;
  editingJourneyId = null;
  renderJourneyListView();
  showSettingsListView();
}

function commitActiveJourneyNameEdit() {
  if (!activeJourneyNameEdit) {
    return;
  }

  const session = activeJourneyNameEdit;
  activeJourneyNameEdit = null;
  session.finish();
}

function startJourneyNameEdit(nameEl, journey, openBtn, renameBtn) {
  commitActiveJourneyNameEdit();

  if (nameEl.dataset.editing === "true") {
    return;
  }

  nameEl.dataset.editing = "true";
  if (openBtn) {
    openBtn.disabled = true;
  }
  if (renameBtn) {
    renameBtn.disabled = true;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "journey-list-name-input";
  input.maxLength = 24;
  input.value = journey.name;
  input.setAttribute("aria-label", "Journey name");

  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;

    if (activeJourneyNameEdit?.input === input) {
      activeJourneyNameEdit = null;
    }

    journey.name = input.value.trim() || journey.name;
    nameEl.textContent = journey.name;
    nameEl.dataset.editing = "false";
    if (openBtn) {
      openBtn.disabled = false;
    }
    if (renameBtn) {
      renameBtn.disabled = false;
    }
    if (input.isConnected) {
      input.remove();
    }
    nameEl.hidden = false;
    saveJourneyListToSettings();
  };

  activeJourneyNameEdit = { input, finish };

  nameEl.hidden = true;
  nameEl.parentNode.insertBefore(input, nameEl.nextSibling);
  input.focus();
  input.select();

  input.addEventListener("blur", finish, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      input.value = journey.name;
      input.blur();
    }
  });
}

function renderJourneyListView() {
  journeyListEl.innerHTML = "";

  for (const journey of settingsDraftJourneys) {
    const item = document.createElement("li");
    item.className = "journey-list-item";
    item.dataset.journeyId = journey.id;

    const card = document.createElement("div");
    card.className = "journey-list-card";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "journey-list-open-btn";
    openBtn.setAttribute("aria-label", `Edit ${journey.name}`);

    const textStack = document.createElement("span");
    textStack.className = "journey-list-text";

    const nameEl = document.createElement("span");
    nameEl.className = "journey-list-name";
    nameEl.textContent = journey.name;

    const route = document.createElement("span");
    route.className = "journey-list-route";
    if (!journey.station || !journey.direction) {
      route.classList.add("journey-list-route--empty");
    }
    route.textContent = formatJourneyRoute(journey);

    const chevron = document.createElement("span");
    chevron.className = "journey-list-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "journey-list-rename-btn";
    renameBtn.setAttribute("aria-label", `Rename ${journey.name}`);
    renameBtn.textContent = "Rename";

    textStack.append(nameEl, route);
    openBtn.append(textStack, chevron);
    openBtn.addEventListener("click", () => {
      openJourneyDetail(journey.id);
    });

    renameBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startJourneyNameEdit(nameEl, journey, openBtn, renameBtn);
    });

    card.append(openBtn, renameBtn);
    item.appendChild(card);
    journeyListEl.appendChild(item);
  }

  if (addJourneyBtn) {
    addJourneyBtn.hidden = settingsDraftJourneys.length >= 6;
  }
}

async function populateJourneyListView() {
  await getStationsList();
  settingsDraftJourneys = resolveInitialJourneys(
    settings.journeys.length ? settings.journeys : []
  ).map((journey) => ({ ...journey }));
  renderJourneyListView();
}

async function populateJourneyDetailForm(journeyId) {
  await getStationsList();
  const journey =
    settingsDraftJourneys.find((entry) => entry.id === journeyId) ??
    getJourneyById(journeyId);

  if (!journey) {
    return;
  }

  editingJourneyId = journey.id;
  editingJourneySnapshot = normalizeJourney({ ...journey });
  if (detailJourneyHeadingEl) {
    detailJourneyHeadingEl.textContent = journey.name;
  }
  detailLeaveBeforeInput.value = journey.leaveBeforeMinutes;
  if (detailUseLeaveBeforeInput) {
    detailUseLeaveBeforeInput.checked = journeyUsesLeaveBefore(journey);
  }
  syncLeaveBeforeControlsState();
  updateLeaveBeforeLabel(journey.leaveBeforeMinutes);
  setOptionalTimeField(
    detailDefaultFromInput,
    detailDefaultFromDisplay,
    detailDefaultFromField,
    detailDefaultFromClear,
    journey.defaultFrom
  );
  setOptionalTimeField(
    detailDefaultUntilInput,
    detailDefaultUntilDisplay,
    detailDefaultUntilField,
    detailDefaultUntilClear,
    journey.defaultUntil
  );
  detailNearestHint.hidden = true;

  renderStationOptions(detailStationSelect, journey.station);
  if (journey.station) {
    detailStationSelect.value = journey.station;
  }
  await loadDirectionsForSelect(detailDirectionSelect, journey.station, journey.direction);

  if (deleteJourneyBtn) {
    deleteJourneyBtn.hidden = settingsDraftJourneys.length <= 1;
  }
}

function countConfiguredJourneys(journeys) {
  return journeys.filter((journey) => !isUnconfiguredJourney(journey)).length;
}

function reloadSettingsDraftFromStorage() {
  if (settings.journeys.length === 0) {
    return;
  }

  settingsDraftJourneys = resolveInitialJourneys(settings.journeys).map((journey) => ({
    ...normalizeJourney(journey),
  }));
}

function saveJourneyListToSettings() {
  const persistedConfiguredCount = countConfiguredJourneys(settings.journeys);

  if (settingsDraftJourneys.length === 0 && persistedConfiguredCount > 0) {
    return;
  }

  const draftConfiguredCount = countConfiguredJourneys(settingsDraftJourneys);
  if (persistedConfiguredCount > 0 && draftConfiguredCount < persistedConfiguredCount) {
    return;
  }

  let activeJourneyId = settings.activeJourneyId;
  const journeys = settingsDraftJourneys.map((draft) => {
    const existing = getJourneyById(draft.id);
    return normalizeJourney({
      ...existing,
      ...draft,
      station: draft.station || existing?.station || "",
      direction: draft.direction || existing?.direction || "",
    });
  });
  if (!journeys.some((journey) => journey.id === activeJourneyId)) {
    activeJourneyId = journeys[0]?.id ?? null;
  }
  persistSettings({ journeys, activeJourneyId });
}

function saveJourneyDetailFromForm() {
  if (!editingJourneyId) {
    return;
  }

  const station = detailStationSelect.value;
  const direction = normalizeDirection(detailDirectionSelect.value);
  if (!station || !direction) {
    throw new Error("Choose a departure station and direction");
  }

  const defaultFrom = readOptionalTimeField(detailDefaultFromField);
  const defaultUntil = readOptionalTimeField(detailDefaultUntilField);
  if (Boolean(defaultFrom) !== Boolean(defaultUntil)) {
    throw new Error("Set both default from and until times, or leave both blank.");
  }

  const existing = settingsDraftJourneys.find((entry) => entry.id === editingJourneyId);
  const updated = normalizeJourney({
    id: editingJourneyId,
    name: existing?.name || "Journey",
    station,
    direction,
    leaveBeforeMinutes: Number(detailLeaveBeforeInput.value),
    useLeaveBefore: detailUseLeaveBeforeInput?.checked ?? true,
    defaultFrom,
    defaultUntil,
  });

  const conflict = findJourneyDefaultWindowConflict(updated, settingsDraftJourneys);
  if (conflict) {
    throw new Error(
      `Default times overlap with "${conflict.name}" (${formatJourneyDefaultWindow(conflict)}). Adjust the times so only one journey is the default at any moment.`
    );
  }

  const index = settingsDraftJourneys.findIndex((journey) => journey.id === editingJourneyId);
  if (index >= 0) {
    settingsDraftJourneys[index] = updated;
  } else {
    settingsDraftJourneys.push(updated);
  }

  let activeJourneyId = settings.activeJourneyId;
  if (!settingsDraftJourneys.some((journey) => journey.id === activeJourneyId)) {
    activeJourneyId = settingsDraftJourneys[0]?.id ?? null;
  }

  persistSettings({ journeys: settingsDraftJourneys.map((journey) => normalizeJourney(journey)), activeJourneyId });
  editingJourneySnapshot = null;
}

function closeSettingsDialog() {
  commitActiveJourneyNameEdit();

  if (!settingsDetailView.hidden) {
    cancelJourneyDetailEdit();
  } else {
    if (settingsDraftJourneys.length === 0) {
      reloadSettingsDraftFromStorage();
    }
    showSettingsListView();
  }

  saveJourneyListToSettings();

  const configured = hasConfiguredCommute();
  if (configured) {
    clearHeroSetupState();
    const journey = getActiveJourney();
    if (journey && routeEl) {
      routeEl.textContent = formatJourneyRoute(journey);
    }
    if (updatedEl) {
      updatedEl.textContent = "Updating…";
      updatedEl.hidden = false;
    }
  }

  if (settingsDialog?.open) {
    settingsDialog.close();
  }
  settingsDialog?.removeAttribute("open");

  if (!configured) {
    renderSetupRequired();
    return;
  }

  fetchNextTrain();
}

function clearAllAppData() {
  const localKeysToRemove = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key?.startsWith("nextTrain") &&
      key !== "nextTrainAdConsent" &&
      key !== "nextTrainAdsLoaded"
    ) {
      localKeysToRemove.push(key);
    }
  }

  for (const key of localKeysToRemove) {
    localStorage.removeItem(key);
  }

  sessionStorage.clear();

  settings = createDefaultStore();
  refreshSeconds = settings.refreshSeconds ?? DEFAULT_SETTINGS.refreshSeconds;
  settingsDraftJourneys = settings.journeys.map((journey) => normalizeJourney(journey));
  editingJourneyId = null;
  skipTrains = 0;
  lastApiData = null;
  lastRenderedNext = null;
  leaveAutoCheckDeparture = null;

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  renderJourneyListView();
  renderSetupRequired();
  renderJourneySwitcher();
}

function handleClearAllData() {
  const confirmed = confirm(
    "Clear all journeys and reset the app to defaults? This cannot be undone."
  );
  if (!confirmed) {
    return;
  }

  clearAllAppData();

  if (settingsDialog?.open) {
    showSettingsListView();
  }
}

function openSettings(isFirstSetup = false) {
  dismissLeaveHint();
  populateJourneyListView().then(() => {
    showSettingsListView();
    settingsDialog.showModal();
  });
}

function openJourneyDetail(journeyId) {
  ensureSettingsDraftLoaded().then(() => {
    return populateJourneyDetailForm(journeyId);
  }).then(() => {
    showSettingsDetailView();
    if (!settingsDialog.open) {
      settingsDialog.showModal();
    }
  });
}

settingsBtn.addEventListener("click", () => openSettings(false));
helpBtn?.addEventListener("click", () => {
  helpDialog?.showModal();
});
helpCloseBtn?.addEventListener("click", () => {
  helpDialog?.close();
});
helpDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  helpDialog?.close();
});
helpDialog?.addEventListener("click", (event) => {
  if (event.target === helpDialog) {
    helpDialog.close();
  }
});
leaveAckBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (lastRenderedNext) {
    acknowledgeLeave(lastRenderedNext);
  }
});
leaveBufferEditBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openLeaveBufferSettings();
});
settingsCancel?.addEventListener("click", (event) => {
  event.preventDefault();
  closeSettingsDialog();
});
settingsDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeSettingsDialog();
});
settingsDialog?.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    closeSettingsDialog();
  }
});

settingsBackBtn?.addEventListener("click", () => {
  cancelJourneyDetailEdit();
});

detailCancelBtn?.addEventListener("click", () => {
  cancelJourneyDetailEdit();
});

addJourneyBtn?.addEventListener("click", () => {
  const journey = createDefaultJourney({
    name: `Journey ${settingsDraftJourneys.length + 1}`,
  });
  settingsDraftJourneys.push(journey);
  saveJourneyListToSettings();
  openJourneyDetail(journey.id);
});

clearAllDataBtn?.addEventListener("click", handleClearAllData);

deleteJourneyBtn?.addEventListener("click", () => {
  if (!editingJourneyId || settingsDraftJourneys.length <= 1) {
    return;
  }

  settingsDraftJourneys = settingsDraftJourneys.filter((journey) => journey.id !== editingJourneyId);
  editingJourneySnapshot = null;
  editingJourneyId = null;
  saveJourneyListToSettings();
  renderJourneyListView();
  showSettingsListView();
});

detailLeaveBeforeInput?.addEventListener("input", () => {
  updateLeaveBeforeLabel();
});

detailUseLeaveBeforeInput?.addEventListener("change", () => {
  syncLeaveBeforeControlsState();
});

bindOptionalTimeField(
  detailDefaultFromInput,
  detailDefaultFromDisplay,
  detailDefaultFromField,
  detailDefaultFromClear
);
bindOptionalTimeField(
  detailDefaultUntilInput,
  detailDefaultUntilDisplay,
  detailDefaultUntilField,
  detailDefaultUntilClear
);

detailStationSelect?.addEventListener("change", () => {
  loadDirectionsForSelect(detailDirectionSelect, detailStationSelect.value);
});

detailNearestBtn?.addEventListener("click", async () => {
  detailNearestHint.hidden = false;
  detailNearestHint.textContent = "Finding nearest station…";

  try {
    const { station, distanceKm: km } = await findNearestStation();
    detailStationSelect.value = station;
    detailNearestHint.textContent = `Selected ${formatStationLabel(station)} (${km.toFixed(1)} km away)`;
    await loadDirectionsForSelect(detailDirectionSelect, station);
  } catch (error) {
    detailNearestHint.textContent =
      error.code === 1
        ? "Location permission denied. Pick your station from the list."
        : "Could not use location. Pick your station from the list.";
  }
});

settingsDetailView?.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    saveJourneyDetailFromForm();
  } catch (error) {
    alert(error.message);
    return;
  }

  closeSettingsDialog();
});

journeySwitcherEl?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleJourneySwitcherMenu();
});

journeySwitcherMenuEl?.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  closeJourneySwitcherMenu();
});

async function init() {
  applyTestQueryParams();
  initHeroSwipe();

  const urlSettings = readUrlSettings();
  if (urlSettings) {
    persistSettings(urlSettings);
  } else {
    settings = readStoredSettings();
    refreshSeconds = settings.refreshSeconds ?? DEFAULT_SETTINGS.refreshSeconds;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  if (!isTestMode() && settings.journeys.some(isUnconfiguredJourney)) {
    await tryApplyNearestStationDefaults();
  }

  if (!hasConfiguredCommute()) {
    renderSetupRequired();
    return;
  }

  clearHeroSetupState();
  maybeAutoSelectJourney();
  skipTrains = readSkipState().count;
  renderJourneySwitcher();
  scheduleRefresh();
  fetchNextTrain();
}

init();

window.nextTrainApp = {
  migrateSettings,
  getActiveLegCommute() {
    return getActiveJourney();
  },
  getEffectiveLeaveBeforeMinutes(journey = getActiveJourney()) {
    return getEffectiveLeaveBeforeMinutes(journey);
  },
  refreshDisplay() {
    if (lastApiData) {
      render(prepareDisplayData(lastApiData));
    }
  },
};

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    maybeAutoSelectJourney();
    skipTrains = readSkipState().count;
    refreshLiveDisplay(true);
    fetchNextTrain();
  }
});
