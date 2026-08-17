import fs from "fs";

const lines = fs.readFileSync("public/app.js", "utf8").split(/\n/);

const ranges = [
  [606, 635],
  [637, 649],
  [821, 837],
  [839, 858],
  [949, 960],
  [961, 1105],
  [1107, 1177],
  [2064, 2081],
  [2152, 2163],
  [2197, 2205],
  [2220, 2235],
  [2954, 2957],
];

let body = [];
for (const [start, end] of ranges) {
  body.push(...lines.slice(start - 1, end));
}
body = body.join("\n");

body = body
  .replace(/\bnormalizeStation\(/g, "deps.normalizeStation(")
  .replace(/\bnormalizeDirection\(/g, "deps.normalizeDirection(")
  .replace(
    /Object\.entries\(JOURNEY_TEMPLATE_PRESETS\)/g,
    "Object.entries(deps.JOURNEY_TEMPLATE_PRESETS || {})"
  )
  .replace(/NEARBY_PIN_HOLD_MS/g, "deps.NEARBY_PIN_HOLD_MS");

const module = `(function (global) {
  const SETTINGS_KEY = "nextTrainSettings";
  const DEFAULT_SETTINGS = {
    leaveBeforeMinutes: 10,
    refreshSeconds: 30,
  };
  const DEFAULT_REMIND_DAYS = [1, 2, 3, 4, 5];

  let deps = {};

  function init(nextDeps = {}) {
    deps = nextDeps;
  }

${body}

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
      const migrated = migrateSettings(JSON.parse(raw));
      const resolved = {
        ...migrated,
        journeys: normalizeJourneyList(migrated.journeys),
      };
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
    createJourneyId,
    createDefaultJourney,
    createDefaultStore,
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
    journeyMatchesTime,
    pad2,
    getPerthDateParts,
    isLegacyBlankDefaultWindow,
    isLegacyTemplateJourneyName,
  };

  global.nextTrainJourneyModel = api;
})(window);
`;

fs.writeFileSync("public/journey-model.js", module);
console.log("Wrote public/journey-model.js");
