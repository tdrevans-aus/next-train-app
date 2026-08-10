package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONObject;

public final class CommuteRefreshService {

  private CommuteRefreshService() {}

  public static void refreshAll(Context context) {
    CommuteSchedule.Result result = CommuteSchedule.load(context, true);
    try {
      JSONObject snapshot = buildWidgetSnapshot(context, result);
      WidgetSettingsStore.saveSnapshot(context, snapshot);
      NextTrainWidgetProvider.updateAllWidgets(context, snapshot);
      WidgetLocalPaintScheduler.scheduleIfNeeded(context, snapshot);
      WidgetDepartureAdvanceScheduler.scheduleIfNeeded(context, snapshot);
    } catch (Exception error) {
      // Keep widget showing last snapshot if formatting fails.
    }
    LeaveReminderScheduler.reschedule(context, result);
  }

  /** Local countdown repaint from cached ISO times — no network. */
  public static void repaintFromCache(Context context) {
    try {
      JSONObject cached = WidgetSettingsStore.readSnapshot(context);
      if (cached == null) {
        WidgetLocalPaintScheduler.cancel(context);
        WidgetDepartureAdvanceScheduler.cancel(context);
        return;
      }

      if (CommuteSchedule.needsNetworkRefresh(cached)) {
        refreshAll(context);
        return;
      }

      JSONObject snapshot = CommuteSchedule.repaintSnapshot(cached);
      WidgetSettingsStore.saveSnapshot(context, snapshot);
      NextTrainWidgetProvider.updateAllWidgets(context, snapshot);
      WidgetLocalPaintScheduler.scheduleIfNeeded(context, snapshot);
      WidgetDepartureAdvanceScheduler.scheduleIfNeeded(context, snapshot);
    } catch (Exception error) {
      // Keep last paint.
    }
  }

  private static JSONObject buildWidgetSnapshot(Context context, CommuteSchedule.Result result)
    throws Exception {
    if (result.empty) {
      return CommuteSchedule.toWidgetSnapshot(result);
    }

    if (result.next != null || result.payload != null) {
      JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);
      snapshot.put("updatedAtMs", result.refreshedAtMs);
      return snapshot;
    }

    JSONObject cached = WidgetSettingsStore.readSnapshot(context);
    if (cached != null && !cached.optString("departureIso", "").isEmpty()) {
      long refreshedAt = cached.optLong("refreshedAtMs", WidgetSettingsStore.readLastRefreshMs(context));
      long age = System.currentTimeMillis() - refreshedAt;
      boolean stale = refreshedAt > 0 && age > CommuteSchedule.STALE_THRESHOLD_MS;
      JSONObject snapshot = CommuteSchedule.repaintSnapshot(cached);
      snapshot.put("stale", stale);
      snapshot.put("refreshedAtMs", refreshedAt);
      if (stale) {
        snapshot.put("updatedLine", "Times may be out of date");
      }
      snapshot.put("updatedAtMs", refreshedAt);
      return snapshot;
    }

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);
    snapshot.put("updatedAtMs", result.refreshedAtMs);
    return snapshot;
  }
}
