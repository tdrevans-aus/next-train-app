package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;

/** Preferred-train leave reminder targeting (v2). */
public final class PreferredTrainReminder {

  public static final class Target {

    public String journeyId;
    public String route;
    public String trainTime;
    public String departureIso;
    public String dayKey;
    public String departureKey;
    public long leaveByMs;
    public boolean stale;
  }

  /** Injectable clock/day state for JVM unit tests. */
  public static final class ScheduleClock {

    public final long nowMs;
    public final int dayOfWeekIso;
    public final String localDateKey;
    public final boolean leaveNowFiredToday;
    public final java.time.ZoneId zone;

    public ScheduleClock(long nowMs, int dayOfWeekIso, String localDateKey, boolean leaveNowFiredToday) {
      this(nowMs, dayOfWeekIso, localDateKey, leaveNowFiredToday, CityTimeZones.zoneFor(null));
    }

    public ScheduleClock(
      long nowMs,
      int dayOfWeekIso,
      String localDateKey,
      boolean leaveNowFiredToday,
      java.time.ZoneId zone
    ) {
      this.nowMs = nowMs;
      this.dayOfWeekIso = dayOfWeekIso;
      this.localDateKey = localDateKey;
      this.leaveNowFiredToday = leaveNowFiredToday;
      this.zone = zone != null ? zone : CityTimeZones.zoneFor(null);
    }

    public static ScheduleClock live(Context context, String journeyId) {
      return live(context, journeyId, CityTimeZones.zoneFor(null));
    }

    /** Zone-aware variant — pass the pinned journey's own city zone (FB 15 Sep 2026). */
    public static ScheduleClock live(Context context, String journeyId, java.time.ZoneId zone) {
      long nowMs = System.currentTimeMillis();
      String localDate = PerthTime.localDateKey(nowMs, zone);
      return new ScheduleClock(
        nowMs,
        PerthTime.dayOfWeekIso(nowMs, zone),
        localDate,
        LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context, journeyId, localDate),
        zone
      );
    }

    /**
     * Strip is independent of whether the leave-now ping already fired. Mid-window late-arm
     * (toggle/save after leave-by) must still resolve the upcoming preferred train.
     */
    public static ScheduleClock liveForStrip(Context context) {
      return liveForStrip(context, CityTimeZones.zoneFor(null));
    }

