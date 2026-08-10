package com.tdrevans.nexttrain;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

public final class WidgetSettingsStore {

  private static final String PREFS = "next_train_widget";
  private static final String KEY_SETTINGS = "settings_json";
  private static final String KEY_SNAPSHOT = "snapshot_json";

  private WidgetSettingsStore() {}

  public static void saveSettings(Context context, String settingsJson) {
    prefs(context).edit().putString(KEY_SETTINGS, settingsJson).apply();
  }

  public static String readSettings(Context context) {
    return prefs(context).getString(KEY_SETTINGS, null);
  }

  public static void saveSnapshot(Context context, JSONObject snapshot) {
    prefs(context).edit().putString(KEY_SNAPSHOT, snapshot.toString()).apply();
  }

  public static JSONObject readSnapshot(Context context) {
    try {
      String raw = prefs(context).getString(KEY_SNAPSHOT, null);
      if (raw == null || raw.isEmpty()) {
        return null;
      }
      return new JSONObject(raw);
    } catch (Exception error) {
      return null;
    }
  }

  public static void saveLastRefreshMs(Context context, long value) {
    prefs(context).edit().putLong(KEY_LAST_REFRESH_MS, value).apply();
  }

  public static long readLastRefreshMs(Context context) {
    return prefs(context).getLong(KEY_LAST_REFRESH_MS, 0L);
  }

  private static final String KEY_LAST_REFRESH_MS = "last_refresh_ms";

  private static SharedPreferences prefs(Context context) {
    return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }
}
