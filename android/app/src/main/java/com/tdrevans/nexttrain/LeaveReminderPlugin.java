package com.tdrevans.nexttrain;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

@CapacitorPlugin(
  name = "LeaveReminders",
  permissions = {
    @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
  }
)
public class LeaveReminderPlugin extends Plugin {

  private PluginCall pendingEnableCall;

  @PluginMethod
  public void getSettings(PluginCall call) {
    if (LeaveReminderSettingsStore.clearExpiredPauseIfNeeded(getContext())) {
      CommuteRefreshService.refreshAll(getContext());
    }
    call.resolve(settingsToJs(LeaveReminderSettingsStore.readSettings(getContext())));
  }

  @PluginMethod
  public void setSettings(PluginCall call) {
    try {
      JSObject input = call.getData();
      JSONObject current = LeaveReminderSettingsStore.readSettings(getContext());
      if (input.has("enabled")) {
        current.put("enabled", input.getBool("enabled"));
      }
      if (input.has("paused")) {
        current.put("paused", input.getBool("paused"));
        if (!input.getBool("paused")) {
          current.put("pauseUntil", JSONObject.NULL);
        }
      }
      if (input.has("pauseUntil")) {
        String pauseUntilValue = input.getString("pauseUntil");
        if (pauseUntilValue == null || pauseUntilValue.isEmpty() || "null".equals(pauseUntilValue)) {
          current.put("pauseUntil", JSONObject.NULL);
        } else {
          current.put("pauseUntil", pauseUntilValue);
        }
      }
      if (input.has("remindAtLeaveBy")) {
        current.put("remindAtLeaveBy", input.getBool("remindAtLeaveBy"));
      }
      if (input.has("earlyHeadsUp")) {
        current.put("earlyHeadsUp", input.getBool("earlyHeadsUp"));
      }
      if (input.has("earlyOffsetMinutes")) {
        current.put("earlyOffsetMinutes", input.getInt("earlyOffsetMinutes"));
      }
      if (input.has("commuteStripEnabled")) {
        current.put("commuteStripEnabled", input.getBool("commuteStripEnabled"));
      }
      LeaveReminderSettingsStore.saveSettings(getContext(), current);
      CommuteRefreshService.refreshAll(getContext());
      call.resolve(settingsToJs(current));
    } catch (Exception error) {
      call.reject(error.getMessage());
    }
  }

  @PluginMethod
  public void enableReminders(PluginCall call) {
    if (!needsNotificationPermission()) {
      resolveEnable(call);
      return;
    }

    // Already permanently denied — system dialog will not show; JS should open Settings.
    if (getPermissionState("notifications") == PermissionState.DENIED) {
      JSObject result = settingsToJs(LeaveReminderSettingsStore.readSettings(getContext()));
      result.put("permissionGranted", false);
      result.put("shouldOpenSettings", true);
      call.resolve(result);
      return;
    }

    pendingEnableCall = call;
    requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
  }

  @PermissionCallback
  private void notificationsPermsCallback(PluginCall call) {
    PluginCall target = pendingEnableCall != null ? pendingEnableCall : call;
    pendingEnableCall = null;

    if (target == null) {
      return;
    }

    if (needsNotificationPermission()) {
      JSObject result = settingsToJs(LeaveReminderSettingsStore.readSettings(getContext()));
      result.put("permissionGranted", false);
      // After a deny, further toggles need Settings — dialog often will not reappear.
      result.put(
        "shouldOpenSettings",
        getPermissionState("notifications") == PermissionState.DENIED
      );
      target.resolve(result);
      return;
    }

    resolveEnable(target);
  }

  @PluginMethod
  public void acknowledgeDeparture(PluginCall call) {
    String journeyId = call.getString("journeyId");
    String departure = call.getString("departure");
    if (journeyId == null || departure == null) {
      call.reject("Missing journeyId or departure");
      return;
    }

    String departureKey = journeyId + ":" + departure;
    LeaveReminderSettingsStore.acknowledgeDeparture(getContext(), departureKey);
    LeaveReminderSettingsStore.markLeaveNowFiredForDay(
      getContext(),
      journeyId,
      PerthTime.localDateKey()
    );
    LeaveReminderNotifier.cancel(getContext());
    LeaveReminderScheduler.cancelAll(getContext());
    CommuteRefreshService.refreshAll(getContext());
    call.resolve();
  }

  @PluginMethod
  public void isDepartureAcknowledged(PluginCall call) {
    String journeyId = call.getString("journeyId");
    String departure = call.getString("departure");
    if (journeyId == null || departure == null) {
      call.reject("Missing journeyId or departure");
      return;
    }

    String departureKey = journeyId + ":" + departure;
    JSObject result = new JSObject();
    result.put(
      "acknowledged",
      LeaveReminderSettingsStore.isAcknowledged(getContext(), departureKey)
    );
    call.resolve(result);
  }

