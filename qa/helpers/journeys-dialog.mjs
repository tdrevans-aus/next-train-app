/**
 * Playwright helpers — My Journeys dialog (double-tap chrome, backdrop cleanup).
 */
import { clickJourneyListItem, openJourneysLibrary } from "./travel-library.mjs";

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

/** Open Journeys library sheet. */
export async function openJourneysLibraryDialog(page) {
  await closeJourneysDialog(page);
  await openJourneysLibrary(page);
  await page.waitForTimeout(300);
}

export async function openJourneysDialog(page) {
  await openJourneysLibraryDialog(page);
}

export async function dismissTemplateCoach(page) {
  await page.evaluate(() => {
    const coach = document.getElementById("template-route-coach");
    if (coach) {
      coach.hidden = true;
    }
  });
}

/** Target train time + walk buffer are always shown for journey-kind items. */
export async function enableTargetTrainOnDetail(page) {
  await dismissTemplateCoach(page);
  await page.locator("#detail-target-nest").waitFor({ state: "visible", timeout: 5000 });
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
    await clickJourneyListItem(page, journeyId);
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
