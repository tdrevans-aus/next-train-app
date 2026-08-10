package com.tdrevans.nexttrain;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget journey pick (v1): active-hours match → else last activeJourneyId → else sole
 * journey without a window → else first configured journey.
 */
public final class JourneySelector {

  private JourneySelector() {}

  public static JSONObject selectJourney(JSONObject settings) throws Exception {
    if (settings == null) {
      return null;
    }

    JSONArray journeys = settings.optJSONArray("journeys");
    if (journeys == null || journeys.length() == 0) {
      return null;
    }

    JSONArray configured = configuredJourneys(journeys);
    if (configured.length() == 0) {
      return null;
    }

    int minutes = PerthTime.minutesSinceMidnight();
    for (int index = 0; index < configured.length(); index += 1) {
      JSONObject journey = configured.getJSONObject(index);
      if (matchesWindow(journey, minutes)) {
        return journey;
      }
    }

    String activeId = settings.optString("activeJourneyId", null);
    JSONObject active = findById(configured, activeId);
    if (active != null) {
      return active;
    }

    if (configured.length() == 1 && !hasWindow(configured.getJSONObject(0))) {
      return configured.getJSONObject(0);
    }

    return configured.getJSONObject(0);
  }

  public static boolean isOutsideActiveHours(JSONObject journey) {
    if (journey == null || !hasWindow(journey)) {
      return false;
    }
    return !matchesWindow(journey, PerthTime.minutesSinceMidnight());
  }

  private static JSONArray configuredJourneys(JSONArray journeys) throws Exception {
    JSONArray configured = new JSONArray();
    for (int index = 0; index < journeys.length(); index += 1) {
      JSONObject journey = journeys.getJSONObject(index);
      String station = journey.optString("station", "");
      String direction = journey.optString("direction", "");
      if (!station.isEmpty() && !direction.isEmpty()) {
        configured.put(journey);
      }
    }
    return configured;
  }

  private static JSONObject findById(JSONArray journeys, String id) throws Exception {
    if (id == null || id.isEmpty()) {
      return null;
    }
    for (int index = 0; index < journeys.length(); index += 1) {
      JSONObject journey = journeys.getJSONObject(index);
      if (id.equals(journey.optString("id"))) {
        return journey;
      }
    }
    return null;
  }

  static boolean hasWindow(JSONObject journey) {
    String from = journey.optString("defaultFrom", "");
    String until = journey.optString("defaultUntil", "");
    return !from.isEmpty() && !until.isEmpty();
  }

  static boolean matchesWindow(JSONObject journey, int minutes) {
    if (!hasWindow(journey)) {
      return false;
    }
    int from = parseTime(journey.optString("defaultFrom"));
    int until = parseTime(journey.optString("defaultUntil"));
    if (from == until) {
      return true;
    }
    if (from < until) {
      return minutes >= from && minutes < until;
    }
    return minutes >= from || minutes < until;
  }

  private static int parseTime(String value) {
    if (value == null || value.isEmpty()) {
      return 0;
    }
    String[] parts = value.split(":");
    int hour = Integer.parseInt(parts[0]);
    int minute = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
    return hour * 60 + minute;
  }
}
