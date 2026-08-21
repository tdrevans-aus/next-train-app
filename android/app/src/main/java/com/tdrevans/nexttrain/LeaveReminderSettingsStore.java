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
  private static final String KEY_DAY_LEAVE_DEP_PREFIX = "day_leave_dep:";
  private static final String KEY_DAY_GET_READY_PREFIX = "day_get_ready:";
  private static final String KEY_STRIP_DISMISSED_PREFIX = "strip_dismissed:";
  private static final String KEY_FAST_TEST = "fast_test_enabled";
  private static final String KEY_ON_THE_WAY = "on_the_way_json";
  private static final String KEY_ACTIVE_LEAVE_ALARM = "active_leave_alarm_json";

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
      settings.put("commuteStripEnabled", false);
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

  public static void clearLeaveNowBlock(Context context, String departureKey) {
    if (departureKey == null || departureKey.isEmpty()) {
      return;
    }
    prefs(context)
      .edit()
      .remove(KEY_ACK_PREFIX + departureKey)
      .remove(KEY_FIRED_PREFIX + departureKey + ":" + LeaveReminderScheduler.TYPE_LEAVE_NOW)
      .apply();
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

  public static String getLeaveNowDepartureKeyForDay(
    Context context,
    String journeyId,
    String localDate
  ) {
    if (journeyId == null || journeyId.isEmpty() || localDate == null || localDate.isEmpty()) {
      return null;
    }
    return prefs(context).getString(KEY_DAY_LEAVE_DEP_PREFIX + journeyId + ":" + localDate, null);
  }

  public static void markLeaveNowFiredForDay(Context context, String journeyId, String localDate) {
    markLeaveNowFiredForDay(context, journeyId, localDate, null);
  }

  public static void markLeaveNowFiredForDay(
    Context context,
    String journeyId,
    String localDate,
    String departureKey
  ) {
    SharedPreferences.Editor editor = prefs(context)
      .edit()
      .putBoolean(KEY_DAY_LEAVE_PREFIX + journeyId + ":" + localDate, true);
    if (departureKey != null && !departureKey.isEmpty()) {
      editor.putString(KEY_DAY_LEAVE_DEP_PREFIX + journeyId + ":" + localDate, departureKey);
    }
    editor.apply();
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

  public static boolean isCommuteStripEnabled(Context context) {
    return readSettingsResolved(context).optBoolean("commuteStripEnabled", false);
  }

  public static boolean hasStripDismissedForDay(Context context, String journeyId, String localDate) {
    if (journeyId == null || journeyId.isEmpty() || localDate == null || localDate.isEmpty()) {
      return false;
    }
    return prefs(context).getBoolean(KEY_STRIP_DISMISSED_PREFIX + journeyId + ":" + localDate, false);
  }

  public static void markStripDismissedForDay(Context context, String journeyId, String localDate) {
    if (journeyId == null || journeyId.isEmpty() || localDate == null || localDate.isEmpty()) {
      return;
    }
    prefs(context).edit().putBoolean(KEY_STRIP_DISMISSED_PREFIX + journeyId + ":" + localDate, true).apply();
  }

  public static void clearStripDismissedForDay(Context context, String journeyId, String localDate) {
    if (journeyId == null || journeyId.isEmpty() || localDate == null || localDate.isEmpty()) {
      return;
    }
    prefs(context).edit().remove(KEY_STRIP_DISMISSED_PREFIX + journeyId + ":" + localDate).apply();
  }

  /** FB-16: active “On my way” session (survives process death until end/dismiss). */
  public static JSONObject readOnTheWaySession(Context context) {
    try {
      String raw = prefs(context).getString(KEY_ON_THE_WAY, null);
      if (raw == null || raw.isEmpty()) {
        return null;
      }
      JSONObject session = new JSONObject(raw);
      long endAtMs = session.optLong("endAtMs", 0L);
      if (endAtMs > 0 && System.currentTimeMillis() >= endAtMs) {
        clearOnTheWaySession(context);
        return null;
      }
      String dayKey = session.optString("dayKey", "");
      if (!dayKey.isEmpty() && !dayKey.equals(PerthTime.localDateKey())) {
        clearOnTheWaySession(context);
        return null;
      }
      return session;
    } catch (Exception error) {
      return null;
    }
  }

  public static boolean isOnTheWayActive(Context context) {
    return readOnTheWaySession(context) != null;
  }

  public static void saveOnTheWaySession(Context context, JSONObject session) {
    if (session == null) {
      clearOnTheWaySession(context);
      return;
    }
    prefs(context).edit().putString(KEY_ON_THE_WAY, session.toString()).apply();
  }

  public static void clearOnTheWaySession(Context context) {
    prefs(context).edit().remove(KEY_ON_THE_WAY).apply();
  }

  /** FB-34: ringing leave alarm the web layer can surface while the app is open. */
  public static JSONObject readActiveLeaveAlarmSession(Context context) {
    try {
      String raw = prefs(context).getString(KEY_ACTIVE_LEAVE_ALARM, null);
      if (raw == null || raw.isEmpty()) {
        return null;
      }
      JSONObject session = new JSONObject(raw);
      String departureKey = session.optString("departureKey", "");
      long departureMs = LeaveReminderNotifier.departureMsFromKey(departureKey);
      if (departureMs > 0) {
        long endAtMs = departureMs + LeaveReminderNotifier.LEAVE_NOW_HOLD_AFTER_DEPARTURE_MS;
        if (System.currentTimeMillis() >= endAtMs) {
          clearActiveLeaveAlarmSession(context);
          return null;
        }
      }
      return session;
    } catch (Exception error) {
      return null;
    }
  }

  public static boolean isLeaveAlarmActive(Context context) {
    return readActiveLeaveAlarmSession(context) != null;
  }

  public static void saveActiveLeaveAlarmSession(Context context, JSONObject session) {
    if (session == null) {
      clearActiveLeaveAlarmSession(context);
      return;
    }
    prefs(context).edit().putString(KEY_ACTIVE_LEAVE_ALARM, session.toString()).apply();
  }

  public static void clearActiveLeaveAlarmSession(Context context) {
    prefs(context).edit().remove(KEY_ACTIVE_LEAVE_ALARM).apply();
  }

  public static void clearPendingForDeparture(Context context, String departureKey) {
    SharedPreferences.Editor editor = prefs(context).edit();
    editor.remove(KEY_ACK_PREFIX + departureKey);
    editor.remove(KEY_FIRED_PREFIX + departureKey + ":early");
    editor.remove(KEY_FIRED_PREFIX + departureKey + ":leave_now");
    editor.apply();
  }

  /** Debug QA only — arms {@link LeaveReminderScheduler} fast-test alarms (~60s). */
  public static boolean isFastTestEnabled(Context context) {
    return prefs(context).getBoolean(KEY_FAST_TEST, false);
  }

  public static void setFastTestEnabled(Context context, boolean enabled) {
    prefs(context).edit().putBoolean(KEY_FAST_TEST, enabled).apply();
  }

  private static SharedPreferences prefs(Context context) {
    return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }
}
