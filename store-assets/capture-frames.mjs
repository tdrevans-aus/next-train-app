/**
 * Play Store phone screenshot capture — headless, against PRODUCTION data.
 *
 * docs/jim-brief-play-screenshots-headless.md. Drives the deployed web app
 * (https://next-train-app.vercel.app) with Playwright at phone size and
 * writes PNGs into store-assets/frames/. No `?test=1`, no fixture chrome,
 * no synthesized numbers — whatever the live API returns is what gets
 * captured. Re-run this any time a fresh set of screenshots is needed for a
 * later 3.x release; it does not depend on any local dev server except for
 * frame 06 (About page), which needs one because the multi-city copy isn't
 * on `master` yet (PR #376, branch jim/privacy-copy-3.0.0-v2).
 *
 * Usage: node store-assets/capture-frames.mjs
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const FRAMES_DIR = path.join(__dirname, "frames");
const PROD_BASE = "https://next-train-app.vercel.app";
const ABOUT_BRANCH = "jim/privacy-copy-3.0.0-v2";

const VIEWPORT = { width: 360, height: 800 };
const DEVICE_SCALE_FACTOR = 3; // -> 1080x2400
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/128.0.0.0 Mobile Safari/537.36";

const PERTH_STATION = "Edgewater Stn";
const PERTH_DIRECTION = "Perth";
const PERTH_WALK_MINUTES = 8;

const LONDON_STATION = "King's Cross St. Pancras";
const LONDON_DIRECTION = "Victoria Brixton";
const LONDON_GEO = { latitude: 51.5308, longitude: -0.1238 }; // King's Cross

const captureLog = [];

function nowPerthIso() {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date());
}

function record(entry) {
  captureLog.push(entry);
  console.log(`[capture] ${entry.file}: ${entry.note}`);
}

async function newPhoneContext(browser, extra = {}) {
  return browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
    colorScheme: "light",
    locale: "en-AU",
    ...extra,
  });
}

/** Ad-free entitlement the app itself already understands (see
 * public/ad-free-purchase.js: AD_FREE_CACHE_KEY / isEntitled()). Setting it
 * before the app boots hides ad chrome without any test-mode flag. */
async function seedAdFree(page) {
  await page.evaluate(() => {
    localStorage.setItem("nextTrainAdFreeCache", "1");
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
  });
}

