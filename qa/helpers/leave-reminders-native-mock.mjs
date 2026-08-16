/**
 * Mock Capacitor + LeaveReminders so web QA can exercise notification permission gates.
 */

export function createLeaveRemindersNativeMock(initial = {}) {
  const state = {
    permissionGranted: initial.permissionGranted === true,
    shouldOpenSettings: initial.shouldOpenSettings === true,
    settings: {
      enabled: false,
      paused: false,
      pauseUntil: null,
      earlyHeadsUp: false,
      earlyOffsetMinutes: 5,
      commuteStripEnabled: false,
      ...(initial.settings || {}),
    },
    enableCalls: 0,
    openSettingsCalls: 0,
    setSettingsCalls: 0,
  };

  function snapshot() {
    return {
      ...state.settings,
      permissionGranted: state.permissionGranted,
    };
  }

  const plugin = {
    getSettings: async () => snapshot(),
    setSettings: async (next = {}) => {
      state.setSettingsCalls += 1;
      state.settings = {
        ...state.settings,
        ...next,
      };
      if (next.paused === false) {
        state.settings.pauseUntil = null;
      }
      return snapshot();
    },
    enableReminders: async () => {
      state.enableCalls += 1;
      if (!state.permissionGranted) {
        return {
          ...snapshot(),
          permissionGranted: false,
          shouldOpenSettings: state.shouldOpenSettings,
        };
      }
      state.settings = {
        ...state.settings,
        enabled: true,
        paused: false,
        pauseUntil: null,
        remindAtLeaveBy: true,
        commuteStripEnabled: true,
      };
      return snapshot();
    },
    openNotificationSettings: async () => {
      state.openSettingsCalls += 1;
    },
    reschedule: async () => ({}),
    getSchedule: async () => ({
      scheduled: false,
      permissionGranted: state.permissionGranted,
      enabled: state.settings.enabled,
      paused: state.settings.paused,
    }),
  };

  return {
    state,
    plugin,
    grantPermission() {
      state.permissionGranted = true;
      state.shouldOpenSettings = false;
    },
    denyPermission({ permanently = false } = {}) {
      state.permissionGranted = false;
      state.shouldOpenSettings = permanently;
    },
    installOnWindow(win = window) {
      win.__qaLeaveRemindersMock = state;
      win.Capacitor = {
        isNativePlatform: () => true,
        registerPlugin: (name) => (name === "LeaveReminders" ? plugin : {}),
        Plugins: { LeaveReminders: plugin },
      };
    },
  };
}

export async function installLeaveRemindersNativeMock(page, initial = {}) {
  await page.evaluate((seed) => {
    const state = {
      permissionGranted: seed.permissionGranted === true,
      shouldOpenSettings: seed.shouldOpenSettings === true,
      settings: {
        enabled: false,
        paused: false,
        pauseUntil: null,
        earlyHeadsUp: false,
        earlyOffsetMinutes: 5,
        commuteStripEnabled: false,
        ...(seed.settings || {}),
      },
      enableCalls: 0,
      openSettingsCalls: 0,
      setSettingsCalls: 0,
    };

    function snapshot() {
      return {
        ...state.settings,
        permissionGranted: state.permissionGranted,
      };
    }

    const plugin = {
      getSettings: async () => snapshot(),
      setSettings: async (next = {}) => {
        state.setSettingsCalls += 1;
        state.settings = { ...state.settings, ...next };
        if (next.paused === false) {
          state.settings.pauseUntil = null;
        }
        return snapshot();
      },
      enableReminders: async () => {
        state.enableCalls += 1;
        if (!state.permissionGranted) {
          return {
            ...snapshot(),
            permissionGranted: false,
            shouldOpenSettings: state.shouldOpenSettings,
          };
        }
        state.settings = {
          ...state.settings,
          enabled: true,
          paused: false,
          pauseUntil: null,
          remindAtLeaveBy: true,
          commuteStripEnabled: true,
        };
        return snapshot();
      },
      openNotificationSettings: async () => {
        state.openSettingsCalls += 1;
      },
      reschedule: async () => ({}),
      getSchedule: async () => ({
        scheduled: false,
        permissionGranted: state.permissionGranted,
        enabled: state.settings.enabled,
        paused: state.settings.paused,
      }),
    };

    window.__qaLeaveRemindersMock = state;
    window.__qaLeaveRemindersGrant = () => {
      state.permissionGranted = true;
      state.shouldOpenSettings = false;
    };
    window.__qaLeaveRemindersDeny = (permanently = false) => {
      state.permissionGranted = false;
      state.shouldOpenSettings = Boolean(permanently);
    };

    window.Capacitor = {
      isNativePlatform: () => true,
      registerPlugin: (name) => (name === "LeaveReminders" ? plugin : {}),
      Plugins: { LeaveReminders: plugin },
    };
  }, initial);
}

export async function readLeaveRemindersMock(page) {
  return page.evaluate(() => {
    const state = window.__qaLeaveRemindersMock;
    if (!state) {
      return null;
    }
    return {
      permissionGranted: state.permissionGranted,
      shouldOpenSettings: state.shouldOpenSettings,
      settings: { ...state.settings },
      enableCalls: state.enableCalls,
      openSettingsCalls: state.openSettingsCalls,
      setSettingsCalls: state.setSettingsCalls,
      local: (() => {
        try {
          return JSON.parse(localStorage.getItem("nextTrainLeaveReminders") || "null");
        } catch {
          return null;
        }
      })(),
    };
  });
}

export async function readRemindToggleUi(page) {
  return page.evaluate(() => {
    const remind = document.getElementById("detail-remind-me");
    const controls = document.getElementById("detail-remind-controls");
    return {
      controlsHidden: controls?.hidden ?? true,
      remindChecked: Boolean(remind?.checked),
    };
  });
}
