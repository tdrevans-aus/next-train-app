/** Simulates native AdMob overlay (fixed banner + margin) for web regression tests. */
export const NATIVE_AD_SIM_BOTTOM_MARGIN_PX = 72;
export const NATIVE_AD_SIM_HEIGHT_PX = 60;
export const NATIVE_AD_GAP_PX = 4;

export function rectsOverlap(a, b, gap = 0) {
  return (
    a.left < b.right - gap &&
    a.right > b.left + gap &&
    a.top < b.bottom - gap &&
    a.bottom > b.top + gap
  );
}

export async function installNativeAdSimulator(page) {
  await page.evaluate(
    ({ bottomMargin, height }) => {
      document.body.classList.add("native-ad-banner");

      let sim = document.getElementById("qa-native-ad-sim");
      if (!sim) {
        sim = document.createElement("div");
        sim.id = "qa-native-ad-sim";
        sim.setAttribute("aria-hidden", "true");
        sim.textContent = "Test Ad";
        sim.style.cssText =
          `position:fixed;left:0;right:0;bottom:${bottomMargin}px;height:${height}px;z-index:9999;` +
          "background:#fff;border-top:1px solid #ccc;font-size:12px;" +
          "display:flex;align-items:center;justify-content:center;pointer-events:none;";
        document.body.appendChild(sim);
      }
    },
    {
      bottomMargin: NATIVE_AD_SIM_BOTTOM_MARGIN_PX,
      height: NATIVE_AD_SIM_HEIGHT_PX,
    }
  );
}

export async function hideNativeAdSimulatorOverlay(page) {
  await page.evaluate(() => {
    const sim = document.getElementById("qa-native-ad-sim");
    if (sim) {
      sim.style.display = "none";
    }
  });
}

export async function removeNativeAdPaddingClass(page) {
  await page.evaluate(() => {
    document.body.classList.remove("native-ad-banner");
  });
}

export async function removeNativeAdSimulator(page) {
  await page.evaluate(() => {
    document.body.classList.remove("native-ad-banner");
    document.getElementById("qa-native-ad-sim")?.remove();
  });
}