  @PluginMethod
  public void startOnTheWay(PluginCall call) {
    String journeyId = call.getString("journeyId");
    String route = call.getString("route", "");
    String trainTime = call.getString("trainTime", "");
    String departure = call.getString("departure");
    boolean stale = Boolean.TRUE.equals(call.getBoolean("stale", false));
    if (journeyId == null || journeyId.isEmpty() || departure == null || departure.isEmpty()) {
      call.reject("Missing journeyId or departure");
      return;
    }

    String departureKey = journeyId + ":" + departure;
    CommuteStripScheduler.startOnTheWay(
      getContext(),
      journeyId,
      route,
      trainTime,
      departureKey,
      stale
    );
    call.resolve();
  }

  @PluginMethod
  public void getActiveLeaveAlarm(PluginCall call) {
    JSONObject session = LeaveReminderSettingsStore.readActiveLeaveAlarmSession(getContext());
    JSObject result = new JSObject();
    if (session == null) {
      result.put("active", false);
      call.resolve(result);
      return;
    }

    String departureKey = session.optString("departureKey", "");
    String departure = "";
    int colon = departureKey.indexOf(':');
    if (colon >= 0 && colon < departureKey.length() - 1) {
      departure = departureKey.substring(colon + 1);
    }

    result.put("active", true);
    result.put("journeyId", session.optString("journeyId", ""));
    result.put("route", session.optString("route", ""));
    result.put("trainTime", session.optString("trainTime", ""));
    result.put("departure", departure);
    result.put("stale", session.optBoolean("stale", false));
    call.resolve(result);
  }

  @PluginMethod
  public void dismissLeaveAlarm(PluginCall call) {
    LeaveReminderNotifier.cancel(getContext());
    call.resolve();
  }

