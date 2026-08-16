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
    WidgetDebugLog.refreshStart("network");
    JSONObject snapshot = null;
    CommuteSchedule.Result result = null;
    try {
      // Outside Active hours: designed idle only — never network, never stale live cache.
      JSONObject outsideHours = CommuteSchedule.nearbyFallbackIfOutsideHours(context);
      if (outsideHours != null) {
        snapshot = outsideHours;
        WidgetSettingsStore.saveSnapshot(context, snapshot);
        NextTrainWidgetProvider.updateAllWidgets(context);
        WidgetLocalPaintScheduler.cancel(context);
        WidgetDepartureAdvanceScheduler.cancel(context);
        WidgetDebugLog.refreshDone(snapshot);
        result = CommuteSchedule.load(context, true);
        LeaveReminderScheduler.reschedule(context, result);
        CommuteStripScheduler.reschedule(context, result);
        return;
      }

      result = CommuteSchedule.load(context, true);
      snapshot = buildWidgetSnapshot(context, result);
      WidgetSettingsStore.saveSnapshot(context, snapshot);
      NextTrainWidgetProvider.updateAllWidgets(context);
      WidgetLocalPaintScheduler.scheduleIfNeeded(context, snapshot);
      WidgetDepartureAdvanceScheduler.scheduleIfNeeded(context, snapshot);
    } catch (Exception error) {
      // Keep widget showing last snapshot if formatting fails.
    }
    WidgetDebugLog.refreshDone(snapshot);
    if (result != null) {
      LeaveReminderScheduler.reschedule(context, result);
      CommuteStripScheduler.reschedule(context, result);
    }
  }

  /** Local countdown repaint from cached ISO times — no network. */
  public static void repaintFromCache(Context context) {
    paintFromCache(context);
  }

  /** Repaint widgets from cache only — never blocks on network. */
  public static void paintFromCache(Context context) {
    boolean triggerFetchRetry = false;
    boolean departureJustPassed = false;
    boolean opportunisticRefresh = false;
    boolean preDeparturePrefetch = false;
    String paintReason = "local";
    JSONObject snapshot = null;
    try {
      JSONObject cached = WidgetSettingsStore.readSnapshot(context);
      if (cached == null) {
        WidgetLocalPaintScheduler.cancel(context);
        WidgetDepartureAdvanceScheduler.cancel(context);
        NextTrainWidgetProvider.updateAllWidgets(context);
        return;
      }

      // Outside Active hours: drop stale commute Fetching/live face for Near me idle.
      JSONObject outsideHours = CommuteSchedule.nearbyFallbackIfOutsideHours(context);
      if (outsideHours != null) {
        WidgetSettingsStore.saveSnapshot(context, outsideHours);
        NextTrainWidgetProvider.updateAllWidgets(context);
        WidgetLocalPaintScheduler.cancel(context);
        WidgetDepartureAdvanceScheduler.cancel(context);
        return;
      }

      departureJustPassed =
        CommuteSchedule.needsNetworkRefresh(cached) &&
        cached.optLong("updatingSinceMs", 0L) == 0L;

      snapshot = CommuteSchedule.repaintSnapshot(cached);
      triggerFetchRetry = snapshot.optBoolean("triggerFetchRetry", false);
      if (triggerFetchRetry) {
        snapshot.remove("triggerFetchRetry");
      }

      if (CommuteSchedule.shouldOpportunisticRefresh(snapshot)) {
        opportunisticRefresh = true;
        snapshot.put("lastOpportunisticRefreshMs", System.currentTimeMillis());
      }
      if (CommuteSchedule.needsPreDeparturePrefetch(snapshot)) {
        preDeparturePrefetch = true;
        snapshot.put("prefetchDepartureIso", snapshot.optString("departureIso", ""));
      }

      WidgetSettingsStore.saveSnapshot(context, snapshot);
      NextTrainWidgetProvider.updateAllWidgets(context);
      WidgetLocalPaintScheduler.scheduleIfNeeded(context, snapshot);
      WidgetDepartureAdvanceScheduler.scheduleIfNeeded(context, snapshot);
    } catch (Exception error) {
      // Keep last paint.
    }

    if (triggerFetchRetry) {
      paintReason = "retry";
    } else if (departureJustPassed) {
      paintReason = "departure-passed";
    } else if (opportunisticRefresh) {
      paintReason = "opportunistic";
    } else if (preDeparturePrefetch) {
      paintReason = "prefetch";
    }
    WidgetDebugLog.paintDone(snapshot, paintReason);

    if (triggerFetchRetry || departureJustPassed || opportunisticRefresh || preDeparturePrefetch) {
      refreshAll(context);
    }
  }

  private static JSONObject buildWidgetSnapshot(Context context, CommuteSchedule.Result result)
    throws Exception {
    // Outside Active hours / no journey: always idle preview or empty — never keep a stale
    // commute "Fetching…" / departure clock from an earlier window.
    if (result.empty || result.nearbyFallback) {
      return CommuteSchedule.toWidgetSnapshot(result);
    }

    if (result.next != null || result.payload != null) {
      JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);
      snapshot.put("updatedAtMs", result.refreshedAtMs);
      return snapshot;
    }

    // Network failed — recompute from last good commute cache if we have one.
    // Never replay a live departure face once Active hours have ended.
    JSONObject outsideHours = CommuteSchedule.nearbyFallbackIfOutsideHours(context);
    if (outsideHours != null) {
      return outsideHours;
    }
    JSONObject cached = WidgetSettingsStore.readSnapshot(context);
    if (
      cached != null &&
      !cached.optBoolean("outsideHoursIdle", false) &&
      !cached.optString("departureIso", "").isEmpty()
    ) {
      long refreshedAt = cached.optLong("refreshedAtMs", WidgetSettingsStore.readLastRefreshMs(context));
      JSONObject snapshot = CommuteSchedule.repaintSnapshot(cached);
      snapshot.remove("triggerFetchRetry");
      if (CommuteSchedule.DEGRADED_SECONDARY.equals(snapshot.optString("secondary"))) {
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
