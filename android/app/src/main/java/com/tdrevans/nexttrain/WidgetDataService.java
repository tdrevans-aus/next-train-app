package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONObject;

public final class WidgetDataService {

  private WidgetDataService() {}

  public static void refreshAll(Context context) {
    CommuteRefreshService.refreshAll(context);
  }

  public static JSONObject buildSnapshot(Context context, boolean allowStaleFallback) {
    CommuteSchedule.Result result = CommuteSchedule.load(context, allowStaleFallback);
    try {
      JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);
      snapshot.put("updatedAtMs", System.currentTimeMillis());
      return snapshot;
    } catch (Exception error) {
      try {
        return CommuteSchedule.toWidgetSnapshot(result);
      } catch (Exception ignored) {
        return new JSONObject();
      }
    }
  }

  static String formatRoute(JSONObject journey) {
    String station = formatStationLabel(journey);
    String direction = journey.optString("direction", "");
    if (station.isEmpty()) {
      return direction;
    }
    if (direction.isEmpty()) {
      return station;
    }
    return station + " → " + direction;
  }

  /** Departure station only — widget crumb (fits 2×1; no swipe / no full route). */
  static String formatStationLabel(JSONObject journey) {
    if (journey == null) {
      return "";
    }
    return journey.optString("station", "").replace(" Stn", "").trim();
  }
}