async function dismissAnyCoach(page) {
  const selectors = [
    "#template-wizard-skip-btn",
    "#onboarding-got-it-btn",
    "#onboarding-routes-got-it-btn",
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector);
    if (await locator.isVisible().catch(() => false)) {
      await locator.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
}

async function waitForJourneyHero(page, { timeout = 30000 } = {}) {
  await page.waitForFunction(
    () => {
      const countdown = document.getElementById("depart-countdown")?.textContent?.trim() ?? "";
      const depart = document.getElementById("depart-display-time")?.textContent?.trim() ?? "";
      return countdown && countdown !== "—" && /\d/.test(countdown) && depart && depart !== "—";
    },
    null,
    { timeout }
  );
}

async function screenshot(page, file, note, opts = {}) {
  await dismissAnyCoach(page);
  const dest = path.join(FRAMES_DIR, file);
  await page.screenshot({ path: dest, fullPage: false, ...opts });
  record({ file, note, timestampPerth: nowPerthIso() });
}

/** Frames 01 + 02: Perth journey (Edgewater -> Perth, 8-min walk), leave-by hero. */
async function captureHeroAndDelay(browser) {
  const context = await newPhoneContext(browser);
  const page = await context.newPage();

  await page.goto(`${PROD_BASE}/?reset=1`);
  await seedAdFree(page);
  await page.evaluate(
    ({ station, direction, walkMinutes }) => {
      const jm = window.nextTrainJourneyModel;
      const journey = jm.normalizeJourney({
        id: "j-perth-hero",
        kind: "journey",
        name: "Edgewater to Perth",
        station,
        direction,
        cityId: "perth",
        leaveBeforeMinutes: walkMinutes,
        useLeaveBefore: true,
        remindMe: false,
        // Every day, so the leave-card arms regardless of which weekday this
        // script runs on (the app's default schedule is Mon-Fri only).
        remindDays: [1, 2, 3, 4, 5, 6, 7],
      });
      jm.persistSettings({
        settingsSchemaVersion: 2,
        refreshSeconds: 30,
        activeJourneyId: journey.id,
        journeys: [journey],
      });
    },
    { station: PERTH_STATION, direction: PERTH_DIRECTION, walkMinutes: PERTH_WALK_MINUTES }
  );

  await page.reload();
  await page.waitForFunction(() => Boolean(window.nextTrainApp?.enterJourneyMode), null, {
    timeout: 20000,
  });
  await page.evaluate(() => {
    window.nextTrainApp.enterJourneyMode();
    window.nextTrainApp.closeJourneysDialog?.();
  });
  await waitForJourneyHero(page);
  await page.waitForTimeout(1000);

  // Frame 02 first: plain Next Train board (no target train armed yet) — the
  // honest live state, whatever it is.
  const status = await page.evaluate(() => {
    const el = document.getElementById("status");
    return el?.textContent?.trim() ?? "";
  });
  await screenshot(
    page,
    "02-delay-honesty.png",
    status
      ? `Same Perth journey; live status text on screen: "${status}". Honest live state, not synthesized.`
      : "Same Perth journey; captured whatever live status the production feed returned at capture time " +
          "(no on-time/delay text element matched a known selector — see raw PNG). No delay was manufactured."
  );

  // Frame 01: arm a target train a little further out (from the app's own
  // real "upcoming" list, not a made-up time) so the Leave-by card renders,
  // matching the brief's "Leave-by clock prominent" ask.
  const armed = await page.evaluate(async (journeyId) => {
    const times = Array.from(document.querySelectorAll(".upcoming-departures-time")).map(
      (el) => el.textContent?.trim()
    );
    const displayTime = times[0] || document.getElementById("depart-display-time")?.textContent?.trim();
    if (!displayTime || displayTime === "—") {
      return { ok: false };
    }
    sessionStorage.setItem(
      "nextTrainManualJourneyOverride",
      JSON.stringify({ journeyId, matchingWindowIds: [journeyId] })
    );
    await window.nextTrainApp.persistReminderJourneys([
      { id: journeyId, preferredTrainTime: displayTime, remindMe: false },
    ]);
    await window.nextTrainApp.fetchNextTrain();
    return { ok: true, displayTime };
  }, "j-perth-hero");

  if (armed.ok) {
    await page
      .waitForSelector("#leave-card:not([hidden])", { timeout: 15000 })
      .catch(() => {});
  }

  await page.waitForTimeout(800);
  const heroState = await page.evaluate(() => ({
    label: document.getElementById("hero-depart-label")?.textContent?.trim() ?? "",
    depart: document.getElementById("depart-display-time")?.textContent?.trim() ?? "",
    leaveTime: document.getElementById("leave-time")?.textContent?.trim() ?? "",
    leaveCountdown: document.getElementById("leave-countdown")?.textContent?.trim() ?? "",
    leaveCardVisible: !document.getElementById("leave-card")?.hidden,
    adBanner: document.querySelector(".ad-slot, #ad-slot")?.hidden ?? "no-ad-slot-found",
  }));

  await screenshot(
    page,
    "01-hero-leave-by.png",
    `Perth journey ${PERTH_STATION} -> ${PERTH_DIRECTION}, ${PERTH_WALK_MINUTES}-min walk, target train ` +
      `${armed.displayTime ?? "(unarmed)"}. Leave-card visible=${heroState.leaveCardVisible}, ` +
      `leave time "${heroState.leaveTime}", countdown "${heroState.leaveCountdown}". ` +
      `Ad-free entitlement set via localStorage nextTrainAdFreeCache (adBanner hidden=${heroState.adBanner}).`
  );

  await context.close();
}

/** Frame 03: Near me at a London coordinate (King's Cross), real geolocation. */
async function captureNearMe(browser) {
  const context = await newPhoneContext(browser, {
    geolocation: LONDON_GEO,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.goto(`${PROD_BASE}/?reset=1`);
  await seedAdFree(page);
  await page.evaluate(async () => {
    await window.NextTrainCitySession.applyCity("uk-london-tfl", { persist: true, explicit: true });
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.nextTrainApp?.enterNearbyMode), null, {
    timeout: 20000,
  });
  await page.evaluate(() => window.nextTrainApp.enterNearbyMode());

  await page
    .waitForSelector(".nearby-direction-row", { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(3000);

  const nearestStation = await page.evaluate(
    () => document.getElementById("route")?.textContent?.trim() ?? ""
  );

  await screenshot(
    page,
    "03-near-me.png",
    `London Near me via real geolocation (King's Cross, ${LONDON_GEO.latitude},${LONDON_GEO.longitude}), ` +
      `region switched to uk-london-tfl. Nearest-station board resolved to "${nearestStation}".`
  );

  await context.close();
}

/** Frame 04: My Journeys with two named journeys — one Perth, one London. */
async function captureJourneysList(browser) {
  const context = await newPhoneContext(browser);
  const page = await context.newPage();

  await page.goto(`${PROD_BASE}/?reset=1`);
  await seedAdFree(page);
  await page.evaluate(
    ({ perthStation, perthDirection, londonStation, londonDirection }) => {
      const jm = window.nextTrainJourneyModel;
      const perth = jm.normalizeJourney({
        id: "j-perth",
        kind: "journey",
        name: "Morning into Perth",
        station: perthStation,
        direction: perthDirection,
        cityId: "perth",
        leaveBeforeMinutes: 8,
        useLeaveBefore: true,
        remindMe: false,
      });
      const london = jm.normalizeJourney({
        id: "j-london",
        kind: "journey",
        name: "Victoria line home",
        station: londonStation,
        direction: londonDirection,
        cityId: "uk-london-tfl",
        leaveBeforeMinutes: 6,
        useLeaveBefore: true,
        remindMe: false,
      });
      jm.persistSettings({
        settingsSchemaVersion: 2,
        refreshSeconds: 30,
        activeJourneyId: perth.id,
        journeys: [perth, london],
      });
    },
    {
      perthStation: PERTH_STATION,
      perthDirection: PERTH_DIRECTION,
      londonStation: LONDON_STATION,
      londonDirection: LONDON_DIRECTION,
    }
  );

  await page.reload();
  await page.waitForFunction(() => Boolean(window.nextTrainApp?.openJourneysLibrary), null, {
    timeout: 20000,
  });
  await page.evaluate(() => window.nextTrainApp.openJourneysLibrary());
  await page.waitForSelector("#journey-list", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const names = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#journey-list .journey-list-item, #journey-list li")).map(
      (el) => el.textContent?.trim()
    )
  );

  await screenshot(
    page,
    "04-journeys.png",
    `My Journeys list, two named journeys: "Morning into Perth" (${PERTH_STATION} -> ${PERTH_DIRECTION}) ` +
      `and "Victoria line home" (${LONDON_STATION} -> ${LONDON_DIRECTION}). Rendered rows: ${JSON.stringify(names)}.`
  );

  await context.close();
}

/** Frame 05: region/city picker, expanded to show breadth of coverage. */
async function captureCoverage(browser) {
  const context = await newPhoneContext(browser);
  const page = await context.newPage();

  await page.goto(`${PROD_BASE}/?reset=1`);
  await seedAdFree(page);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.NextTrainCitySession?.openRegionScreen), null, {
    timeout: 20000,
  });
  await page.evaluate(() => window.NextTrainCitySession.openRegionScreen());
  await page.waitForSelector("#region-setup:not([hidden])", { timeout: 10000 });

  // Force both selects open as inline listboxes (native dropdown popups don't
  // screenshot reliably headless) so the frame actually shows the breadth of
  // countries/cities rather than two closed <select> boxes.
  await page.evaluate(() => {
    const country = document.getElementById("region-country-select");
    const city = document.getElementById("region-city-select");
    if (country) country.size = Math.min(country.options.length, 6);
    if (city) city.size = Math.min(city.options.length, 10);
  });
  await page.waitForTimeout(300);

  const counts = await page.evaluate(() => ({
    countries: document.getElementById("region-country-select")?.options.length ?? 0,
    cities: document.querySelectorAll('[data-region-city] option').length
      ? document.getElementById("region-city-select")?.options.length ?? 0
      : 0,
  }));

  await screenshot(
    page,
    "05-coverage.png",
    `Region picker (Country + City selects) expanded inline (via a runtime-only \`size\` attribute set ` +
      `through page.evaluate — not a public/ change) to show breadth: ${counts.countries} countries, ` +
      `${counts.cities} cities/regions listed. Caption "33 cities. Australia, the UK and the Nordics." ` +
      `is applied externally per captions.md, not baked into this PNG.`
  );

  await context.close();
}

/** Frame 06: About page, from PR #376's not-yet-merged multi-city copy. */
async function captureTrust(browser) {
  // Fetch public/about.html + shared styles.css from the unmerged branch into a
  // scratch dir, then serve that dir on a free local port. We do not touch
  // public/ on this branch.
  const scratchDir = path.join(REPO_ROOT, ".tmp-about-v2");
  mkdirSync(scratchDir, { recursive: true });
  mkdirSync(path.join(scratchDir, "styles"), { recursive: true });
  // styles.css is just an @import aggregator (public/styles/base.css etc) —
  // fetch every file it references, not just the top-level one.
  const styleFiles = execFileSync(
    "git",
    ["ls-tree", "-r", `origin/${ABOUT_BRANCH}`, "--name-only", "--", "public/styles/"],
    { cwd: REPO_ROOT }
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((p) => p.replace(/^public\//, ""));
  for (const file of ["about.html", "styles.css", ...styleFiles]) {
    const contents = execFileSync("git", ["show", `origin/${ABOUT_BRANCH}:public/${file}`], {
      cwd: REPO_ROOT,
      maxBuffer: 1024 * 1024 * 20,
    });
    writeFileSync(path.join(scratchDir, file), contents);
  }

  const server = createServer((req, res) => {
    let file = req.url === "/" || req.url === "/about.html" ? "about.html" : req.url.replace(/^\//, "");
    file = file.split("?")[0];
    const full = path.join(scratchDir, file);
    if (!full.startsWith(scratchDir) || !existsSync(full)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const type = file.endsWith(".css") ? "text/css" : "text/html";
    res.writeHead(200, { "Content-Type": type });
    res.end(readFileSync(full));
  });

  const port = await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });

  try {
    const context = await newPhoneContext(browser);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/about.html`);
    await page.waitForSelector("h1");
    await page.waitForTimeout(300);

    await screenshot(
      page,
      "06-trust.png",
      `About page from branch ${ABOUT_BRANCH} (PR #376, not yet merged to master) served from a ` +
        `throwaway local static server on 127.0.0.1:${port} — master's public/about.html is still ` +
        `Perth-only. This frame will look stale once #376 merges; re-run this script after that lands ` +
        `and this note becomes unnecessary.`
    );

    await context.close();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function writeReadme() {
  const lines = [
    "# Play screenshot capture — 2026-09-13",
    "",
    "Captured headless with Playwright (`store-assets/capture-frames.mjs`) against production",
    `(${PROD_BASE}), per docs/jim-brief-play-screenshots-headless.md. Viewport 360x800 CSS px,`,
    "deviceScaleFactor 3 (-> 1080x2400), mobile UA, touch enabled, light theme, no `?test=1`, no",
    "fixture chrome, no synthesized numbers.",
    "",
    "| Frame | State captured | Timestamp (Perth local) | Caveat |",
    "|---|---|---|---|",
  ];
  for (const entry of captureLog) {
    lines.push(`| ${entry.file} | ${entry.note.replace(/\|/g, "\\|")} | ${entry.timestampPerth} | |`);
  }
  lines.push(
    "",
    "## Notes",
    "",
    "- 02-delay-honesty.png: whatever live status production returned at capture time was used as-is;",
    "  if it reads \"On Time\", that is the honest state at that moment, not a placeholder. Re-capture in",
    "  evening peak (Perth or London) if a genuine delay is wanted for this frame.",
    "- 05-coverage.png: the two `<select>` elements were temporarily given a `size` attribute at runtime",
    "  (via `page.evaluate`, not a `public/` edit) so headless Chromium renders them as inline listboxes —",
    "  native dropdown popups don't screenshot reliably headless. The picker itself, its country/city",
    "  lists, and the app's `public/` files are all unmodified.",
    "- 06-trust.png: captured from branch `jim/privacy-copy-3.0.0-v2` (PR #376, unmerged) served from a",
    "  throwaway local static server, because master's `public/about.html` is still Perth-only. Re-run",
    "  this script once #376 merges to recapture from master/production directly.",
    "- 08-widget.png is not produced by this script — it needs a real phone (Ruth's ship set notes this).",
    ""
  );
  writeFileSync(
    path.join(FRAMES_DIR, "README-capture-2026-09-13.md"),
    lines.join("\n")
  );
}

async function main() {
  mkdirSync(FRAMES_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await captureHeroAndDelay(browser);
    await captureNearMe(browser);
    await captureJourneysList(browser);
    await captureCoverage(browser);
    await captureTrust(browser);
  } finally {
    await browser.close();
  }
  await writeReadme();
  console.log("Done. Frames written to", FRAMES_DIR);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
