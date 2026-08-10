package com.tdrevans.nexttrain;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

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

    long triggerAt = System.currentTimeMillis() + INTERVAL_MS;
    PendingIntent pending = buildPendingIntent(context);

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pending);
      } else {
        manager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pending);
      }
    } catch (Exception error) {
      manager.set(AlarmManager.RTC_WAKEUP, triggerAt, pending);
    }
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
