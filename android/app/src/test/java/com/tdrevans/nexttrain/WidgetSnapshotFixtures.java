package com.tdrevans.nexttrain;

import org.json.JSONObject;

/** Deterministic widget snapshot JSON for layout regression tests (FB-28). */
final class WidgetSnapshotFixtures {

  private WidgetSnapshotFixtures() {}

  static JSONObject liveJourneyWithLeave() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("outsideHoursIdle", false);
    snapshot.put("label", "Target train");
    snapshot.put("primary", "11 min");
    snapshot.put("trainClock", "5:42 pm");
    snapshot.put("secondary", "Leave in 4 min");
    snapshot.put("route", "Warwick Stn → Perth");
    snapshot.put("stationLabel", "Warwick Stn");
    snapshot.put("updatedLine", "Updated just now");
    snapshot.put("stale", false);
    return snapshot;
  }

  static JSONObject liveUpdating() throws Exception {
    JSONObject snapshot = liveJourneyWithLeave();
    snapshot.put("primary", "Updating…");
    snapshot.put("secondary", "Fetching next train…");
    snapshot.put("updatedLine", "Updated 3m ago");
    snapshot.put("stale", true);
    return snapshot;
  }

  static JSONObject liveJourneyNoLeave() throws Exception {
    JSONObject snapshot = liveJourneyWithLeave();
    snapshot.put("secondary", "");
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", "32 min");
    snapshot.put("trainClock", "23:15");
    snapshot.put("route", "Edgewater → Perth");
    snapshot.put("stationLabel", "Edgewater");
    return snapshot;
  }

  static JSONObject outsideHoursIdle() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("outsideHoursIdle", true);
    snapshot.put("label", "Target Train");
    snapshot.put("primary", "7:30");
    snapshot.put("trainClock", "Tomorrow");
    snapshot.put("route", "Edgewater → Perth");
    snapshot.put("stationLabel", "Edgewater Stn");
    return snapshot;
  }

  static JSONObject emptySetup() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", true);
    return snapshot;
  }
}
