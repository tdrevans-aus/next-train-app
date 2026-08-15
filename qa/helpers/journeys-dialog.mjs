/**
 * Playwright helpers — My Journeys dialog (double-tap chrome, backdrop cleanup).
 */
export async function closeJourneysDialog(page) {
  await page.evaluate(() => {
    if (window.nextTrainApp?.closeJourneysDialog) {
      window.nextTrainApp.closeJourneysDialog();
      return;
    }
    const backdrop = document.getElementById("journeys-dialog-backdrop");
    if (backdrop) backdrop.hidden = true;
    const d = document.getElementById("journeys-dialog");
    if (d) {
      if (d.open) d.close();
      d.removeAttribute("open");
      d.hidden = true;
    }
    document.body.classList.remove("app-dialog-open");
  });
  await page.waitForTimeout(300);
}

/** Open Commutes library sheet. */
export async function openCommutesLibraryDialog(page) {
  await closeJourneysDialog(page);
  await page.evaluate(() => window.nextTrainApp.openCommutesLibrary?.());
  await page.waitForTimeout(800);
}

export async function openJourneysDialog(page) {
  await openCommutesLibraryDialog(page);
}

export async function dismissTemplateCoach(page) {
  await page.evaluate(() => {
    const coach = document.getElementById("template-route-coach");
    if (coach) {
      coach.hidden = true;
    }
  });
}

/** Time-to-station slider only appears when Target train is on. */
export async function enableTargetTrainOnDetail(page) {
  await dismissTemplateCoach(page);
  await page.evaluate(() => {
    const checkbox = document.getElementById("detail-use-target-train");
    if (checkbox && !checkbox.checked) {
      checkbox.click();
    }
  });
  await page.waitForTimeout(400);
  await page.locator("#detail-leave-before-input").waitFor({ state: "visible", timeout: 5000 });
}

export async function openJourneyDetail(page, journeyId, options = {}) {
  await openJourneysDialog(page);
  const opened = await page.evaluate(async (id) => {
    if (typeof window.nextTrainApp?.openJourneyDetail !== "function") {
      return false;
    }
    await window.nextTrainApp.openJourneyDetail(id);
    return true;
  }, journeyId);
  if (!opened) {
    await page
      .locator(`.journey-list-item[data-journey-id="${journeyId}"] .journey-list-open-btn`)
      .click({ timeout: 15000 });
  }
  await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
  await page.waitForTimeout(400);
  if (options.enableTargetTrain) {
    await enableTargetTrainOnDetail(page);
  }
}

export async function clickJourneysDone(page) {
  await page.evaluate(() => document.getElementById("journeys-done-btn")?.click());
  await page.waitForTimeout(500);
}

export async function clickMenuDone(page) {
  await page.evaluate(() => document.getElementById("menu-done-btn")?.click());
  await page.waitForTimeout(500);
}
