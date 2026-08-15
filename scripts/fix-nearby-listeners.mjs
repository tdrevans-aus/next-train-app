import fs from "node:fs";

const p = "public/nearby-mode.js";
let c = fs.readFileSync(p, "utf8");
const start = c.indexOf("function initNearbyListeners");
const end = c.indexOf("  function init(nextDeps");
if (start < 0 || end < 0) {
  throw new Error("markers not found");
}

const listeners = `function initNearbyListeners() {
  nearbyBtn?.addEventListener("click", () => {
    nearbyBtn?.classList.add("icon-btn--refreshing");
    Promise.resolve(enterNearbyMode()).finally(() => {
      window.setTimeout(() => nearbyBtn?.classList.remove("icon-btn--refreshing"), 300);
    });
  });

  nearbyDontWaitBtn?.addEventListener("click", () => {
    if (!nearbyLoading || nearbyLocatePickerVisible) {
      return;
    }
    showNearbyEarlyPicker();
    if (isNearbyModeActive() && nearbyLoading) {
      renderNearbyBoard();
    }
  });

  nearbyStationBtn?.addEventListener("click", async () => {
    const station = getNearbyStationCombobox()?.getValue?.();
    if (!station) {
      if (nearbyFallbackTextEl) {
        nearbyFallbackTextEl.textContent = "Pick a station from the list first.";
      }
      getNearbyStationCombobox()?.focus?.();
      return;
    }
    await applyNearbyManualStation(station);
  });

  nearbyLeaveBeforeInput?.addEventListener("input", () => {
    updateNearbyLeaveBeforeLabel();
    const minutes = Number(nearbyLeaveBeforeInput.value);
    if (!Number.isFinite(minutes)) {
      return;
    }
    persistSettings({ nearbyLeaveBeforeMinutes: minutes });
    if (isNearbyPinHolding()) {
      syncNearbyPinSettings();
      renderNearbyBoard();
    }
  });

  nearbyNotifyMeInput?.addEventListener("change", () => {
    void handleNearbyNotifyToggle();
  });

  nearbyLeaveHideBtn?.addEventListener("click", () => {
    dismissNearbyPinLeaveCard();
  });
}

`;

c = c.slice(0, start) + listeners + c.slice(end);
// Remove mangled duplicate block before initNearbyListeners
const mangled = c.indexOf("nearbyStationBtn?.addEventListener");
const initIdx = c.indexOf("function initNearbyListeners");
if (mangled >= 0 && mangled < initIdx) {
  c = c.slice(0, mangled) + c.slice(initIdx);
}

fs.writeFileSync(p, c);
console.log("Fixed listeners");
