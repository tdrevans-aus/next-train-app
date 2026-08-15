(function (global) {
  const TEMPLATE_WIZARD_SEEN_KEY = "nextTrainTemplateWizardSeen";
  const TEMPLATE_WIZARD_SKIPPED_KEY = "nextTrainTemplateWizardSkipped";

  let deps = {};

  let templateWizardStep = 1;
  let templateWizardContext = null;
  let templateWizardReminderArmGeneration = 0;
  let templateWizardReminderArmTimers = [];
  let templateWizardReminderDemoActive = false;
  let templateWizardReminderPermissionRequested = false;

  const templateRouteCoach = document.getElementById("template-route-coach");
  const templateRouteCoachBody = document.getElementById("template-route-coach-body");
  const templateWizardHoursBody = document.getElementById("template-wizard-hours-body");
  const templateWizardPrimaryBtn = document.getElementById("template-wizard-primary-btn");
  const templateWizardStep1 = document.getElementById("template-wizard-step-1");
  const templateWizardStep2 = document.getElementById("template-wizard-step-2");
  const templateWizardStep3 = document.getElementById("template-wizard-step-3");
  const templateWizardStepReminder = document.getElementById("template-wizard-step-reminder");
  const templateWizardStepName = document.getElementById("template-wizard-step-name");
  const templateWizardNameBody = document.getElementById("template-wizard-name-body");
  const templateWizardSkipBtn = document.getElementById("template-wizard-skip-btn");

  function formatJourneyDefaultWindow(journey) {
    return deps.formatJourneyDefaultWindow?.(journey) ?? "";
  }

  function formatStationLabel(name) {
    return deps.formatStationLabel?.(name) ?? name;
  }

  function normalizeStation(station) {
    return deps.normalizeStation?.(station) ?? station;
  }

  function getConfiguredJourneys() {
    return deps.getConfiguredJourneys?.() ?? [];
  }

  function isPerthCatalogStation(station) {
    return deps.isPerthCatalogStation?.(station) ?? false;
  }

  function openJourneysDialogSync() {
    return deps.openJourneysDialogSync?.();
  }

  function showSettingsDetailView() {
    return deps.showSettingsDetailView?.();
  }

  function isDetailTargetMasterOn() {
    return deps.isDetailTargetMasterOn?.() ?? false;
  }

  function syncDetailTargetMasterVisibility(options) {
    return deps.syncDetailTargetMasterVisibility?.(options);
  }

  function syncDetailTargetRemindVisibility() {
    return deps.syncDetailTargetRemindVisibility?.();
  }

  async function revertDetailRemindersForDeniedPermission() {
    return deps.revertDetailRemindersForDeniedPermission?.();
  }

  function getTemplateWizardContext() {
    return templateWizardContext;
  }

  function isTemplateWizardReminderDemoActive() {
    return templateWizardReminderDemoActive;
  }
