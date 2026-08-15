/** Click the primary Add journey control (FB-29). */
export async function openCustomJourneyCreate(page) {
  await page.locator("#journey-add-btn").click();
}
