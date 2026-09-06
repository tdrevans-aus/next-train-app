/**
 * "What's covered in <Region>" — Help dialog entry, docs/jim-brief-help-coverage-notes.md.
 *
 * Renders the active region's lib/cities/<city>/coverage.json (bundled file first, API
 * second, same order as brisbane-dogfood.js's direction chips) into the Help dialog, and
 * exposes NextTrainHelpCoverage.open() as the shared handler for every entry point:
 * the picker's "Can't find your station?" row, the "?" icon button, and the out-of-area
 * card's "See what's covered" link.
 */
(function () {
  const cache = new Map();

  function planningCityId() {
    return (
      window.NextTrainCitySession?.readSavedCity?.() ||
      window.NextTrainCitySession?.LIVE_CITY ||
      "perth"
    );
  }

  function regionLabel(city) {
    return window.NextTrainCitySession?.regionDisplayName?.(city) || "your region";
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function productionOrigin() {
    return window.NextTrainCitySession?.VERCEL_ORIGIN || "https://next-train-app.vercel.app";
  }

  /** Bundled file first (native APK / static web build), API second (dev/uncached). */
  async function loadCoverageNotes(city) {
    if (cache.has(city)) {
      return cache.get(city);
    }
    const promise = (async () => {
      try {
        return await fetchJsonWithTimeout(`/coverage-notes/${encodeURIComponent(city)}.json`, 4000);
      } catch {
        try {
          const origin = productionOrigin();
          return await fetchJsonWithTimeout(
            `${origin}/api/coverage-notes?city=${encodeURIComponent(city)}`,
            8000
          );
        } catch {
          return null;
        }
      }
    })();
    cache.set(city, promise);
    return promise;
  }

  function invalidateCache(city) {
    if (city) {
      cache.delete(city);
    } else {
      cache.clear();
    }
  }

  function appendList(container, items, { withDetail }) {
    container.replaceChildren();
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    for (const item of list) {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = item?.label || "";
      li.append(strong);
      if (withDetail && item?.detail) {
        li.append(document.createTextNode(` — ${item.detail}`));
      }
      container.append(li);
    }
  }

  function formatUpdated(dateStr) {
    if (!dateStr) {
      return "";
    }
    try {
      const date = new Date(`${dateStr}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        return dateStr;
      }
      return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  }

  async function renderHelpCoverageEntry() {
    const region = planningCityId();
    const titleEl = document.getElementById("help-coverage-title");
    const bodyEl = document.getElementById("help-coverage-body");
    if (!titleEl || !bodyEl) {
      return;
    }
    titleEl.textContent = `What's covered in ${regionLabel(region)}`;

    const coveredEl = document.getElementById("help-coverage-covered");
    const partialEl = document.getElementById("help-coverage-partial");
    const notCoveredEl = document.getElementById("help-coverage-not-covered");
    const stationsEl = document.getElementById("help-coverage-stations");
    const notesEl = document.getElementById("help-coverage-notes");
    const updatedEl = document.getElementById("help-coverage-updated");

    const notes = await loadCoverageNotes(region);
    // The active region may have changed while this fetch was in flight.
    if (planningCityId() !== region) {
      return;
    }

    if (!notes) {
      appendList(coveredEl, [], { withDetail: false });
      appendList(partialEl, [], { withDetail: true });
      appendList(notCoveredEl, [], { withDetail: true });
      if (stationsEl) stationsEl.textContent = "";
      if (notesEl) {
        notesEl.textContent = "Coverage details aren't available right now.";
        notesEl.hidden = false;
      }
      if (updatedEl) updatedEl.textContent = "";
      return;
    }

    appendList(coveredEl, notes.covered, { withDetail: true });
    appendList(partialEl, notes.partial, { withDetail: true });
    appendList(notCoveredEl, notes.notCovered, { withDetail: true });
    if (stationsEl) {
      stationsEl.textContent = notes.stations || "";
      stationsEl.hidden = !notes.stations;
    }
    if (notesEl) {
      notesEl.textContent = notes.notes || "";
      notesEl.hidden = !notes.notes;
    }
    if (updatedEl) {
      const formatted = formatUpdated(notes.updated);
      updatedEl.textContent = formatted ? `Last checked ${formatted}` : "";
    }
  }

  function openHelpCoverageEntry() {
    const dialog = document.getElementById("help-dialog");
    window.nextTrainApp?.openAppDialog?.(dialog);
    const details = document.getElementById("help-coverage-faq");
    if (details) {
      details.open = true;
    }
    void renderHelpCoverageEntry().then(() => {
      details?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    });
  }

  document.getElementById("menu-help-btn")?.addEventListener("click", () => {
    void renderHelpCoverageEntry();
  });

  document.getElementById("help-coverage-other-regions-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    window.nextTrainApp?.closeAppDialog?.(document.getElementById("help-dialog"));
    window.NextTrainCitySession?.openRegionScreen?.();
  });

  /**
   * Entry point B (docs/jim-brief-help-coverage-notes.md) — a small "?" icon-button beside
   * the "Choose station" label, same handler as entry point A. Cheap, always-visible chrome;
   * kept behind the same handler pending Tim's decision on whether to keep it after seeing A.
   */
  const COVERAGE_ICON_BTN_IDS = ["nearby-station-coverage-btn", "detail-station-coverage-btn"];
  function syncCoverageIconButtons() {
    const region = planningCityId();
    const label = `What's covered in ${regionLabel(region)}`;
    for (const id of COVERAGE_ICON_BTN_IDS) {
      document.getElementById(id)?.setAttribute("aria-label", label);
    }
  }
  for (const id of COVERAGE_ICON_BTN_IDS) {
    document.getElementById(id)?.addEventListener("click", (event) => {
      event.preventDefault();
      openHelpCoverageEntry();
    });
  }
  syncCoverageIconButtons();
  document.addEventListener("nexttrain:city-changed", syncCoverageIconButtons);

  document.addEventListener("nexttrain:city-changed", () => {
    invalidateCache();
    const helpDialog = document.getElementById("help-dialog");
    if (helpDialog && helpDialog.open) {
      void renderHelpCoverageEntry();
    }
  });

  window.NextTrainHelpCoverage = {
    render: renderHelpCoverageEntry,
    open: openHelpCoverageEntry,
    invalidateCache,
    regionLabel,
  };
})();
