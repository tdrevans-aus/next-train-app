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

  function templateWizardUsesNameStep(context = templateWizardContext) {
    return context?.useNameStep === true;
  }

  function getTemplateWizardRouteStep(context = templateWizardContext) {
    return templateWizardUsesNameStep(context) ? 2 : 1;
  }

  /** Target train — before Reminders and Journey window. */
  function getTemplateWizardTimeStep(context = templateWizardContext) {
    return templateWizardUsesNameStep(context) ? 3 : 2;
  }

  /** Reminders — after target train, before Journey window (matches form layout). */
  function getTemplateWizardReminderStep(context = templateWizardContext) {
    return getTemplateWizardTimeStep(context) + 1;
  }

  /** Journey window (active hours) — final wizard step. */
  function getTemplateWizardHoursStep(context = templateWizardContext) {
    return getTemplateWizardReminderStep(context) + 1;
  }

  function getTemplateWizardMaxStep(context = templateWizardContext) {
    return getTemplateWizardHoursStep(context);
  }

  // CAPACITOR-1B: classic-script / global callers after FB-25 + deferred load.
  global.getTemplateWizardRouteStep = getTemplateWizardRouteStep;
  global.getTemplateWizardTimeStep = getTemplateWizardTimeStep;
  global.getTemplateWizardReminderStep = getTemplateWizardReminderStep;
  global.getTemplateWizardHoursStep = getTemplateWizardHoursStep;
  global.getTemplateWizardMaxStep = getTemplateWizardMaxStep;








function templateWizardShouldDockCoachBottom(step = templateWizardStep) {
  // Legacy hook — scroll padding only; coach position is computed in syncTemplateWizardCoachPosition.
  return (
    step === getTemplateWizardHoursStep() ||
    step === getTemplateWizardTimeStep() ||
    step === getTemplateWizardReminderStep()
  );
}

function templateWizardRectsOverlap(rectA, rectB, gap = 8) {
  return (
    rectA.left < rectB.right - gap &&
    rectA.right > rectB.left + gap &&
    rectA.top < rectB.bottom - gap &&
    rectA.bottom > rectB.top + gap
  );
}

function applyTemplateWizardCoachTop(card, topPx, padding, maxTop) {
  const top = Math.max(padding, Math.min(topPx, maxTop));
  card.style.top = `${top}px`;
  card.style.bottom = "auto";
}

function applyTemplateWizardCoachBottom(card, bottomPx) {
  card.style.top = "auto";
  card.style.bottom = `${bottomPx}px`;
}

function syncTemplateWizardCoachPosition() {
  const card = templateRouteCoach?.querySelector(".onboarding-coach-card");
  if (!card || !templateRouteCoach || templateRouteCoach.hidden) {
    return;
  }

  const target = getTemplateWizardHighlightTarget();

  if (!target) {
    return;
  }

  templateRouteCoach.classList.remove("template-route-coach--dock-bottom");

  const coachRect = templateRouteCoach.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const cardHeight = card.offsetHeight;
  const gap = 10;
  const padding = 12;
  const maxTop = coachRect.height - cardHeight - padding;
  const isHoursStep = templateWizardStep === getTemplateWizardHoursStep();

  const candidates = isHoursStep
    ? [
        { top: targetRect.top - coachRect.top - cardHeight - gap },
        { bottom: padding },
        { top: targetRect.bottom - coachRect.top + gap },
      ]
    : [
        { top: targetRect.top - coachRect.top - cardHeight - gap },
        { top: targetRect.bottom - coachRect.top + gap },
        { bottom: padding },
      ];

  for (const candidate of candidates) {
    if (candidate.top !== undefined) {
      applyTemplateWizardCoachTop(card, candidate.top, padding, maxTop);
    } else {
      applyTemplateWizardCoachBottom(card, candidate.bottom);
    }

    const cardRect = card.getBoundingClientRect();
    if (!templateWizardRectsOverlap(cardRect, targetRect)) {
      if (candidate.bottom !== undefined) {
        templateRouteCoach.classList.add("template-route-coach--dock-bottom");
      }
      return;
    }
  }

  applyTemplateWizardCoachTop(card, padding, padding, maxTop);
}

