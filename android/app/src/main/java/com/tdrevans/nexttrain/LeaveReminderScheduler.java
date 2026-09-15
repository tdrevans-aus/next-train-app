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

  /** Leave-now still owed while the train has not departed (includes past leave-by). */
  static boolean isLeaveNowBlockedForTarget(Context context, PreferredTrainReminder.Target target) {
    if (target == null) {
      return true;
    }
    if (LeaveReminderSettingsStore.isAcknowledged(context, target.departureKey)) {
      return true;
    }
    if (LeaveReminderSettingsStore.hasFired(context, target.departureKey, TYPE_LEAVE_NOW)) {
      return true;
    }
    // Near me pin reuses one journey id — block per departure, not once per day.
    if (NearbyPinHelper.JOURNEY_ID.equals(target.journeyId)) {
      return false;
    }
    String localDate = PerthTime.localDateKey();
    return LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, target.journeyId, localDate);
  }

  static boolean shouldScheduleLeaveNow(
    Context context,
    PreferredTrainReminder.Target target,
    long now
  ) {
    if (target == null) {
      return false;
    }
    if (isLeaveNowBlockedForTarget(context, target)) {
      return false;
    }
    long departureMs = PerthTime.epochMillisFromIso(target.departureIso);
    return departureMs > now && target.leaveByMs <= departureMs;
  }

  /**
   * Stale AlarmClock can still fire after the user turns Remind me off. Don't ring unless
   * the matching pin/journey toggle is still on.
   */
  static boolean isLeaveNowStillArmed(Context context, String journeyId) {
    if (context == null || journeyId == null || journeyId.isEmpty()) {
      return false;
    }
    if (!LeaveReminderSettingsStore.isEnabled(context) || LeaveReminderSettingsStore.isPaused(context)) {
      return false;
    }
    try {
      String raw = WidgetSettingsStore.readSettings(context);
      if (raw == null || raw.isEmpty()) {
        return false;
      }
      return isLeaveNowStillArmed(new JSONObject(raw), journeyId);
    } catch (Exception error) {
      return false;
    }
  }

  static boolean isLeaveNowStillArmed(JSONObject widgetSettings, String journeyId) {
    if (widgetSettings == null || journeyId == null || journeyId.isEmpty()) {
      return false;
    }
    if (NearbyPinHelper.JOURNEY_ID.equals(journeyId)) {
      JSONObject pin = widgetSettings.optJSONObject("nearbyPin");
      return pin != null && pin.optBoolean("notifyMe", false);
    }
    JSONArray journeys = widgetSettings.optJSONArray("journeys");
    if (journeys == null) {
      return false;
    }
    for (int index = 0; index < journeys.length(); index += 1) {
      JSONObject journey = journeys.optJSONObject(index);
      if (journey == null || !journeyId.equals(journey.optString("id", ""))) {
        continue;
      }
      if (JourneySelector.isRouteJourney(journey)) {
        return journey.optBoolean("pinNotifyMe", false);
      }
      return PreferredTrainReminder.isRemindMeEnabled(journey);
    }
    return false;
  }

  static void rearmNearbyPinIfNotifyTurnedOn(
    Context context,
    String previousSettingsJson,
    String nextSettingsJson
  ) {
    try {
      JSONObject next = new JSONObject(nextSettingsJson);
      JSONObject pin = next.optJSONObject("nearbyPin");
      if (pin == null || !pin.optBoolean("notifyMe", false)) {
        return;
      }
      String departureIso = pin.optString("departureIso", "");
      if (departureIso.isEmpty()) {
        return;
      }
      JSONObject previousPin = null;
      if (previousSettingsJson != null && !previousSettingsJson.isEmpty()) {
        previousPin = new JSONObject(previousSettingsJson).optJSONObject("nearbyPin");
      }
      boolean samePinAlreadyOn =
        previousPin != null &&
        previousPin.optBoolean("notifyMe", false) &&
        departureIso.equals(previousPin.optString("departureIso", ""));
      if (samePinAlreadyOn) {
        return;
      }
      LeaveReminderSettingsStore.clearLeaveNowBlock(
        context,
        NearbyPinHelper.JOURNEY_ID + ":" + departureIso
      );
    } catch (Exception ignored) {
      // Best effort — scheduling still runs.
    }
  }

  static long resolveLeaveNowTriggerAtMs(long leaveByMs, long now) {
    long alignedLeaveBy = PerthTime.truncateToMinuteStartMs(leaveByMs);
    if (alignedLeaveBy > now) {
      return alignedLeaveBy;
    }
    // Past leave-by: fire now. A +2s AlarmClock on Samsung often never rings
    // while the app is already open.
    return now;
  }

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

    if (!LeaveReminderSettingsStore.isEnabled(context) && !isFastTestActive(context)) {
      cancelPauseResumeAlarm(context);
      LeaveReminderNotifier.cancel(context);
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
      if (shouldScheduleLeaveNow(context, target, now)) {
        scheduleAlarm(
          context,
          TYPE_LEAVE_NOW,
          resolveLeaveNowTriggerAtMs(target.leaveByMs, now),
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
        if (shouldScheduleLeaveNow(context, target, now)) {
          scheduleAlarm(
            context,
            TYPE_LEAVE_NOW,
            resolveLeaveNowTriggerAtMs(target.leaveByMs, now),
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
        long now = System.currentTimeMillis();
        scheduleAlarm(
          context,
          TYPE_LEAVE_NOW,
          resolveLeaveNowTriggerAtMs(plan.target.leaveByMs, now),
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

      long now = System.currentTimeMillis();
      long triggerAtMs = computeFastTestTriggerAtMs(now);
      String localDate = PerthTime.localDateKey();

      JSONObject pin = settings.optJSONObject("nearbyPin");
      if (pin != null && NearbyPinHelper.isHolding(pin)) {
        int leaveBefore = settings.optInt("nearbyLeaveBeforeMinutes", 10);
        PreferredTrainReminder.Target nearbyTarget = NearbyPinHelper.computeTarget(pin, leaveBefore, false);
        if (
          nearbyTarget != null &&
          !isLeaveNowBlockedForTarget(context, nearbyTarget)
        ) {
          scheduleAlarm(
            context,
            TYPE_LEAVE_NOW,
            triggerAtMs,
            nearbyTarget,
            0,
            alarmRequestCode(nearbyTarget.journeyId, localDate, "fast_test:" + TYPE_LEAVE_NOW)
          );
          return;
        }
      }

      if (journeys == null) {
        return;
      }

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
    JSONObject payload =
      NextTrainApiClient.fetchNextTrain(station, direction, leaveBefore, journey.optString("cityId", ""));
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

      if (!PreferredTrainReminder.isRemindDay(journey, System.currentTimeMillis())) {
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
        JSONObject payload =
      NextTrainApiClient.fetchNextTrain(station, direction, leaveBefore, journey.optString("cityId", ""));
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
          journeyId,
          CityTimeZones.zoneFor(journey.optString("cityId", ""))
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
    JSONObject payload =
      NextTrainApiClient.fetchNextTrain(station, direction, leaveBefore, journey.optString("cityId", ""));
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

    boolean leaveNowScheduled = shouldScheduleLeaveNow(context, target, now);

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
        cancelRequestCode(context, manager, requestCodeFromRecord(keys.opt(index)));
      }
    } catch (Exception ignored) {
      // Fall through to clear keys.
    }

    prefs.edit().putString(KEY_SCHEDULED_ALARMS, "[]").apply();
  }

  private static JSONArray readScheduledAlarmRecords(Context context) {
    SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    try {
      return new JSONArray(prefs.getString(KEY_SCHEDULED_ALARMS, "[]"));
    } catch (Exception error) {
      return new JSONArray();
    }
  }

  private static int requestCodeFromRecord(Object raw) {
    if (raw instanceof Number) {
      return ((Number) raw).intValue();
    }
    if (raw instanceof JSONObject) {
      return ((JSONObject) raw).optInt("requestCode", 0);
    }
    return 0;
  }

  private static void cancelRequestCode(Context context, AlarmManager manager, int requestCode) {
    if (manager == null || requestCode == 0) {
      return;
    }
    Intent cancelIntent = new Intent(context, LeaveReminderReceiver.class);
    cancelIntent.setAction(ACTION_LEAVE_REMINDER);
    PendingIntent pending = PendingIntent.getBroadcast(
      context,
      requestCode,
      cancelIntent,
      PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
    );
    if (pending != null) {
      manager.cancel(pending);
      pending.cancel();
    }
    Intent showIntent = new Intent(context, LeaveAlarmActivity.class);
    PendingIntent showPending = PendingIntent.getActivity(
      context,
      requestCode + 17,
      showIntent,
      PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
    );
    if (showPending != null) {
      manager.cancel(showPending);
      showPending.cancel();
    }
  }

  private static void registerScheduledAlarm(
    Context context,
    int requestCode,
    String type,
    PreferredTrainReminder.Target target,
    long triggerAtMs
  ) {
    try {
      SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONArray keys = new JSONArray(prefs.getString(KEY_SCHEDULED_ALARMS, "[]"));
      JSONObject record = new JSONObject();
      record.put("requestCode", requestCode);
      record.put("type", type);
      record.put("triggerAtMs", triggerAtMs);
      if (target != null) {
        record.put("journeyId", target.journeyId);
        record.put("trainTime", target.trainTime);
        record.put("route", target.route);
        record.put("departureKey", target.departureKey);
      }
      keys.put(record);
      prefs.edit().putString(KEY_SCHEDULED_ALARMS, keys.toString()).apply();
    } catch (Exception ignored) {
      // Best effort.
    }
  }

  public static JSONObject describeUpcoming(Context context) {
    long nowMs = System.currentTimeMillis();
    LeaveReminderSettingsStore.clearExpiredPauseIfNeeded(context);
    JSONObject leaveSettings = LeaveReminderSettingsStore.readSettings(context);
    boolean paused = leaveSettings.optBoolean("paused", false);
    JSONObject envelope = new JSONObject();
    try {
      envelope.put("paused", paused);
      envelope.put("enabled", leaveSettings.optBoolean("enabled", false));
      String pauseUntil = leaveSettings.optString("pauseUntil", "");
      if (pauseUntil != null && !pauseUntil.isEmpty() && !"null".equals(pauseUntil)) {
        envelope.put("pauseUntil", pauseUntil);
      }

      JSONObject widgetSettings = new JSONObject();
      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson != null && !settingsJson.isEmpty()) {
        widgetSettings = new JSONObject(settingsJson);
      }

      java.util.Set<String> doneToday = collectDoneTodayIds(context, widgetSettings);
      JSONArray derived = UpcomingReminders.deriveFires(
        widgetSettings,
        PerthTime.minutesSinceMidnight(nowMs),
        PerthTime.dayOfWeekIso(nowMs),
        doneToday
      );
      JSONArray firedToday = new JSONArray();
      for (String journeyId : doneToday) {
        firedToday.put(journeyId);
      }
      envelope.put("fires", derived);
      envelope.put("firedToday", firedToday);
      envelope.put("leftovers", UpcomingReminders.findLeftovers(readScheduledAlarmRecords(context), derived));
      return envelope;
    } catch (Exception error) {
      try {
        envelope.put("fires", new JSONArray());
        envelope.put("leftovers", new JSONArray());
        envelope.put("reason", "error");
      } catch (Exception ignored) {
        // Unreachable.
      }
      return envelope;
    }
  }

  public static void skipToday(Context context, String journeyId) {
    if (journeyId == null || journeyId.isEmpty()) {
      return;
    }
    String date = PerthTime.localDateKey();
    LeaveReminderSettingsStore.markLeaveNowFiredForDay(context, journeyId, date);
    LeaveReminderSettingsStore.markGetReadyFiredForDay(context, journeyId, date);
    CommuteRefreshService.refreshAll(context);
  }

  static java.util.Set<String> collectDoneTodayIds(Context context, JSONObject widgetSettings) {
    java.util.Set<String> ids = new java.util.HashSet<>();
    String date = PerthTime.localDateKey();
    considerDoneToday(context, NearbyPinHelper.JOURNEY_ID, date, ids);
    if (widgetSettings == null) {
      return ids;
    }
    JSONArray journeys = widgetSettings.optJSONArray("journeys");
    if (journeys == null) {
      return ids;
    }
    for (int index = 0; index < journeys.length(); index += 1) {
      JSONObject journey = journeys.optJSONObject(index);
      if (journey == null) {
        continue;
      }
      considerDoneToday(context, journey.optString("id", ""), date, ids);
    }
    return ids;
  }

  private static void considerDoneToday(
    Context context,
    String journeyId,
    String date,
    java.util.Set<String> ids
  ) {
    if (journeyId == null || journeyId.isEmpty()) {
      return;
    }
    if (LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, journeyId, date)) {
      ids.add(journeyId);
      return;
    }
    String departureKey = LeaveReminderSettingsStore.getLeaveNowDepartureKeyForDay(
      context,
      journeyId,
      date
    );
    if (departureKey != null && LeaveReminderSettingsStore.isAcknowledged(context, departureKey)) {
      ids.add(journeyId);
    }
  }

  public static void clearLeftoverAlarms(Context context) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    JSONArray derived = new JSONArray();
    try {
      JSONObject upcoming = describeUpcoming(context);
      derived = upcoming.optJSONArray("fires");
      if (derived == null) {
        derived = new JSONArray();
      }
    } catch (Exception ignored) {
      derived = new JSONArray();
    }

    SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    JSONArray kept = new JSONArray();
    try {
      JSONArray stored = readScheduledAlarmRecords(context);
      for (int index = 0; index < stored.length(); index += 1) {
        Object raw = stored.opt(index);
        JSONObject alarm = UpcomingReminders.asAlarmRecord(raw);
        if (alarm == null || UpcomingReminders.isLeftover(alarm, derived)) {
          cancelRequestCode(context, manager, requestCodeFromRecord(raw));
          continue;
        }
        kept.put(raw);
      }
    } catch (Exception ignored) {
      // Fall through to reschedule.
    }
    prefs.edit().putString(KEY_SCHEDULED_ALARMS, kept.toString()).apply();
    LeaveReminderNotifier.cancel(context);
    CommuteRefreshService.refreshAll(context);
  }

  /** Leave-now uses AlarmClock for reliable wake + status-bar alarm affordance (FB-34). */
  static boolean shouldUseAlarmClock(String type) {
    return TYPE_LEAVE_NOW.equals(type);
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
      if (shouldUseAlarmClock(type) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        Intent showIntent = LeaveReminderNotifier.leaveAlarmActivityIntent(
          context,
          target.journeyId,
          target.route,
          target.trainTime,
          target.stale,
          target.departureKey
        );
        PendingIntent showPending = PendingIntent.getActivity(
          context,
          requestCode + 17,
          showIntent,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager.AlarmClockInfo clock = new AlarmManager.AlarmClockInfo(triggerAtMs, showPending);
        manager.setAlarmClock(clock, pending);
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
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

    registerScheduledAlarm(context, requestCode, type, target, triggerAtMs);
  }

  private static int alarmRequestCode(String journeyId, String localDate, String type) {
    return (journeyId + ":" + localDate + ":" + type).hashCode();
  }
}
