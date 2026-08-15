/** Routes / Commutes library + route editor (FB-23 Q7). */
export async function openRoutesLibrary(page) {
  await page.evaluate(() => window.nextTrainApp.openRoutesLibrary?.());
  await page.waitForTimeout(500);
}

export async function openCommutesLibrary(page) {
  await page.evaluate(() => window.nextTrainApp.openCommutesLibrary?.());
  await page.waitForTimeout(500);
}

export async function openRouteCreate(page) {
  await openRoutesLibrary(page);
  await page.locator("#journey-save-route-btn").click();
  await page.waitForTimeout(600);
}

export async function openCommuteSetup(page) {
  await openCommutesLibrary(page);
  await page.locator("#journey-setup-commute-btn").click();
  await page.waitForTimeout(600);
}

export async function readChromeLabels(page) {
  return page.evaluate(() => ({
    nearby: document.querySelector("#nearby-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    routes: document.querySelector("#routes-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    commutes: document.querySelector("#commutes-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    menu: document.querySelector("#menu-chrome-action .chrome-action-label")?.textContent?.trim() ?? "",
    journeysBtnGone: !document.getElementById("journeys-btn"),
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
          id: "commute-a",
          kind: "commute",
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
