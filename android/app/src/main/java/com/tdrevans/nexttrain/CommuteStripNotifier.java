package com.tdrevans.nexttrain;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public final class CommuteStripNotifier {

  static final String CHANNEL_ID = "commute_strip";
  /** FB-16: lock-screen glance — silent but high visibility (not the quiet auto-strip channel). */
  static final String CHANNEL_ID_ON_THE_WAY = "train_countdown_glance";
  static final int NOTIFICATION_ID = 52002;
  /** Reuses the leave-alarm slot so lock screen does not drop when morphing to countdown. */
  static final int NOTIFICATION_ID_ON_THE_WAY = LeaveReminderNotifier.NOTIFICATION_ID;

  private CommuteStripNotifier() {}

  enum OnTheWayPhase {
    CHRONOMETER,
    STATIC_ONE_MIN,
    STATIC_NOW
  }

  static final class OnTheWayDisplay {

    final OnTheWayPhase phase;
    final String title;
    final long chronometerToMs;

    OnTheWayDisplay(OnTheWayPhase phase, String title, long chronometerToMs) {
      this.phase = phase;
      this.title = title;
      this.chronometerToMs = chronometerToMs;
    }

    boolean usesChronometer(long nowMs) {
      return phase == OnTheWayPhase.CHRONOMETER && chronometerToMs > nowMs;
    }
  }

  /**
   * Chronometer zero — the train's clock minute (23:10 → 23:10:00). Not one minute
   * early: a live MM:SS that ends at 23:09 looks a minute short of Train 23:10.
   */
  static long computeChronoEndMs(long departureMs) {
    return computeDepartureMinuteMs(departureMs);
  }

  /** Wall-clock start of the frozen "1 min" title (minute before departure). */
  static long computeOneMinPhaseMs(long departureMs) {
    long departureMinuteMs = computeDepartureMinuteMs(departureMs);
    if (departureMinuteMs <= 0) {
      return 0L;
    }
    return departureMinuteMs - 60_000L;
  }

  static long computeDepartureMinuteMs(long departureMs) {
    if (departureMs <= 0) {
      return 0L;
    }
    return PerthTime.truncateToMinuteStartMs(departureMs);
  }

  static OnTheWayDisplay resolveOnTheWayDisplay(long departureMs, long nowMs) {
    if (departureMs <= 0) {
      return new OnTheWayDisplay(OnTheWayPhase.STATIC_NOW, "Train countdown · now", 0L);
    }

    String departureIso = PerthTime.formatIsoFromEpochMs(departureMs);
    int minutes = PerthTime.minutesUntilWallClock(departureIso, nowMs);
    if (minutes > 1) {
      return new OnTheWayDisplay(
        OnTheWayPhase.CHRONOMETER,
        "Train countdown",
        computeChronoEndMs(departureMs)
      );
    }
    if (minutes == 1) {
      return new OnTheWayDisplay(OnTheWayPhase.STATIC_ONE_MIN, "Train countdown · 1 min", 0L);
    }
    return new OnTheWayDisplay(OnTheWayPhase.STATIC_NOW, "Train countdown · now", 0L);
  }

  /** Human countdown for FB-16 — matches in-app wall-clock minutes (status-bar clock). */
  static String formatMinutesToTrain(long departureMs, long nowMs) {
    if (departureMs <= 0) {
      return "Train countdown";
    }
    String departureIso = PerthTime.formatIsoFromEpochMs(departureMs);
    int minutes = PerthTime.minutesUntilWallClock(departureIso, nowMs);
    if (minutes <= 0) {
      return "Train countdown · now";
    }
    if (minutes == 1) {
      return "Train countdown · 1 min";
    }
    return "Train countdown · " + minutes + " min";
  }

  static String formatTrainClock24(long epochMs) {
    if (epochMs <= 0) {
      return "—";
    }
    try {
      ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), PerthTime.zone());
      return time.format(DateTimeFormatter.ofPattern("HH:mm"));
    } catch (Exception error) {
      return "—";
    }
  }

  public static void show(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    long leaveByMs,
    long departureMs,
    boolean stale
  ) {
    show(context, journeyId, route, trainTime, leaveByMs, departureMs, stale, false);
  }

  public static void show(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    long leaveByMs,
    long departureMs,
    boolean stale,
    boolean onTheWay
  ) {
    if (onTheWay) {
      createOnTheWayChannel(context);
    } else {
      createChannel(context);
    }

    long now = System.currentTimeMillis();
    boolean leaveNow = leaveByMs <= now;
    // On my way (FB-16): chronometer above 1 min, static text at 1 min / now.
    String title;
    long chronometerToMs = 0L;
    boolean useChronometer = false;
    String bodyTrainTime =
      departureMs > 0 ? formatTrainClock24(departureMs) : trainTime;
    if (onTheWay) {
      OnTheWayDisplay display =
        resolveOnTheWayDisplay(departureMs > 0 ? departureMs : leaveByMs, now);
      title = display.title;
      useChronometer = display.usesChronometer(now);
      chronometerToMs = useChronometer ? display.chronometerToMs : 0L;
    } else {
      title = leaveNow ? "Target train" : "Leave";
      chronometerToMs = leaveNow ? departureMs : leaveByMs;
      useChronometer = chronometerToMs > now;
    }

    String body = route + " · Train " + bodyTrainTime;
    if (stale) {
      body += " · Times may be out of date";
    }

    Intent openIntent = new Intent(context, MainActivity.class);
    openIntent.setAction(Intent.ACTION_VIEW);
    openIntent.setData(ReminderDeepLink.forJourney(journeyId));
    openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    int notificationId = onTheWay ? NOTIFICATION_ID_ON_THE_WAY : NOTIFICATION_ID;
    String channelId = onTheWay ? CHANNEL_ID_ON_THE_WAY : CHANNEL_ID;

    PendingIntent openPending = PendingIntent.getActivity(
      context,
      notificationId,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    Intent dismissIntent = new Intent(context, CommuteStripReceiver.class);
    dismissIntent.setAction(CommuteStripScheduler.ACTION_DISMISS);
    dismissIntent.putExtra(CommuteStripScheduler.EXTRA_JOURNEY_ID, journeyId);
    // Same zone-aware date CommuteStripScheduler uses for this journey's other day keys —
    // dismissing must land on the same date the fired/dismissed-for-day checks read (closes
    // #400 follow-up, 15 Sep 2026).
    dismissIntent.putExtra(
      CommuteStripScheduler.EXTRA_DAY_KEY,
      DayKeys.forJourneyId(context, journeyId, System.currentTimeMillis())
    );

    PendingIntent dismissPending = PendingIntent.getBroadcast(
      context,
      CommuteStripScheduler.dismissRequestCode(journeyId),
      dismissIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
      .setSmallIcon(R.drawable.ic_stat_next_train)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openPending)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setAutoCancel(false)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .addAction(0, "Dismiss", dismissPending);

    if (onTheWay) {
      builder
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .setSilent(true);
    } else {
      builder
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setCategory(NotificationCompat.CATEGORY_STATUS);
    }

    if (useChronometer) {
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
      manager.notify(notificationId, notification);
    }
  }

  public static void cancel(Context context) {
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.cancel(NOTIFICATION_ID);
    }
  }

  public static void cancelOnTheWay(Context context) {
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.cancel(NOTIFICATION_ID_ON_THE_WAY);
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
    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }

  private static void createOnTheWayChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID_ON_THE_WAY,
      "Train countdown",
      NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription(
      "Quiet countdown on your lock screen after you've left for the train"
    );
    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
    channel.setSound(null, null);
    channel.enableVibration(false);
    channel.enableLights(false);

    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }
}
