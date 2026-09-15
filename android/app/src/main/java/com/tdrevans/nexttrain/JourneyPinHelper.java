package com.tdrevans.nexttrain;

import org.json.JSONArray;
import org.json.JSONObject;

/** Journey-mode pinned train face (FB-20): preferred default + day override. */
public final class JourneyPinHelper {

  private JourneyPinHelper() {}

  public static boolean isOverrideActiveToday(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    java.time.ZoneId zone = CityTimeZones.zoneFor(journey.optString("cityId", ""));
    String overrideDate = journey.optString("journeyPinOverrideDate", "");
    String overrideIso = journey.optString("journeyPinOverrideIso", "");
    return !overrideDate.isEmpty()
      && !overrideIso.isEmpty()
      && overrideDate.equals(PerthTime.localDateKey(System.currentTimeMillis(), zone));
  }

  public static boolean isPinDismissedToday(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    java.time.ZoneId zone = CityTimeZones.zoneFor(journey.optString("cityId", ""));
    String dismissedDate = journey.optString("journeyPinDismissedDate", "");
    return !dismissedDate.isEmpty()
      && dismissedDate.equals(PerthTime.localDateKey(System.currentTimeMillis(), zone));
  }

  /** Widget + hero pin chrome: override today, or preferred target in window and not dismissed today. */
  public static boolean isJourneyPinnedToday(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    if (isOverrideActiveToday(journey)) {
      return true;
    }
    if (isPinDismissedToday(journey)) {
      return false;
    }
    if (CommuteSchedule.preferredMinutesForLiveGlance(journey) < 0) {
      return false;
    }
    java.time.ZoneId zone = CityTimeZones.zoneFor(journey.optString("cityId", ""));
    long nowMs = System.currentTimeMillis();
    return JourneySelector.matchesWindow(
      journey,
      PerthTime.minutesSinceMidnight(nowMs, zone),
      PerthTime.dayOfWeekIso(nowMs, zone)
    );
  }

  public static JSONObject resolvePinnedTrip(JSONObject payload, JSONObject journey) throws Exception {
    if (payload == null || journey == null) {
      return null;
    }

    java.time.ZoneId zone = CityTimeZones.zoneFor(journey.optString("cityId", ""));
    long nowMs = System.currentTimeMillis();
    PinResolutionHelper.Clock clock =
      new PinResolutionHelper.Clock(nowMs, PerthTime.localDateKey(nowMs, zone), zone);
    String widgetDeparture =
      PinResolutionHelper.resolveJourneyWidgetFaceDeparture(payload, journey, clock);
    if (widgetDeparture == null || widgetDeparture.isEmpty()) {
      return null;
    }

    return findTripByDeparture(CommuteSchedule.collectUpcomingTrips(payload), widgetDeparture);
  }

