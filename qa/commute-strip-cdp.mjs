const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = list.find((p) => p.type === "page");
if (!page) throw new Error("no page");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve);
  ws.addEventListener("error", reject);
});

let id = 0;
function evalExpr(expression) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    const onMsg = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== msgId) return;
      ws.removeEventListener("message", onMsg);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
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

const setup = await evalExpr(`(async () => {
  const notNow = [...document.querySelectorAll("button")].find((b) =>
    /not now/i.test(b.textContent || "")
  );
  notNow?.click();

  const SETTINGS_KEY = "nextTrainSettings";
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ok: false, reason: "no settings", keys: Object.keys(localStorage) };
  const settings = JSON.parse(raw);
  const journey = settings.journeys?.[0];
  if (!journey) return { ok: false, reason: "no journey" };

  // Prefer the ~23:45 train so leave-by (~23:35) is still ahead / in window.
  // Active until must be after preferred — reminder horizon clips at defaultUntil.
  journey.remindMe = true;
  journey.preferredTrainTime = "23:30";
  journey.defaultFrom = "22:00";
  journey.defaultUntil = "23:59";
  journey.remindDays = [1, 2, 3, 4, 5, 6, 7];
  journey.leaveBeforeMinutes = 10;
  journey.useLeaveBefore = true;
  settings.journeys[0] = journey;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  const leave = window.nextTrainLeaveReminders;
  if (!leave?.saveReminderSettings) {
    return { ok: false, reason: "no leave API", leaveType: typeof leave };
  }

  const saved = await leave.saveReminderSettings({
    enabled: false,
    paused: false,
    commuteStripEnabled: true,
    earlyHeadsUp: true,
    earlyOffsetMinutes: 45,
  });

  // syncSettings historically may not resolve — fire-and-forget with timeout.
  const widget = window.Capacitor?.Plugins?.WidgetSync;
  let sync = "skipped";
  if (widget?.syncSettings) {
    try {
      await Promise.race([
        widget.syncSettings({ settingsJson: JSON.stringify(settings) }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("sync timeout")), 2500)),
      ]);
      sync = "ok";
    } catch (error) {
      sync = String(error?.message || error);
    }
  }

  leave.reschedule?.();
  window.Capacitor?.Plugins?.LeaveReminders?.reschedule?.();

  return {
    ok: true,
    sync,
    journey: {
      id: journey.id,
      remindMe: journey.remindMe,
      preferredTrainTime: journey.preferredTrainTime,
    },
    reminderSettings: saved,
    pluginNames: Object.keys(window.Capacitor?.Plugins || {}),
  };
})()`);

console.log(JSON.stringify(setup.result?.value ?? setup, null, 2));
ws.close();
