/** Click Save a route (FB-23 route create). */
export async function openCustomJourneyCreate(page) {
  await page.locator("#journey-save-route-btn").click();
}