  static JSONObject findTripByDeparture(JSONArray upcoming, String departureIso) throws Exception {
    if (upcoming == null || departureIso == null || departureIso.isEmpty()) {
      return null;
    }

    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip == null) {
        continue;
      }
      String departure = CommuteSchedule.tripDepartureIso(trip);
      if (departureIso.equals(departure)) {
        return trip;
      }
    }

    return null;
  }

  /** Matches web {@code getRoutePinnedLeaveBeforeMinutes}: journey walk time, else Near me slider. */
  public static int routePinLeaveBeforeMinutes(JSONObject journey, JSONObject settings) {
    if (journey != null) {
      int leaveBefore = journey.optInt("leaveBeforeMinutes", 0);
      if (leaveBefore >= 1 && leaveBefore <= 30) {
        return leaveBefore;
      }
    }
    if (settings != null) {
      int nearby = settings.optInt("nearbyLeaveBeforeMinutes", 10);
      if (nearby >= 1 && nearby <= 30) {
        return nearby;
      }
    }
    return 10;
  }

  public static PreferredTrainReminder.Target computeRoutePinTarget(
    JSONObject journey,
    int leaveBeforeMinutes,
    boolean stale
  ) throws Exception {
    if (journey == null || !JourneySelector.isRouteJourney(journey) || !isOverrideActiveToday(journey)) {
      return null;
    }

    String station = journey.optString("station", "");
    String direction = journey.optString("direction", "");
    String departureIso = journey.optString("journeyPinOverrideIso", "");
    if (station.isEmpty() || direction.isEmpty() || departureIso.isEmpty()) {
      return null;
    }

    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    long now = System.currentTimeMillis();
    if (departureMs <= 0 || departureMs <= now) {
      return null;
    }

    JSONObject payload =
      NextTrainApiClient.fetchNextTrain(station, direction, leaveBeforeMinutes, journey.optString("cityId", ""));
    JSONObject trip = findTripByDeparture(CommuteSchedule.collectUpcomingTrips(payload), departureIso);
    if (trip == null) {
      trip = buildSyntheticRoutePinTrip(journey, departureIso, leaveBeforeMinutes);
    }
    if (trip == null) {
      return null;
    }

    String leaveByIso = trip.optString("leaveBy", "");
    long leaveByMs = PerthTime.epochMillisFromIso(leaveByIso);
    if (leaveByMs <= 0) {
      leaveByMs = departureMs - leaveBeforeMinutes * 60_000L;
    }

    String journeyId = journey.optString("id", "");
    if (journeyId.isEmpty()) {
      return null;
    }

    java.time.ZoneId zone = CityTimeZones.zoneFor(journey.optString("cityId", ""));
    PreferredTrainReminder.Target target = new PreferredTrainReminder.Target();
    target.journeyId = journeyId;
    target.route = WidgetDataService.formatRoute(journey);
    target.trainTime =
      trip.optString("displayTime", PerthTime.formatClockFromEpochMs(departureMs, zone));
    target.departureIso = departureIso;
    String localDate = PerthTime.localDateKey(System.currentTimeMillis(), zone);
    target.dayKey = journeyId + ":" + localDate;
    target.departureKey = journeyId + ":" + departureIso;
    target.leaveByMs = leaveByMs;
    target.stale = stale;
    return target;
  }

  static JSONObject buildSyntheticRoutePinTrip(
    JSONObject journey,
    String departureIso,
    int leaveBeforeMinutes
  ) throws Exception {
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0) {
      return null;
    }

    long leaveByMs = departureMs - leaveBeforeMinutes * 60_000L;
    String leaveByIso = PerthTime.formatIsoFromEpochMs(leaveByMs);
    java.time.ZoneId zone = CityTimeZones.zoneFor(journey != null ? journey.optString("cityId", "") : "");

    JSONObject trip = new JSONObject();
    trip.put("departure", departureIso);
    trip.put("arrival", departureIso);
    trip.put("leaveBy", leaveByIso);
    trip.put("displayTime", PerthTime.formatClockFromEpochMs(departureMs, zone));
    trip.put("minutesUntilDeparture", PerthTime.minutesUntilWallClock(departureIso, System.currentTimeMillis()));
    trip.put("platform", "—");
    trip.put("status", "On Time");
    return trip;
  }

  /** Reminder / strip targeting uses the same pin resolution as the widget face. */
  public static JSONObject pickTripForReminders(
    JSONObject journey,
    JSONObject payload,
    PreferredTrainReminder.ScheduleClock clock
  ) throws Exception {
    if (journey == null || payload == null || clock == null) {
      return null;
    }

    JSONArray upcoming = payload.optJSONArray("upcoming");
    if (upcoming == null || upcoming.length() == 0) {
      JSONObject next = payload.optJSONObject("next");
      if (next != null) {
        upcoming = new JSONArray();
        upcoming.put(next);
      } else {
        return null;
      }
    }

    String overrideIso = "";
    if (isOverrideActiveToday(journey)) {
      overrideIso = journey.optString("journeyPinOverrideIso", "");
    }

    if (!overrideIso.isEmpty()) {
      JSONObject overrideTrip = findTripByDeparture(upcoming, overrideIso);
      long departureMs = PerthTime.epochMillisFromIso(overrideIso);
      if (overrideTrip != null && departureMs > clock.nowMs) {
        return overrideTrip;
      }
    }

    if (isPinDismissedToday(journey)) {
      return CommuteSchedule.resolveTrueNextTrip(payload);
    }

    PinResolutionHelper.Clock pinClock =
      new PinResolutionHelper.Clock(clock.nowMs, clock.localDateKey, clock.zone);
    String departureIso = PinResolutionHelper.resolveReminderTargetDeparture(payload, journey, pinClock);
    if (departureIso != null && !departureIso.isEmpty()) {
      JSONObject preferredTrip = findTripByDeparture(upcoming, departureIso);
      long departureMs = PerthTime.epochMillisFromIso(departureIso);
      if (preferredTrip != null && departureMs > clock.nowMs) {
        return preferredTrip;
      }
    }

    return CommuteSchedule.resolveTrueNextTrip(payload);
  }
}
