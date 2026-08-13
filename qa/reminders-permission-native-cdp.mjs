/**
 * Native emulator probe — notification permission × Live countdown heal/enable.
 * Avoids enableReminders while permission is revoked (system dialog hangs CDP).
 * Reconnects CDP after pm grant/revoke — an open session can stall the bridge.
 *
 * Usage:
 *   adb shell am start -n com.tdrevans.nexttrain/.MainActivity
 *   node qa/reminders-permission-native-cdp.mjs
 */
import { adb as adbRaw, adbOk as adbOkRaw, resolveAdbSerial } from "./helpers/adb.mjs";

const PKG = "com.tdrevans.nexttrain";
const CDP_PORT = 9222;
const ADB_SERIAL = resolveAdbSerial({ preferEmulator: true });

if (!ADB_SERIAL) {
  throw new Error("No Android device/emulator found. Run `adb devices`.");
}

function adb(...args) {
  return adbRaw(args, { serial: ADB_SERIAL });
}

function adbOk(...args) {
  return adbOkRaw(args, { serial: ADB_SERIAL });
}

function permissionGrantedDump() {
  const dump = adbOk("shell", "dumpsys", "package", PKG);
  const match = dump.match(/android\.permission\.POST_NOTIFICATIONS: granted=(true|false)/);
  return match ? match[1] === "true" : null;
}

function appPid() {
  return adbOk("shell", "pidof", PKG).split(/\s+/)[0];
}

function forwardCdp(pid) {
  adb("forward", "--remove", `tcp:${CDP_PORT}`);
  adbOk("forward", `tcp:${CDP_PORT}`, `localabstract:webview_devtools_remote_${pid}`);
}

async function connectPage() {
  const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
  const page = list.find((p) => /Next Train/i.test(p.title) || /https:\/\/localhost\/?/i.test(p.url));
  if (!page?.webSocketDebuggerUrl) {
    throw new Error(`No Next Train page in CDP list: ${JSON.stringify(list.map((p) => p.title))}`);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });

  let id = 0;
  async function evaluate(expression, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const msgId = ++id;
      const timer = setTimeout(
        () => reject(new Error(`CDP timeout: ${expression.slice(0, 100)}`)),
        timeoutMs
      );
      const onMsg = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id !== msgId) {
          return;
        }
        clearTimeout(timer);
        ws.removeEventListener("message", onMsg);
        if (msg.error) {
          reject(new Error(JSON.stringify(msg.error)));
          return;
        }
        if (msg.result?.exceptionDetails) {
          reject(new Error(JSON.stringify(msg.result.exceptionDetails)));
          return;
        }
        resolve(msg.result?.result?.value);
      };
      ws.addEventListener("message", onMsg);
      ws.send(
        JSON.stringify({
          id: msgId,
          method: "Runtime.evaluate",
          params: { expression, awaitPromise: true, returnByValue: true },
        })
      );
    });
  }

  return { ws, evaluate };
}

