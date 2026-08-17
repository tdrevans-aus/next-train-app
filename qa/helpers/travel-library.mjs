/** Routes / Journeys library + route editor (FB-23 Q7). */
export async function openRoutesLibrary(page) {
  await page.evaluate(() => window.nextTrainApp.openRoutesLibrary?.());
  await page.waitForTimeout(500);
}

export async function openJourneysLibrary(page) {
  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary?.());
  await page.waitForTimeout(500);
}

export async function openRouteCreate(page) {
  await openRoutesLibrary(page);
  await page.locator("#journey-save-route-btn").click();
  await page.waitForTimeout(600);
}

export async function openJourneySetup(page) {
  await openJourneysLibrary(page);
  await page.locator("#journey-setup-btn").click();
  await page.waitForTimeout(600);
}

/** Click a saved journey/route row in the open library sheet. */
export async function clickJourneyListItem(page, journeyId) {
  const opened = await page.evaluate(async (id) => {
    if (typeof window.nextTrainApp?.openJourneyDetail !== "function") {
      return false;
    }
    await window.nextTrainApp.openJourneyDetail(id);
    return true;
  }, journeyId);
  if (opened) {
    await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
    return;
  }
  await page
    .locator(`.journey-list-item[data-journey-id="${journeyId}"] .journey-list-open-btn`)
    .click({ timeout: 15000 });
}

/** Persist journeys via the shared model (schema v2 + normalized kind). */
export async function seedPersistedJourneys(page, journeys, options = {}) {
  const {
    activeJourneyId = journeys[0]?.id ?? null,
    onboardingDone = true,
    templateWizardSeen = true,
  } = options;

  await page.evaluate(
    ({ journeys, activeJourneyId, onboardingDone, templateWizardSeen }) => {
      const jm = window.nextTrainJourneyModel;
      jm.persistSettings({
        settingsSchemaVersion: 2,
        refreshSeconds: 60,
        activeJourneyId,
        journeys: journeys.map((journey) => jm.normalizeJourney(journey)),
      });
      if (onboardingDone) {
        localStorage.setItem("nextTrainOnboardingDone", "1");
      }
      if (templateWizardSeen) {
        localStorage.setItem("nextTrainTemplateWizardSeen", "1");
      }
    },
    { journeys, activeJourneyId, onboardingDone, templateWizardSeen }
  );
}

export async function dismissTemplateWizardCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(300);
  }
}

export async function readChromeLabels(page) {
  return page.evaluate(() => ({
    nearby: document.querySelector("#nearby-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    routes: document.querySelector("#routes-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    journeys: document.querySelector("#journeys-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    menu: document.querySelector("#menu-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    legacyCommutesChromeRemoved: !document.getElementById("commutes-btn"),
  }));
}

export async function seedMixedJourneys(page) {
  await page.evaluate(() => {
    const jm = window.nextTrainJourneyModel;
    jm.persistSettings({
      settingsSchemaVersion: 2,
      refreshSeconds: 30,
      activeJourneyId: "route-a",
      journeys: [
        jm.createRouteJourney({
          id: "route-a",
          station: "Edgewater Stn",
          direction: "Perth",
        }),
        jm.normalizeJourney({
          id: "journey-a",
          kind: "journey",
          name: "Morning",
          station: "Edgewater Stn",
          direction: "Perth",
          defaultFrom: "06:00",
          defaultUntil: "09:00",
          preferredTrainTime: "07:30",
        }),
        jm.createRouteJourney({
          id: "route-b",
          station: "Perth Stn",
          direction: "Mandurah",
        }),
      ],
    });
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
  });
}
