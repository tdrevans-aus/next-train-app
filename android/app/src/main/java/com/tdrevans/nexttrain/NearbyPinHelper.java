package com.tdrevans.nexttrain;

import org.json.JSONArray;
import org.json.JSONObject;

/** Near me pinned train — widget face + ephemeral reminders (FB-14). */
public final class NearbyPinHelper {

  public static final String JOURNEY_ID = "nearby-pin";
  public static final long HOLD_MS = 60_000L;

  private NearbyPinHelper() {}

  public static boolean isHolding(JSONObject pin) {
    return isHolding(pin, System.currentTimeMillis());
  }

  public static boolean isHolding(JSONObject pin, long nowMs) {
    if (pin == null) {
      return false;
    }

    String departureIso = pin.optString("departureIso", "");
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0) {
      return false;
    }

    long holdUntilMs = pin.has("holdingUntilMs")
      ? pin.optLong("holdingUntilMs", 0)
      : departureMs + HOLD_MS;
    return nowMs < holdUntilMs;
  }

  public static long holdingUntilMs(JSONObject pin) {
    if (pin == null) {
      return 0L;
    }
    String departureIso = pin.optString("departureIso", "");
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0) {
      return 0L;
    }
    if (pin.has("holdingUntilMs")) {
      return pin.optLong("holdingUntilMs", departureMs + HOLD_MS);
    }
    return departureMs + HOLD_MS;
  }

  public static String formatRoute(JSONObject pin) {
    if (pin == null) {
      return "";
    }
    try {
      JSONObject route = new JSONObject();
      route.put("station", pin.optString("station", ""));
      route.put("direction", pin.optString("direction", ""));
      return WidgetDataService.formatRoute(route);
    } catch (Exception error) {
      return "";
    }
  }

  public static JSONObject findTripByDeparture(JSONObject payload, String departureIso)
    throws Exception {
    if (payload == null || departureIso == null || departureIso.isEmpty()) {
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

    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.getJSONObject(index);
      String departure = trip.optString("departure", "");
      if (departure.isEmpty()) {
        departure = trip.optString("arrival", "");
      }
      if (departureIso.equals(departure)) {
        return trip;
      }
    }

    return null;
  }

  public static JSONObject buildSyntheticTrip(JSONObject pin, int leaveBeforeMinutes)
    throws Exception {
    String departureIso = pin.optString("departureIso", "");
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0) {
      return null;
    }

    long leaveByMs = departureMs - leaveBeforeMinutes * 60_000L;
    String leaveByIso = PerthTime.formatIsoFromEpochMs(leaveByMs);
    String displayTime = pin.optString("displayTime", "");
    if (displayTime.isEmpty()) {
      displayTime = PerthTime.formatClockFromEpochMs(departureMs);
    }

    JSONObject trip = new JSONObject();
    trip.put("departure", departureIso);
    trip.put("arrival", departureIso);
    trip.put("leaveBy", leaveByIso);
    trip.put("displayTime", displayTime);
    trip.put("minutesUntilDeparture", PerthTime.minutesUntilWallClock(departureIso, System.currentTimeMillis()));
    trip.put("platform", pin.optString("platform", "—"));
    trip.put("status", pin.optString("status", "Departed"));
    return trip;
  }

  public static PreferredTrainReminder.Target computeTarget(
    JSONObject pin,
    int leaveBeforeMinutes,
    boolean stale
  ) throws Exception {
    if (!isHolding(pin)) {
      return null;
    }

    String station = pin.optString("station", "");
    String direction = pin.optString("direction", "");
    String departureIso = pin.optString("departureIso", "");
    if (station.isEmpty() || direction.isEmpty() || departureIso.isEmpty()) {
      return null;
    }

    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    long holdUntilMs = holdingUntilMs(pin);
    long now = System.currentTimeMillis();
    if (departureMs <= 0 || now >= holdUntilMs) {
      return null;
    }

    JSONObject payload = null;
    try {
      payload = NextTrainApiClient.fetchNextTrain(station, direction, leaveBeforeMinutes);
    } catch (Exception error) {
      payload = null;
    }
    JSONObject trip = findTripByDeparture(payload, departureIso);
    if (trip == null) {
      trip = buildSyntheticTrip(pin, leaveBeforeMinutes);
    }
    if (trip == null) {
      return null;
    }

    String leaveByIso = trip.optString("leaveBy", "");
    long leaveByMs = PerthTime.epochMillisFromIso(leaveByIso);
    if (leaveByMs <= 0) {
      leaveByMs = departureMs - leaveBeforeMinutes * 60_000L;
    }

    PreferredTrainReminder.Target target = new PreferredTrainReminder.Target();
    target.journeyId = JOURNEY_ID;
    target.route = formatRoute(pin);
    target.trainTime =
      trip.optString("displayTime", PerthTime.formatClockFromEpochMs(departureMs));
    target.departureIso = departureIso;
    String localDate = PerthTime.localDateKey();
    target.dayKey = JOURNEY_ID + ":" + localDate;
    target.departureKey = JOURNEY_ID + ":" + departureIso;
    target.leaveByMs = leaveByMs;
    target.stale = stale;
    return target;
  }
}
