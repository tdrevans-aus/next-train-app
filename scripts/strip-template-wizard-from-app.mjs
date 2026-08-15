import fs from "node:fs";
import path from "node:path";

const appPath = path.join("public", "app.js");
let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const removeRanges = [[4451, 3813], [6031, 6026]];

for (const [end, start] of removeRanges) {
  lines.splice(start - 1, end - start + 1);
}

lines = lines.filter((line) => {
  const t = line.trim();
  if (t === 'const TEMPLATE_WIZARD_SEEN_KEY = "nextTrainTemplateWizardSeen";') return false;
  if (t === 'const TEMPLATE_WIZARD_SKIPPED_KEY = "nextTrainTemplateWizardSkipped";') return false;
  if (t.includes("const templateRouteCoach =")) return false;
  if (t.includes("const templateRouteCoachBody =")) return false;
  if (t.includes("const templateWizardHoursBody =")) return false;
  if (t.includes("const templateWizardPrimaryBtn =")) return false;
  if (t.includes("const templateWizardStep1 =")) return false;
  if (t.includes("const templateWizardStep2 =")) return false;
  if (t.includes("const templateWizardStep3 =")) return false;
  if (t.includes("const templateWizardStepReminder =")) return false;
  if (t.includes("const templateWizardStepName =")) return false;
  if (t.includes("const templateWizardNameBody =")) return false;
  if (t.includes("const templateWizardSkipBtn =")) return false;
  return true;
});

const wrapperMarker = "const nearbyMode = () => window.nextTrainNearby;";
const wrapperIdx = lines.findIndex((l) => l.startsWith(wrapperMarker));

const wrappers = `
const templateWizard = () => window.nextTrainTemplateWizard;

function showTemplateRouteCoach(options) { return templateWizard().showTemplateRouteCoach(options); }
function dismissTemplateRouteCoach() { return templateWizard().dismissTemplateRouteCoach(); }
function updateTemplateRouteCoachState(patch) { return templateWizard().updateTemplateRouteCoachState(patch); }
function shouldShowTemplateRouteCoach() { return templateWizard().shouldShowTemplateRouteCoach(); }
function hasSkippedTemplateWizard() { return templateWizard().hasSkippedTemplateWizard(); }
function hasSeenTemplateWizard() { return templateWizard().hasSeenTemplateWizard(); }
function getTemplateWizardContext() { return templateWizard().getTemplateWizardContext(); }
function isTemplateWizardReminderDemoActive() { return templateWizard().isTemplateWizardReminderDemoActive(); }

function initTemplateWizardFromModule() {
  templateWizard()?.init?.({
    formatJourneyDefaultWindow,
    formatStationLabel,
    normalizeStation,
    getConfiguredJourneys,
    isPerthCatalogStation: (station) => {
      const normalized = normalizeStation(station);
      return PERTH_STATIONS.has(normalized) || PERTH_STATIONS.has(station);
    },
    openJourneysDialogSync,
    showSettingsDetailView,
    isDetailTargetMasterOn,
    syncDetailTargetMasterVisibility,
    syncDetailTargetRemindVisibility,
    revertDetailRemindersForDeniedPermission,
    detailJourneyNameField,
    detailRouteSection,
    detailRouteCore,
    detailJourneyWindow,
    detailTargetMaster,
    detailPreferredSection,
    detailPreferredField,
    detailRemindControls,
    detailReminderSection,
    leaveBeforeField,
    detailRemindMeInput,
    detailUseTargetTrainInput,
    detailLeaveRemindersCommuteStripInput,
    detailLeaveRemindersStripWrap,
    journeysDialog,
  });
  templateWizard()?.initTemplateWizardListeners?.();
}

`;

if (wrapperIdx >= 0) {
  lines.splice(wrapperIdx, 0, wrappers.trimEnd(), "");
}

// Replace templateWizardContext references
for (let i = 0; i < lines.length; i++) {
  lines[i] = lines[i].replace(/\btemplateWizardContext\b/g, "getTemplateWizardContext()");
  if (lines[i].includes("!templateWizardReminderDemoActive")) {
    lines[i] = lines[i].replace(
      "!templateWizardReminderDemoActive",
      "!isTemplateWizardReminderDemoActive()"
    );
  }
  if (lines[i].trim() === "if (!templateWizardReminderDemoActive) {") {
    lines[i] = lines[i].replace(
      "templateWizardReminderDemoActive",
      "isTemplateWizardReminderDemoActive()"
    );
  }
}

const initCall = "initNearbyModeFromModule();";
const initIdx = lines.findIndex((l) => l.trim() === initCall);
if (initIdx >= 0) {
  lines.splice(initIdx, 0, "initTemplateWizardFromModule();");
}

const indexPath = path.join("public", "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
if (!indexHtml.includes("template-wizard.js")) {
  indexHtml = indexHtml.replace(
    "<script src=\"nearby-mode.js\"></script>",
    "<script src=\"nearby-mode.js\"></script>\n    <script src=\"template-wizard.js\"></script>"
  );
  fs.writeFileSync(indexPath, indexHtml);
}

fs.writeFileSync(appPath, lines.join("\n"));
console.log("Stripped template wizard from app.js");