function getTemplateWizardHighlightTarget(
  step = templateWizardStep,
  context = templateWizardContext
) {
  if (templateWizardUsesNameStep(context) && step === 1) {
    return deps.detailJourneyNameField;
  }

  if (step === getTemplateWizardRouteStep(context)) {
    return deps.detailRouteCore || deps.detailRouteSection;
  }
  if (step === getTemplateWizardHoursStep(context)) {
    return deps.detailJourneyWindow || document.getElementById("detail-timing-section");
  }
  if (step === getTemplateWizardTimeStep(context)) {
    return deps.detailTargetMaster || deps.detailPreferredSection || deps.detailPreferredField;
  }
  if (step === getTemplateWizardReminderStep(context)) {
    return deps.detailRemindControls || deps.detailReminderSection;
  }

  return null;
}

function getTemplateWizardStepTitleId(
  step = templateWizardStep,
  context = templateWizardContext
) {
  if (templateWizardUsesNameStep(context) && step === 1) {
    return "template-wizard-step-name-title";
  }
  if (step === getTemplateWizardRouteStep(context)) {
    return "template-wizard-step-1-title";
  }
  if (step === getTemplateWizardHoursStep(context)) {
    return "template-wizard-step-3-title";
  }
  if (step === getTemplateWizardTimeStep(context)) {
    return "template-wizard-step-2-title";
  }
  if (step === getTemplateWizardReminderStep(context)) {
    return "template-wizard-step-reminder-title";
  }
  return "template-wizard-step-1-title";
}

function escapeTemplateHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function populateTemplateWizardNameBody(journey, templateKey) {
  if (!templateWizardNameBody) {
    return;
  }

  const label =
    templateKey === "evening"
      ? "Evening home"
      : templateKey === "custom"
        ? "custom journey"
        : "Morning into town";
  const name = journey?.name || label;
  templateWizardNameBody.innerHTML = `We've called this journey <strong>${escapeTemplateHtml(name)}</strong>. Change it anytime.`;
}

function populateTemplateWizardHoursBody(journey, templateKey) {
  if (!templateWizardHoursBody) {
    return;
  }

  const windowLabel = formatJourneyDefaultWindow(journey);
  const period =
    templateKey === "evening"
      ? "evenings"
      : templateKey === "custom"
        ? "weekday mornings"
        : "mornings";
  const example =
    windowLabel && windowLabel !== "Not set"
      ? ` — e.g. ${period} ${windowLabel}`
      : templateKey === "custom"
        ? " — e.g. weekday mornings"
        : "";
  templateWizardHoursBody.textContent = `When this journey shows on your home screen${example}. Your target train must be within these hours.`;
}

function populateTemplateRouteCoachBody(context = templateWizardContext) {
  if (!templateRouteCoachBody || !context) {
    return;
  }

  const { templateKey, journey, nearest, configured, error, routeLoading } = context;
  const step1Title = document.getElementById("template-wizard-step-1-title");
  if (step1Title) {
    step1Title.textContent =
      templateKey === "custom" ? "Station & direction" : "Station picked for you";
  }

  if (routeLoading) {
    templateRouteCoachBody.innerHTML =
      '<span class="template-route-loading"><span class="locate-spinner" aria-hidden="true"></span> Finding your nearest station…</span>';
    return;
  }

  const templateLabel =
    templateKey === "evening"
      ? "Evening home"
      : templateKey === "custom"
        ? "custom journey"
        : "Morning into town";

  if (templateKey === "custom") {
    if (journey?.station) {
      const station = formatStationLabel(journey.station);
      const distance =
        typeof nearest?.distanceKm === "number"
          ? ` (${nearest.distanceKm.toFixed(1)} km)`
          : "";
      templateRouteCoachBody.textContent = journey.direction
        ? `We filled in your nearest station ${station}${distance} → ${journey.direction}. Change station or direction above.`
        : `We filled in your nearest station ${station}${distance}. Pick a direction above (or change station).`;
    } else if (error?.code === 1) {
      templateRouteCoachBody.textContent =
        "Location permission was denied, so we couldn't pick your nearest station. Open Settings → Apps → Next Train → Location → Allow, or choose your station and direction — you can tap Use nearest station if you change your mind.";
    } else if (error) {
      templateRouteCoachBody.textContent =
        "We couldn't find your nearest station just now. Pick your station and direction — you can tap Use nearest station for a shortcut.";
    } else {
      templateRouteCoachBody.textContent =
        "Pick your station and direction above. You can tap Use nearest station for a shortcut.";
    }
  } else if (configured && journey?.station && journey?.direction) {
    const station = formatStationLabel(journey.station);
    const distance =
      typeof nearest?.distanceKm === "number"
        ? ` (${nearest.distanceKm.toFixed(1)} km)`
        : "";
    templateRouteCoachBody.textContent = `For ${templateLabel.toLowerCase()} we defaulted to your nearest station ${station}${distance} → ${journey.direction}. Change station or direction above.`;
  } else if (error?.code === 1) {
    templateRouteCoachBody.textContent =
      "Location permission was denied, so we couldn't pick your nearest station. Open Settings → Apps → Next Train → Location → Allow, or choose your station and direction — you can tap Use nearest station if you change your mind.";
  } else if (
    templateKey === "morning" &&
    nearest?.station &&
    isPerthCatalogStation(nearest.station)
  ) {
    templateRouteCoachBody.textContent = "Pick your station and direction above.";
  } else {
    templateRouteCoachBody.textContent =
      "We couldn't auto-fill your route just now. Pick your station and direction — you can tap Use nearest station for a shortcut.";
  }
}

