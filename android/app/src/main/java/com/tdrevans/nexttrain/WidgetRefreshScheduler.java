package com.tdrevans.nexttrain;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

public final class WidgetRefreshScheduler {

  private static final String ACTION_REFRESH = "com.tdrevans.nexttrain.action.WIDGET_REFRESH";
  private static final int REQUEST_CODE = 73001;
  private static final long INTERVAL_MS = 15L * 60L * 1000L;

  private WidgetRefreshScheduler() {}

  public static void ensureScheduled(Context context) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    // Floor, not reset: callers fire on every unlock/update, and re-arming at
    // now + 15 min each time deferred the alarm forever on active devices.
    long now = System.currentTimeMillis();
    long pendingAt = WidgetSettingsStore.readRefreshAlarmAt(context);
    if (pendingAt > now && pendingAt <= now + INTERVAL_MS) {
      return;
    }

    long triggerAt = now + INTERVAL_MS;
    PendingIntent pending = buildPendingIntent(context);
    WidgetAlarms.scheduleWakeup(manager, triggerAt, pending);
    WidgetSettingsStore.saveRefreshAlarmAt(context, triggerAt);
  }

  public static void refreshSoon(Context context) {
    CommuteRefreshService.refreshAll(context);
  }

  public static void cancel(Context context) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    PendingIntent pending = buildPendingIntent(context);
    manager.cancel(pending);
    pending.cancel();
    WidgetSettingsStore.saveRefreshAlarmAt(context, 0L);
  }

  static PendingIntent buildPendingIntent(Context context) {
    Intent intent = new Intent(context, WidgetRefreshReceiver.class);
    intent.setAction(ACTION_REFRESH);
    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }
}
