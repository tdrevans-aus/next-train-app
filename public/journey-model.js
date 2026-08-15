(function (global) {
  const SETTINGS_KEY = "nextTrainSettings";
  const DEFAULT_SETTINGS = {
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
  };
  const DEFAULT_REMIND_DAYS = [1, 2, 3, 4, 5];
  const JOURNEY_KIND_ROUTE = "route";
  const JOURNEY_KIND_COMMUTE = "commute";
  const COMMUTE_TEMPLATE_KEYS = new Set(["morning", "evening"]);
  /** FB-23: one-time journey reset + route vs commute schema. */
  const SETTINGS_SCHEMA_VERSION = 2;
  const COMMUTE_UPGRADE_DEFAULTS = {
    templateKey: "morning",
    defaultFrom: "06:00",
    defaultUntil: "09:00",
    preferredTrainTime: "07:30",
    remindDays: [...DEFAULT_REMIND_DAYS],
    remindMe: true,
  };

  let deps = {};

  function init(nextDeps = {}) {
    deps = nextDeps;
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
    preferredTrainTime: "",
    remindDays: [...DEFAULT_REMIND_DAYS],
    remindMe: false,
    ...overrides,
  };
}

function createDefaultStore() {
  return {
    settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
    refreshSeconds: DEFAULT_SETTINGS.refreshSeconds,
    activeJourneyId: null,
    journeys: [],
    nearbyLeaveBeforeMinutes: DEFAULT_SETTINGS.leaveBeforeMinutes,
    nearbyPin: null,
  };
}

function stripCommuteFieldsForRoute(journey) {
  journey.defaultFrom = "";
  journey.defaultUntil = "";
  journey.preferredTrainTime = "";
  journey.remindMe = false;
  journey.journeyPinOverrideIso = "";
  journey.journeyPinOverrideDate = "";
  journey.journeyPinDismissedDate = "";
  delete journey.templateKey;
  return journey;
}

function upgradeRouteToCommute(raw = {}) {
  const name = String(raw.name || "Morning into town").trim() || "Morning into town";
  return normalizeJourney({
    id: raw.id,
    name,
    station: raw.station,
    direction: raw.direction,
    leaveBeforeMinutes: raw.leaveBeforeMinutes,
    useLeaveBefore: raw.useLeaveBefore,
    kind: JOURNEY_KIND_COMMUTE,
    ...COMMUTE_UPGRADE_DEFAULTS,
  });
}

function createRouteJourney(overrides = {}) {
  return normalizeJourney({
    name: "Route",
    kind: JOURNEY_KIND_ROUTE,
    ...overrides,
  });
}
function isUnconfiguredJourney(journey) {
  return !journey?.station || !journey?.direction;
}

function resolveInitialJourneys(rawJourneys = []) {
  return rawJourneys
    .map((journey) => normalizeJourney(journey))
    .filter((journey) => !isUnconfiguredJourney(journey));
}

function normalizeJourneyList(rawJourneys = []) {
  return rawJourneys.map((journey) => normalizeJourney(journey));
}
function isDefaultCommuteJourneyName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return normalized === "daily commute - in" || normalized === "daily commute - out";
}

function isLegacyBlankDefaultWindow(defaultFrom, defaultUntil) {
  return defaultFrom === "00:00" && (defaultUntil === "23:59" || defaultUntil === "24:00");
}

function normalizeRemindDays(raw) {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_REMIND_DAYS];
  }

  const days = raw.map((value) => Number(value)).filter((value) => value >= 1 && value <= 7);
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : [...DEFAULT_REMIND_DAYS];
}
function getPerthDayOfWeekIso(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Perth",
    weekday: "long",
  }).format(date);
  const map = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };
  return map[weekday] ?? 1;
}

function getJourneyRemindDays(journey) {
  return normalizeRemindDays(journey?.remindDays);
}
function journeyMatchesActiveDay(journey, dayOfWeek = getPerthDayOfWeekIso()) {
  return getJourneyRemindDays(journey).includes(dayOfWeek);
}

function journeyMatchesSchedule(
  journey,
  minutes = getPerthMinutesSinceMidnight(),
  dayOfWeek = getPerthDayOfWeekIso()
) {
  return journeyMatchesActiveDay(journey, dayOfWeek) && journeyMatchesTime(journey, minutes);
}

function journeyRemindMeEnabled(raw = {}) {
  if (typeof raw.remindMe === "boolean") {
    return raw.remindMe;
  }
  return Boolean(raw.preferredTrainTime);
}

function inferTemplateKey(raw = {}) {
  if (raw.templateKey) {
    return String(raw.templateKey);
  }

  for (const [key, preset] of Object.entries(deps.JOURNEY_TEMPLATE_PRESETS || {})) {
    if (raw.name === preset.name) {
      return key;
    }
  }

  return "";
}

function normalizeJourneyKind(rawKind) {
  const kind = String(rawKind || "").trim().toLowerCase();
  if (kind === JOURNEY_KIND_ROUTE || kind === JOURNEY_KIND_COMMUTE) {
    return kind;
  }
  return "";
}

