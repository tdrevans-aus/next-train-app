/**
 * Repro: Done needs two taps to close Menu / Reminders.
 * Usage: node qa/done-double-tap-repro.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function dialogState(page) {
  return page.evaluate(() => ({
    menu: {
      open: document.getElementById("menu-dialog").open,
      hasOpenAttr: document.getElementById("menu-dialog").hasAttribute("open"),
    },
    reminders: {
      open: document.getElementById("reminders-dialog").open,
      hasOpenAttr: document.getElementById("reminders-dialog").hasAttribute("open"),
    },
    widgetHelp: {
      open: document.getElementById("widget-help-dialog")?.open ?? false,
    },
    help: {
      open: document.getElementById("help-dialog")?.open ?? false,
    },
    journeys: {
      open: document.getElementById("journeys-dialog")?.open ?? false,
    },
    anyDialogOpen: [...document.querySelectorAll("dialog")].filter((d) => d.open).length,
  }));
}

async function tapDoneOnce(page, selector) {
  await page.locator(selector).click();
  await page.waitForTimeout(400);
}

async function dismissAllDialogs(page) {
  await page.evaluate(() => {
    window.nextTrainApp?.closeMenuDialogOnly?.();
    document.querySelectorAll("dialog").forEach((dialog) => {
      try {
        dialog.close();
      } catch {
        // Ignore close errors on already-closed modals.
      }
      dialog.removeAttribute("open");
    });
    document.getElementById("menu-btn")?.setAttribute("aria-expanded", "false");
    document.getElementById("menu-chrome-action")?.classList.remove("chrome-action--open");
  });
  await page.waitForTimeout(200);
}

async function openMenuIfClosed(page) {
  const open = await page.evaluate(() => document.getElementById("menu-dialog")?.open ?? false);
  if (!open) {
    await page.locator("#menu-btn").click();
  }
  await page.waitForTimeout(300);
}

async function runScenario(page, name, steps) {
  await dismissAllDialogs(page);
  const log = [];
  for (const step of steps) {
    await step.action(page);
    const state = await dialogState(page);
    log.push({ step: step.name, ...state });
  }
  return { name, log };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(
    `${BASE}/?reset=1&test=1&fixture=normal&station=Edgewater%20Stn&direction=Perth`
  );
  await page.waitForTimeout(2000);

  const scenarios = [];

  // Menu: single Done
  scenarios.push(
    await runScenario(page, "menu_single_done", [
      {
        name: "open_menu",
        action: async (p) => openMenuIfClosed(p),
      },
      {
        name: "done_once",
        action: async (p) => tapDoneOnce(p, "#menu-done-btn"),
      },
    ])
  );

  // Menu → Reminders → Done once (web)
  scenarios.push(
    await runScenario(page, "menu_reminders_done_once", [
      {
        name: "open_menu",
        action: async (p) => openMenuIfClosed(p),
      },
      {
        name: "open_reminders",
        action: async (p) => {
          await p.locator("#menu-reminders-btn").click();
          await p.waitForTimeout(1500);
        },
      },
      {
        name: "done_once",
        action: async (p) => tapDoneOnce(p, "#reminders-done-btn"),
      },
    ])
  );

  // Menu → Help → close help (menu was already closed when help opened)
  scenarios.push(
    await runScenario(page, "menu_help_close", [
      {
        name: "open_menu",
        action: async (p) => openMenuIfClosed(p),
      },
      {
        name: "open_help",
        action: async (p) => {
          await p.locator("#menu-help-btn").click();
          await p.waitForTimeout(400);
        },
      },
      {
        name: "close_help",
        action: async (p) => {
          await p.locator("#help-close-btn").click();
          await p.waitForTimeout(400);
        },
      },
    ])
  );

  // Activity: journeys save then menu
  scenarios.push(
    await runScenario(page, "after_journeys_activity_menu_done", [
      {
        name: "open_journeys",
        action: async (p) => {
          await p.evaluate(() => window.nextTrainApp.openJourneysLibrary());
          await p.waitForTimeout(600);
        },
      },
      {
        name: "journeys_done",
        action: async (p) => tapDoneOnce(p, "#journeys-done-btn"),
      },
      {
        name: "open_menu",
        action: async (p) => openMenuIfClosed(p),
      },
      {
        name: "menu_done_once",
        action: async (p) => tapDoneOnce(p, "#menu-done-btn"),
      },
    ])
  );

  // Rapid double-click Done on menu
  scenarios.push(
    await runScenario(page, "menu_double_click_done", [
      {
        name: "open_menu",
        action: async (p) => openMenuIfClosed(p),
      },
      {
        name: "double_done",
        action: async (p) => {
          await p.evaluate(() => {
            const btn = document.getElementById("menu-done-btn");
            btn?.click();
            btn?.click();
          });
          await p.waitForTimeout(400);
        },
      },
    ])
  );

  await browser.close();

  console.log("\nDone double-tap repro\n");

  let anyFail = false;
  for (const s of scenarios) {
    const last = s.log.at(-1);
    let pass;
    if (s.name === "menu_help_close") {
      pass = Boolean(last.menu?.open) && !last.help?.open;
    } else {
      pass =
        last.anyDialogOpen === 0 &&
        !last.menu?.open &&
        !last.reminders?.open &&
        !last.help?.open;
    }
    const label =
      s.name === "menu_help_close"
        ? pass
          ? "PASS (Help closes → Menu reopens)"
          : "FAIL"
        : pass
          ? "PASS (1 Done closes all)"
          : "FAIL";
    console.log(`\n${s.name}: ${label}`);
    console.log(JSON.stringify(last, null, 2));
    if (!pass) anyFail = true;
  }

  console.log(
    anyFail
      ? "\nREPRODUCED or stuck dialog after single Done in some scenario.\n"
      : "\nDid not reproduce stuck dialog in automated scenarios (may be native/async only).\n"
  );
  process.exit(anyFail ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