    /** Zone-aware variant — pass the strip's own city zone (FB 15 Sep 2026). */
    public static ScheduleClock liveForStrip(Context context, java.time.ZoneId zone) {
      long nowMs = System.currentTimeMillis();
      return new ScheduleClock(
        nowMs,
        PerthTime.dayOfWeekIso(nowMs, zone),
        PerthTime.localDateKey(nowMs, zone),
        false,
        zone
      );
    }
  }

  private PreferredTrainReminder() {}

  public static Target computeForJourney(
    Context context,
    JSONObject journey,
    JSONObject payload,
    boolean stale
  ) throws Exception {
    String journeyId = journey != null ? journey.optString("id", "") : "";
    java.time.ZoneId zone = CityTimeZones.zoneFor(journey != null ? journey.optString("cityId", "") : "");
    return computeForJourney(journey, payload, stale, ScheduleClock.live(context, journeyId, zone));
  }

  public static Target computeForJourney(
    JSONObject journey,
    JSONObject payload,
    boolean stale,
    ScheduleClock clock
  ) throws Exception {
    if (journey == null || payload == null || clock == null) {
      return null;
    }

    if (!isRemindMeEnabled(journey)) {
      return null;
    }

    if (!journey.optBoolean("useLeaveBefore", true)) {
      return null;
    }

    String preferred = journey.optString("preferredTrainTime", "");
    if (preferred.isEmpty() && !journey.has("remindMe")) {
      String fallback = journey.optString("defaultFrom", "");
      preferred = fallback.isEmpty() ? "" : fallback;
    }
    int preferredMinutes = PerthTime.parseClockMinutes(preferred);
    if (preferredMinutes < 0 && !JourneyPinHelper.isOverrideActiveToday(journey)) {
      return null;
    }

    if (!isRemindDay(journey, clock.dayOfWeekIso)) {
      return null;
    }

    String journeyId = journey.optString("id", "");
    if (journeyId.isEmpty()) {
      return null;
    }

    if (clock.leaveNowFiredToday) {
      return null;
    }

    JSONObject trip = JourneyPinHelper.pickTripForReminders(journey, payload, clock);
    if (trip == null) {
      return null;
    }

    String departureIso = trip.optString("departure", "");
    if (departureIso.isEmpty()) {
      departureIso = trip.optString("arrival", "");
    }
    if (departureIso.isEmpty()) {
      return null;
    }

    String leaveByIso = trip.optString("leaveBy", "");
    long leaveByMs = PerthTime.epochMillisFromIso(leaveByIso);
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    // Leave-by may already be past while the train is still upcoming (e.g. 10 min walk,
    // train in 5). Reminders only schedule future leave-by; the commute strip must still
    // arm through departure so "Leave now" can show.
    if (departureMs <= clock.nowMs) {
      return null;
    }
    if (leaveByMs <= 0) {
      return null;
    }

    Target target = new Target();
    target.journeyId = journeyId;
    target.route = WidgetDataService.formatRoute(journey);
    target.trainTime = trip.optString("displayTime", PerthTime.formatClockFromIso(departureIso, clock.zone));
    target.departureIso = departureIso;
    target.dayKey = journeyId + ":" + clock.localDateKey;
    target.departureKey = journeyId + ":" + departureIso;
    target.leaveByMs = leaveByMs;
    target.stale = stale;
    return target;
  }

  public static long computeGetReadyAtMs(long leaveByMs, int getReadyMinutes) {
    if (getReadyMinutes <= 0) {
      return leaveByMs;
    }
    return leaveByMs - getReadyMinutes * 60_000L;
  }

  static boolean isRemindMeEnabled(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    if (journey.has("remindMe")) {
      return journey.optBoolean("remindMe", false);
    }
    return !journey.optString("preferredTrainTime", "").isEmpty();
  }

  /**
   * Zone-aware variant — resolves the journey's own city zone via {@link CityTimeZones} so a
   * remind-day check near a UTC day boundary doesn't fall on the wrong day for non-Perth
   * journeys (Mark's PR #398 review, follow-up 15 Sep 2026). Falls back to Perth only when
   * {@code cityId} is empty (Perth-era journeys with no stored city).
   */
  static boolean isRemindDay(JSONObject journey, long nowMs) {
    java.time.ZoneId zone = CityTimeZones.zoneFor(journey != null ? journey.optString("cityId", "") : "");
    return isRemindDay(journey, PerthTime.dayOfWeekIso(nowMs, zone));
  }

  static boolean isRemindDay(JSONObject journey, int dayOfWeekIso) {
    JSONArray days = journey.optJSONArray("remindDays");
    if (days == null || days.length() == 0) {
      return true;
    }

    for (int index = 0; index < days.length(); index += 1) {
      if (days.optInt(index, -1) == dayOfWeekIso) {
        return true;
      }
    }
    return false;
  }

  static int reminderHorizonMinutes(JSONObject journey) {
    return reminderHorizonMinutes(journey, -1);
  }

  /**
   * Trains at/after preferred must be before this clock minute.
   * Active-until when set; otherwise preferred+3h (not all day — empty until was
   * incorrectly arming afternoon trains for a morning target).
   */
  static int reminderHorizonMinutes(JSONObject journey, int preferredMinutes) {
    String until = journey.optString("defaultUntil", "");
    int untilMinutes = PerthTime.parseClockMinutes(until);
    if (untilMinutes > 0) {
      return untilMinutes;
    }
    if (preferredMinutes >= 0) {
      int capped = preferredMinutes + 180;
      return Math.min(24 * 60, Math.max(preferredMinutes + 1, capped));
    }
    return 24 * 60;
  }

  static JSONObject pickTripAtOrAfter(JSONArray upcoming, int preferredMinutes, int horizonMinutes)
    throws Exception {
    JSONObject best = null;
    int bestMinutes = Integer.MAX_VALUE;

    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.getJSONObject(index);
      String departureIso = trip.optString("departure", "");
      if (departureIso.isEmpty()) {
        departureIso = trip.optString("arrival", "");
      }
      int departureMinutes = PerthTime.minutesFromIso(departureIso);
      if (departureMinutes < 0) {
        continue;
      }
      if (departureMinutes < preferredMinutes) {
        continue;
      }
      if (departureMinutes >= horizonMinutes) {
        continue;
      }
      if (departureMinutes < bestMinutes) {
        best = trip;
        bestMinutes = departureMinutes;
      }
    }

    return best;
  }

  /** Reason when {@link #computeForJourney} returns null but gates were already checked. */
  static String diagnoseUnscheduled(JSONObject journey, JSONObject payload, ScheduleClock clock)
    throws Exception {
    if (clock.leaveNowFiredToday) {
      return "already_fired";
    }

    JSONArray upcoming = payload.optJSONArray("upcoming");
    if (upcoming == null || upcoming.length() == 0) {
      JSONObject next = payload.optJSONObject("next");
      if (next != null) {
        upcoming = new JSONArray();
        upcoming.put(next);
      } else {
        return "no_trip";
      }
    }

    String preferred = journey.optString("preferredTrainTime", "");
    if (preferred.isEmpty()) {
      preferred = journey.optString("defaultFrom", "");
    }
    int preferredMinutes = PerthTime.parseClockMinutes(preferred);
    if (preferredMinutes < 0) {
      return "no_preferred";
    }

    JSONObject trip = pickTripAtOrAfter(upcoming, preferredMinutes, reminderHorizonMinutes(journey, preferredMinutes));
    if (trip == null) {
      return "no_trip";
    }

    long leaveByMs = PerthTime.epochMillisFromIso(trip.optString("leaveBy", ""));
    long departureMs = PerthTime.epochMillisFromIso(trip.optString("departure", ""));
    if (departureMs <= 0) {
      departureMs = PerthTime.epochMillisFromIso(trip.optString("arrival", ""));
    }
    if (departureMs <= clock.nowMs) {
      return "departure_in_past";
    }
    if (leaveByMs <= clock.nowMs) {
      return "leave_in_past_strip_ok";
    }

    return "already_fired";
  }
}
