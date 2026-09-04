/**
 * Playwright helpers for first-use onboarding coach.
 */
async function waitForOnboardingStep1Once(page, timeout) {
  await page
    .waitForFunction(
      () => {
        const route = document.getElementById("route")?.textContent?.trim() ?? "";
        return route.length > 0 && !/^loading/i.test(route);
      },
      null,
      { timeout: Math.min(timeout, 20000) }
    )
    .catch(() => {});

  await page.waitForFunction(
    () => {
      const coach = document.getElementById("onboarding-coach");
      const step = document.getElementById("onboarding-step-1");
      return coach && !coach.hidden && step && !step.hidden;
    },
    null,
    { timeout }
  );
}

export async function waitForOnboardingStep1(page, { timeout = 30000 } = {}) {
  try {
    await waitForOnboardingStep1Once(page, timeout);
  } catch (firstError) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForOnboardingStep1Once(page, timeout);
  }
}

/** Click through step 1 (Near Me) and step 2 (Routes) Got it, landing on step 3 (Journeys). */
export async function advanceOnboardingToJourneysStep(page) {
  const step1Visible = await page.locator("#onboarding-step-1").isVisible().catch(() => false);
  if (!step1Visible) {
    return false;
  }

  await page.locator("#onboarding-got-it-btn").click();
  await page.waitForTimeout(300);

  const step2Visible = await page.locator("#onboarding-routes-got-it-btn").isVisible().catch(() => false);
  if (step2Visible) {
    await page.locator("#onboarding-routes-got-it-btn").click();
    await page.waitForTimeout(300);
  }
  return true;
}

/** Dismiss the 3-step onboarding coach via Maybe later. */
export async function dismissOnboardingMaybeLater(page) {
  const advanced = await advanceOnboardingToJourneysStep(page);
  if (!advanced) {
    return false;
  }

  const later = page.locator("#onboarding-later-btn");
  if (await later.isVisible().catch(() => false)) {
    await later.click();
    await page.waitForTimeout(300);
  }
  return true;
}

/** Dismiss onboarding when it is blocking chrome during a test run. */
export async function dismissOnboardingIfVisible(page) {
  const coachVisible = await page.evaluate(
    () => !document.getElementById("onboarding-coach")?.hidden
  );
  if (!coachVisible) {
    return false;
  }

  const step1Visible = await page.locator("#onboarding-step-1").isVisible().catch(() => false);
  if (step1Visible) {
    await page.locator("#onboarding-got-it-btn").click();
    await page.waitForTimeout(300);
  }

  const routesVisible = await page.locator("#onboarding-routes-got-it-btn").isVisible().catch(() => false);
  if (routesVisible) {
    await page.locator("#onboarding-routes-got-it-btn").click();
    await page.waitForTimeout(300);
    await page.locator("#onboarding-later-btn").click().catch(() => {});
    await page.waitForTimeout(300);
    return true;
  }

  const laterVisible = await page.locator("#onboarding-later-btn").isVisible().catch(() => false);
  if (laterVisible) {
    await page.locator("#onboarding-later-btn").click();
    await page.waitForTimeout(300);
    return true;
  }

  return false;
}
