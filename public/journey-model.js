(function (global) {
  const SETTINGS_KEY = "nextTrainSettings";
  const DEFAULT_SETTINGS = {
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
  };
  const DEFAULT_REMIND_DAYS = [1, 2, 3, 4, 5];
  const JOURNEY_KIND_ROUTE = "route";
  const JOURNEY_KIND_JOURNEY = "journey";
  const LEGACY_JOURNEY_KIND_COMMUTE = "commute";
  const JOURNEY_TEMPLATE_KEYS = new Set(["morning", "evening", "custom"]);
  /** FB-23: one-time journey reset + route vs journey schema. */
  const SETTINGS_SCHEMA_VERSION = 2;
  const JOURNEY_UPGRADE_DEFAULTS = {
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
    appTheme: "system",
  };
}

function stripJourneyFieldsForRoute(journey) {
  journey.defaultFrom = "";
  journey.defaultUntil = "";
  journey.preferredTrainTime = "";
  journey.remindMe = false;
  delete journey.templateKey;
  return journey;
}

function upgradeRouteToJourney(raw = {}) {
  const name = String(raw.name || "Morning into town").trim() || "Morning into town";
  return normalizeJourney({
    id: raw.id,
    name,
    station: raw.station,
    direction: raw.direction,
    leaveBeforeMinutes: raw.leaveBeforeMinutes,
    useLeaveBefore: raw.useLeaveBefore,
    kind: JOURNEY_KIND_JOURNEY,
    ...JOURNEY_UPGRADE_DEFAULTS,
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
function isLegacyTemplateJourneyName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return normalized === "daily commute - in" || normalized === "daily commute - out";
}

function normalizeJourneyNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function nextAvailableJourneyName(journeys = [], { prefix = "Journey" } = {}) {
  const used = new Set(
    journeys.map((journey) => normalizeJourneyNameKey(journey?.name)).filter(Boolean)
  );
  let number = 1;
  while (used.has(normalizeJourneyNameKey(`${prefix} ${number}`))) {
    number += 1;
  }
  return `${prefix} ${number}`;
}

function findJourneyNameConflict(name, journeys = [], excludeId = null) {
  const key = normalizeJourneyNameKey(name);
  if (!key) {
    return null;
  }

  return (
    journeys.find((journey) => {
      if (!journey || journey.id === excludeId) {
        return false;
      }
      return normalizeJourneyNameKey(journey.name) === key;
    }) ?? null
  );
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
    timeZone: getActiveTimeZone(),
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

const ACTIVE_DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatJourneyActiveDays(journey) {
  const days = getJourneyRemindDays(journey);
  if (!days.length) {
    return "";
  }
  if (days.length === 7) {
    return "Every day";
  }

  const ranges = [];
  let rangeStart = days[0];
  let prev = days[0];

  for (let index = 1; index <= days.length; index += 1) {
    const current = days[index];
    if (current === prev + 1) {
      prev = current;
      continue;
    }

    ranges.push(
      rangeStart === prev
        ? ACTIVE_DAY_SHORT[rangeStart - 1]
        : `${ACTIVE_DAY_SHORT[rangeStart - 1]}–${ACTIVE_DAY_SHORT[prev - 1]}`
    );
    rangeStart = current;
    prev = current;
  }

  return ranges.join(", ");
}
function journeyMatchesActiveDay(journey, dayOfWeek = getPerthDayOfWeekIso()) {
  return getJourneyRemindDays(journey).includes(dayOfWeek);
}

  function isTestMode() {
    return sessionStorage.getItem("nextTrainTestMode") === "1" || window.location.search.includes("test=1");
  }

  function journeyMatchesSchedule(
  journey,
  minutes = getPerthMinutesSinceMidnight(),
  dayOfWeek = getPerthDayOfWeekIso()
) {
  const matchesDay = journeyMatchesActiveDay(journey, dayOfWeek);
  const matchesTime = journeyMatchesTime(journey, minutes);
  return matchesDay && matchesTime;
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
  if (kind === JOURNEY_KIND_ROUTE) {
    return JOURNEY_KIND_ROUTE;
  }
  if (kind === JOURNEY_KIND_JOURNEY || kind === LEGACY_JOURNEY_KIND_COMMUTE) {
    return JOURNEY_KIND_JOURNEY;
  }
  return "";
}

function inferJourneyKind(raw = {}, context = {}) {
  const explicit = normalizeJourneyKind(raw.kind);
  if (explicit) {
    return explicit;
  }

  const templateKey = context.templateKey ?? inferTemplateKey(raw);
  if (templateKey && JOURNEY_TEMPLATE_KEYS.has(templateKey)) {
    return JOURNEY_KIND_JOURNEY;
  }

  const preferredTrainTime =
    context.preferredTrainTime === undefined || context.preferredTrainTime === null
      ? raw.preferredTrainTime === undefined || raw.preferredTrainTime === null
        ? ""
        : String(raw.preferredTrainTime)
      : String(context.preferredTrainTime);
  if (preferredTrainTime) {
    return JOURNEY_KIND_JOURNEY;
  }

  if (journeyRemindMeEnabled(raw)) {
    return JOURNEY_KIND_JOURNEY;
  }

  return JOURNEY_KIND_ROUTE;
}

function isJourneyKind(journey) {
  return normalizeJourneyKind(journey?.kind) === JOURNEY_KIND_JOURNEY;
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
    !isLegacyTemplateJourneyName(raw.name)
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
    pinNotifyMe: raw.pinNotifyMe === true,
    kind: inferJourneyKind(raw, { templateKey, preferredTrainTime }),
  };

  const cityId = String(raw.cityId ?? "").trim().toLowerCase();
  if (PERSISTED_CITY_IDS.has(cityId)) {
    journey.cityId = cityId;
  }

  if (templateKey) {
    journey.templateKey = templateKey;
  }

  // Always re-derive Active hours from Target train if it's a Journey kind.
  if (isJourneyKind(journey) && journey.preferredTrainTime) {
    const target = parseTimeToMinutes(journey.preferredTrainTime);
    const fromMins = (target - 60 + 24 * 60) % (24 * 60);
    const untilMins = (target + 15 + 24 * 60) % (24 * 60);
    journey.defaultFrom = formatMinutesAsTime(fromMins);
    journey.defaultUntil = formatMinutesAsTime(untilMins);
  }

  if (raw.autoRoute === false) {
    journey.autoRoute = false;
  }

  if (isRouteJourney(journey)) {
    stripJourneyFieldsForRoute(journey);
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

function pickWidgetAppearanceModeFields(raw = {}) {
  const mode = String(raw.widgetAppearanceMode ?? "").trim();
  if (mode === "blend" || mode === "wallpaper" || mode === "brand") {
    return { widgetAppearanceMode: mode };
  }
  const legacy = String(raw.widgetThemeId ?? "").trim();
  if (legacy === "system") {
    return { widgetAppearanceMode: "wallpaper" };
  }
  if (legacy === "default") {
    return { widgetAppearanceMode: "brand" };
  }
  if (legacy) {
    return { widgetAppearanceMode: "blend" };
  }
  return { widgetAppearanceMode: "blend" };
}

function pickWidgetColourIdFields(raw = {}) {
  const mode = pickWidgetAppearanceModeFields(raw).widgetAppearanceMode;
  if (!("widgetThemeId" in raw)) {
    if (mode === "blend") {
      return { widgetThemeId: "ocean" };
    }
    return {};
  }
  const id = String(raw.widgetThemeId ?? "").trim();
  if (!id || id === "system") {
    return mode === "blend" ? { widgetThemeId: "ocean" } : {};
  }
  if (id === "forest") {
    return { widgetThemeId: "default" };
  }
  const valid = new Set([
    "ocean",
    "midnight",
    "slate",
    "lavender",
    "rose",
    "amoled",
    "default",
  ]);
  if (valid.has(id)) {
    return { widgetThemeId: id };
  }
  return mode === "blend" ? { widgetThemeId: "ocean" } : {};
}

function pickWidgetThemeFields(raw = {}) {
  return {
    ...pickWidgetAppearanceModeFields(raw),
    ...pickWidgetColourIdFields(raw),
  };
}

function pickWidgetAppearanceFields(raw = {}) {
  if ("widgetBgOpacity" in raw) {
    const opacity = Math.max(0, Math.min(100, Math.round(Number(raw.widgetBgOpacity) || 0)));
    if (opacity > 0) {
      return { widgetBgOpacity: opacity, widgetTransparentBg: false };
    }
    return { widgetBgOpacity: 0, widgetTransparentBg: true };
  }
  if (Boolean(raw.widgetTransparentBg)) {
    return { widgetBgOpacity: 0, widgetTransparentBg: true };
  }
  return {};
}

function pickAppThemeFields(raw = {}) {
  const mode = String(raw.appTheme ?? "").trim();
  if (mode === "light" || mode === "dark" || mode === "system") {
    return { appTheme: mode };
  }
  return { appTheme: "system" };
}

const PERSISTED_CITY_IDS = new Set([
  "perth",
  "sydney",
  "brisbane",
  "adelaide",
  "uk-london-tfl",
  "amsterdam",
  "rotterdam",
  "vancouver",
  "canberra",
  "gold-coast",
  "newcastle",
  "auckland",
  "stockholm",
  "goteborg",
  "wellington",
  "malmo",
  "uppsala",
  "helsinki",
  "oslo",
  "uk-west-midlands",
  "west-of-england",
  "east-midlands",
  "liverpool-city-region",
  "west-yorkshire",
]);
const PERSISTED_COUNTRY_IDS = new Set(["au", "gb", "nl", "ca", "nz", "se", "fi", "no"]);

function pickSavedCityFields(raw = {}) {
  const city = String(raw.savedCity ?? "").trim().toLowerCase();
  const country = String(raw.savedCountry ?? "").trim().toLowerCase();
  const out = {};
  if (PERSISTED_CITY_IDS.has(city)) {
    out.savedCity = city;
  }
  if (PERSISTED_COUNTRY_IDS.has(country)) {
    out.savedCountry = country;
  }
  if (raw.regionExplicit === true) {
    out.regionExplicit = true;
  }
  const mismatch = String(raw.regionMismatchDismissed ?? "").trim();
  if (mismatch) {
    out.regionMismatchDismissed = mismatch;
  }
  return out;
}

function pickPersistedRootFields(raw = {}) {
  return {
    ...pickNearbySettingsFields(raw),
    ...pickWidgetThemeFields(raw),
    ...pickWidgetAppearanceFields(raw),
    ...pickAppThemeFields(raw),
    ...pickSavedCityFields(raw),
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
  const rootFields = pickPersistedRootFields(raw);
  const priorVersion = Number(raw.settingsSchemaVersion) || 0;

  if (priorVersion < SETTINGS_SCHEMA_VERSION) {
    return {
      settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
      refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
      activeJourneyId: null,
      journeys: [],
      ...rootFields,
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
      ...rootFields,
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
      ...rootFields,
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
      ...rootFields,
    };
  }

  return {
    settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
    refreshSeconds: Number(raw.refreshSeconds) || DEFAULT_SETTINGS.refreshSeconds,
    activeJourneyId: null,
    journeys: [],
    ...rootFields,
  };
}
function pad2(value) {
  return String(value).padStart(2, "0");
}

function getActiveTimeZone() {
  try {
    return window.NextTrainCitySession?.readActiveTimeZone?.() || "Australia/Perth";
  } catch {
    return "Australia/Perth";
  }
}

function getPerthDateParts(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: getActiveTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value;

    return {
      year: Number(get("year") ?? 0),
      month: Number(get("month") ?? 1),
      day: Number(get("day") ?? 1),
      hour: Number(get("hour") ?? 0),
      minute: Number(get("minute") ?? 0),
      second: Number(get("second") ?? 0),
    };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }
}
function getPerthMinutesSinceMidnight(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: getActiveTimeZone(),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}
function hasDefaultWindow(journey) {
  return Boolean(journey?.defaultFrom && journey?.defaultUntil);
}

function parseTimeToMinutes(time) {
  const parts = String(time || "00:00").split(":");
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  return isNaN(hour) || isNaN(minute) ? -1 : hour * 60 + minute;
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

const CUSTOM_TARGET_TRAIN_OFFSET_MINUTES = 60;
const CUSTOM_TARGET_TRAIN_ROUND_MINUTES = 5;

/** Sensible first target for blank custom journeys — about an hour from now, on a 5‑min step. */
function getDefaultCustomPreferredTrainTime(date = new Date()) {
  const target = getPerthMinutesSinceMidnight(date) + CUSTOM_TARGET_TRAIN_OFFSET_MINUTES;
  const rounded =
    Math.ceil(target / CUSTOM_TARGET_TRAIN_ROUND_MINUTES) * CUSTOM_TARGET_TRAIN_ROUND_MINUTES;
  return formatMinutesAsTime(rounded);
}

function journeyMatchesTime(journey, minutes) {
  let from, until;

  if (isJourneyKind(journey) && journey.preferredTrainTime && !hasDefaultWindow(journey)) {
    const target = parseTimeToMinutes(journey.preferredTrainTime);
    from = (target - 60 + 24 * 60) % (24 * 60);
    until = (target + 15 + 24 * 60) % (24 * 60);
  } else {
    if (!hasDefaultWindow(journey)) {
      return false;
    }
    from = parseTimeToMinutes(journey.defaultFrom);
    until = parseTimeToMinutes(journey.defaultUntil);
  }

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
    upgradeRouteToJourney,
    isUnconfiguredJourney,
    resolveInitialJourneys,
    normalizeJourneyList,
    normalizeRemindDays,
    getPerthDayOfWeekIso,
    getJourneyRemindDays,
    formatJourneyActiveDays,
    journeyMatchesActiveDay,
    journeyMatchesSchedule,
    journeyRemindMeEnabled,
    inferTemplateKey,
    inferJourneyKind,
    isJourneyKind,
    isRouteJourney,
    JOURNEY_KIND_ROUTE,
    JOURNEY_KIND_JOURNEY,
    normalizeJourney,
    legToJourney,
    pickNearbySettingsFields,
    pickAppThemeFields,
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
    getDefaultCustomPreferredTrainTime,
    journeyMatchesTime,
    pad2,
    getPerthDateParts,
    isLegacyBlankDefaultWindow,
    isLegacyTemplateJourneyName,
    normalizeJourneyNameKey,
    nextAvailableJourneyName,
    findJourneyNameConflict,
  };

  global.nextTrainJourneyModel = api;
})(window);
