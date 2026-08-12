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

export async function openJourneysDialog(page) {
  await closeJourneysDialog(page);
  const inJourneyMode = await page.locator("#journeys-btn").getAttribute("aria-pressed");
  if (inJourneyMode === "true") {
    await page.evaluate(() => window.nextTrainApp?.openJourneys?.());
  } else {
    await page.locator("#journeys-btn").click();
    await page.waitForTimeout(500);
    await page.locator("#journeys-btn").click();
  }
  await page.waitForTimeout(800);
}

export async function openJourneyDetail(page, journeyId) {
  await openJourneysDialog(page);
  await page.locator(`.journey-list-item[data-journey-id="${journeyId}"] .journey-list-open-btn`).click();
  await page.waitForTimeout(1500);
}

export async function clickJourneysDone(page) {
  await page.evaluate(() => document.getElementById("journeys-done-btn")?.click());
  await page.waitForTimeout(500);
}

export async function clickMenuDone(page) {
  await page.evaluate(() => document.getElementById("menu-done-btn")?.click());
  await page.waitForTimeout(500);
}
