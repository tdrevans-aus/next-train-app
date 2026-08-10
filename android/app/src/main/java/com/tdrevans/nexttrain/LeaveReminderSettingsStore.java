package com.tdrevans.nexttrain;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

public final class LeaveReminderSettingsStore {

  private static final String PREFS = "next_train_leave_reminders";
  private static final String KEY_SETTINGS = "settings_json";
  private static final String KEY_ACK_PREFIX = "ack:";
  private static final String KEY_FIRED_PREFIX = "fired:";
  private static final String KEY_DAY_LEAVE_PREFIX = "day_leave:";
  private static final String KEY_DAY_GET_READY_PREFIX = "day_get_ready:";

  private LeaveReminderSettingsStore() {}

  public static JSONObject readSettings(Context context) {
    try {
      String raw = prefs(context).getString(KEY_SETTINGS, null);
      if (raw == null || raw.isEmpty()) {
        return defaultSettings();
      }
      JSONObject settings = new JSONObject(raw);
      if (!settings.has("enabled")) {
        return defaultSettings();
      }
      return settings;
    } catch (Exception error) {
      return defaultSettings();
    }
  }

  public static void saveSettings(Context context, JSONObject settings) {
    prefs(context).edit().putString(KEY_SETTINGS, settings.toString()).apply();
  }

  public static JSONObject defaultSettings() {
    JSONObject settings = new JSONObject();
    try {
      settings.put("enabled", false);
      settings.put("paused", false);
      settings.put("pauseUntil", JSONObject.NULL);
      settings.put("remindAtLeaveBy", true);
      settings.put("earlyHeadsUp", false);
      settings.put("earlyOffsetMinutes", 5);
    } catch (Exception ignored) {
      // Unreachable.
    }
    return settings;
  }

  public static boolean clearExpiredPauseIfNeeded(Context context) {
    JSONObject settings = readSettings(context);
    if (!settings.optBoolean("paused", false)) {
      return false;
    }

    String pauseUntil = settings.optString("pauseUntil", "");
    if (pauseUntil == null || pauseUntil.isEmpty() || "null".equals(pauseUntil)) {
      return false;
    }

    long untilMs = PerthTime.epochMillisFromIso(pauseUntil);
    if (untilMs <= 0 || System.currentTimeMillis() < untilMs) {
      return false;
    }

    try {
      settings.put("paused", false);
      settings.put("pauseUntil", JSONObject.NULL);
      saveSettings(context, settings);
      return true;
    } catch (Exception error) {
      return false;
    }
  }

  public static JSONObject readSettingsResolved(Context context) {
    clearExpiredPauseIfNeeded(context);
    return readSettings(context);
  }

  public static boolean isEnabled(Context context) {
    return readSettings(context).optBoolean("enabled", false);
  }

  public static boolean isPaused(Context context) {
    return readSettingsResolved(context).optBoolean("paused", false);
  }

  public static boolean isGetReadyEnabled(Context context) {
    JSONObject settings = readSettingsResolved(context);
    return (
      settings.optBoolean("enabled", false) &&
      !settings.optBoolean("paused", false) &&
      settings.optBoolean("earlyHeadsUp", false) &&
      settings.optInt("earlyOffsetMinutes", 0) > 0
    );
  }

  public static int getReadyOffsetMinutes(Context context) {
    return Math.max(0, readSettingsResolved(context).optInt("earlyOffsetMinutes", 5));
  }

  /** @deprecated use {@link #isGetReadyEnabled} */
  public static boolean isEarlyHeadsUpEnabled(Context context) {
    return isGetReadyEnabled(context);
  }

  /** @deprecated use {@link #getReadyOffsetMinutes} */
  public static int earlyOffsetMinutes(Context context) {
    return Math.max(1, getReadyOffsetMinutes(context));
  }

  public static boolean isAcknowledged(Context context, String departureKey) {
    if (departureKey == null || departureKey.isEmpty()) {
      return false;
    }
    return prefs(context).getBoolean(KEY_ACK_PREFIX + departureKey, false);
  }

  public static void acknowledgeDeparture(Context context, String departureKey) {
    if (departureKey == null || departureKey.isEmpty()) {
      return;
    }
    prefs(context).edit().putBoolean(KEY_ACK_PREFIX + departureKey, true).apply();
  }

  public static boolean hasFired(Context context, String departureKey, String type) {
    return prefs(context).getBoolean(KEY_FIRED_PREFIX + departureKey + ":" + type, false);
  }

  public static void markFired(Context context, String departureKey, String type) {
    prefs(context).edit().putBoolean(KEY_FIRED_PREFIX + departureKey + ":" + type, true).apply();
  }

  public static boolean hasLeaveNowFiredForDay(Context context, String journeyId, String localDate) {
    return prefs(context).getBoolean(KEY_DAY_LEAVE_PREFIX + journeyId + ":" + localDate, false);
  }

  public static void markLeaveNowFiredForDay(Context context, String journeyId, String localDate) {
    prefs(context)
      .edit()
      .putBoolean(KEY_DAY_LEAVE_PREFIX + journeyId + ":" + localDate, true)
      .apply();
  }

  public static boolean hasGetReadyFiredForDay(Context context, String journeyId, String localDate) {
    return prefs(context).getBoolean(KEY_DAY_GET_READY_PREFIX + journeyId + ":" + localDate, false);
  }

  public static void markGetReadyFiredForDay(Context context, String journeyId, String localDate) {
    prefs(context)
      .edit()
      .putBoolean(KEY_DAY_GET_READY_PREFIX + journeyId + ":" + localDate, true)
      .apply();
  }

  public static void clearPendingForDeparture(Context context, String departureKey) {
    SharedPreferences.Editor editor = prefs(context).edit();
    editor.remove(KEY_ACK_PREFIX + departureKey);
    editor.remove(KEY_FIRED_PREFIX + departureKey + ":early");
    editor.remove(KEY_FIRED_PREFIX + departureKey + ":leave_now");
    editor.apply();
  }

  private static SharedPreferences prefs(Context context) {
    return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }
}