function inferJourneyKind(raw = {}, context = {}) {
  const explicit = normalizeJourneyKind(raw.kind);
  if (explicit) {
    return explicit;
  }

  const templateKey = context.templateKey ?? inferTemplateKey(raw);
  if (templateKey && COMMUTE_TEMPLATE_KEYS.has(templateKey)) {
    return JOURNEY_KIND_COMMUTE;
  }

  const preferredTrainTime =
    context.preferredTrainTime === undefined || context.preferredTrainTime === null
      ? raw.preferredTrainTime === undefined || raw.preferredTrainTime === null
        ? ""
        : String(raw.preferredTrainTime)
      : String(context.preferredTrainTime);
  if (preferredTrainTime) {
    return JOURNEY_KIND_COMMUTE;
  }

  if (journeyRemindMeEnabled(raw)) {
    return JOURNEY_KIND_COMMUTE;
  }

  return JOURNEY_KIND_ROUTE;
}

function isCommuteJourney(journey) {
  return normalizeJourneyKind(journey?.kind) === JOURNEY_KIND_COMMUTE;
}

function isRouteJourney(journey) {
  return normalizeJourneyKind(journey?.kind) === JOURNEY_KIND_ROUTE;
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

  let preferredTrainTime =
    raw.preferredTrainTime === undefined || raw.preferredTrainTime === null
      ? ""
      : String(raw.preferredTrainTime);
  if (!preferredTrainTime && defaultFrom && journeyRemindMeEnabled(raw)) {
    preferredTrainTime = defaultFrom;
  }

  const templateKey = inferTemplateKey(raw);
  const today = getPerthLocalDateKey();
  let journeyPinOverrideIso =
    raw.journeyPinOverrideIso === undefined || raw.journeyPinOverrideIso === null
      ? ""
      : String(raw.journeyPinOverrideIso);
  let journeyPinOverrideDate =
    raw.journeyPinOverrideDate === undefined || raw.journeyPinOverrideDate === null
      ? ""
      : String(raw.journeyPinOverrideDate);
  if (journeyPinOverrideDate && journeyPinOverrideDate !== today) {
    journeyPinOverrideIso = "";
    journeyPinOverrideDate = "";
  }

  let journeyPinDismissedDate =
    raw.journeyPinDismissedDate === undefined || raw.journeyPinDismissedDate === null
      ? ""
      : String(raw.journeyPinDismissedDate);
  if (journeyPinDismissedDate && journeyPinDismissedDate !== today) {
    journeyPinDismissedDate = "";
  }

  const journey = {
    id: raw.id || createJourneyId(),
    name: String(raw.name || "Journey").trim() || "Journey",
    station: raw.station ? deps.normalizeStation(raw.station) : "",
    direction: raw.direction ? deps.normalizeDirection(raw.direction) : "",
    leaveBeforeMinutes:
      Number(raw.leaveBeforeMinutes) || DEFAULT_SETTINGS.leaveBeforeMinutes,
    useLeaveBefore: raw.useLeaveBefore !== false,
    defaultFrom,
    defaultUntil,
    preferredTrainTime,
    journeyPinOverrideIso,
    journeyPinOverrideDate,
    journeyPinDismissedDate,
    remindDays: normalizeRemindDays(raw.remindDays),
    remindMe: journeyRemindMeEnabled(raw),
    kind: inferJourneyKind(raw, { templateKey, preferredTrainTime }),
  };

  if (templateKey) {
    journey.templateKey = templateKey;
  }
  if (raw.autoRoute === false) {
    journey.autoRoute = false;
  }

  if (isRouteJourney(journey)) {
    stripCommuteFieldsForRoute(journey);
  }

  return journey;
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

function pickNearbySettingsFields(raw = {}) {
  const leaveBefore = Number(raw.nearbyLeaveBeforeMinutes);
  const nearbyLeaveBeforeMinutes =
    Number.isFinite(leaveBefore) && leaveBefore >= 1 && leaveBefore <= 30
      ? leaveBefore
      : DEFAULT_SETTINGS.leaveBeforeMinutes;

  let nearbyPin = raw.nearbyPin;
  if (nearbyPin && !isNearbyPinSettingsHolding(nearbyPin)) {
    nearbyPin = null;
  }

  return {
    nearbyLeaveBeforeMinutes,
    nearbyPin: nearbyPin || null,
  };
}

function isNearbyPinSettingsHolding(pin) {
  if (!pin?.departureIso) {
    return false;
  }
  const departureMs = Date.parse(pin.departureIso);
  if (!Number.isFinite(departureMs)) {
    return false;
  }
  const holdUntil =
    typeof pin.holdingUntilMs === "number" ? pin.holdingUntilMs : departureMs + deps.NEARBY_PIN_HOLD_MS;
  return Date.now() < holdUntil;
}
function migrateSettings(raw = {}) {
  const nearbyFields = pickNearbySettingsFields(raw);
  const priorVersion = Number(raw.settingsSchemaVersion) || 0;

  if (priorVersion < SETTINGS_SCHEMA_VERSION) {
    return {
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId: null,
      journeys: [],
      ...nearbyFields,
    };
  }

  if (Array.isArray(raw.journeys) && raw.journeys.length > 0) {
    const journeys = normalizeJourneyList(raw.journeys).filter(
      (journey) => !isUnconfiguredJourney(journey)
    );
    const activeJourneyId = journeys.some((journey) => journey.id === raw.activeJourneyId)
      ? raw.activeJourneyId
      : (journeys[0]?.id ?? null);

    return {
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId,
      journeys,
      ...nearbyFields,
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
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId,
      journeys,
      ...nearbyFields,
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
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId: journey?.id ?? null,
      journeys: journey ? [journey] : [],
      ...nearbyFields,
    };
  }

  return {
    settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
    refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
    activeJourneyId: null,
    journeys: [],
    ...nearbyFields,
  };
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
function hasDefaultWindow(journey) {
  return Boolean(journey?.defaultFrom && journey?.defaultUntil);
}

function parseTimeToMinutes(time) {
  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  return hour * 60 + (minute || 0);
}

function formatMinutesAsTime(totalMinutes) {
  const wrapped = ((Number(totalMinutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function addMinutesToTimeString(time, minutesToAdd) {
  if (!time) {
    return "";
  }
  return formatMinutesAsTime(parseTimeToMinutes(time) + minutesToAdd);
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
function getPerthLocalDateKey(date = new Date()) {
  const { year, month, day } = getPerthDateParts(date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

  function getConfiguredJourneys() {
    return deps.getSettings().journeys.filter((journey) => !isUnconfiguredJourney(journey));
  }

  function getJourneyById(id) {
    return deps.getSettings().journeys.find((journey) => journey.id === id) ?? null;
  }

  function getActiveJourney() {
    const configured = getConfiguredJourneys();
    if (!configured.length) {
      return null;
    }
    const active = getJourneyById(deps.getSettings().activeJourneyId);
    if (active?.station && active?.direction) {
      return active;
    }
    return configured[0];
  }

  function readStoredSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        return createDefaultStore();
      }
      const parsed = JSON.parse(raw);
      const migrated = migrateSettings(parsed);
      const resolved = {
        ...migrated,
        journeys: normalizeJourneyList(migrated.journeys),
      };
      if ((Number(parsed.settingsSchemaVersion) || 0) < SETTINGS_SCHEMA_VERSION) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(resolved));
      }
      if (resolved.journeys.length && !resolved.activeJourneyId) {
        resolved.activeJourneyId = resolved.journeys[0].id;
      }
      if (
        resolved.activeJourneyId &&
        !resolved.journeys.some((journey) => journey.id === resolved.activeJourneyId)
      ) {
        resolved.activeJourneyId = resolved.journeys[0]?.id ?? null;
      }
      if (!resolved.journeys.length) {
        resolved.activeJourneyId = null;
      }
      return resolved;
    } catch {
      return createDefaultStore();
    }
  }

  function persistSettings(next) {
    let settings = migrateSettings({ ...deps.getSettings(), ...next });
    settings.journeys = settings.journeys.map((journey) => normalizeJourney(journey));
    const configured = settings.journeys.filter((j) => !isUnconfiguredJourney(j));
    if (!configured.some((journey) => journey.id === settings.activeJourneyId)) {
      settings.activeJourneyId = configured[0]?.id ?? settings.journeys[0]?.id ?? null;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    deps.setSettings(settings);
    deps.onSettingsPersisted?.(settings);
    return settings;
  }

  const api = {
    init,
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    DEFAULT_REMIND_DAYS,
    SETTINGS_SCHEMA_VERSION,
    createJourneyId,
    createDefaultJourney,
    createDefaultStore,
    createRouteJourney,
    upgradeRouteToCommute,
    isUnconfiguredJourney,
    resolveInitialJourneys,
    normalizeJourneyList,
    normalizeRemindDays,
    getPerthDayOfWeekIso,
    getJourneyRemindDays,
    journeyMatchesActiveDay,
    journeyMatchesSchedule,
    journeyRemindMeEnabled,
    inferTemplateKey,
    inferJourneyKind,
    isCommuteJourney,
    isRouteJourney,
    JOURNEY_KIND_ROUTE,
    JOURNEY_KIND_COMMUTE,
    normalizeJourney,
    legToJourney,
    pickNearbySettingsFields,
    migrateSettings,
    getConfiguredJourneys,
    getJourneyById,
    getActiveJourney,
    readStoredSettings,
    persistSettings,
    getPerthMinutesSinceMidnight,
    getPerthLocalDateKey,
    hasDefaultWindow,
    parseTimeToMinutes,
    formatMinutesAsTime,
    addMinutesToTimeString,
    journeyMatchesTime,
    pad2,
    getPerthDateParts,
    isLegacyBlankDefaultWindow,
    isDefaultCommuteJourneyName,
  };

  global.nextTrainJourneyModel = api;
})(window);