function updateTemplateRouteCoachState(patch) {
  if (!templateWizardContext) {
    return;
  }

  templateWizardContext = { ...templateWizardContext, ...patch };
  if (templateWizardContext.journey) {
    populateTemplateWizardHoursBody(
      templateWizardContext.journey,
      templateWizardContext.templateKey
    );
  }

  if (templateWizardStep === getTemplateWizardRouteStep()) {
    populateTemplateRouteCoachBody();
  }
}

function clearTemplateWizardCoachPosition() {
  const card = templateRouteCoach?.querySelector(".onboarding-coach-card");
  if (!card) {
    return;
  }

  card.style.removeProperty("top");
  card.style.removeProperty("bottom");
  card.style.removeProperty("left");
  card.style.removeProperty("right");
  card.style.removeProperty("transform");
}

function syncTemplateWizardHighlight(step = templateWizardStep) {
  deps.detailJourneyNameField?.classList.remove("template-wizard-highlight");
  deps.detailRouteSection?.classList.remove("template-wizard-highlight");
  deps.detailRouteCore?.classList.remove("template-wizard-highlight");
  deps.detailPreferredSection?.classList.remove("template-wizard-highlight");
  deps.detailTargetMaster?.classList.remove("template-wizard-highlight");
  deps.leaveBeforeField?.classList.remove("template-wizard-highlight");
  deps.detailJourneyWindow?.classList.remove("template-wizard-highlight");
  deps.detailReminderSection?.classList.remove("template-wizard-highlight");
  deps.detailRemindControls?.classList.remove("template-wizard-highlight");

  const target = getTemplateWizardHighlightTarget(step);
  if (target) {
    target.classList.add("template-wizard-highlight");
    const scrollBlock =
      step === getTemplateWizardHoursStep() ||
      step === getTemplateWizardTimeStep() ||
      step === getTemplateWizardReminderStep()
        ? "start"
        : "nearest";
    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        block: scrollBlock,
        behavior: "smooth",
      });
      window.setTimeout(() => syncTemplateWizardCoachPosition(), 320);
    });
  }
}

function syncTemplateWizardChrome() {
  const active = Boolean(templateRouteCoach && !templateRouteCoach.hidden);
  const reminderStep = active && templateWizardStep === getTemplateWizardReminderStep();
  const hoursStep = active && templateWizardStep === getTemplateWizardHoursStep();
  deps.journeysDialog?.classList.toggle("template-wizard-active", active);
  deps.journeysDialog?.classList.toggle("template-wizard-reminder-step", reminderStep);
  deps.journeysDialog?.classList.toggle("template-wizard-hours-step", hoursStep);

  if (!templateRouteCoach) {
    return;
  }

  templateRouteCoach.classList.remove(
    "template-route-coach--step-1",
    "template-route-coach--step-2",
    "template-route-coach--step-3",
    "template-route-coach--step-4",
    "template-route-coach--step-5",
    "template-route-coach--step-6"
  );
  if (active) {
    templateRouteCoach.classList.add(`template-route-coach--step-${templateWizardStep}`);
    window.requestAnimationFrame(() => syncTemplateWizardCoachPosition());
  } else {
    templateRouteCoach.classList.remove("template-route-coach--dock-bottom");
  }
}

