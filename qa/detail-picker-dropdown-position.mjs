/**
 * Routes editor: the Departure-station dropdown anchors to its own trigger
 * field, not offset by the journeys-dialog's centring
 * (docs/jim-brief-detail-picker-dropdown-offset.md).
 *
 * Root cause: `.journeys-dialog.journeys-dialog--detail:not([hidden])`
 * (public/styles/dialogs.css) centred itself with `transform:
 * translateX(-50%)`. A `transform` on an ancestor makes it the containing
 * block for any `position: fixed` descendant, so the dropdown's
 * viewport-relative top/left (public/station-combobox.js,
 * syncDetailDropdownPosition(), computed from trigger.getBoundingClientRect())
 * resolved against the dialog's own box instead of the real viewport —
 * offsetting the dropdown by the dialog's position. The fix drops the
 * `transform` for `left/right: 0; margin-inline: auto` (auto-margin
 * centring), which centres the same box without creating a containing
 * block, so `position: fixed` keeps resolving against the viewport with no
 * JS change needed.
 *
 * An earlier draft of this fix portaled the dropdown to document.body
 * instead. That also anchored correctly, but broke real click/fill
 * actionability on anything inside it (Playwright's isEnabled() flipped to
 * false, and a forced click landed without opening its target) — moving the
 * dropdown outside the dialog's `role="dialog" aria-modal="true"` region
 * apparently drops it out of the accessible interactive scope Chromium
 * builds for an aria-modal container. The CSS-only fix avoids that; the
 * dropdown never leaves the dialog's DOM subtree.
 *
 * Note: only #detail-station-combobox ("Departure station") is a custom
 * combobox with a fixed-position dropdown inside this dialog. "Trains to"
 * (#detail-direction-select) is a native <select> with no custom dropdown to
 * mis-anchor, so it isn't a second instance of this bug and isn't asserted
 * here.
 *
 * Usage: node qa/detail-picker-dropdown-position.mjs
 */
import { chromium } from "playwright";
import { openCustomJourneyCreate } from "./helpers/open-custom-journey.mjs";
import { openStationSearch } from "./helpers/station-combobox.mjs";
import { BASE } from "./helpers/dev-server.mjs";

const MAX_TOP_OFFSET_PX = 8;
const MAX_LEFT_OFFSET_PX = 4;

const VIEWPORTS = [
  { label: "mobile", width: 375, height: 812 },
  { label: "desktop", width: 1280, height: 900 },
];

async function dismissCoach(page) {
  const skip = page.locator("#template-wizard-skip-btn");
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    const coach = document.getElementById("template-route-coach");
    if (coach) {
      coach.hidden = true;
    }
  });
}

async function measureAnchor(page) {
  return page.evaluate(() => {
    const trigger = document.getElementById("detail-station-input");
    const list = document.getElementById("detail-station-listbox");
    const dropdown = list?.parentElement;
    if (!trigger || !dropdown) {
      return null;
    }
    const t = trigger.getBoundingClientRect();
    const d = dropdown.getBoundingClientRect();
    return {
      triggerBottom: t.bottom,
      triggerLeft: t.left,
      dropdownTop: d.top,
      dropdownLeft: d.left,
      dropdownPosition: getComputedStyle(dropdown).position,
    };
  });
}

function assertAnchored(measurement, label) {
  if (!measurement) {
    console.error(`FAIL — ${label}: could not measure trigger/dropdown`);
    process.exitCode = 1;
    return;
  }
  const topOffset = measurement.dropdownTop - measurement.triggerBottom;
  const leftOffset = measurement.dropdownLeft - measurement.triggerLeft;
  const ok =
    Math.abs(topOffset) <= MAX_TOP_OFFSET_PX && Math.abs(leftOffset) <= MAX_LEFT_OFFSET_PX;
  if (ok) {
    console.log(
      `PASS — ${label}: top offset ${topOffset.toFixed(1)}px (max ${MAX_TOP_OFFSET_PX}), ` +
        `left offset ${leftOffset.toFixed(1)}px (max ${MAX_LEFT_OFFSET_PX})`
    );
  } else {
    console.error(
      `FAIL — ${label}: top offset ${topOffset.toFixed(1)}px (max ${MAX_TOP_OFFSET_PX}), ` +
        `left offset ${leftOffset.toFixed(1)}px (max ${MAX_LEFT_OFFSET_PX})`
    );
    process.exitCode = 1;
  }
}

