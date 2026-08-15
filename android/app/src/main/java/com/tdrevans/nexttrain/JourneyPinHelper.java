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
    String overrideDate = journey.optString("journeyPinOverrideDate", "");
    String overrideIso = journey.optString("journeyPinOverrideIso", "");
    return !overrideDate.isEmpty()
      && !overrideIso.isEmpty()
      && overrideDate.equals(PerthTime.localDateKey());
  }

  public static boolean isPinDismissedToday(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    String dismissedDate = journey.optString("journeyPinDismissedDate", "");
    return !dismissedDate.isEmpty() && dismissedDate.equals(PerthTime.localDateKey());
  }

  /** Widget + hero pin chrome: override today, or preferred target not dismissed today. */
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
    return CommuteSchedule.preferredMinutesForLiveGlance(journey) >= 0;
  }

  public static JSONObject resolvePinnedTrip(JSONObject payload, JSONObject journey) throws Exception {
    if (payload == null || journey == null) {
      return null;
    }

    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);
    String overrideIso = "";
    if (isOverrideActiveToday(journey)) {
      overrideIso = journey.optString("journeyPinOverrideIso", "");
    }

    if (!overrideIso.isEmpty()) {
      JSONObject overrideTrip = findTripByDeparture(upcoming, overrideIso);
      if (overrideTrip != null && !CommuteSchedule.hasDepartureMinutePassed(overrideTrip)) {
        return overrideTrip;
      }
    }

    if (isPinDismissedToday(journey)) {
      return CommuteSchedule.resolveTrueNextTrip(payload);
    }

    int preferredMinutes = CommuteSchedule.preferredMinutesForLiveGlance(journey);
    if (preferredMinutes >= 0) {
      int horizon = CommuteSchedule.liveHorizonMinutes(journey);
      JSONObject preferredTrip = PreferredTrainReminder.pickTripAtOrAfter(
        upcoming,
        preferredMinutes,
        horizon
      );
      if (preferredTrip != null && !CommuteSchedule.hasDepartureMinutePassed(preferredTrip)) {
        return preferredTrip;
      }
    }

    return CommuteSchedule.resolveTrueNextTrip(payload);
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

    JSONObject payload = NextTrainApiClient.fetchNextTrain(station, direction, leaveBeforeMinutes);
    JSONObject trip = findTripByDeparture(CommuteSchedule.collectUpcomingTrips(payload), departureIso);
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

    PreferredTrainReminder.Target target = new PreferredTrainReminder.Target();
    target.journeyId = journeyId;
    target.route = WidgetDataService.formatRoute(journey);
    target.trainTime =
      trip.optString("displayTime", PerthTime.formatClockFromEpochMs(departureMs));
    target.departureIso = departureIso;
    String localDate = PerthTime.localDateKey();
    target.dayKey = journeyId + ":" + localDate;
    target.departureKey = journeyId + ":" + departureIso;
    target.leaveByMs = leaveByMs;
    target.stale = stale;
    return target;
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

    String preferred = journey.optString("preferredTrainTime", "");
    if (preferred.isEmpty() && !journey.has("remindMe")) {
      preferred = journey.optString("defaultFrom", "");
    }
    int preferredMinutes = PerthTime.parseClockMinutes(preferred);
    if (preferredMinutes >= 0) {
      int horizon = PreferredTrainReminder.reminderHorizonMinutes(journey, preferredMinutes);
      JSONObject preferredTrip = PreferredTrainReminder.pickTripAtOrAfter(
        upcoming,
        preferredMinutes,
        horizon
      );
      if (preferredTrip != null) {
        long departureMs = PerthTime.epochMillisFromIso(
          preferredTrip.optString("departure", preferredTrip.optString("arrival", ""))
        );
        if (departureMs > clock.nowMs) {
          return preferredTrip;
        }
      }
    }

    return CommuteSchedule.resolveTrueNextTrip(payload);
  }
}