function renderTemplateWizardStep() {
  const useName = templateWizardUsesNameStep();
  const routeStep = getTemplateWizardRouteStep();
  const timeStep = getTemplateWizardTimeStep();
  const hoursStep = getTemplateWizardHoursStep();
  const reminderStep = getTemplateWizardReminderStep();

  if (templateWizardStepName) {
    templateWizardStepName.hidden = !(useName && templateWizardStep === 1);
  }
  if (templateWizardStep1) {
    templateWizardStep1.hidden = templateWizardStep !== routeStep;
  }
  if (templateWizardStep2) {
    templateWizardStep2.hidden = templateWizardStep !== timeStep;
  }
  if (templateWizardStep3) {
    templateWizardStep3.hidden = templateWizardStep !== hoursStep;
  }
  if (templateWizardStepReminder) {
    templateWizardStepReminder.hidden = templateWizardStep !== reminderStep;
  }

  if (templateRouteCoach) {
    templateRouteCoach.setAttribute("aria-labelledby", getTemplateWizardStepTitleId());
  }

  if (templateWizardPrimaryBtn) {
    templateWizardPrimaryBtn.textContent =
      templateWizardStep === getTemplateWizardMaxStep() ? "Got it" : "Next";
  }

  syncTemplateWizardHighlight();
  syncTemplateWizardChrome();

  if (templateWizardStep === reminderStep) {
    void armRemindersForWizardStep({ animate: true });
  } else {
    cancelTemplateWizardReminderArm();
  }
}

function cancelTemplateWizardReminderArm() {
  templateWizardReminderArmGeneration += 1;
  templateWizardReminderDemoActive = false;
  templateWizardReminderPermissionRequested = false;
  for (const timerId of templateWizardReminderArmTimers) {
    window.clearTimeout(timerId);
  }
  templateWizardReminderArmTimers = [];
  return templateWizardReminderArmGeneration;
}

function isTemplateWizardReminderArmActive(generation) {
  return (
    generation === templateWizardReminderArmGeneration &&
    templateWizardStep === getTemplateWizardReminderStep() &&
    Boolean(templateRouteCoach && !templateRouteCoach.hidden)
  );
}

function templateWizardReminderDelay(ms, generation) {
  return new Promise((resolve, reject) => {
    const timerId = window.setTimeout(() => {
      templateWizardReminderArmTimers = templateWizardReminderArmTimers.filter((id) => id !== timerId);
      if (!isTemplateWizardReminderArmActive(generation)) {
        reject(new DOMException("Template wizard reminder arm cancelled", "AbortError"));
        return;
      }
      resolve();
    }, ms);
    templateWizardReminderArmTimers.push(timerId);
  });
}

function pulseTemplateWizardToggleRow(element) {
  if (!element) {
    return;
  }
  element.classList.add("template-wizard-toggle-on");
  window.setTimeout(() => {
    element.classList.remove("template-wizard-toggle-on");
  }, 650);
}

async function requestTemplateWizardReminderPermission() {
  if (templateWizardReminderPermissionRequested) {
    return;
  }
  templateWizardReminderPermissionRequested = true;

  const settings = await window.nextTrainLeaveReminders?.enableLeaveReminders?.({
    userInitiated: true,
  });
  if (settings?.permissionGranted === false) {
    await revertDetailRemindersForDeniedPermission();
    syncDetailTargetRemindVisibility();
    return;
  }
  await window.nextTrainLeaveReminders?.ensureLiveCountdownDefaultOn?.();
  syncDetailTargetRemindVisibility();
}

/** Default Remind me on, and ask for notification permission once. */
function armRemindersForWizardStep({ animate = false } = {}) {
  const generation = cancelTemplateWizardReminderArm();

  void (async () => {
    if (animate) {
      templateWizardReminderDemoActive = true;
    }

    if (!isDetailTargetMasterOn()) {
      if (deps.detailUseTargetTrainInput) {
        deps.detailUseTargetTrainInput.checked = true;
      }
      syncDetailTargetMasterVisibility({ seedTime: true });
    }

    if (deps.detailRemindMeInput) {
      delete deps.detailRemindMeInput.dataset.userTouched;
    }

    if (animate) {
      if (deps.detailRemindMeInput) {
        deps.detailRemindMeInput.checked = false;
      }
      syncDetailTargetRemindVisibility();

      try {
        await templateWizardReminderDelay(450, generation);
        if (deps.detailRemindMeInput) {
          deps.detailRemindMeInput.checked = true;
        }
        pulseTemplateWizardToggleRow(deps.detailReminderSection);
      } catch (error) {
        if (error?.name !== "AbortError") {
          throw error;
        }
        return;
      } finally {
        if (generation === templateWizardReminderArmGeneration) {
          templateWizardReminderDemoActive = false;
        }
      }
    } else if (deps.detailRemindMeInput) {
      deps.detailRemindMeInput.checked = true;
      syncDetailTargetRemindVisibility();
    }

    if (!isTemplateWizardReminderArmActive(generation)) {
      return;
    }

    await requestTemplateWizardReminderPermission();
  })();
}

