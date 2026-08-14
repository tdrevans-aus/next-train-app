/**
 * Regression: long Near me boards (many directions) must scroll clear of the ad zone.
 * Native AdMob banners overlay the WebView — body.native-ad-banner adds scroll padding.
 *
 * Usage: node qa/nearby-content-above-ad.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };
const GAP_PX = 4;
const MANY_DIRECTIONS = [
  "Byford",
  "Claremont",
  "Ellenbrook",
  "Fremantle",
  "High Wycombe",
  "Mandurah",
  "Midland",
  "Yanchep",
  "Armadale",
  "Perth",
];

function rectsOverlap(a, b, gap = 0) {
  return (
    a.left < b.right - gap &&
    a.right > b.left + gap &&
    a.top < b.bottom - gap &&
    a.bottom > b.top + gap
  );
}

async function seedManyDirectionNearby(page) {
  await page.evaluate((directions) => {
    const app = document.querySelector(".app");
    app?.classList.add("nearby-mode");

    const directionsSection = document.getElementById("nearby-directions");
    const list = document.getElementById("nearby-directions-list");
    if (!directionsSection || !list) {
      return;
    }

    directionsSection.hidden = false;
    list.innerHTML = "";
    for (const direction of directions) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nearby-direction-row";
      button.textContent = `to ${direction} · 2 min · Pl 7`;
      item.appendChild(button);
      list.appendChild(item);
    }

    const following = document.getElementById("following-section");
    const followingNext = document.getElementById("following-next");
    if (following) {
      following.hidden = false;
    }
    if (followingNext) {
      followingNext.textContent = "18:07";
    }

    const updated = document.getElementById("updated");
    if (updated) {
      updated.textContent = "Updated 1 min ago";
    }

    const leaveCard = document.getElementById("leave-card");
    if (leaveCard) {
      leaveCard.hidden = true;
    }
  }, MANY_DIRECTIONS);
}

async function installNativeAdSimulator(page) {
  await page.evaluate(() => {
    document.body.classList.add("native-ad-banner");

    let sim = document.getElementById("qa-native-ad-sim");
    if (!sim) {
      sim = document.createElement("div");
      sim.id = "qa-native-ad-sim";
      sim.setAttribute("aria-hidden", "true");
      sim.textContent = "Test Ad";
      sim.style.cssText =
        "position:fixed;left:0;right:0;bottom:72px;height:60px;z-index:9999;" +
        "background:#fff;border-top:1px solid #ccc;font-size:12px;" +
        "display:flex;align-items:center;justify-content:center;pointer-events:none;";
      document.body.appendChild(sim);
    }
  });
}

async function auditBottomContentAboveAd(page) {
  return page.evaluate(({ gap }) => {
    const sim = document.getElementById("qa-native-ad-sim");
    const appBody = document.querySelector(".app-body");
    if (!sim || !appBody) {
      return { ok: false, error: "missing simulator or app-body" };
    }

    appBody.scrollTop = appBody.scrollHeight;
    const adRect = sim.getBoundingClientRect();
    const targets = [
      { id: "following-next", label: "Then row" },
      { id: "updated", label: "Updated line" },
      { id: "detail-strip", label: "Platform/status strip" },
    ];

    const issues = [];
    for (const target of targets) {
      const el = document.getElementById(target.id);
      if (!el || el.hidden) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        continue;
      }
      const overlap =
        rect.left < adRect.right - gap &&
        rect.right > adRect.left + gap &&
        rect.top < adRect.bottom - gap &&
        rect.bottom > adRect.top + gap;
      if (overlap) {
        issues.push({
          label: target.label,
          overflowBottom: Math.round(rect.bottom - adRect.top),
        });
      }
    }

    const padding = getComputedStyle(appBody).paddingBottom;
    return {
      ok: issues.length === 0,
      issues,
      scrollHeight: appBody.scrollHeight,
      clientHeight: appBody.clientHeight,
      paddingBottom: padding,
      nativeAdClass: document.body.classList.contains("native-ad-banner"),
    };
  }, { gap: GAP_PX });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  await page.goto(`${BASE}/?reset=1&test=1&fixture=normal`);
  await page.waitForTimeout(1500);

  await seedManyDirectionNearby(page);
  await installNativeAdSimulator(page);
  await page.waitForTimeout(200);

  const withPadding = await auditBottomContentAboveAd(page);

  await page.evaluate(() => {
    document.body.classList.remove("native-ad-banner");
  });
  await page.waitForTimeout(100);
  const withoutPadding = await auditBottomContentAboveAd(page);

  await browser.close();

  if (withPadding.error) {
    console.error("FAIL nearby-content-above-ad:", withPadding.error);
    process.exit(1);
  }

  if (!withPadding.ok) {
    console.error("FAIL nearby-content-above-ad — content overlaps ad with padding fix");
    console.error(JSON.stringify(withPadding, null, 2));
    process.exit(1);
  }

  if (!withoutPadding.issues?.length) {
    console.error(
      "FAIL nearby-content-above-ad — expected overlap without native-ad-banner (regression guard)"
    );
    console.error(JSON.stringify(withoutPadding, null, 2));
    process.exit(1);
  }

  console.log("PASS nearby-content-above-ad");
  console.log(
    `  ${MANY_DIRECTIONS.length} directions; padding ${withPadding.paddingBottom}; ` +
      `overlap without fix: ${withoutPadding.issues.map((i) => i.label).join(", ")}`
  );
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
