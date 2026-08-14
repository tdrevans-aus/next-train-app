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
  public static final String EXTRA_DEPARTURE_MS = "strip_departure_ms";
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

    if (!hasNotificationPermission(context)) {
      return;
    }

    // Widget cache age is irrelevant here — computeStripPlanForJourney fetches its own trips.
    // Do not stamp "Times may be out of date" from widget refresh age.

    try {
      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson == null || settingsJson.isEmpty()) {
        return;
      }

      JSONObject settings = new JSONObject(settingsJson);
      StripPlan nearbyPlan = computeStripPlanForNearbyPin(context, settings);
      if (nearbyPlan != null) {
        scheduleStripPlan(context, nearbyPlan);
        return;
      }

      if (!LeaveReminderSettingsStore.isCommuteStripEnabled(context)) {
        return;
      }

      JSONArray journeys = settings.optJSONArray("journeys");
      if (journeys == null) {
        return;
      }

      long now = System.currentTimeMillis();
      StripPlan best = null;

      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.getJSONObject(index);
        // Fresh fetch per journey — do not inherit widget-cache "stale" into the strip body.
        StripPlan plan = computeStripPlanForJourney(context, journey, false);
        if (plan == null || plan.endAtMs <= now) {
          continue;
        }
        if (best == null || plan.startAtMs < best.startAtMs) {
          best = plan;
        }
      }

      if (best == null) {
        LeaveReminderNotifier.cancel(context);
        return;
      }

      scheduleStripPlan(context, best);
    } catch (Exception error) {
      // Keep alarms cleared.
    }
  }

  static StripPlan computeStripPlanForNearbyPin(Context context, JSONObject settings)
    throws Exception {
    JSONObject pin = settings.optJSONObject("nearbyPin");
    if (!NearbyPinHelper.isHolding(pin) || !pin.optBoolean("notifyMe", false)) {
      return null;
    }

    int leaveBefore = settings.optInt("nearbyLeaveBeforeMinutes", 10);
    PreferredTrainReminder.Target target = NearbyPinHelper.computeTarget(pin, leaveBefore, false);
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

  private static void scheduleStripPlan(Context context, StripPlan plan) {
    long now = System.currentTimeMillis();
    if (plan == null || plan.endAtMs <= now) {
      LeaveReminderNotifier.cancel(context);
      return;
    }

    if (
      LeaveReminderSettingsStore.hasStripDismissedForDay(
        context,
        plan.target.journeyId,
        PerthTime.localDateKey()
      )
    ) {
      return;
    }

    if (isInsideStripWindow(now, plan.startAtMs, plan.endAtMs)) {
      long departureMs = PerthTime.epochMillisFromIso(plan.target.departureIso);
      CommuteStripNotifier.show(
        context,
        plan.target.journeyId,
        plan.target.route,
        plan.target.trainTime,
        plan.target.leaveByMs,
        departureMs,
        plan.target.stale
      );
      if (plan.target.leaveByMs > now && departureMs > plan.target.leaveByMs) {
        scheduleShowRefresh(
          context,
          plan.target.journeyId,
          plan.target.route,
          plan.target.trainTime,
          plan.target.leaveByMs,
          departureMs,
          plan.endAtMs,
          plan.target.stale
        );
      }
    } else {
      scheduleAlarm(
        context,
        ACTION_SHOW,
        plan.startAtMs,
        plan,
        alarmRequestCode(plan.target.journeyId, "show")
      );
    }

    if (plan.endAtMs > now) {
      scheduleAlarm(
        context,
        ACTION_END,
        plan.endAtMs,
        plan,
        alarmRequestCode(plan.target.journeyId, "end")
      );
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
      journey,
      payload,
      stale,
      PreferredTrainReminder.ScheduleClock.liveForStrip(context)
    );
    if (target == null) {
      return null;
    }

    String localDate = PerthTime.localDateKey();
    // After leave-now for today: only keep strip for that same departure (mid-window),
    // never chain to the next afternoon train.
    if (LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, target.journeyId, localDate)) {
      String firedDepartureKey = LeaveReminderSettingsStore.getLeaveNowDepartureKeyForDay(
        context,
        target.journeyId,
        localDate
      );
      if (
        firedDepartureKey == null ||
        firedDepartureKey.isEmpty() ||
        !firedDepartureKey.equals(target.departureKey)
      ) {
        return null;
      }
    }

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

  /** True when Live countdown should post immediately (mid-window late-arm). */
  static boolean isInsideStripWindow(long nowMs, long startAtMs, long endAtMs) {
    return nowMs >= startAtMs && nowMs < endAtMs;
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
    scheduleAlarm(
      context,
      action,
      triggerAtMs,
      plan.target.journeyId,
      plan.target.route,
      plan.target.trainTime,
      plan.target.leaveByMs,
      PerthTime.epochMillisFromIso(plan.target.departureIso),
      plan.endAtMs,
      plan.target.stale,
      requestCode
    );
  }

  /** Re-post the strip at leave-by so chronometer switches from leave → train. */
  static void scheduleShowRefresh(
    Context context,
    String journeyId,
    String route,
    String trainTime,
    long leaveByMs,
    long departureMs,
    long endAtMs,
    boolean stale
  ) {
    scheduleAlarm(
      context,
      ACTION_SHOW,
      leaveByMs,
      journeyId,
      route,
      trainTime,
      leaveByMs,
      departureMs,
      endAtMs,
      stale,
      alarmRequestCode(journeyId, "leave")
    );
  }

  private static void scheduleAlarm(
    Context context,
    String action,
    long triggerAtMs,
    String journeyId,
    String route,
    String trainTime,
    long leaveByMs,
    long departureMs,
    long endAtMs,
    boolean stale,
    int requestCode
  ) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    Intent intent = new Intent(context, CommuteStripReceiver.class);
    intent.setAction(action);
    intent.putExtra(EXTRA_JOURNEY_ID, journeyId);
    intent.putExtra(EXTRA_ROUTE, route);
    intent.putExtra(EXTRA_TRAIN_TIME, trainTime);
    intent.putExtra(EXTRA_DAY_KEY, PerthTime.localDateKey());
    intent.putExtra(EXTRA_LEAVE_BY_MS, leaveByMs);
    intent.putExtra(EXTRA_DEPARTURE_MS, departureMs);
    intent.putExtra(EXTRA_END_AT_MS, endAtMs);
    intent.putExtra(EXTRA_STALE, stale);

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
