package com.tdrevans.nexttrain;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
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
    if (needsNotificationPermission()) {
      pendingEnableCall = call;
      requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
      return;
    }

    resolveEnable(call);
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
    LeaveReminderScheduler.cancelAll(getContext());
    CommuteRefreshService.refreshAll(getContext());
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
      boolean permissionGranted = !needsNotificationPermission();
      result.put("permissionGranted", permissionGranted);
      if (
        !permissionGranted &&
        result.optBoolean("enabled", false) &&
        !result.optBoolean("paused", false)
      ) {
        result.put("scheduled", false);
        result.put("reason", "no_permission");
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
      call.resolve(result);
    } catch (Exception error) {
      call.reject(error.getMessage());
    }
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
      } else {
        result.put(key, nested);
      }
    }
    return result;
  }
}
