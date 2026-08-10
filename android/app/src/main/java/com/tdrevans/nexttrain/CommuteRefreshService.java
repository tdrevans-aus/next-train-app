package com.tdrevans.nexttrain;

import android.content.Context;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public final class CommuteRefreshService {

  private static final ExecutorService REFRESH_EXECUTOR =
    Executors.newSingleThreadExecutor(
      runnable -> {
        Thread thread = new Thread(runnable, "commute-refresh");
        thread.setDaemon(true);
        return thread;
      }
    );

  private CommuteRefreshService() {}

  /** Network refresh on a background thread — safe from Activity / UI thread. */
  public static void refreshAll(Context context) {
    Context appContext = context.getApplicationContext();
    REFRESH_EXECUTOR.execute(() -> refreshAllOnWorker(appContext));
  }

  static void refreshAllOnWorker(Context context) {
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
    paintFromCache(context);
    try {
      JSONObject cached = WidgetSettingsStore.readSnapshot(context);
      if (cached != null && CommuteSchedule.needsNetworkRefresh(cached)) {
        refreshAll(context);
      }
    } catch (Exception error) {
      // Keep last paint.
    }
  }

  /** Repaint widgets from cache only — never blocks on network. */
  public static void paintFromCache(Context context) {
    try {
      JSONObject cached = WidgetSettingsStore.readSnapshot(context);
      if (cached == null) {
        WidgetLocalPaintScheduler.cancel(context);
        WidgetDepartureAdvanceScheduler.cancel(context);
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
      JSONObject snapshot = CommuteSchedule.repaintSnapshot(cached);
      if ("Tap to refresh".equals(snapshot.optString("secondary"))) {
        snapshot.put("refreshedAtMs", refreshedAt);
        snapshot.put("updatedAtMs", refreshedAt);
        return snapshot;
      }
      long age = System.currentTimeMillis() - refreshedAt;
      boolean stale = refreshedAt > 0 && age > CommuteSchedule.STALE_THRESHOLD_MS;
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
