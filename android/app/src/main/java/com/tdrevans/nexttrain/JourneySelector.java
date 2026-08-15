package com.tdrevans.nexttrain;

import org.json.JSONArray;
import org.json.JSONObject;

/** Widget / schedule journey pick: in Active hours (+ days) only — no activeId / first fallbacks. */
public final class JourneySelector {

  private static final String KIND_ROUTE = "route";
  private static final String KIND_COMMUTE = "commute";

  private JourneySelector() {}

  public static String journeyKind(JSONObject journey) {
    if (journey == null) {
      return KIND_ROUTE;
    }
    String explicit = journey.optString("kind", "").trim().toLowerCase();
    if (KIND_ROUTE.equals(explicit) || KIND_COMMUTE.equals(explicit)) {
      return explicit;
    }
    String templateKey = journey.optString("templateKey", "");
    if ("morning".equals(templateKey) || "evening".equals(templateKey)) {
      return KIND_COMMUTE;
    }
    if (!journey.optString("preferredTrainTime", "").isEmpty()) {
      return KIND_COMMUTE;
    }
    if (journey.optBoolean("remindMe", false)) {
      return KIND_COMMUTE;
    }
    return KIND_ROUTE;
  }

  public static boolean isCommuteJourney(JSONObject journey) {
    return KIND_COMMUTE.equals(journeyKind(journey));
  }

  public static boolean isRouteJourney(JSONObject journey) {
    return KIND_ROUTE.equals(journeyKind(journey));
  }

  public static JSONObject selectJourney(JSONObject settings) throws Exception {
    JSONArray matching = commutesInActiveWindow(settings);
    if (matching.length() == 0) {
      return null;
    }
    return pickScheduledCommute(matching, PerthTime.minutesSinceMidnight());
  }

  /** Widget priority 4 — active route when no commute is in window. */
  public static JSONObject selectActiveRoute(JSONObject settings) throws Exception {
    if (settings == null) {
      return null;
    }

    String activeId = settings.optString("activeJourneyId", "").trim();
    if (activeId.isEmpty()) {
      return null;
    }

    JSONArray journeys = settings.optJSONArray("journeys");
    if (journeys == null || journeys.length() == 0) {
      return null;
    }

    JSONArray configured = configuredJourneys(journeys);
    for (int index = 0; index < configured.length(); index += 1) {
      JSONObject journey = configured.getJSONObject(index);
      if (!activeId.equals(journey.optString("id", ""))) {
        continue;
      }
      if (isRouteJourney(journey)) {
        return journey;
      }
      return null;
    }

    return null;
  }

  public static JSONArray commutesInActiveWindow(JSONObject settings) throws Exception {
    JSONArray matching = new JSONArray();
    if (settings == null) {
      return matching;
    }

    JSONArray journeys = settings.optJSONArray("journeys");
    if (journeys == null || journeys.length() == 0) {
      return matching;
    }

    JSONArray configured = configuredJourneys(journeys);
    int minutes = PerthTime.minutesSinceMidnight();
    for (int index = 0; index < configured.length(); index += 1) {
      JSONObject journey = configured.getJSONObject(index);
      if (!isCommuteJourney(journey)) {
        continue;
      }
      if (matchesWindow(journey, minutes)) {
        matching.put(journey);
      }
    }

    return matching;
  }

  public static JSONObject pickScheduledCommute(JSONArray commutes, int minutes) throws Exception {
    if (commutes == null || commutes.length() == 0) {
      return null;
    }
    if (commutes.length() == 1) {
      return commutes.getJSONObject(0);
    }

    JSONArray withTarget = new JSONArray();
    for (int index = 0; index < commutes.length(); index += 1) {
      JSONObject journey = commutes.getJSONObject(index);
      if (preferredMinutesFromJourney(journey) >= 0) {
        withTarget.put(journey);
      }
    }

    if (withTarget.length() < 2) {
      return commutes.getJSONObject(0);
    }

    JSONArray sorted = new JSONArray();
    for (int index = 0; index < withTarget.length(); index += 1) {
      sorted.put(withTarget.getJSONObject(index));
    }
    for (int left = 0; left < sorted.length() - 1; left += 1) {
      for (int right = left + 1; right < sorted.length(); right += 1) {
        JSONObject leftJourney = sorted.getJSONObject(left);
        JSONObject rightJourney = sorted.getJSONObject(right);
        if (preferredMinutesFromJourney(leftJourney) > preferredMinutesFromJourney(rightJourney)) {
          sorted.put(left, rightJourney);
          sorted.put(right, leftJourney);
        }
      }
    }

    for (int index = 0; index < sorted.length() - 1; index += 1) {
      int midpoint =
        (preferredMinutesFromJourney(sorted.getJSONObject(index)) +
          preferredMinutesFromJourney(sorted.getJSONObject(index + 1))) /
        2;
      if (minutes < midpoint) {
        return sorted.getJSONObject(index);
      }
    }

    return sorted.getJSONObject(sorted.length() - 1);
  }

  static int preferredMinutesFromJourney(JSONObject journey) {
    if (journey == null) {
      return -1;
    }
    return PerthTime.parseClockMinutes(journey.optString("preferredTrainTime", ""));
  }

  public static boolean hasConfiguredJourneys(JSONObject settings) throws Exception {
    if (settings == null) {
      return false;
    }
    JSONArray journeys = settings.optJSONArray("journeys");
    if (journeys == null) {
      return false;
    }
    return configuredJourneys(journeys).length() > 0;
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

  static boolean hasWindow(JSONObject journey) {
    String from = journey.optString("defaultFrom", "");
    String until = journey.optString("defaultUntil", "");
    return !from.isEmpty() && !until.isEmpty();
  }

  static boolean matchesWindow(JSONObject journey, int minutes) {
    return matchesWindow(journey, minutes, PerthTime.dayOfWeekIso());
  }

  static boolean matchesWindow(JSONObject journey, int minutes, int dayOfWeekIso) {
    if (!hasWindow(journey)) {
      return false;
    }
    if (!PreferredTrainReminder.isRemindDay(journey, dayOfWeekIso)) {
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