async function reconnectAfterPermissionChange() {
  // Bring app forward; permission flips can stall an open CDP session.
  adb("shell", "am", "start", "-n", `${PKG}/.MainActivity`);
  await new Promise((r) => setTimeout(r, 1500));
  const pid = appPid();
  forwardCdp(pid);
  const session = await connectPage();
  for (let i = 0; i < 20; i++) {
    const ready = await session.evaluate(
      `Boolean(window.nextTrainLeaveReminders?.saveReminderSettings)`
    );
    if (ready) {
      return session;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Leave reminders bridge not ready after permission change");
}

async function run() {
  let pid = appPid();
  if (!pid) {
    throw new Error("App not running — start Next Train on the emulator first");
  }

  console.log("\nNative reminders permission CDP probe\n");
  console.log(`adb serial=${ADB_SERIAL}`);
  console.log(`pid=${pid}`);

  adbOk("shell", "pm", "grant", PKG, "android.permission.POST_NOTIFICATIONS");
  forwardCdp(pid);
  let session = await connectPage();
  console.log("CDP connected");

  await session.evaluate(`(() => {
    for (const id of ["widget-coach", "leave-reminder-coach", "template-route-coach", "onboarding-coach"]) {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    }
    const done = { status: "done", snoozeUntilMs: null, notNowCount: 0 };
    localStorage.setItem("nextTrainOnboardingDone", "1");
    localStorage.setItem("nextTrainTemplateWizardSeen", "1");
    localStorage.setItem("nextTrainWidgetCoach", JSON.stringify(done));
    localStorage.setItem("nextTrainLeaveReminderCoach", JSON.stringify(done));
    return true;
  })()`);

  const bridgeOk = await session.evaluate(
    `Boolean(window.nextTrainLeaveReminders?.enableLeaveReminders && window.Capacitor?.isNativePlatform?.())`
  );
  console.log("bridgeOk=", bridgeOk);
  if (!bridgeOk) {
    throw new Error("Leave reminders bridge / native platform missing");
  }

  const results = [];

  // 1) Revoke
  session.ws.close();
  adbOk("shell", "pm", "revoke", PKG, "android.permission.POST_NOTIFICATIONS");
  console.log("system permission after revoke:", permissionGrantedDump());
  session = await reconnectAfterPermissionChange();

  await session.evaluate(
    `window.nextTrainLeaveReminders.saveReminderSettings({ enabled: false, commuteStripEnabled: false })`
  );
  const settingsAfterRevoke = await session.evaluate(
    `window.nextTrainLeaveReminders.loadReminderSettings()`
  );
  const ensured = await session.evaluate(
    `window.nextTrainLeaveReminders.ensureLiveCountdownDefaultOn()`
  );
  await session.evaluate(
    `window.nextTrainLeaveReminders.saveReminderSettings({ commuteStripEnabled: true })`
  );
  const orphanEnsured = await session.evaluate(
    `window.nextTrainLeaveReminders.ensureLiveCountdownDefaultOn()`
  );
  const healed = await session.evaluate(
    `window.nextTrainLeaveReminders.refreshJourneyRemindExtras()`
  );

  const deniedLive = {
    settingsPermission: settingsAfterRevoke?.permissionGranted,
    ensureStrip: ensured?.commuteStripEnabled === true,
    orphanCleared: orphanEnsured?.commuteStripEnabled === false,
    healedStrip: healed?.commuteStripEnabled === true,
  };
  results.push({
    name: "revoke → permission false; ensure/heal do not leave Live countdown on",
    pass:
      deniedLive.settingsPermission === false &&
      deniedLive.ensureStrip === false &&
      deniedLive.orphanCleared === true &&
      deniedLive.healedStrip === false,
    detail: deniedLive,
  });

  // 2) Grant
  session.ws.close();
  adbOk("shell", "pm", "grant", PKG, "android.permission.POST_NOTIFICATIONS");
  console.log("system permission after grant:", permissionGrantedDump());
  session = await reconnectAfterPermissionChange();

  const enabled = await session.evaluate(
    `window.nextTrainLeaveReminders.enableLeaveReminders({ userInitiated: false })`
  );
  const ensuredOn = await session.evaluate(
    `window.nextTrainLeaveReminders.ensureLiveCountdownDefaultOn()`
  );
  const settingsGranted = await session.evaluate(
    `window.nextTrainLeaveReminders.loadReminderSettings()`
  );
  const granted = {
    enablePermissionGranted: enabled?.permissionGranted,
    ensureStrip: ensuredOn?.commuteStripEnabled === true,
    settingsStrip: settingsGranted?.commuteStripEnabled === true,
    settingsPermission: settingsGranted?.permissionGranted,
  };
  results.push({
    name: "grant → enableLeaveReminders ok; Live countdown can arm",
    pass:
      granted.enablePermissionGranted === true &&
      granted.settingsPermission === true &&
      granted.ensureStrip === true &&
      granted.settingsStrip === true,
    detail: granted,
  });

  // 3) Strip off while still granted
  const stripOffSettings = await session.evaluate(
    `window.nextTrainLeaveReminders.saveReminderSettings({ commuteStripEnabled: false })`
  );
  const stripOff = { strip: stripOffSettings?.commuteStripEnabled === true };
  results.push({
    name: "Live countdown can turn off with permission still granted",
    pass: stripOff.strip === false,
    detail: stripOff,
  });

  // 4) Arm then revoke — heal clears
  await session.evaluate(
    `window.nextTrainLeaveReminders.saveReminderSettings({ enabled: true, commuteStripEnabled: true })`
  );
  await session.evaluate(`(() => {
    const journeys = window.nextTrainApp.getConfiguredJourneys?.() || [];
    if (journeys[0]) {
      window.nextTrainApp.persistReminderJourneys([
        {
          id: journeys[0].id,
          remindMe: true,
          preferredTrainTime: journeys[0].preferredTrainTime || "07:30",
        },
      ]);
      return journeys[0].id;
    }
    return null;
  })()`);

  session.ws.close();
  adbOk("shell", "pm", "revoke", PKG, "android.permission.POST_NOTIFICATIONS");
  console.log("system permission for heal:", permissionGrantedDump());
  session = await reconnectAfterPermissionChange();

  const healedAfter = await session.evaluate(
    `window.nextTrainLeaveReminders.refreshJourneyRemindExtras()`
  );
  const journeys = await session.evaluate(
    `window.nextTrainApp.getConfiguredJourneys().map((j) => ({ id: j.id, remindMe: j.remindMe }))`
  );
  const healRow = {
    strip: healedAfter?.commuteStripEnabled === true,
    enabled: healedAfter?.enabled === true,
    permissionGranted: healedAfter?.permissionGranted,
    journeys,
  };
  results.push({
    name: "revoke after armed → heal clears strip + remindMe + enabled",
    pass:
      healRow.strip === false &&
      healRow.enabled === false &&
      healRow.permissionGranted === false &&
      (healRow.journeys.length === 0 || !healRow.journeys.some((j) => j.remindMe)),
    detail: healRow,
  });

  let allPass = true;
  for (const row of results) {
    console.log(`${row.pass ? "PASS" : "FAIL"}  ${row.name}`);
    console.log(JSON.stringify(row.detail));
    allPass = allPass && row.pass;
  }

  session.ws.close();
  adbOk("shell", "pm", "grant", PKG, "android.permission.POST_NOTIFICATIONS");
  console.log(allPass ? "\nPASS  native permission CDP probe\n" : "\nFAIL  native permission CDP probe\n");
  process.exit(allPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
