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
