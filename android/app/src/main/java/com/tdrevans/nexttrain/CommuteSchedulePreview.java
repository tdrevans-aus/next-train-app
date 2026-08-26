package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONObject;

/**
 * Idle / setup / locked widget faces and degraded clock copy (no live countdown).
 */
public final class CommuteSchedulePreview {

  static final int DEGRADED_CLOCK_MINUTES_PAST = 20;
  public static final String DEGRADED_SECONDARY = "Open app";

  private CommuteSchedulePreview() {}

  /**
   * When settings exist but no journey is in Active hours, return next-commute preview
   * (or soft Near me if preview cannot be built).
   */
  public static JSONObject nearbyFallbackIfOutsideHours(Context context) {
    try {
      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson == null || settingsJson.isEmpty()) {
        return null;
      }
      JSONObject settings = new JSONObject(settingsJson);
      JSONObject nearbyPin = settings.optJSONObject("nearbyPin");
      if (NearbyPinHelper.isHolding(nearbyPin)) {
        return null;
      }
      if (!JourneySelector.hasConfiguredJourneys(settings)) {
        return null;
      }
      if (JourneySelector.selectJourney(settings) != null) {
        return null;
      }
      if (JourneySelector.selectActiveRoute(settings) != null) {
        return null;
      }
      return outsideHoursSnapshot(settings);
    } catch (Exception error) {
      return null;
    }
  }

  /** Designed idle / next commute preview from settings — no network. */
  public static JSONObject outsideHoursSnapshot(JSONObject settings) throws Exception {
    return outsideHoursSnapshot(
      settings,
      PerthTime.minutesSinceMidnight(),
      PerthTime.dayOfWeekIso()
    );
  }

  static JSONObject outsideHoursSnapshot(
    JSONObject settings,
    int nowMinutes,
    int dayOfWeekIso
  ) throws Exception {
    NextCommutePreview.Preview preview = NextCommutePreview.findNext(
      settings,
      nowMinutes,
      dayOfWeekIso
    );
    if (preview == null || preview.journey == null) {
      return nearbyFallbackState();
    }

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("outsideHoursIdle", true);
    snapshot.put("openNearbyOnTap", false);
    snapshot.put("nearbyFallback", false);
    snapshot.put("journeyId", preview.journey.optString("id", "nearby"));
    String route = WidgetDataService.formatRoute(preview.journey);
    snapshot.put("route", route);
    // Full route on both fields so the bottom bar still paints if a binder uses stationLabel.
    snapshot.put("stationLabel", route);
    snapshot.put("journeyName", preview.journey.optString("name", ""));
    // textAllCaps on the face → TARGET TRAIN or NEXT JOURNEY
    snapshot.put("label", NextCommutePreview.idleWidgetLabel(preview.journey));
    // Big primary slot is for a short clock, not "Tomorrow 7:30".
    snapshot.put("primary", preview.preferredOrFromClock);
    // Day word only — never a leftover live departure clock.
    snapshot.put("trainClock", NextCommutePreview.formatDayWord(preview));
    snapshot.put("secondary", "");
    snapshot.put("preferredHint", "");
    snapshot.put("leaveByArmed", false);
    snapshot.put("updatedLine", "");
    snapshot.put("statusCrumb", "");
    snapshot.put("departureIso", "");
    snapshot.put("leaveByIso", "");
    snapshot.put("followingDepartureIso", "");
    snapshot.put("followingLeaveByIso", "");
    snapshot.put("followingDisplayTime", "");
    snapshot.put("followingStatus", "");
    snapshot.put("stale", false);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    snapshot.put("updatingSinceMs", 0L);
    return snapshot;
  }

  static JSONObject nearbyFallbackState() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("nearbyFallback", true);
    snapshot.put("empty", false);
    snapshot.put("journeyId", "nearby");
    snapshot.put("label", "NEAR ME");
    snapshot.put("primary", "Near me");
    snapshot.put("trainClock", "See trains near you");
    snapshot.put("secondary", "");
    snapshot.put("updatedLine", "");
    snapshot.put("stale", false);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    return snapshot;
  }

  static JSONObject emptyState() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", true);
    snapshot.put("journeyId", "new");
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", WidgetUiBuilder.EMPTY_SETUP_PRIMARY);
    snapshot.put("trainClock", WidgetUiBuilder.EMPTY_SETUP_SUB);
    snapshot.put("secondary", "");
    snapshot.put("updatedLine", "");
    snapshot.put("stale", false);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    return snapshot;
  }

  public static JSONObject widgetLockedSnapshot() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("widgetLocked", true);
    snapshot.put("empty", false);
    snapshot.put("journeyId", "pro");
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", "Widget paused");
    snapshot.put(
      "trainClock",
      "Your Pro trial ended. Unlock once to keep leave-by on your home screen."
    );
    snapshot.put("route", "Unlock Pro");
    snapshot.put("secondary", "");
    snapshot.put("updatedLine", "");
    snapshot.put("stale", false);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    return snapshot;
  }

  static JSONObject loadingState(JSONObject journey) throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    if (journey != null) {
      snapshot.put("journeyId", journey.optString("id"));
      snapshot.put("route", WidgetDataService.formatRoute(journey));
      snapshot.put("stationLabel", WidgetDataService.formatRoute(journey));
    }
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", "…");
    snapshot.put("trainClock", "");
    snapshot.put("secondary", "");
    snapshot.put("updatedLine", "");
    snapshot.put("stale", false);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    return snapshot;
  }

  static String degradedPrimary(JSONObject cached) {
    long now = System.currentTimeMillis();
    String departureIso = cached.optString("departureIso", "");
    String trainClock = cached.optString("trainClock", "");

    if (!departureIso.isEmpty()) {
      int minutesUntilDeparture = PerthTime.minutesUntilWallClock(departureIso, now);
      if (minutesUntilDeparture >= 0) {
        return CommuteScheduleSnapshot.formatMinutesPrimary(minutesUntilDeparture);
      }
      int minutesPastDeparture = -minutesUntilDeparture;
      if (minutesPastDeparture < DEGRADED_CLOCK_MINUTES_PAST && !trainClock.isEmpty()) {
        return trainClock;
      }
    } else if (!trainClock.isEmpty()) {
      return trainClock;
    }

    return "Open";
  }
}
