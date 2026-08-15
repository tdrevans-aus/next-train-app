/** Open Commutes library and start a custom commute. */
export async function openCustomJourneyCreate(page) {
  await page.evaluate(() => window.nextTrainApp.openCommutesLibrary?.());
  await page.waitForTimeout(400);
  await page.locator("#journey-setup-commute-btn").click();
}
