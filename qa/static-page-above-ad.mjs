/**
 * Regression: About / Privacy static pages must scroll clear of the native ad zone.
 * Usage: node qa/static-page-above-ad.mjs
 */
import { chromium } from "playwright";
import {
  installNativeAdSimulator,
  removeNativeAdPaddingClass,
  NATIVE_AD_GAP_PX,
} from "./helpers/native-ad-sim.mjs";

import { BASE } from "./helpers/dev-server.mjs";
const VIEWPORT = { width: 390, height: 844 };

const STATIC_PAGES = [
  {
    name: "about",
    path: "/about.html",
    targets: [
      { selector: "h2", text: "Ads & remove ads", label: "Ads section heading" },
      { selector: ".page-links", label: "Privacy link row" },
    ],
  },
  {
    name: "privacy",
    path: "/privacy.html",
    targets: [
      { selector: "h2", text: "Disclaimer", label: "Disclaimer heading" },
      { selector: "h2", text: "Contact", label: "Contact heading" },
    ],
  },
];

async function auditStaticPage(page, targets) {
  return page.evaluate(
    ({ gap, targets: pageTargets }) => {
      const sim = document.getElementById("qa-native-ad-sim");
      const pageMain = document.querySelector("main.page");
      if (!sim || !pageMain) {
        return { ok: false, error: "missing simulator or main.page" };
      }

      window.scrollTo(0, document.body.scrollHeight);
      const adRect = sim.getBoundingClientRect();
      const issues = [];

      for (const target of pageTargets) {
        let el = null;
        if (target.text) {
          el = [...document.querySelectorAll(target.selector)].find(
            (node) => node.textContent?.trim() === target.text
          );
        } else {
          el = document.querySelector(target.selector);
        }

        if (!el || el.hidden) {
          issues.push({ label: target.label, error: "element missing" });
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

      return {
        ok: issues.length === 0,
        issues,
        paddingBottom: getComputedStyle(pageMain).paddingBottom,
        nativeAdClass: document.body.classList.contains("native-ad-banner"),
      };
    },
    { gap: NATIVE_AD_GAP_PX, targets }
  );
}

async function runStaticPage(browser, pageConfig) {
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  await page.goto(`${BASE}${pageConfig.path}`);
  await page.waitForTimeout(500);

  await installNativeAdSimulator(page);
  await page.waitForTimeout(200);
  const withPadding = await auditStaticPage(page, pageConfig.targets);

  await removeNativeAdPaddingClass(page);
  await page.waitForTimeout(100);
  const withoutPadding = await auditStaticPage(page, pageConfig.targets);

  await page.close();

  if (withPadding.error) {
    return { name: pageConfig.name, ok: false, detail: withPadding.error };
  }
  if (!withPadding.ok) {
    return {
      name: pageConfig.name,
      ok: false,
      detail: `overlap with fix: ${JSON.stringify(withPadding.issues)}`,
    };
  }

  const paddingWith = parseFloat(withPadding.paddingBottom) || 0;
  const paddingWithout = parseFloat(withoutPadding.paddingBottom) || 0;
  if (paddingWith <= paddingWithout) {
    return {
      name: pageConfig.name,
      ok: false,
      detail: `padding did not increase (${paddingWithout} → ${paddingWith})`,
    };
  }

  return {
    name: pageConfig.name,
    ok: true,
    detail: `padding ${withPadding.paddingBottom} (was ${withoutPadding.paddingBottom})`,
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const pageConfig of STATIC_PAGES) {
    results.push(await runStaticPage(browser, pageConfig));
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("FAIL static-page-above-ad");
    for (const result of failed) {
      console.error(`  ${result.name}: ${result.detail}`);
    }
    process.exit(1);
  }

  console.log("PASS static-page-above-ad");
  for (const result of results) {
    console.log(`  ${result.name}: ${result.detail}`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
