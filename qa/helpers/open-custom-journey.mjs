/** Open Journeys library and start a custom journey. */
export async function openCustomJourneyCreate(page) {
  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary?.());
  await page.waitForTimeout(400);
  await page.locator("#journey-setup-btn").click();
}
