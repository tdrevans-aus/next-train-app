package com.tdrevans.nexttrain;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public final class LeaveReminderNotifier {

  private static final String CHANNEL_ID = "leave_reminders";
  private static final int NOTIFICATION_ID = 52001;
  /** Keep Leave now visible briefly after the train leaves, then drop it. */
  private static final long LEAVE_NOW_HOLD_AFTER_DEPARTURE_MS = 10 * 60_000L;

  private LeaveReminderNotifier() {}

  public static void show(
    Context context,
    String type,
    String journeyId,
    String route,
    String trainTime,
    boolean stale,
    int getReadyMinutes
  ) {
    show(context, type, journeyId, route, trainTime, stale, getReadyMinutes, null);
  }

  public static void show(
    Context context,
    String type,
    String journeyId,
    String route,
    String trainTime,
    boolean stale,
    int getReadyMinutes,
    String departureKey
  ) {
    createChannel(context);

    String title;
    if (LeaveReminderScheduler.TYPE_GET_READY.equals(type)) {
      if (getReadyMinutes <= 1) {
        title = "Time to get ready";
      } else {
        title = "Leave in " + getReadyMinutes + " min";
      }
    } else {
      title = "Leave now";
    }

    String body = route + " · Train " + trainTime;
    if (stale) {
      body += " · Times may be out of date";
    }

    Intent openIntent = new Intent(context, MainActivity.class);
    openIntent.setAction(Intent.ACTION_VIEW);
    openIntent.setData(Uri.parse("nexttrain://journey/" + journeyId));
    openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    PendingIntent openPending = PendingIntent.getActivity(
      context,
      NOTIFICATION_ID,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_next_train)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openPending)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER);

    if (
      LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type) &&
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
    ) {
      long timeoutMs = leaveNowTimeoutMs(departureKey);
      if (timeoutMs > 0) {
        builder.setTimeoutAfter(timeoutMs);
      }
    }

    Notification notification = builder.build();

    NotificationManager manager = (NotificationManager) context.getSystemService(
      Context.NOTIFICATION_SERVICE
    );
    if (manager != null) {
      manager.notify(NOTIFICATION_ID, notification);
    }
  }

  public static void cancel(Context context) {
    NotificationManager manager = (NotificationManager) context.getSystemService(
      Context.NOTIFICATION_SERVICE
    );
    if (manager != null) {
      manager.cancel(NOTIFICATION_ID);
    }
  }

  /**
   * departureKey is journeyId:ISO — expire ~10 min after departure so shade doesn't keep
   * a Leave now from hours ago.
   */
  private static long leaveNowTimeoutMs(String departureKey) {
    if (departureKey == null || departureKey.isEmpty()) {
      return 30 * 60_000L;
    }
    int colon = departureKey.indexOf(':');
    if (colon < 0 || colon >= departureKey.length() - 1) {
      return 30 * 60_000L;
    }
    long departureMs = PerthTime.epochMillisFromIso(departureKey.substring(colon + 1));
    if (departureMs <= 0) {
      return 30 * 60_000L;
    }
    long until = departureMs + LEAVE_NOW_HOLD_AFTER_DEPARTURE_MS - System.currentTimeMillis();
    return Math.max(60_000L, until);
  }

  private static void createChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "Leave reminders",
      NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription("Notifications when it is time to leave for your train");

    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }
}
