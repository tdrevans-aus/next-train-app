package com.tdrevans.nexttrain;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

/** 1-minute local widget repaint aligned to Perth wall-clock minute boundaries. */
public final class WidgetLocalPaintScheduler {

  private static final String ACTION_LOCAL_PAINT = "com.tdrevans.nexttrain.action.WIDGET_LOCAL_PAINT";
  private static final int REQUEST_CODE = 73002;
  private WidgetLocalPaintScheduler() {}

  public static void scheduleIfNeeded(Context context, JSONObject snapshot) {
    if (!CommuteSchedule.needsLocalRepaint(snapshot)) {
      cancel(context);
      return;
    }

    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    long triggerAt = PerthTime.nextMinuteBoundaryMs();
    PendingIntent pending = buildPendingIntent(context);
    WidgetAlarms.scheduleWakeup(manager, triggerAt, pending);
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
    Intent intent = new Intent(context, WidgetLocalPaintReceiver.class);
    intent.setAction(ACTION_LOCAL_PAINT);
    return PendingIntent.getBroadcast(
      context,
      REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }
}
