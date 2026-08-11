package com.tdrevans.nexttrain;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public final class CommuteStripScheduler {

  public static final String ACTION_SHOW = "com.tdrevans.nexttrain.action.COMMUTE_STRIP_SHOW";
  public static final String ACTION_END = "com.tdrevans.nexttrain.action.COMMUTE_STRIP_END";
  public static final String ACTION_DISMISS = "com.tdrevans.nexttrain.action.COMMUTE_STRIP_DISMISS";

  public static final String EXTRA_JOURNEY_ID = "strip_journey_id";
  public static final String EXTRA_ROUTE = "strip_route";
  public static final String EXTRA_TRAIN_TIME = "strip_train_time";
  public static final String EXTRA_DAY_KEY = "strip_day_key";
  public static final String EXTRA_LEAVE_BY_MS = "strip_leave_by_ms";
  public static final String EXTRA_END_AT_MS = "strip_end_at_ms";
  public static final String EXTRA_STALE = "strip_stale";

  private static final String PREFS = "next_train_commute_strip";
  private static final String KEY_SCHEDULED_ALARMS = "scheduled_alarm_keys";

  static final long GRACE_MS = 10 * 60_000L;
  static final long MAX_RUNTIME_MS = 90 * 60_000L;

  static final class StripPlan {

    final PreferredTrainReminder.Target target;
    final long startAtMs;
    final long endAtMs;

    StripPlan(PreferredTrainReminder.Target target, long startAtMs, long endAtMs) {
      this.target = target;
      this.startAtMs = startAtMs;
      this.endAtMs = endAtMs;
    }
  }

  private CommuteStripScheduler() {}

  public static void reschedule(Context context, CommuteSchedule.Result widgetResult) {
    cancelScheduledAlarms(context);
    CommuteStripNotifier.cancel(context);

    LeaveReminderSettingsStore.clearExpiredPauseIfNeeded(context);

    if (!LeaveReminderSettingsStore.isCommuteStripEnabled(context)) {
      return;
    }

    if (!hasNotificationPermission(context)) {
      return;
    }

    long refreshedAt = widgetResult != null && widgetResult.refreshedAtMs > 0
      ? widgetResult.refreshedAtMs
      : WidgetSettingsStore.readLastRefreshMs(context);
    long age = System.currentTimeMillis() - refreshedAt;
    boolean stale = refreshedAt > 0 && age > CommuteSchedule.STALE_THRESHOLD_MS;
    if (stale) {
      return;
    }

    try {
      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson == null || settingsJson.isEmpty()) {
        return;
      }

      JSONObject settings = new JSONObject(settingsJson);
      JSONArray journeys = settings.optJSONArray("journeys");
      if (journeys == null) {
        return;
      }

      long now = System.currentTimeMillis();
      StripPlan best = null;

      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.getJSONObject(index);
        StripPlan plan = computeStripPlanForJourney(context, journey, stale);
        if (plan == null || plan.endAtMs <= now) {
          continue;
        }
        if (best == null || plan.startAtMs < best.startAtMs) {
          best = plan;
        }
      }

      if (best == null) {
        return;
      }

      if (
        LeaveReminderSettingsStore.hasStripDismissedForDay(
          context,
          best.target.journeyId,
          PerthTime.localDateKey()
        )
      ) {
        return;
      }

      if (now >= best.startAtMs) {
        CommuteStripNotifier.show(
          context,
          best.target.journeyId,
          best.target.route,
          best.target.trainTime,
          best.target.leaveByMs,
          best.target.stale
        );
      } else {
        scheduleAlarm(
          context,
          ACTION_SHOW,
          best.startAtMs,
          best,
          alarmRequestCode(best.target.journeyId, "show")
        );
      }

      if (best.endAtMs > now) {
        scheduleAlarm(
          context,
          ACTION_END,
          best.endAtMs,
          best,
          alarmRequestCode(best.target.journeyId, "end")
        );
      }
    } catch (Exception error) {
      // Keep alarms cleared.
    }
  }

  static StripPlan computeStripPlanForJourney(Context context, JSONObject journey, boolean stale)
    throws Exception {
    String station = journey.optString("station", "");
    String direction = journey.optString("direction", "");
    if (station.isEmpty() || direction.isEmpty()) {
      return null;
    }

    if (!journey.optBoolean("useLeaveBefore", true)) {
      return null;
    }

    if (!PreferredTrainReminder.isRemindMeEnabled(journey)) {
      return null;
    }

    if (!PreferredTrainReminder.isRemindDay(journey)) {
      return null;
    }

    int leaveBefore = journey.optInt("leaveBeforeMinutes", 10);
    JSONObject payload = NextTrainApiClient.fetchNextTrain(station, direction, leaveBefore);
    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      context,
      journey,
      payload,
      stale
    );
    if (target == null) {
      return null;
    }

    String localDate = PerthTime.localDateKey();
    if (LeaveReminderSettingsStore.hasStripDismissedForDay(context, target.journeyId, localDate)) {
      return null;
    }

    long startAtMs = computeStripStartMs(context, target.leaveByMs);
    long endAtMs = computeStripEndMs(startAtMs, target.departureIso);
    if (endAtMs <= startAtMs) {
      return null;
    }

    return new StripPlan(target, startAtMs, endAtMs);
  }

  static long computeStripStartMs(Context context, long leaveByMs) {
    JSONObject settings = LeaveReminderSettingsStore.readSettingsResolved(context);
    if (settings.optBoolean("earlyHeadsUp", false)) {
      int offset = Math.max(0, settings.optInt("earlyOffsetMinutes", 5));
      if (offset > 0) {
        return PreferredTrainReminder.computeGetReadyAtMs(leaveByMs, offset);
      }
    }
    return leaveByMs;
  }

  static long computeStripStartMsFromSettings(JSONObject settings, long leaveByMs) {
    if (settings != null && settings.optBoolean("earlyHeadsUp", false)) {
      int offset = Math.max(0, settings.optInt("earlyOffsetMinutes", 5));
      if (offset > 0) {
        return PreferredTrainReminder.computeGetReadyAtMs(leaveByMs, offset);
      }
    }
    return leaveByMs;
  }

  static long computeStripEndMs(long startAtMs, String departureIso) {
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    long graceEnd = departureMs > 0 ? departureMs + GRACE_MS : startAtMs + MAX_RUNTIME_MS;
    long maxEnd = startAtMs + MAX_RUNTIME_MS;
    return Math.min(graceEnd, maxEnd);
  }

  public static void cancelScheduledAlarms(Context context) {
    SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String raw = prefs.getString(KEY_SCHEDULED_ALARMS, "[]");
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    try {
      JSONArray keys = new JSONArray(raw);
      for (int index = 0; index < keys.length(); index += 1) {
        int requestCode = keys.getInt(index);
        PendingIntent pending = PendingIntent.getBroadcast(
          context,
          requestCode,
          new Intent(context, CommuteStripReceiver.class),
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        manager.cancel(pending);
        pending.cancel();
      }
    } catch (Exception ignored) {
      // Fall through to clear keys.
    }

    prefs.edit().putString(KEY_SCHEDULED_ALARMS, "[]").apply();
  }

  static boolean hasNotificationPermission(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return true;
    }
    return (
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
      PackageManager.PERMISSION_GRANTED
    );
  }

  static int dismissRequestCode(String journeyId) {
    return ("strip_dismiss:" + journeyId).hashCode();
  }

  private static void registerScheduledAlarm(Context context, int requestCode) {
    try {
      SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONArray keys = new JSONArray(prefs.getString(KEY_SCHEDULED_ALARMS, "[]"));
      keys.put(requestCode);
      prefs.edit().putString(KEY_SCHEDULED_ALARMS, keys.toString()).apply();
    } catch (Exception ignored) {
      // Best effort.
    }
  }

  private static void scheduleAlarm(
    Context context,
    String action,
    long triggerAtMs,
    StripPlan plan,
    int requestCode
  ) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    Intent intent = new Intent(context, CommuteStripReceiver.class);
    intent.setAction(action);
    intent.putExtra(EXTRA_JOURNEY_ID, plan.target.journeyId);
    intent.putExtra(EXTRA_ROUTE, plan.target.route);
    intent.putExtra(EXTRA_TRAIN_TIME, plan.target.trainTime);
    intent.putExtra(EXTRA_DAY_KEY, PerthTime.localDateKey());
    intent.putExtra(EXTRA_LEAVE_BY_MS, plan.target.leaveByMs);
    intent.putExtra(EXTRA_END_AT_MS, plan.endAtMs);
    intent.putExtra(EXTRA_STALE, plan.target.stale);

    PendingIntent pending = PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
      } else {
        manager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
      }
    } catch (Exception error) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
      } else {
        manager.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pending);
      }
    }

    registerScheduledAlarm(context, requestCode);
  }

  private static int alarmRequestCode(String journeyId, String kind) {
    return ("strip:" + journeyId + ":" + PerthTime.localDateKey() + ":" + kind).hashCode();
  }
}
