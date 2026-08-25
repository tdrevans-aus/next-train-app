/** Open Journeys library and start a custom journey.
 *
 * Empty-state Add a journey starts the Morning commute preset. Callers that
 * need a blank Custom must already have a configured journey-kind item.
 */
export async function openCustomJourneyCreate(page) {
  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary?.());
  await page.waitForTimeout(400);
  await page.locator("#journey-setup-btn").click();
  await page.waitForSelector("#settings-detail-view", { state: "visible", timeout: 15000 });
}