  @PluginMethod
  public void openNotificationSettings(PluginCall call) {
    Intent intent = new Intent();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
      intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
    } else {
      intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
      intent.setData(Uri.parse("package:" + getContext().getPackageName()));
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public void openAlarmSettings(PluginCall call) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
      intent.setData(Uri.parse("package:" + getContext().getPackageName()));
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      try {
        getContext().startActivity(intent);
      } catch (Exception ignored) {
        Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
        fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(fallback);
      }
    }
    call.resolve();
  }

  @PluginMethod
  public void reschedule(PluginCall call) {
    CommuteRefreshService.refreshAll(getContext());
    call.resolve();
  }

  @PluginMethod
  public void getSchedule(PluginCall call) {
    try {
      if (LeaveReminderSettingsStore.clearExpiredPauseIfNeeded(getContext())) {
        CommuteRefreshService.refreshAll(getContext());
      }
      JSObject result = jsonToJs(LeaveReminderScheduler.describeSchedule(getContext()));
      applyArmFlags(result);
      boolean permissionGranted = result.optBoolean("permissionGranted", false);
      boolean exactAlarmsGranted = result.optBoolean("exactAlarmsGranted", false);
      if (
        !permissionGranted &&
        result.optBoolean("enabled", false) &&
        !result.optBoolean("paused", false)
      ) {
        result.put("scheduled", false);
        result.put("reason", "no_permission");
      } else if (
        !exactAlarmsGranted &&
        result.optBoolean("enabled", false) &&
        !result.optBoolean("paused", false) &&
        !result.optBoolean("scheduled", false)
      ) {
        result.put("reason", "no_exact_alarm");
      }
      call.resolve(result);
    } catch (Exception error) {
      JSObject result = new JSObject();
      result.put("scheduled", false);
      result.put("reason", "error");
      result.put("errorMessage", error.getMessage() != null ? error.getMessage() : "unknown");
      call.resolve(result);
    }
  }

  @PluginMethod
  public void getScheduleDebug(PluginCall call) {
    getSchedule(call);
  }

  @PluginMethod
  public void getUpcoming(PluginCall call) {
    try {
      JSObject result = jsonToJs(LeaveReminderScheduler.describeUpcoming(getContext()));
      applyArmFlags(result);
      call.resolve(result);
    } catch (Exception error) {
      JSObject result = new JSObject();
      result.put("paused", false);
      result.put("fires", new com.getcapacitor.JSArray());
      result.put("leftovers", new com.getcapacitor.JSArray());
      result.put("armBlocked", true);
      call.resolve(result);
    }
  }

  @PluginMethod
  public void skipToday(PluginCall call) {
    String journeyId = call.getString("journeyId", "");
    if (journeyId == null || journeyId.isEmpty()) {
      call.reject("journeyId required");
      return;
    }
    LeaveReminderScheduler.skipToday(getContext(), journeyId);
    try {
      JSObject result = jsonToJs(LeaveReminderScheduler.describeUpcoming(getContext()));
      applyArmFlags(result);
      call.resolve(result);
    } catch (Exception error) {
      call.resolve();
    }
  }

  @PluginMethod
  public void clearLeftoverAlarms(PluginCall call) {
    LeaveReminderScheduler.clearLeftoverAlarms(getContext());
    try {
      call.resolve(jsonToJs(LeaveReminderScheduler.describeUpcoming(getContext())));
    } catch (Exception error) {
      call.resolve();
    }
  }

  @PluginMethod
  public void setFastTestMode(PluginCall call) {
    if (!isDebuggable()) {
      call.reject("Fast test is only available in debug builds");
      return;
    }

    boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
    LeaveReminderSettingsStore.setFastTestEnabled(getContext(), enabled);
    CommuteRefreshService.refreshAll(getContext());
    JSObject result = new JSObject();
    result.put("enabled", enabled);
    call.resolve(result);
  }

  @PluginMethod
  public void getFastTestMode(PluginCall call) {
    JSObject result = new JSObject();
    result.put("enabled", isDebuggable() && LeaveReminderSettingsStore.isFastTestEnabled(getContext()));
    result.put("available", isDebuggable());
    call.resolve(result);
  }

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject result = new JSObject();
    result.put("available", true);
    call.resolve(result);
  }

  private void resolveEnable(PluginCall call) {
    try {
      JSONObject settings = LeaveReminderSettingsStore.readSettings(getContext());
      settings.put("enabled", true);
      settings.put("paused", false);
      settings.put("pauseUntil", JSONObject.NULL);
      settings.put("remindAtLeaveBy", true);
      LeaveReminderSettingsStore.saveSettings(getContext(), settings);
      CommuteRefreshService.refreshAll(getContext());
      JSObject result = settingsToJs(settings);
      result.put("permissionGranted", true);
      boolean exactOk = canScheduleExactAlarms();
      result.put("exactAlarmsGranted", exactOk);
      if (!exactOk) {
        result.put("shouldOpenAlarmSettings", true);
      }
      call.resolve(result);
    } catch (Exception error) {
      call.reject(error.getMessage());
    }
  }

  private boolean canScheduleExactAlarms() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return true;
    }
    AlarmManager manager = (AlarmManager) getContext().getSystemService(android.content.Context.ALARM_SERVICE);
    return manager != null && manager.canScheduleExactAlarms();
  }

  private boolean needsNotificationPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return false;
    }
    return (
      ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    );
  }

  private void applyArmFlags(JSObject result) {
    boolean permissionGranted = !needsNotificationPermission();
    boolean exactAlarmsGranted = canScheduleExactAlarms();
    result.put("permissionGranted", permissionGranted);
    result.put("exactAlarmsGranted", exactAlarmsGranted);
    boolean scheduled = result.optBoolean("scheduled", false);
    if (!result.has("scheduled")) {
      try {
        scheduled = LeaveReminderScheduler.describeSchedule(getContext()).optBoolean("scheduled", false);
      } catch (Exception ignored) {
        scheduled = false;
      }
    }
    result.put("armBlocked", !permissionGranted || (!exactAlarmsGranted && !scheduled));
  }

  private boolean isDebuggable() {
    return (getContext().getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
  }

  private JSObject settingsToJs(JSONObject settings) {
    JSObject result = new JSObject();
    result.put("enabled", settings.optBoolean("enabled", false));
    result.put("paused", settings.optBoolean("paused", false));
    String pauseUntil = settings.optString("pauseUntil", "");
    if (pauseUntil == null || pauseUntil.isEmpty() || "null".equals(pauseUntil)) {
      result.put("pauseUntil", null);
    } else {
      result.put("pauseUntil", pauseUntil);
    }
    result.put("remindAtLeaveBy", settings.optBoolean("remindAtLeaveBy", true));
    result.put("earlyHeadsUp", settings.optBoolean("earlyHeadsUp", false));
    result.put("earlyOffsetMinutes", settings.optInt("earlyOffsetMinutes", 5));
    result.put("commuteStripEnabled", settings.optBoolean("commuteStripEnabled", false));
    result.put("permissionGranted", !needsNotificationPermission());
    return result;
  }

  private JSObject jsonToJs(JSONObject value) throws Exception {
    JSObject result = new JSObject();
    if (value == null) {
      return result;
    }

    java.util.Iterator<String> keys = value.keys();
    while (keys.hasNext()) {
      String key = keys.next();
      Object nested = value.get(key);
      if (nested instanceof JSONObject) {
        result.put(key, jsonToJs((JSONObject) nested));
      } else if (nested instanceof org.json.JSONArray) {
        com.getcapacitor.JSArray array = new com.getcapacitor.JSArray();
        org.json.JSONArray source = (org.json.JSONArray) nested;
        for (int index = 0; index < source.length(); index += 1) {
          Object item = source.get(index);
          if (item instanceof JSONObject) {
            array.put(jsonToJs((JSONObject) item));
          } else {
            array.put(item);
          }
        }
        result.put(key, array);
      } else {
        result.put(key, nested);
      }
    }
    return result;
  }
}
