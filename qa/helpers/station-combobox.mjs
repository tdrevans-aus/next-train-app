/**
 * Playwright helpers for station combobox (journey detail + Near me).
 */
export function stationDisplayLabel(canonical) {
  if (canonical === "Perth Stn" || canonical === "Perth Underground Stn") {
    return "Perth";
  }

  return canonical.replace(/ Stn$/, "");
}

export async function openStationSearch(page, { rootSelector, inputSelector, listboxSelector }) {
  const input = page.locator(inputSelector);
  const searchInput = page.locator(`${rootSelector} .station-combobox-search-input`);
  const searchRow = page.locator(`${listboxSelector} .station-combobox-search`);

  await input.click();

  // docs/jim-brief-country-wide-station-picker.md #2: the detail ("Choose
  // station") combobox now jumps straight to search mode on open — no
  // intermediate "Search stations" row. The nearby-mode combobox is
  // unchanged and still shows that row first.
  let searchInputVisible = await searchInput
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);

  if (!searchInputVisible) {
    // The click may have landed inside the picker's brief re-open
    // suppression window right after a previous close (markPickerJustClosed
    // in station-combobox.js) — Enter bypasses that gate, and also opens
    // straight to search mode the same way a click would.
    await input.press("Enter");
    searchInputVisible = await searchInput
      .waitFor({ state: "visible", timeout: 4000 })
      .then(() => true)
      .catch(() => false);
  }

  if (searchInputVisible) {
    return;
  }

  // Fall back to the nearby-mode picker's browse-then-search shape.
  await searchRow.waitFor({ state: "visible", timeout: 20000 });
  await searchRow.click();
  await page.waitForSelector(`${rootSelector} .station-combobox-search-input`, {
    state: "visible",
    timeout: 10000,
  });
}

export async function waitForDirectionSelectReady(page, { selectId = "detail-direction-select", timeout = 15000 } = {}) {
  await page.waitForFunction(
    (id) => {
      const select = document.getElementById(id);
      if (!select || select.disabled) {
        return false;
      }
      const realOptions = [...select.options].filter(
        (option) => option.value && !option.disabled
      );
      return realOptions.length >= 1;
    },
    selectId,
    { timeout }
  );
}

export async function pickStationCombobox(
  page,
  { rootSelector, inputSelector, listboxSelector, station, waitForDirections = null }
) {
  const label = stationDisplayLabel(station);
  const query = label.slice(0, Math.min(4, label.length));

  await openStationSearch(page, { rootSelector, inputSelector, listboxSelector });
  await page.locator(`${rootSelector} .station-combobox-search-input`).fill(query);
  await page.waitForSelector(`${listboxSelector} .station-combobox-option`, { timeout: 20000 });
  await page
    .locator(`${listboxSelector} .station-combobox-option`)
    .filter({ hasText: label })
    .first()
    .click();
  await page.waitForFunction(
    (selector) =>
      !document.querySelector(selector)?.closest("#settings-detail-view")?.classList.contains(
        "station-picker-open"
      ),
    rootSelector,
    { timeout: 5000 }
  ).catch(() => {});

  const shouldWaitForDirections =
    waitForDirections ??
    Boolean(await page.locator("#detail-direction-select").isVisible().catch(() => false));

  if (shouldWaitForDirections) {
    await waitForDirectionSelectReady(page);
  }
  await page.waitForTimeout(200);
}

export async function waitForDetailStationCombobox(page) {
  await page.locator("#detail-station-input").click();
  await page.waitForFunction(
    () => document.querySelectorAll("#detail-station-listbox .station-combobox-option").length > 0,
    null,
    { timeout: 20000 }
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => !document.getElementById("settings-detail-view")?.classList.contains("station-picker-open"),
    null,
    { timeout: 5000 }
  );
  await page.waitForTimeout(150);
}
