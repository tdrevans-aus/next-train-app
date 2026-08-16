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

public final class CommuteStripNotifier {

  static final String CHANNEL_ID = "commute_strip";
  static final int NOTIFICATION_ID = 52002;

  private CommuteStripNotifier() {}

  public static void show(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    long leaveByMs,
    long departureMs,
    boolean stale
  ) {
    createChannel(context);

    long now = System.currentTimeMillis();
    boolean leaveNow = leaveByMs <= now;
    // Before leave-by: chronometer → leave-by. After: chronometer → train departure.
    String title = leaveNow ? "Target train" : "Leave";
    long chronometerToMs = leaveNow ? departureMs : leaveByMs;

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

    Intent dismissIntent = new Intent(context, CommuteStripReceiver.class);
    dismissIntent.setAction(CommuteStripScheduler.ACTION_DISMISS);
    dismissIntent.putExtra(CommuteStripScheduler.EXTRA_JOURNEY_ID, journeyId);
    dismissIntent.putExtra(CommuteStripScheduler.EXTRA_DAY_KEY, PerthTime.localDateKey());

    PendingIntent dismissPending = PendingIntent.getBroadcast(
      context,
      CommuteStripScheduler.dismissRequestCode(journeyId),
      dismissIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_next_train)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openPending)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setAutoCancel(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .addAction(0, "Dismiss", dismissPending);

    if (chronometerToMs > now) {
      builder
        .setWhen(chronometerToMs)
        .setShowWhen(false)
        .setUsesChronometer(true);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        builder.setChronometerCountDown(true);
      }
    }

    Notification notification = builder.build();
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.notify(NOTIFICATION_ID, notification);
    }
  }

  public static void cancel(Context context) {
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.cancel(NOTIFICATION_ID);
    }
  }

  private static void createChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID,
      "Commute countdown",
      NotificationManager.IMPORTANCE_LOW
    );
    channel.setDescription("Persistent leave countdown while heading to your target train");

    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }
}