async function openDetailPicker(page) {
  await openStationSearch(page, {
    rootSelector: "#detail-station-combobox",
    inputSelector: "#detail-station-input",
    listboxSelector: "#detail-station-listbox",
  });
  // The search input becomes visible synchronously (enterSearchMode), but
  // the actual position sync only runs once the async station list load
  // resolves (renderList + syncDetailDropdownPosition share that .then()) —
  // wait for the dropdown to actually be positioned (position: fixed) before
  // measuring, or the assertions below could pass by coincidence against
  // its pre-sync, still in-flow CSS position.
  await page.waitForFunction(
    () => {
      const list = document.getElementById("detail-station-listbox");
      const dropdown = list?.parentElement;
      return Boolean(
        dropdown && !dropdown.hidden && getComputedStyle(dropdown).position === "fixed"
      );
    },
    null,
    { timeout: 20000 }
  );
}

async function closeDetailPicker(page) {
  await page.keyboard.press("Escape");
  await page
    .waitForFunction(
      () =>
        !document
          .getElementById("settings-detail-view")
          ?.classList.contains("station-picker-open"),
      null,
      { timeout: 5000 }
    )
    .catch(() => {});
  await page.waitForTimeout(150);
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
    await page.waitForTimeout(1200);

    await openCustomJourneyCreate(page);
    await dismissCoach(page);
    await page.locator("#detail-station-input").waitFor({ state: "visible", timeout: 15000 });

    // 1. Initial open — anchored directly under its own trigger, not offset
    // by the dialog's centring.
    await openDetailPicker(page);
    assertAnchored(await measureAnchor(page), `${viewport.label} — initial open`);

    // 1b. The row is genuinely clickable — not just correctly positioned.
    // This is the assertion an earlier (portal-based) draft of this fix
    // silently broke: the dropdown measured "correctly anchored" while
    // actually being inert to real clicks. Search for something with no
    // matches so the coverage row is the only thing to click.
    await page.locator("#detail-station-combobox .station-combobox-search-input").fill("zzzzzzzzzzzz");
    await page.waitForSelector("#detail-station-listbox .station-combobox-empty", { timeout: 10000 });
    const coverageRow = page.locator("#detail-station-listbox .station-combobox-coverage-row");
    const rowClickable = await coverageRow
      .click({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    const helpDialogOpened = rowClickable
      ? await page
          .waitForFunction(() => document.getElementById("help-dialog")?.open === true, null, {
            timeout: 5000,
          })
          .then(() => true)
          .catch(() => false)
      : false;
    if (helpDialogOpened) {
      console.log(`PASS — ${viewport.label}: dropdown rows are genuinely clickable, not just correctly positioned`);
      await page.evaluate(() => {
        window.nextTrainApp?.closeAppDialog?.(document.getElementById("help-dialog"));
      });
    } else {
      console.error(
        `FAIL — ${viewport.label}: coverage row did not open Help on click (rowClickable=${rowClickable})`
      );
      process.exitCode = 1;
    }
    await closeDetailPicker(page);

    // 2. Scroll the dialog body, then reopen — anchor must track the
    // trigger's current position, not a stale pre-scroll one.
    const scrolled = await page.evaluate(() => {
      const scrollRoot = document.querySelector("#settings-detail-view .settings-detail-scroll");
      if (!scrollRoot) {
        return false;
      }
      scrollRoot.scrollTop = 40;
      return scrollRoot.scrollTop > 0;
    });
    await page.waitForTimeout(150);
    await openDetailPicker(page);
    assertAnchored(
      await measureAnchor(page),
      `${viewport.label} — after scrolling the dialog body` +
        (scrolled ? "" : " (form too short to scroll at this size — anchor still checked)")
    );

    // 3. While still open, fire the resize re-sync listener — a proxy for a
    // real Android on-screen-keyboard open/close, which resizes
    // visualViewport/window — and confirm the dropdown followed the
    // trigger rather than staying put at its pre-resize position.
    await page.setViewportSize({
      width: viewport.width,
      height: Math.max(400, viewport.height - 250),
    });
    await page.waitForTimeout(250);
    assertAnchored(
      await measureAnchor(page),
      `${viewport.label} — after resize while open (keyboard-open proxy)`
    );

    await closeDetailPicker(page);
    await context.close();
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
