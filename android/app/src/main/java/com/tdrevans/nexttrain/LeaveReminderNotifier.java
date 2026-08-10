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

    Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openPending)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .build();

    NotificationManager manager = (NotificationManager) context.getSystemService(
      Context.NOTIFICATION_SERVICE
    );
    if (manager != null) {
      manager.notify(NOTIFICATION_ID, notification);
    }
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