function hasSeenTemplateWizard() {
  return localStorage.getItem(TEMPLATE_WIZARD_SEEN_KEY) === "1";
}

function hasSkippedTemplateWizard() {
  return localStorage.getItem(TEMPLATE_WIZARD_SKIPPED_KEY) === "1";
}

function markTemplateWizardSeen() {
  localStorage.setItem(TEMPLATE_WIZARD_SEEN_KEY, "1");
}

function markTemplateWizardCompleted() {
  markTemplateWizardSeen();
  localStorage.removeItem(TEMPLATE_WIZARD_SKIPPED_KEY);
}

function skipTemplateWizard() {
  markTemplateWizardSeen();
  localStorage.setItem(TEMPLATE_WIZARD_SKIPPED_KEY, "1");
  dismissTemplateRouteCoach();
}

function shouldShowTemplateRouteCoach() {
  // Journey setup tour — once per install (complete or Skip tour). Routes do not consume it.
  return !hasSeenTemplateWizard();
}

function dismissTemplateRouteCoach() {
  cancelTemplateWizardReminderArm();
  if (templateRouteCoach) {
    templateRouteCoach.hidden = true;
  }
  clearTemplateWizardCoachPosition();
  templateWizardStep = 1;
  templateWizardContext = null;
  deps.detailJourneyNameField?.classList.remove("template-wizard-highlight");
  deps.detailReminderSection?.classList.remove("template-wizard-highlight");
  deps.detailRemindControls?.classList.remove("template-wizard-highlight");
  syncTemplateWizardHighlight(0);
  syncTemplateWizardChrome();
  // Same as onboarding: restore banner after rare coach overlays.
  void window.NextTrainAds?.reload?.();
}

function advanceTemplateWizard() {
  const maxStep = getTemplateWizardMaxStep();
  if (templateWizardStep < maxStep) {
    templateWizardStep += 1;
    if (templateWizardStep === getTemplateWizardRouteStep()) {
      populateTemplateRouteCoachBody();
    }
    renderTemplateWizardStep();
    return;
  }

  void requestTemplateWizardReminderPermission().finally(() => {
    markTemplateWizardCompleted();
    dismissTemplateRouteCoach();
  });
}

function showTemplateRouteCoach({
  templateKey,
  journey,
  nearest,
  configured,
  error,
  routeLoading = false,
}) {
  if (!templateRouteCoach || !templateRouteCoachBody) {
    return;
  }

  if (!shouldShowTemplateRouteCoach()) {
    return;
  }

  const useNameStep = templateKey !== "custom";
  templateWizardContext = {
    templateKey,
    journey,
    nearest,
    configured,
    error,
    routeLoading,
    useNameStep,
  };
  templateWizardStep = 1;

  if (useNameStep) {
    populateTemplateWizardNameBody(journey, templateKey);
  } else {
    populateTemplateRouteCoachBody();
  }
  populateTemplateWizardHoursBody(journey, templateKey);

  openJourneysDialogSync();
  showSettingsDetailView();
  renderTemplateWizardStep();
  templateRouteCoach.hidden = false;
  // Native AdMob sits above the WebView — hide while the setup wizard is up.
  void window.NextTrainAds?.hideNativeBanner?.({ force: true });
  syncTemplateWizardChrome();
  window.requestAnimationFrame(() => syncTemplateWizardCoachPosition());
}

function isTemplateWizardActive() {
  return Boolean(templateRouteCoach && !templateRouteCoach.hidden);
}

let listenersBound = false;
function initTemplateWizardListeners() {
  if (listenersBound) {
    return;
  }
  listenersBound = true;
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
  getTemplateWizardRouteStep,
  getTemplateWizardTimeStep,
  getTemplateWizardReminderStep,
  getTemplateWizardHoursStep,
  getTemplateWizardMaxStep,
  hasSeenTemplateWizard,
  hasSkippedTemplateWizard,
  isTemplateWizardReminderDemoActive,
  isTemplateWizardActive,
  showTemplateRouteCoach,
  skipTemplateWizard,
  shouldShowTemplateRouteCoach,
  updateTemplateRouteCoachState,
  initTemplateWizardListeners,
};

global.nextTrainTemplateWizard = api;
})(window);
