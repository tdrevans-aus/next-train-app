package com.tdrevans.nexttrain;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

public final class LeaveReminderScheduler {

  public static final String ACTION_LEAVE_REMINDER = "com.tdrevans.nexttrain.action.LEAVE_REMINDER";
  public static final String EXTRA_TYPE = "reminder_type";
  public static final String EXTRA_JOURNEY_ID = "journey_id";
  public static final String EXTRA_ROUTE = "route";
  public static final String EXTRA_TRAIN_TIME = "train_time";
  public static final String EXTRA_DEPARTURE_KEY = "departure_key";
  public static final String EXTRA_DAY_KEY = "day_key";
  public static final String EXTRA_STALE = "stale";
  public static final String EXTRA_GET_READY_MINUTES = "get_ready_minutes";

  public static final String TYPE_GET_READY = "get_ready";
  public static final String TYPE_LEAVE_NOW = "leave_now";

  /** @deprecated use {@link #TYPE_GET_READY} */
  public static final String TYPE_EARLY = TYPE_GET_READY;

  private static final String PREFS = "next_train_leave_reminders";
  private static final String KEY_SCHEDULED_ALARMS = "scheduled_alarm_keys";
  public static final long FAST_TEST_DELAY_MS = 60_000L;

  private static final class AlarmPlan {

    final PreferredTrainReminder.Target target;
    final boolean getReadyScheduled;
    final long getReadyAtMs;
    final int getReadyOffsetMinutes;
    final boolean leaveNowScheduled;

    AlarmPlan(
      PreferredTrainReminder.Target target,
      boolean getReadyScheduled,
      long getReadyAtMs,
      int getReadyOffsetMinutes,
      boolean leaveNowScheduled
    ) {
      this.target = target;
      this.getReadyScheduled = getReadyScheduled;
      this.getReadyAtMs = getReadyAtMs;
      this.getReadyOffsetMinutes = getReadyOffsetMinutes;
      this.leaveNowScheduled = leaveNowScheduled;
    }
  }

  private LeaveReminderScheduler() {}

  public static long computeFastTestTriggerAtMs(long nowMs) {
    return nowMs + FAST_TEST_DELAY_MS;
  }

  static boolean isFastTestActive(Context context) {
    return isDebuggable(context) && LeaveReminderSettingsStore.isFastTestEnabled(context);
  }

