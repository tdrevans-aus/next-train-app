import fs from "fs";

const path = "public/app.js";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  "let settings = createDefaultStore();",
  "let settings = window.nextTrainJourneyModel.createDefaultStore();"
);

const wrapperBlock = `
const journeyModel = () => window.nextTrainJourneyModel;

function createJourneyId() { return journeyModel().createJourneyId(); }
function createDefaultJourney(overrides = {}) { return journeyModel().createDefaultJourney(overrides); }
function createDefaultStore() { return journeyModel().createDefaultStore(); }
function isUnconfiguredJourney(journey) { return journeyModel().isUnconfiguredJourney(journey); }
function resolveInitialJourneys(rawJourneys = []) { return journeyModel().resolveInitialJourneys(rawJourneys); }
function normalizeJourneyList(rawJourneys = []) { return journeyModel().normalizeJourneyList(rawJourneys); }
function isLegacyTemplateJourneyName(name) { return journeyModel().isLegacyTemplateJourneyName(name); }
function isLegacyBlankDefaultWindow(a, b) { return journeyModel().isLegacyBlankDefaultWindow(a, b); }
function normalizeRemindDays(raw) { return journeyModel().normalizeRemindDays(raw); }
function getPerthDayOfWeekIso(date) { return journeyModel().getPerthDayOfWeekIso(date); }
function getJourneyRemindDays(journey) { return journeyModel().getJourneyRemindDays(journey); }
function journeyMatchesActiveDay(journey, day) { return journeyModel().journeyMatchesActiveDay(journey, day); }
function journeyMatchesSchedule(journey, minutes, day) { return journeyModel().journeyMatchesSchedule(journey, minutes, day); }
function journeyRemindMeEnabled(raw) { return journeyModel().journeyRemindMeEnabled(raw); }
function inferTemplateKey(raw) { return journeyModel().inferTemplateKey(raw); }
function normalizeJourney(raw) { return journeyModel().normalizeJourney(raw); }
function legToJourney(leg, name, from, until) { return journeyModel().legToJourney(leg, name, from, until); }
function pickNearbySettingsFields(raw) { return journeyModel().pickNearbySettingsFields(raw); }
function migrateSettings(raw) { return journeyModel().migrateSettings(raw); }
function getConfiguredJourneys() { return journeyModel().getConfiguredJourneys(); }
function getJourneyById(id) { return journeyModel().getJourneyById(id); }
function getActiveJourney() { return journeyModel().getActiveJourney(); }
function readStoredSettings() { return journeyModel().readStoredSettings(); }
function persistSettings(next) { return journeyModel().persistSettings(next); }
function pad2(value) { return journeyModel().pad2(value); }
function getPerthDateParts(date) { return journeyModel().getPerthDateParts(date); }
function getPerthMinutesSinceMidnight(date) { return journeyModel().getPerthMinutesSinceMidnight(date); }
function getPerthLocalDateKey(date) { return journeyModel().getPerthLocalDateKey(date); }
function hasDefaultWindow(journey) { return journeyModel().hasDefaultWindow(journey); }
function parseTimeToMinutes(time) { return journeyModel().parseTimeToMinutes(time); }
function journeyMatchesTime(journey, minutes) { return journeyModel().journeyMatchesTime(journey, minutes); }

function initJourneyModelFromModule() {
  journeyModel()?.init?.({
    getSettings: () => settings,
    setSettings: (next) => {
      settings = next;
    },
    normalizeStation,
    normalizeDirection,
    JOURNEY_TEMPLATE_PRESETS,
    NEARBY_PIN_HOLD_MS,
    onSettingsPersisted: (nextSettings) => {
      refreshSeconds = nextSettings.refreshSeconds;
      renderJourneySwitcher();
      window.nextTrainWidget?.syncWidgetSettings?.(nextSettings);
      document.dispatchEvent(new CustomEvent("nexttrain:settings-persisted"));
    },
  });
}

`;

content = content.replace(
  "initStationComboboxesFromModule();",
  `${wrapperBlock}initJourneyModelFromModule();\ninitStationComboboxesFromModule();`
);

fs.writeFileSync(path, content);
console.log("Wrappers added");
