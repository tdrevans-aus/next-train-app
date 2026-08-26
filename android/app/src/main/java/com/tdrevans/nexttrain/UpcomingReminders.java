package com.tdrevans.nexttrain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Next leave ping per journey (same next-target idea as {@link NextCommutePreview}).
 * One row per commute — does not explode remind days or arm alarms.
 */
public final class UpcomingReminders {

  static final int HORIZON_DAYS = 7;

  public static final String TYPE_LEAVE_NOW = LeaveReminderScheduler.TYPE_LEAVE_NOW;

  private UpcomingReminders() {}

  public static JSONArray deriveFires(
    JSONObject widgetSettings,
    int nowMinutes,
    int dayOfWeekIso
  ) throws Exception {
    return deriveFires(widgetSettings, nowMinutes, dayOfWeekIso, Collections.emptySet());
  }

  public static JSONArray deriveFires(
    JSONObject widgetSettings,
    int nowMinutes,
    int dayOfWeekIso,
    Set<String> doneTodayIds
  ) throws Exception {
    List<JSONObject> fires = new ArrayList<>();
    if (widgetSettings == null) {
      return toArray(fires);
    }

    Set<String> done = doneTodayIds != null ? doneTodayIds : Collections.emptySet();
    JSONObject pinFire = pinLeaveFire(widgetSettings, System.currentTimeMillis(), done);
    JSONArray journeys = widgetSettings.optJSONArray("journeys");
    if (journeys != null) {
      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.optJSONObject(index);
        boolean doneToday = journey != null && done.contains(journey.optString("id", ""));
        JSONObject leave = nextLeaveForJourney(journey, nowMinutes, dayOfWeekIso, doneToday);
        if (leave != null) {
          fires.add(leave);
        }
      }
    }
    if (pinFire != null) {
      fires.add(pinFire);
    }
    return toArray(fires);
  }

  static JSONObject pinLeaveFire(JSONObject widgetSettings, long nowMs) throws Exception {
    return pinLeaveFire(widgetSettings, nowMs, Collections.emptySet());
  }

  static JSONObject pinLeaveFire(JSONObject widgetSettings, long nowMs, Set<String> doneTodayIds)
    throws Exception {
    if (widgetSettings == null) {
      return null;
    }
    JSONObject nearby = widgetSettings.optJSONObject("nearbyPin");
    if (nearby != null && nearby.optBoolean("notifyMe", false) && NearbyPinHelper.isHolding(nearby, nowMs)) {
      int leaveBefore = widgetSettings.optInt("nearbyLeaveBeforeMinutes", 10);
      return pinFireFromDeparture(
        NearbyPinHelper.JOURNEY_ID,
        "Near me · " + WidgetDataService.formatStationLabel(nearby),
        nearby.optString("departureIso", ""),
        leaveBefore,
        nowMs,
        doneTodayIds != null && doneTodayIds.contains(NearbyPinHelper.JOURNEY_ID)
      );
    }

    JSONArray journeys = widgetSettings.optJSONArray("journeys");
    if (journeys == null) {
      return null;
    }
    for (int index = 0; index < journeys.length(); index += 1) {
      JSONObject journey = journeys.optJSONObject(index);
      if (journey == null || !JourneySelector.isRouteJourney(journey)) {
        continue;
      }
      if (!journey.optBoolean("pinNotifyMe", false)) {
        continue;
      }
      if (!JourneyPinHelper.isOverrideActiveToday(journey)) {
        continue;
      }
      String departureIso = journey.optString("journeyPinOverrideIso", "");
      int leaveBefore = JourneyPinHelper.routePinLeaveBeforeMinutes(journey, widgetSettings);
      JSONObject fire = pinFireFromDeparture(
        journey.optString("id", ""),
        WidgetDataService.formatRoute(journey),
        departureIso,
        leaveBefore,
        nowMs,
        doneTodayIds != null && doneTodayIds.contains(journey.optString("id", ""))
      );
      if (fire != null) {
        return fire;
      }
    }
    return null;
  }

  private static JSONObject pinFireFromDeparture(
    String journeyId,
    String name,
    String departureIso,
    int leaveBeforeMinutes,
    long nowMs,
    boolean doneToday
  ) throws Exception {
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0 || journeyId.isEmpty()) {
      return null;
    }
    int leaveBefore = leaveBeforeMinutes > 0 ? leaveBeforeMinutes : 10;
    long leaveByMs = departureMs - leaveBefore * 60_000L;
    int trainMinutes = PerthTime.minutesFromIso(departureIso);
    if (trainMinutes < 0) {
      trainMinutes = PerthTime.minutesSinceMidnight(departureMs);
    }
    int leaveMinutes = PerthTime.minutesSinceMidnight(leaveByMs);
    if (leaveMinutes < 0) {
      leaveMinutes = 0;
    }
    JSONObject fire = new JSONObject();
    fire.put("journeyId", journeyId);
    fire.put("journeyName", name);
    fire.put("kind", "pin");
    fire.put("type", TYPE_LEAVE_NOW);
    fire.put("notifyAtClock", NextCommutePreview.formatClock(leaveMinutes));
    fire.put("trainTime", NextCommutePreview.formatClock(trainMinutes));
    fire.put("dayOffset", 0);
    fire.put("dayOfWeekIso", PerthTime.dayOfWeekIso(nowMs));
    fire.put("sortKey", leaveMinutes);
    fire.put("doneToday", doneToday);
    fire.put("subtitle", formatLeaveSubtitle(fire));
    fire.put("leftover", false);
    return fire;
  }

  static JSONObject nextLeaveForJourney(
    JSONObject journey,
    int nowMinutes,
    int dayOfWeekIso
  ) throws Exception {
    return nextLeaveForJourney(journey, nowMinutes, dayOfWeekIso, false);
  }

  static JSONObject nextLeaveForJourney(
    JSONObject journey,
    int nowMinutes,
    int dayOfWeekIso,
    boolean doneToday
  ) throws Exception {
    if (journey == null || !JourneySelector.isJourneyKind(journey)) {
      return null;
    }
    String station = journey.optString("station", "");
    String direction = journey.optString("direction", "");
    if (station.isEmpty() || direction.isEmpty()) {
      return null;
    }
    if (!PreferredTrainReminder.isRemindMeEnabled(journey)) {
      return null;
    }
    if (!journey.optBoolean("useLeaveBefore", true)) {
      return null;
    }

    int startOffset = doneToday ? 1 : 0;
    for (int dayOffset = startOffset; dayOffset <= HORIZON_DAYS; dayOffset += 1) {
      int day = ((dayOfWeekIso - 1 + dayOffset) % 7) + 1;
      JSONObject leave = leaveFireForDay(journey, day, dayOffset, nowMinutes);
      if (leave != null) {
        if (doneToday) {
          leave.put("doneToday", true);
          leave.put("subtitle", formatLeaveSubtitle(leave));
        }
        return leave;
      }
    }
    return null;
  }

  static String formatLeaveSubtitle(JSONObject fire) {
    if (fire == null) {
      return "";
    }
    int dayOffset = fire.optInt("dayOffset", 0);
    int dayOfWeekIso = fire.optInt("dayOfWeekIso", 0);
    if (fire.optBoolean("doneToday")) {
      if (dayOffset <= 0) {
        return "Done today";
      }
      return (
        "Done today · next " +
        NextCommutePreview.dayName(dayOfWeekIso) +
        " " +
        fire.optString("notifyAtClock", "")
      );
    }
    String day = dayOffset == 0 ? "today" : NextCommutePreview.dayName(dayOfWeekIso);
    return (
      "Leave " +
      day +
      " " +
      fire.optString("notifyAtClock", "") +
      " for the " +
      fire.optString("trainTime", "")
    );
  }

  static JSONArray findLeftovers(JSONArray storedAlarms, JSONArray derivedFires) throws Exception {
    JSONArray leftovers = new JSONArray();
    if (storedAlarms == null) {
      return leftovers;
    }
    for (int index = 0; index < storedAlarms.length(); index += 1) {
      Object raw = storedAlarms.opt(index);
      JSONObject alarm = asAlarmRecord(raw);
      if (alarm == null) {
        JSONObject unknown = new JSONObject();
        unknown.put("leftover", true);
        leftovers.put(unknown);
        continue;
      }
      if (isLeftover(alarm, derivedFires)) {
        alarm.put("leftover", true);
        leftovers.put(alarm);
      }
    }
    return leftovers;
  }

  static boolean isLeftover(JSONObject alarm, JSONArray derivedFires) {
    if (alarm == null) {
      return true;
    }
    String type = alarm.optString("type", "");
    if (type.contains("fast_test")) {
      return true;
    }
    String journeyId = alarm.optString("journeyId", "");
    if (journeyId.isEmpty()) {
      return true;
    }
    if (derivedFires == null) {
      return true;
    }
    for (int index = 0; index < derivedFires.length(); index += 1) {
      JSONObject fire = derivedFires.optJSONObject(index);
      if (fire != null && journeyId.equals(fire.optString("journeyId", ""))) {
        return false;
      }
    }
    return true;
  }

  private static JSONObject leaveFireForDay(
    JSONObject journey,
    int dayOfWeekIso,
    int dayOffset,
    int nowMinutes
  ) throws Exception {
    if (!PreferredTrainReminder.isRemindDay(journey, dayOfWeekIso)) {
      return null;
    }

    String preferred = journey.optString("preferredTrainTime", "");
    if (preferred.isEmpty()) {
      preferred = journey.optString("defaultFrom", "");
    }
    int trainMinutes = PerthTime.parseClockMinutes(preferred);
    if (trainMinutes < 0) {
      return null;
    }

    int leaveBefore = journey.optInt("leaveBeforeMinutes", 10);
    if (leaveBefore < 0) {
      leaveBefore = 10;
    }
    int leaveByMinutes = trainMinutes - leaveBefore;
    if (leaveByMinutes < 0) {
      leaveByMinutes = 0;
    }
    if (dayOffset == 0 && leaveByMinutes <= nowMinutes) {
      return null;
    }

    JSONObject fire = new JSONObject();
    fire.put("journeyId", journey.optString("id", ""));
    fire.put("journeyName", journeyDisplayName(journey));
    fire.put("type", TYPE_LEAVE_NOW);
    fire.put("notifyAtClock", NextCommutePreview.formatClock(leaveByMinutes));
    fire.put("trainTime", NextCommutePreview.formatClock(trainMinutes));
    fire.put("dayOffset", dayOffset);
    fire.put("dayOfWeekIso", dayOfWeekIso);
    fire.put("subtitle", formatLeaveSubtitle(fire));
    fire.put("leftover", false);
    return fire;
  }

  static String journeyDisplayName(JSONObject journey) {
    String name = journey.optString("name", "").trim();
    if (!name.isEmpty()) {
      return name;
    }
    return WidgetDataService.formatRoute(journey);
  }

  static JSONObject asAlarmRecord(Object raw) {
    if (raw instanceof JSONObject) {
      return (JSONObject) raw;
    }
    return null;
  }

  private static JSONArray toArray(List<JSONObject> fires) {
    JSONArray array = new JSONArray();
    for (JSONObject fire : fires) {
      array.put(fire);
    }
    return array;
  }
}
