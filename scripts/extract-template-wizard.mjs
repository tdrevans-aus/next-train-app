import fs from "node:fs";
import path from "node:path";

const appPath = path.join("public", "app.js");
const outPath = path.join("public", "template-wizard.js");
const lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const extractRanges = [[3813, 4451]];

const detailRefs = [
  "detailJourneyNameField",
  "detailRouteSection",
  "detailRouteCore",
  "detailJourneyWindow",
  "detailTargetMaster",
  "detailPreferredSection",
  "detailPreferredField",
  "detailRemindControls",
  "detailReminderSection",
  "leaveBeforeField",
  "detailRemindMeInput",
  "detailUseTargetTrainInput",
  "detailLeaveRemindersCommuteStripInput",
  "detailLeaveRemindersStripWrap",
  "journeysDialog",
];

let body = "";
for (const [start, end] of extractRanges) {
  body += lines.slice(start - 1, end).join("\n") + "\n\n";
}

function transform(code) {
  let out = code
    .replace(/^let templateWizardStep = 1;\r?$/m, "")
    .replace(/^let templateWizardContext = null;\r?$/m, "")
    .replace(/^let templateWizardReminderArmGeneration = 0;\r?$/m, "")
    .replace(/^let templateWizardReminderArmTimers = \[\];\r?$/m, "")
    .replace(/^let templateWizardReminderDemoActive = false;\r?$/m, "")
    .replace(/^let templateWizardReminderPermissionRequested = false;\r?$/m, "");

  out = out.replace(
    /PERTH_STATIONS\.has\(normalizeStation\(([^)]+)\)\)/g,
    "isPerthCatalogStation($1)"
  );

  for (const ref of detailRefs) {
    out = out.replace(new RegExp(`\\b${ref}\\b`, "g"), `deps.${ref}`);
  }

  return out;
}

body = transform(body);

const header = fs.readFileSync(path.join("scripts", "template-wizard-header.js"), "utf8");

const listeners = `
function initTemplateWizardListeners() {
  templateWizardPrimaryBtn?.addEventListener("click", () => {
    advanceTemplateWizard();
  });

  templateWizardSkipBtn?.addEventListener("click", () => {
    skipTemplateWizard();
  });
}

function init(nextDeps = {}) {
  deps = { ...nextDeps };
}

const api = {
  init,
  advanceTemplateWizard,
  dismissTemplateRouteCoach,
  getTemplateWizardContext,
  hasSeenTemplateWizard,
  hasSkippedTemplateWizard,
  isTemplateWizardReminderDemoActive,
  showTemplateRouteCoach,
  skipTemplateWizard,
  shouldShowTemplateRouteCoach,
  updateTemplateRouteCoachState,
  initTemplateWizardListeners,
};

global.nextTrainTemplateWizard = api;
})(window);
`;

const footerStart = header.lastIndexOf("(function (global)");
const headerWithoutIIFE = header.slice(footerStart);

const output =
  headerWithoutIIFE.trimEnd() +
  "\n\n" +
  body.trimEnd() +
  "\n\n" +
  listeners.trimStart();

fs.writeFileSync(outPath, output);
console.log(`Wrote ${outPath} (${output.split(/\r?\n/).length} lines)`);
