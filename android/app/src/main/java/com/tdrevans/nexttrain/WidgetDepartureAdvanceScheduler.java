package com.tdrevans.nexttrain;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

/** One-shot network refresh right after the cached train's departure minute passes. */
public final class WidgetDepartureAdvanceScheduler {

  private static final String ACTION_DEPARTURE_ADVANCE =
    "com.tdrevans.nexttrain.action.WIDGET_DEPARTURE_ADVANCE";
  private static final int REQUEST_CODE = 73003;

  private WidgetDepartureAdvanceScheduler() {}

  public static void scheduleIfNeeded(Context context, JSONObject snapshot) {
    if (snapshot == null || snapshot.optBoolean("empty", false)) {
      cancel(context);
      return;
    }

    String departureIso = snapshot.optString("departureIso", "");
    long advanceAt = CommuteSchedule.departureAdvanceAtMs(departureIso);
    if (advanceAt <= 0L) {
      cancel(context);
      return;
    }

    long now = System.currentTimeMillis();
    if (now >= advanceAt) {
      cancel(context);
      CommuteRefreshService.refreshAll(context);
      return;
    }

    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    PendingIntent pending = buildPendingIntent(context);
    WidgetAlarms.scheduleWakeup(manager, advanceAt, pending);
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
    Intent intent = new Intent(context, WidgetDepartureAdvanceReceiver.class);
    intent.setAction(ACTION_DEPARTURE_ADVANCE);
    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }
}