  private static boolean isDebuggable(Context context) {
    return (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
  }

  public static void reschedule(Context context, CommuteSchedule.Result widgetResult) {
    cancelAllScheduled(context);
    LeaveReminderSettingsStore.clearExpiredPauseIfNeeded(context);

    if (!LeaveReminderSettingsStore.isEnabled(context)) {
      cancelPauseResumeAlarm(context);
      return;
    }

    if (LeaveReminderSettingsStore.isPaused(context)) {
      schedulePauseResumeAlarm(context);
      return;
    }

    cancelPauseResumeAlarm(context);

    if (isFastTestActive(context)) {
      scheduleFastTest(context);
      return;
    }

    long refreshedAt = widgetResult != null && widgetResult.refreshedAtMs > 0
      ? widgetResult.refreshedAtMs
      : WidgetSettingsStore.readLastRefreshMs(context);
    long age = System.currentTimeMillis() - refreshedAt;
    boolean stale = refreshedAt > 0 && age > CommuteSchedule.STALE_THRESHOLD_MS;

    try {
      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson == null || settingsJson.isEmpty()) {
        return;
      }

      JSONObject settings = new JSONObject(settingsJson);
      // Pin reminders fetch their own trips — widget cache age must not block them.
      if (scheduleNearbyPinIfNeeded(context, settings, false)) {
        return;
      }

      if (scheduleRoutePinIfNeeded(context, settings, false)) {
        return;
      }

      if (stale) {
        return;
      }

      JSONArray journeys = settings.optJSONArray("journeys");
      if (journeys == null) {
        return;
      }

      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.getJSONObject(index);
        if (!JourneySelector.isJourneyKind(journey)) {
          continue;
        }
        scheduleForJourney(context, journey, stale);
      }
    } catch (Exception error) {
      // Keep last scheduled alarms cleared.
    }
  }

  private static boolean scheduleNearbyPinIfNeeded(
    Context context,
    JSONObject settings,
    boolean stale
  ) {
    try {
      JSONObject pin = settings.optJSONObject("nearbyPin");
      if (!NearbyPinHelper.isHolding(pin) || !pin.optBoolean("notifyMe", false)) {
        return false;
      }

      int leaveBefore = settings.optInt("nearbyLeaveBeforeMinutes", 10);
      PreferredTrainReminder.Target target = NearbyPinHelper.computeTarget(pin, leaveBefore, stale);
      if (target == null) {
        return false;
      }

      if (LeaveReminderSettingsStore.isAcknowledged(context, target.departureKey)) {
        return false;
      }

      long now = System.currentTimeMillis();
      String localDate = PerthTime.localDateKey();
      boolean leaveNowScheduled =
        target.leaveByMs > now &&
        !LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, target.journeyId, localDate) &&
        !LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_LEAVE_NOW);

      if (leaveNowScheduled) {
        scheduleAlarm(
          context,
          TYPE_LEAVE_NOW,
          target.leaveByMs,
          target,
          0,
          alarmRequestCode(target.journeyId, localDate, TYPE_LEAVE_NOW)
        );
      }

      return true;
    } catch (Exception error) {
      return false;
    }
  }

  private static boolean scheduleRoutePinIfNeeded(
    Context context,
    JSONObject settings,
    boolean stale
  ) {
    try {
      JSONArray journeys = settings.optJSONArray("journeys");
      if (journeys == null) {
        return false;
      }

      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.optJSONObject(index);
        if (journey == null || !JourneySelector.isRouteJourney(journey)) {
          continue;
        }
        if (!journey.optBoolean("pinNotifyMe", false)) {
          continue;
        }

        int leaveBefore = JourneyPinHelper.routePinLeaveBeforeMinutes(journey, settings);
        PreferredTrainReminder.Target target =
          JourneyPinHelper.computeRoutePinTarget(journey, leaveBefore, stale);
        if (target == null) {
          continue;
        }

        if (LeaveReminderSettingsStore.isAcknowledged(context, target.departureKey)) {
          continue;
        }

        long now = System.currentTimeMillis();
        String localDate = PerthTime.localDateKey();
        boolean leaveNowScheduled =
          target.leaveByMs > now &&
          !LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, target.journeyId, localDate) &&
          !LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_LEAVE_NOW);

        if (leaveNowScheduled) {
          scheduleAlarm(
            context,
            TYPE_LEAVE_NOW,
            target.leaveByMs,
            target,
            0,
            alarmRequestCode(target.journeyId, localDate, TYPE_LEAVE_NOW)
          );
        }

        return true;
      }

      return false;
    } catch (Exception error) {
      return false;
    }
  }

  private static void scheduleForJourney(Context context, JSONObject journey, boolean stale) {
    try {
      AlarmPlan plan = computeAlarmPlan(context, journey, stale);
      if (plan == null) {
        return;
      }

      String localDate = PerthTime.localDateKey();
      if (plan.getReadyScheduled) {
        scheduleAlarm(
          context,
          TYPE_GET_READY,
          plan.getReadyAtMs,
          plan.target,
          plan.getReadyOffsetMinutes,
          alarmRequestCode(plan.target.journeyId, localDate, TYPE_GET_READY)
        );
      }

      if (plan.leaveNowScheduled) {
        scheduleAlarm(
          context,
          TYPE_LEAVE_NOW,
          plan.target.leaveByMs,
          plan.target,
          plan.getReadyOffsetMinutes,
          alarmRequestCode(plan.target.journeyId, localDate, TYPE_LEAVE_NOW)
        );
      }
    } catch (Exception error) {
      // Skip this journey on fetch/compute errors.
    }
  }

  /**
   * Debug QA path — one alarm ~60s from reschedule. Exercises Receiver → Notifier → tap without
   * waiting for the next real commute window.
   */
  private static void scheduleFastTest(Context context) {
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
      long triggerAtMs = computeFastTestTriggerAtMs(now);
      String localDate = PerthTime.localDateKey();

      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.getJSONObject(index);
        if (!JourneySelector.isJourneyKind(journey)) {
          continue;
        }
        if (!PreferredTrainReminder.isRemindMeEnabled(journey)) {
          continue;
        }

        PreferredTrainReminder.Target target = resolveFastTestTarget(context, journey);
        if (target == null) {
          continue;
        }

        if (LeaveReminderSettingsStore.isAcknowledged(context, target.departureKey)) {
          continue;
        }

        String type;
        int getReadyMinutes = LeaveReminderSettingsStore.getReadyOffsetMinutes(context);
        if (LeaveReminderSettingsStore.isGetReadyEnabled(context)) {
          type = TYPE_GET_READY;
          if (
            LeaveReminderSettingsStore.hasGetReadyFiredForDay(context, target.journeyId, localDate) ||
            LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_GET_READY)
          ) {
            continue;
          }
        } else if (
          !LeaveReminderSettingsStore.isCommuteStripEnabled(context) &&
          !LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, target.journeyId, localDate) &&
          !LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_LEAVE_NOW)
        ) {
          type = TYPE_LEAVE_NOW;
          getReadyMinutes = 0;
        } else {
          type = TYPE_GET_READY;
          if (
            LeaveReminderSettingsStore.hasGetReadyFiredForDay(context, target.journeyId, localDate) ||
            LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_GET_READY)
          ) {
            continue;
          }
        }

        scheduleAlarm(
          context,
          type,
          triggerAtMs,
          target,
          getReadyMinutes,
          alarmRequestCode(target.journeyId, localDate, "fast_test:" + type)
        );
        return;
      }
    } catch (Exception error) {
      // Best effort — fast test is optional QA.
    }
  }

  private static PreferredTrainReminder.Target resolveFastTestTarget(
    Context context,
    JSONObject journey
  ) throws Exception {
    AlarmPlan plan = computeAlarmPlan(context, journey, false);
    if (plan != null) {
      return plan.target;
    }

    String station = journey.optString("station", "");
    String direction = journey.optString("direction", "");
    if (station.isEmpty() || direction.isEmpty()) {
      return null;
    }

    int leaveBefore = journey.optInt("leaveBeforeMinutes", 10);
    JSONObject payload = NextTrainApiClient.fetchNextTrain(station, direction, leaveBefore);
    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      context,
      journey,
      payload,
      false
    );
    if (target != null) {
      return target;
    }

    PreferredTrainReminder.Target synthetic = new PreferredTrainReminder.Target();
    String journeyId = journey.optString("id", "fast-test");
    long leaveByMs = computeFastTestTriggerAtMs(System.currentTimeMillis());
    synthetic.journeyId = journeyId;
    synthetic.route = WidgetDataService.formatRoute(journey);
    synthetic.trainTime = PerthTime.formatClockFromEpochMs(leaveByMs + leaveBefore * 60_000L);
    synthetic.departureIso = PerthTime.formatIsoFromEpochMs(leaveByMs + leaveBefore * 60_000L);
    synthetic.dayKey = PerthTime.localDateKey();
    synthetic.departureKey = journeyId + ":fast-test:" + synthetic.departureIso;
    synthetic.leaveByMs = leaveByMs;
    synthetic.stale = false;
    return synthetic;
  }

  private static JSONObject describeFastTestSchedule(Context context, long computedAtMs) {
    JSONObject result = new JSONObject();
    try {
      long triggerAtMs = computeFastTestTriggerAtMs(computedAtMs);
      result.put("scheduled", true);
      result.put("reason", "fast_test");
      result.put("fastTest", true);
      result.put("primaryNotifyAtIso", PerthTime.formatIsoFromEpochMs(triggerAtMs));
      result.put("primaryNotifyAtClock", PerthTime.formatClockFromEpochMs(triggerAtMs));
      result.put(
        "primaryType",
        LeaveReminderSettingsStore.isGetReadyEnabled(context) ||
          LeaveReminderSettingsStore.isCommuteStripEnabled(context)
          ? TYPE_GET_READY
          : TYPE_LEAVE_NOW
      );

      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson != null && !settingsJson.isEmpty()) {
        JSONObject settings = new JSONObject(settingsJson);
        JSONArray journeys = settings.optJSONArray("journeys");
        if (journeys != null) {
          for (int index = 0; index < journeys.length(); index += 1) {
            JSONObject journey = journeys.optJSONObject(index);
            if (journey == null || !JourneySelector.isJourneyKind(journey)) {
              continue;
            }
            if (!PreferredTrainReminder.isRemindMeEnabled(journey)) {
              continue;
            }
            PreferredTrainReminder.Target target = resolveFastTestTarget(context, journey);
            if (target == null) {
              continue;
            }
            result.put("journeyId", target.journeyId);
            result.put("journeyName", journey.optString("name", ""));
            result.put("route", target.route);
            result.put("trainTime", target.trainTime);
            result.put("departureIso", target.departureIso);
            result.put("leaveByIso", PerthTime.formatIsoFromEpochMs(target.leaveByMs));
            result.put("leaveByClock", PerthTime.formatClockFromEpochMs(target.leaveByMs));
            break;
          }
        }
      }
    } catch (Exception error) {
      try {
        result.put("scheduled", false);
        result.put("reason", "error");
        result.put(
          "errorMessage",
          error.getMessage() != null ? error.getMessage() : "unknown"
        );
      } catch (Exception ignored) {
        // Unreachable.
      }
    }
    return result;
  }

  /**
   * Idempotent read of the next reminder fire(s) using the same path as {@link #reschedule}.
   * Does not arm or cancel alarms.
   */
  public static JSONObject describeSchedule(Context context) {
    long computedAtMs = System.currentTimeMillis();
    String localDate = PerthTime.localDateKey();
    LeaveReminderSettingsStore.clearExpiredPauseIfNeeded(context);
    JSONObject leaveSettings = LeaveReminderSettingsStore.readSettings(context);
    boolean enabled = leaveSettings.optBoolean("enabled", false);
    boolean paused = leaveSettings.optBoolean("paused", false);

    JSONObject envelope = new JSONObject();
    try {
      envelope.put("enabled", enabled);
      envelope.put("paused", paused);
      envelope.put("scheduled", false);
      envelope.put("reason", "no_journey");
      envelope.put("localDate", localDate);
      envelope.put("computedAtIso", PerthTime.formatIsoFromEpochMs(computedAtMs));

      if (!enabled) {
        envelope.put("reason", "reminders_off");
        return envelope;
      }
      if (paused) {
        envelope.put("reason", "paused");
        String pauseUntil = leaveSettings.optString("pauseUntil", "");
        if (pauseUntil != null && !pauseUntil.isEmpty() && !"null".equals(pauseUntil)) {
          envelope.put("pauseUntil", pauseUntil);
        }
        return envelope;
      }

      if (isFastTestActive(context)) {
        mergeScheduleFields(envelope, describeFastTestSchedule(context, computedAtMs));
        return envelope;
      }

      long refreshedAt = WidgetSettingsStore.readLastRefreshMs(context);
      long age = computedAtMs - refreshedAt;
      boolean stale = refreshedAt > 0 && age > CommuteSchedule.STALE_THRESHOLD_MS;
      if (stale) {
        envelope.put("reason", "stale");
        return envelope;
      }

      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson == null || settingsJson.isEmpty()) {
        envelope.put("reason", "no_journey");
        return envelope;
      }

      JSONObject widgetSettings = new JSONObject(settingsJson);
      JSONArray journeys = widgetSettings.optJSONArray("journeys");
      if (journeys == null || journeys.length() == 0) {
        envelope.put("reason", "no_journey");
        return envelope;
      }

      JSONObject bestScheduled = null;
      long bestPrimaryMs = Long.MAX_VALUE;
      JSONObject firstFailure = null;

      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.getJSONObject(index);
        if (!JourneySelector.isJourneyKind(journey)) {
          continue;
        }
        JSONObject journeyResult = describeJourneySchedule(context, journey, stale, computedAtMs);
        if (journeyResult.optBoolean("scheduled", false)) {
          long primaryMs = PerthTime.epochMillisFromIso(journeyResult.optString("primaryNotifyAtIso", ""));
          if (primaryMs > 0 && primaryMs < bestPrimaryMs) {
            bestPrimaryMs = primaryMs;
            bestScheduled = journeyResult;
          }
        } else if (firstFailure == null) {
          firstFailure = journeyResult;
        }
      }

      JSONObject chosen = bestScheduled != null ? bestScheduled : firstFailure;
      if (chosen == null) {
        envelope.put("reason", "no_journey");
        return envelope;
      }

      mergeScheduleFields(envelope, chosen);
      return envelope;
    } catch (Exception error) {
      try {
        envelope.put("scheduled", false);
        envelope.put("reason", "error");
        envelope.put(
          "errorMessage",
          error.getMessage() != null ? error.getMessage() : "unknown"
        );
      } catch (Exception ignored) {
        // Unreachable.
      }
      return envelope;
    }
  }

  private static void mergeScheduleFields(JSONObject target, JSONObject source) throws Exception {
    String[] keys = {
      "scheduled",
      "reason",
      "journeyId",
      "journeyName",
      "route",
      "trainTime",
      "departureIso",
      "leaveByIso",
      "leaveByClock",
      "getReady",
      "leaveNow",
      "primaryNotifyAtIso",
      "primaryNotifyAtClock",
      "primaryType",
      "errorMessage",
    };
    for (String key : keys) {
      if (source.has(key)) {
        target.put(key, source.get(key));
      }
    }
  }

  private static JSONObject describeJourneySchedule(
    Context context,
    JSONObject journey,
    boolean stale,
    long computedAtMs
  ) {
    JSONObject result = new JSONObject();
    try {
      String journeyId = journey.optString("id", "");
      result.put("scheduled", false);
      result.put("reason", "no_journey");
      result.put("journeyId", journeyId);
      result.put("journeyName", journey.optString("name", ""));
      result.put("route", WidgetDataService.formatRoute(journey));

      String station = journey.optString("station", "");
      String direction = journey.optString("direction", "");
      if (station.isEmpty() || direction.isEmpty()) {
        result.put("reason", "no_journey");
        return result;
      }

      if (!JourneySelector.isJourneyKind(journey)) {
        result.put("reason", "route_journey");
        return result;
      }

      if (!journey.optBoolean("useLeaveBefore", true)) {
        result.put("reason", "buffer_off");
        return result;
      }

      if (!PreferredTrainReminder.isRemindMeEnabled(journey)) {
        result.put("reason", "journey_reminders_off");
        return result;
      }

      String preferred = journey.optString("preferredTrainTime", "");
      if (preferred.isEmpty() && !journey.has("remindMe")) {
        preferred = journey.optString("defaultFrom", "");
      }
      if (PerthTime.parseClockMinutes(preferred) < 0) {
        result.put("reason", "no_preferred");
        return result;
      }

      if (!PreferredTrainReminder.isRemindDay(journey)) {
        result.put("reason", "wrong_day");
        return result;
      }

      if (stale) {
        result.put("reason", "stale");
        return result;
      }

      AlarmPlan plan = computeAlarmPlan(context, journey, stale);
      if (plan == null) {
        int leaveBefore = journey.optInt("leaveBeforeMinutes", 10);
        JSONObject payload = NextTrainApiClient.fetchNextTrain(station, direction, leaveBefore);
        PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
          context,
          journey,
          payload,
          stale
        );
        if (target != null && LeaveReminderSettingsStore.isAcknowledged(context, target.departureKey)) {
          result.put("reason", "already_fired");
          return result;
        }

        PreferredTrainReminder.ScheduleClock clock = PreferredTrainReminder.ScheduleClock.live(
          context,
          journeyId
        );
        result.put("reason", PreferredTrainReminder.diagnoseUnscheduled(journey, payload, clock));
        return result;
      }

      return buildScheduledResult(context, plan, journey);
    } catch (Exception error) {
      try {
        result.put("scheduled", false);
        result.put("reason", "error");
        result.put(
          "errorMessage",
          error.getMessage() != null ? error.getMessage() : "unknown"
        );
      } catch (Exception ignored) {
        // Unreachable.
      }
      return result;
    }
  }

  private static JSONObject buildScheduledResult(Context context, AlarmPlan plan, JSONObject journey)
    throws Exception {
    JSONObject result = new JSONObject();
    PreferredTrainReminder.Target target = plan.target;

    result.put("journeyId", target.journeyId);
    result.put("journeyName", journey.optString("name", ""));
    result.put("route", target.route);
    result.put("trainTime", target.trainTime);
    result.put("departureIso", target.departureIso);
    result.put("leaveByIso", PerthTime.formatIsoFromEpochMs(target.leaveByMs));
    result.put("leaveByClock", PerthTime.formatClockFromEpochMs(target.leaveByMs));

    JSONObject getReady = new JSONObject();
    getReady.put("scheduled", plan.getReadyScheduled);
    if (plan.getReadyScheduled) {
      getReady.put("notifyAtIso", PerthTime.formatIsoFromEpochMs(plan.getReadyAtMs));
      getReady.put("notifyAtClock", PerthTime.formatClockFromEpochMs(plan.getReadyAtMs));
      getReady.put("offsetMinutes", plan.getReadyOffsetMinutes);
    }
    result.put("getReady", getReady);

    JSONObject leaveNow = new JSONObject();
    leaveNow.put("scheduled", plan.leaveNowScheduled);
    if (plan.leaveNowScheduled) {
      leaveNow.put("notifyAtIso", PerthTime.formatIsoFromEpochMs(target.leaveByMs));
      leaveNow.put("notifyAtClock", PerthTime.formatClockFromEpochMs(target.leaveByMs));
    }
    result.put("leaveNow", leaveNow);

    boolean scheduled = plan.getReadyScheduled || plan.leaveNowScheduled;
    result.put("scheduled", scheduled);
    if (!scheduled) {
      String localDate = PerthTime.localDateKey();
      if (
        LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, target.journeyId, localDate) ||
        LeaveReminderSettingsStore.hasGetReadyFiredForDay(context, target.journeyId, localDate)
      ) {
        result.put("reason", "already_fired");
      } else {
        result.put("reason", "leave_in_past");
      }
      return result;
    }

    result.put("reason", "ok");

    long primaryMs;
    String primaryType;
    if (
      plan.getReadyScheduled &&
      (!plan.leaveNowScheduled || plan.getReadyAtMs <= target.leaveByMs)
    ) {
      primaryMs = plan.getReadyAtMs;
      primaryType = TYPE_GET_READY;
    } else if (plan.leaveNowScheduled) {
      primaryMs = target.leaveByMs;
      primaryType = TYPE_LEAVE_NOW;
    } else {
      primaryMs = target.leaveByMs;
      primaryType = "commute_strip";
    }

    result.put("primaryNotifyAtIso", PerthTime.formatIsoFromEpochMs(primaryMs));
    result.put("primaryNotifyAtClock", PerthTime.formatClockFromEpochMs(primaryMs));
    result.put("primaryType", primaryType);
    return result;
  }

  private static AlarmPlan computeAlarmPlan(Context context, JSONObject journey, boolean stale)
    throws Exception {
    String station = journey.optString("station", "");
    String direction = journey.optString("direction", "");
    if (station.isEmpty() || direction.isEmpty()) {
      return null;
    }

    if (!journey.optBoolean("useLeaveBefore", true)) {
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

    if (LeaveReminderSettingsStore.isAcknowledged(context, target.departureKey)) {
      return null;
    }

    long now = System.currentTimeMillis();
    String localDate = PerthTime.localDateKey();
    int getReadyMinutes = LeaveReminderSettingsStore.getReadyOffsetMinutes(context);
    boolean getReadyScheduled = false;
    long getReadyAtMs = 0L;

    if (LeaveReminderSettingsStore.isGetReadyEnabled(context)) {
      getReadyAtMs = PreferredTrainReminder.computeGetReadyAtMs(target.leaveByMs, getReadyMinutes);
      if (
        getReadyAtMs > now &&
        !LeaveReminderSettingsStore.hasGetReadyFiredForDay(context, target.journeyId, localDate) &&
        !LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_GET_READY)
      ) {
        getReadyScheduled = true;
      }
    }

    boolean leaveNowScheduled =
      target.leaveByMs > now &&
      !LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, target.journeyId, localDate) &&
      !LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_LEAVE_NOW);

    return new AlarmPlan(target, getReadyScheduled, getReadyAtMs, getReadyMinutes, leaveNowScheduled);
  }

  public static void cancelAll(Context context) {
    cancelAllScheduled(context);
    cancelPauseResumeAlarm(context);
  }

  static final String ACTION_PAUSE_RESUME = "com.tdrevans.nexttrain.action.PAUSE_RESUME";
  private static final int PAUSE_RESUME_REQUEST_CODE = 74001;

  static void schedulePauseResumeAlarm(Context context) {
    JSONObject settings = LeaveReminderSettingsStore.readSettings(context);
    String pauseUntil = settings.optString("pauseUntil", "");
    long untilMs = PerthTime.epochMillisFromIso(pauseUntil);
    long now = System.currentTimeMillis();
    if (untilMs <= now) {
      cancelPauseResumeAlarm(context);
      return;
    }

    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    Intent intent = new Intent(context, PauseResumeReceiver.class);
    intent.setAction(ACTION_PAUSE_RESUME);
    PendingIntent pending = PendingIntent.getBroadcast(
      context,
      PAUSE_RESUME_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, untilMs, pending);
      } else {
        manager.setExact(AlarmManager.RTC_WAKEUP, untilMs, pending);
      }
    } catch (Exception error) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, untilMs, pending);
      } else {
        manager.set(AlarmManager.RTC_WAKEUP, untilMs, pending);
      }
    }
  }

  static void cancelPauseResumeAlarm(Context context) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    Intent intent = new Intent(context, PauseResumeReceiver.class);
    intent.setAction(ACTION_PAUSE_RESUME);
    PendingIntent pending = PendingIntent.getBroadcast(
      context,
      PAUSE_RESUME_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
    manager.cancel(pending);
    pending.cancel();
  }

  private static void cancelAllScheduled(Context context) {
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
          new Intent(context, LeaveReminderReceiver.class),
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
    String type,
    long triggerAtMs,
    PreferredTrainReminder.Target target,
    int getReadyMinutes,
    int requestCode
  ) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (manager == null) {
      return;
    }

    Intent intent = new Intent(context, LeaveReminderReceiver.class);
    intent.setAction(ACTION_LEAVE_REMINDER);
    intent.putExtra(EXTRA_TYPE, type);
    intent.putExtra(EXTRA_JOURNEY_ID, target.journeyId);
    intent.putExtra(EXTRA_ROUTE, target.route);
    intent.putExtra(EXTRA_TRAIN_TIME, target.trainTime);
    intent.putExtra(EXTRA_DEPARTURE_KEY, target.departureKey);
    intent.putExtra(EXTRA_DAY_KEY, target.dayKey);
    intent.putExtra(EXTRA_STALE, target.stale);
    intent.putExtra(EXTRA_GET_READY_MINUTES, getReadyMinutes);

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

  private static int alarmRequestCode(String journeyId, String localDate, String type) {
    return (journeyId + ":" + localDate + ":" + type).hashCode();
  }
}
