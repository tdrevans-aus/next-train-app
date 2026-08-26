package com.tdrevans.nexttrain;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

public final class LeaveReminderNotifier {

  private static final String CHANNEL_ID = "leave_reminders";
  /** High-interrupt channel for leave-by alarm (FB-34). Separate from get-ready heads-up. */
  static final String ALARM_CHANNEL_ID = "leave_alarm_v2";
  static final int NOTIFICATION_ID = 52001;
  /** Keep Leave now visible briefly after the train leaves, then drop it. */
  static final long LEAVE_NOW_HOLD_AFTER_DEPARTURE_MS = 10 * 60_000L;

  public static final String ACTION_DISMISS_LEAVE_ALARM =
    "com.tdrevans.nexttrain.action.DISMISS_LEAVE_ALARM";
  public static final String ACTION_ON_THE_WAY =
    "com.tdrevans.nexttrain.action.LEAVE_ON_THE_WAY";

  public static final String EXTRA_JOURNEY_ID = "journey_id";
  public static final String EXTRA_ROUTE = "route";
  public static final String EXTRA_TRAIN_TIME = "train_time";
  public static final String EXTRA_DEPARTURE_KEY = "departure_key";
  public static final String EXTRA_STALE = "stale";

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
    if (LeaveReminderScheduler.TYPE_LEAVE_NOW.equals(type)) {
      if (!LeaveReminderScheduler.isLeaveNowStillArmed(context, journeyId)) {
        return;
      }
      showLeaveAlarm(context, journeyId, route, trainTime, stale, departureKey);
      return;
    }
    showGetReady(context, journeyId, route, trainTime, stale, getReadyMinutes);
  }

  private static void showGetReady(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    boolean stale,
    int getReadyMinutes
  ) {
    createReminderChannel(context);

    String title;
    if (getReadyMinutes <= 1) {
      title = "Time to get ready";
    } else {
      title = "Leave in " + getReadyMinutes + " min";
    }

    String body = route + " · Train " + trainTime;
    if (stale) {
      body += " · Times may be out of date";
    }

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_next_train)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openJourneyPending(context, journeyId, NOTIFICATION_ID))
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER);

    NotificationManager manager = (NotificationManager) context.getSystemService(
      Context.NOTIFICATION_SERVICE
    );
    if (manager != null) {
      manager.notify(NOTIFICATION_ID, builder.build());
    }
  }

  /**
   * FB-34: audible, persistent leave-by alarm until dismissed. Uses CATEGORY_ALARM + ongoing
   * notification (+ full-screen intent when allowed). Does not require USE_EXACT_ALARM.
   */
  private static void showLeaveAlarm(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    boolean stale,
    String departureKey
  ) {
    createAlarmChannel(context);

    String body = route + " · Train " + trainTime;
    if (stale) {
      body += " · Times may be out of date";
    }

    Intent onTheWayIntent = new Intent(context, LeaveReminderReceiver.class);
    onTheWayIntent.setAction(ACTION_ON_THE_WAY);
    onTheWayIntent.putExtra(EXTRA_JOURNEY_ID, journeyId);
    onTheWayIntent.putExtra(EXTRA_ROUTE, route);
    onTheWayIntent.putExtra(EXTRA_TRAIN_TIME, trainTime);
    onTheWayIntent.putExtra(EXTRA_DEPARTURE_KEY, departureKey);
    onTheWayIntent.putExtra(EXTRA_STALE, stale);
    PendingIntent onTheWayPending = PendingIntent.getBroadcast(
      context,
      NOTIFICATION_ID + 3,
      onTheWayIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, ALARM_CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_next_train)
      .setContentTitle("Leave now")
      .setContentText(body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openJourneyPending(context, journeyId, NOTIFICATION_ID))
      .setOngoing(true)
      .setAutoCancel(false)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .addAction(0, "OK", onTheWayPending);

    long departureMs = departureMsFromKey(departureKey);
    long now = System.currentTimeMillis();
    if (departureMs > now) {
      builder.setWhen(departureMs).setShowWhen(false).setUsesChronometer(true);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        builder.setChronometerCountDown(true);
      }
    }

    long timeoutMs = leaveNowTimeoutMs(departureKey);
    if (timeoutMs > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder.setTimeoutAfter(timeoutMs);
    }

    if (canUseFullScreenIntent(context)) {
      PendingIntent fullScreenPending = PendingIntent.getActivity(
        context,
        NOTIFICATION_ID + 2,
        leaveAlarmActivityIntent(context, journeyId, route, trainTime, stale, departureKey),
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );
      builder.setFullScreenIntent(fullScreenPending, true);
    }

    NotificationManager manager = (NotificationManager) context.getSystemService(
      Context.NOTIFICATION_SERVICE
    );
    if (manager != null) {
      manager.notify(NOTIFICATION_ID, builder.build());
    }

    launchLeaveAlarmActivity(context, journeyId, route, trainTime, stale, departureKey);

    try {
      JSONObject session = new JSONObject();
      session.put("journeyId", journeyId != null ? journeyId : "");
      session.put("route", route != null ? route : "");
      session.put("trainTime", trainTime != null ? trainTime : "");
      session.put("departureKey", departureKey != null ? departureKey : "");
      session.put("stale", stale);
      LeaveReminderSettingsStore.saveActiveLeaveAlarmSession(context, session);
    } catch (Exception error) {
      // Best effort — alarm still rings.
    }
  }

  public static void cancel(Context context) {
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.cancel(NOTIFICATION_ID);
    }
    LeaveReminderSettingsStore.clearActiveLeaveAlarmSession(context);
  }

  /** Bring the alarm over the app / lock screen — FSI is skipped when the screen is already on. */
  static void launchLeaveAlarmActivity(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    boolean stale,
    String departureKey
  ) {
    Intent fullScreen = leaveAlarmActivityIntent(
      context,
      journeyId,
      route,
      trainTime,
      stale,
      departureKey
    );
    try {
      if (Build.VERSION.SDK_INT >= 34) {
        android.app.ActivityOptions options = android.app.ActivityOptions.makeBasic();
        options.setPendingIntentBackgroundActivityStartMode(
          android.app.ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
        );
        context.startActivity(fullScreen, options.toBundle());
      } else {
        context.startActivity(fullScreen);
      }
    } catch (Exception error) {
      // Notification is already posted.
    }
  }

  static Intent leaveAlarmActivityIntent(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    boolean stale,
    String departureKey
  ) {
    Intent fullScreen = new Intent(context, LeaveAlarmActivity.class);
    fullScreen.putExtra(LeaveAlarmActivity.EXTRA_JOURNEY_ID, journeyId);
    fullScreen.putExtra(LeaveAlarmActivity.EXTRA_ROUTE, route);
    fullScreen.putExtra(LeaveAlarmActivity.EXTRA_TRAIN_TIME, trainTime);
    fullScreen.putExtra(LeaveAlarmActivity.EXTRA_DEPARTURE_KEY, departureKey);
    fullScreen.putExtra(LeaveAlarmActivity.EXTRA_STALE, stale);
    fullScreen.setFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK |
      Intent.FLAG_ACTIVITY_CLEAR_TOP |
      Intent.FLAG_ACTIVITY_NO_USER_ACTION
    );
    return fullScreen;
  }

  static boolean canUseFullScreenIntent(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return true;
    }
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    return manager != null && manager.canUseFullScreenIntent();
  }

  /**
   * departureKey is journeyId:ISO — expire ~10 min after departure so shade doesn't keep
   * a Leave now from hours ago.
   */
  private static long leaveNowTimeoutMs(String departureKey) {
    long departureMs = departureMsFromKey(departureKey);
    if (departureMs <= 0) {
      return 30 * 60_000L;
    }
    long until = departureMs + LEAVE_NOW_HOLD_AFTER_DEPARTURE_MS - System.currentTimeMillis();
    return Math.max(60_000L, until);
  }

  static long departureMsFromKey(String departureKey) {
    if (departureKey == null || departureKey.isEmpty()) {
      return 0L;
    }
    int colon = departureKey.indexOf(':');
    if (colon < 0 || colon >= departureKey.length() - 1) {
      return 0L;
    }
    return PerthTime.epochMillisFromIso(departureKey.substring(colon + 1));
  }

  private static PendingIntent openJourneyPending(Context context, String journeyId, int requestCode) {
    Intent openIntent = new Intent(context, MainActivity.class);
    openIntent.setAction(Intent.ACTION_VIEW);
    openIntent.setData(ReminderDeepLink.forReminders());
    openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return PendingIntent.getActivity(
      context,
      requestCode,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
  }

  private static void createReminderChannel(Context context) {
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

  private static void createAlarmChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel = new NotificationChannel(
      ALARM_CHANNEL_ID,
      "Leave alarm",
      NotificationManager.IMPORTANCE_HIGH
    );
    channel.setDescription("Audible leave-by alarm that stays until you dismiss it");
    channel.enableVibration(true);
    channel.setBypassDnd(false);
    channel.setSound(
      Settings.System.DEFAULT_ALARM_ALERT_URI,
      new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    );

    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }
}
