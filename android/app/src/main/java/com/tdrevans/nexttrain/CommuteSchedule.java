package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;

/** Shared journey fetch + leave-by computation for widget and leave reminders. */
public final class CommuteSchedule {

  public static final long STALE_THRESHOLD_MS = 120L * 60L * 1000L;

  public static final class Result {

    public JSONObject settings;
    public JSONObject journey;
    public JSONObject payload;
    public JSONObject next;
    public boolean departMode;
    public boolean stale;
    public boolean empty;
    public long refreshedAtMs;
    public String journeyId;
    public String route;
    public String leaveByIso;
    public String departureIso;
    public String displayTime;
    public String status;
    public String leavePhase;
    public int minutesUntilLeave;
  }

  private CommuteSchedule() {}

  public static Result load(Context context, boolean allowStaleFallback) {
    Result result = new Result();
    result.refreshedAtMs = WidgetSettingsStore.readLastRefreshMs(context);

    try {
      String settingsJson = WidgetSettingsStore.readSettings(context);
      if (settingsJson == null || settingsJson.isEmpty()) {
        result.empty = true;
        return result;
      }

      result.settings = new JSONObject(settingsJson);
      result.journey = JourneySelector.selectJourney(result.settings);
      if (result.journey == null) {
        result.empty = true;
        return result;
      }

      result.journeyId = result.journey.optString("id");
      result.route = WidgetDataService.formatRoute(result.journey);
      result.departMode = !result.journey.optBoolean("useLeaveBefore", true);

      int leaveBefore = result.departMode ? 0 : result.journey.optInt("leaveBeforeMinutes", 10);
      result.payload = NextTrainApiClient.fetchNextTrain(
        result.journey.optString("station"),
        result.journey.optString("direction"),
        leaveBefore
      );
      result.refreshedAtMs = System.currentTimeMillis();
      WidgetSettingsStore.saveLastRefreshMs(context, result.refreshedAtMs);
      result.stale = false;
      result.next = resolveActiveNextTrip(result.payload);
      fillTripFields(result);
      return result;
    } catch (Exception error) {
      if (allowStaleFallback) {
        long age = System.currentTimeMillis() - result.refreshedAtMs;
        result.stale = result.refreshedAtMs > 0 && age > STALE_THRESHOLD_MS;

        JSONObject cached = WidgetSettingsStore.readSnapshot(context);
        if (cached != null) {
          try {
            result.journeyId = cached.optString("journeyId");
            result.route = cached.optString("route");
            result.empty = cached.optBoolean("empty", false);
          } catch (Exception ignored) {
            result.empty = true;
          }
        } else {
          result.empty = true;
        }
      } else {
        result.empty = true;
      }
      return result;
    }
  }

  private static void fillTripFields(Result result) {
    if (result.next == null) {
      return;
    }
    result.leaveByIso = result.next.optString("leaveBy", "");
    result.departureIso = result.next.optString("departure", "");
    if (result.departureIso.isEmpty()) {
      result.departureIso = result.next.optString("arrival", "");
    }
    result.displayTime = result.next.optString("displayTime", "—");
    result.status = result.next.optString("status", "On Time");
    result.leavePhase = result.next.optString("leavePhase", "calm");
    result.minutesUntilLeave = result.next.optInt("minutesUntilLeave", 0);
  }

  public static String departureKey(Result result) {
    if (result == null || result.journeyId == null || result.departureIso == null) {
      return "";
    }
    if (result.departureIso.isEmpty()) {
      return "";
    }
    return result.journeyId + ":" + result.departureIso;
  }

  public static long parseLeaveByMs(Result result) {
    if (result == null || result.leaveByIso == null || result.leaveByIso.isEmpty()) {
      return 0L;
    }
    try {
      return java.time.Instant.parse(result.leaveByIso).toEpochMilli();
    } catch (Exception error) {
      return 0L;
    }
  }

  public static JSONObject toWidgetSnapshot(Result result) throws Exception {
    if (result.empty) {
      return emptyState();
    }

    if (result.next == null && result.payload == null) {
      return loadingState(result.journey);
    }

    if (result.next == null) {
      JSONObject snapshot = new JSONObject();
      snapshot.put("empty", false);
      snapshot.put("journeyId", result.journeyId);
      snapshot.put("route", result.route);
      snapshot.put("stationLabel", WidgetDataService.formatStationLabel(result.journey));
      snapshot.put("label", "NEXT TRAIN");
      snapshot.put("primary", "No trains");
      snapshot.put("trainClock", "");
      snapshot.put("secondary", "");
      snapshot.put("updatedLine", PerthTime.formatUpdatedAgo(result.refreshedAtMs));
      snapshot.put("statusCrumb", "");
      snapshot.put("urgent", false);
      snapshot.put("late", false);
      snapshot.put("stale", result.stale);
      return snapshot;
    }

    return buildLiveSnapshot(result);
  }

  private static JSONObject emptyState() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", true);
    snapshot.put("journeyId", "new");
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", "Add journey");
    snapshot.put("trainClock", "");
    snapshot.put("secondary", "Save your journey");
    snapshot.put("updatedLine", "");
    snapshot.put("stale", false);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    return snapshot;
  }

  private static JSONObject loadingState(JSONObject journey) throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    if (journey != null) {
      snapshot.put("journeyId", journey.optString("id"));
      snapshot.put("route", WidgetDataService.formatRoute(journey));
      snapshot.put("stationLabel", WidgetDataService.formatStationLabel(journey));
    }
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", "…");
    snapshot.put("trainClock", "");
    snapshot.put("secondary", "");
    snapshot.put("updatedLine", "Updating…");
    snapshot.put("stale", false);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    return snapshot;
  }

  private static JSONObject buildLiveSnapshot(Result result) throws Exception {
    JSONObject journey = result.journey;
    boolean departMode = result.departMode;
    JSONObject next = result.next;

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("journeyId", result.journeyId);
    snapshot.put("route", result.route);
    snapshot.put("stationLabel", WidgetDataService.formatStationLabel(journey));
    snapshot.put("journeyName", journey.optString("name", "Journey"));
    snapshot.put("stale", result.stale);

    String leavePhase = result.leavePhase;
    int minutesUntilLeave = result.minutesUntilLeave;
    int minutesUntilDeparture = next.optInt("minutesUntilDeparture", 0);
    String displayTime = result.displayTime;
    String status = result.status;

    boolean leaveLate = "late".equals(leavePhase) || "missed".equals(leavePhase);
    boolean leaveUrgent =
      leaveLate
        || "now".equals(leavePhase)
        || "urgent".equals(leavePhase)
        || "soon".equals(leavePhase);

    // Match main screen: Next Train primary, leave secondary.
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", formatMinutesPrimary(minutesUntilDeparture));
    snapshot.put("trainClock", displayTime != null ? displayTime : "");

    if (departMode) {
      snapshot.put("secondary", "");
      snapshot.put("urgent", false);
      snapshot.put("late", false);
    } else {
      snapshot.put("secondary", formatLeaveSecondary(leavePhase, minutesUntilLeave));
      snapshot.put("urgent", leaveUrgent);
      snapshot.put("late", leaveLate);
    }

    snapshot.put("statusCrumb", formatStatusCrumb(status));
    snapshot.put("departureIso", result.departureIso != null ? result.departureIso : "");
    snapshot.put("leaveByIso", result.leaveByIso != null ? result.leaveByIso : "");
    snapshot.put("departMode", departMode);
    snapshot.put("refreshedAtMs", result.refreshedAtMs);
    snapshot.put("status", status != null ? status : "On Time");
    snapshot.put(
      "updatedLine",
      result.stale
        ? "Times may be out of date"
        : PerthTime.formatUpdatedAgo(result.refreshedAtMs)
    );
    snapshot.put(
      "leaveBeforeMinutes",
      journey.optInt("leaveBeforeMinutes", 10)
    );
    putFollowingCache(snapshot, resolveFollowingTrip(result.payload, next));
    return snapshot;
  }

  /** Recompute countdown copy from cached absolute ISO times (no network). */
  public static JSONObject repaintSnapshot(JSONObject cached) throws Exception {
    if (cached == null || cached.optBoolean("empty", false)) {
      return cached;
    }

    String departureIso = cached.optString("departureIso", "");
    if (departureIso.isEmpty()) {
      return cached;
    }

    long now = System.currentTimeMillis();
    if (hasDepartureMinutePassed(departureIso)) {
      JSONObject promoted = tryPromoteFollowing(cached, now);
      if (promoted != null) {
        return promoted;
      }
      return applyUpdatingState(cached);
    }

    return repaintActiveSnapshot(new JSONObject(cached.toString()), now);
  }

  static JSONObject resolveActiveNextTrip(JSONObject payload) {
    if (payload == null) {
      return null;
    }

    JSONArray upcoming = payload.optJSONArray("upcoming");
    if (upcoming != null && upcoming.length() > 0) {
      for (int index = 0; index < upcoming.length(); index += 1) {
        JSONObject trip = upcoming.optJSONObject(index);
        if (trip != null && !hasDepartureMinutePassed(trip)) {
          return trip;
        }
      }
      return null;
    }

    JSONObject next = payload.optJSONObject("next");
    if (next != null && !hasDepartureMinutePassed(next)) {
      return next;
    }

    JSONObject following = payload.optJSONObject("following");
    if (following != null && !hasDepartureMinutePassed(following)) {
      return following;
    }

    return null;
  }

  static JSONObject resolveFollowingTrip(JSONObject payload, JSONObject activeNext) {
    if (payload == null || activeNext == null) {
      return null;
    }

    String activeDeparture = tripDepartureIso(activeNext);
    JSONArray upcoming = payload.optJSONArray("upcoming");
    if (upcoming != null) {
      for (int index = 0; index < upcoming.length(); index += 1) {
        JSONObject trip = upcoming.optJSONObject(index);
        if (trip == null) {
          continue;
        }
        if (tripDepartureIso(trip).equals(activeDeparture) && index + 1 < upcoming.length()) {
          JSONObject candidate = upcoming.optJSONObject(index + 1);
          if (candidate != null && !hasDepartureMinutePassed(candidate)) {
            return candidate;
          }
          return null;
        }
      }
    }

    JSONObject following = payload.optJSONObject("following");
    if (
      following != null &&
      !tripDepartureIso(following).equals(activeDeparture) &&
      !hasDepartureMinutePassed(following)
    ) {
      return following;
    }

    return null;
  }

  static String tripDepartureIso(JSONObject trip) {
    if (trip == null) {
      return "";
    }
    String departureIso = trip.optString("departure", "");
    if (!departureIso.isEmpty()) {
      return departureIso;
    }
    return trip.optString("arrival", "");
  }

  static boolean hasDepartureMinutePassed(JSONObject trip) {
    return hasDepartureMinutePassed(tripDepartureIso(trip));
  }

  static boolean hasDepartureMinutePassed(String departureIso) {
    long advanceAt = departureAdvanceAtMs(departureIso);
    return advanceAt > 0L && System.currentTimeMillis() >= advanceAt;
  }

  private static JSONObject tryPromoteFollowing(JSONObject cached, long now) throws Exception {
    String followingDepartureIso = cached.optString("followingDepartureIso", "");
    if (followingDepartureIso.isEmpty() || hasDepartureMinutePassed(followingDepartureIso)) {
      return null;
    }

    JSONObject snapshot = new JSONObject(cached.toString());
    snapshot.put("departureIso", followingDepartureIso);
    String leaveByIso = cached.optString("followingLeaveByIso", "");
    if (leaveByIso.isEmpty() && !snapshot.optBoolean("departMode", false)) {
      int leaveBefore = snapshot.optInt("leaveBeforeMinutes", 10);
      long leaveByMs =
        PerthTime.epochMillisFromIso(followingDepartureIso) - leaveBefore * 60_000L;
      leaveByIso = PerthTime.formatIsoFromEpochMs(leaveByMs);
    }
    snapshot.put("leaveByIso", leaveByIso);
    snapshot.put("trainClock", cached.optString("followingDisplayTime", ""));
    snapshot.put("status", cached.optString("followingStatus", "On Time"));
    clearFollowingCache(snapshot);
    return repaintActiveSnapshot(snapshot, now);
  }

  private static JSONObject applyUpdatingState(JSONObject cached) throws Exception {
    JSONObject snapshot = new JSONObject(cached.toString());
    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", "Updating…");
    snapshot.put("trainClock", "");
    snapshot.put("secondary", "Fetching next train…");
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    snapshot.put("statusCrumb", "");
    boolean stale = cached.optBoolean("stale", false);
    long refreshedAtMs = cached.optLong("refreshedAtMs", 0L);
    snapshot.put(
      "updatedLine",
      stale ? "Times may be out of date" : PerthTime.formatUpdatedAgo(refreshedAtMs)
    );
    return snapshot;
  }

  private static JSONObject repaintActiveSnapshot(JSONObject snapshot, long now) throws Exception {
    String departureIso = snapshot.optString("departureIso", "");
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    String leaveByIso = snapshot.optString("leaveByIso", "");
    long leaveByMs = leaveByIso.isEmpty() ? 0L : PerthTime.epochMillisFromIso(leaveByIso);

    int minutesUntilDeparture = roundMinutes(departureMs - now);
    int minutesUntilLeave = leaveByMs > 0 ? roundMinutes(leaveByMs - now) : minutesUntilDeparture;
    String leavePhase = getLeavePhase(minutesUntilLeave, minutesUntilDeparture);
    boolean departMode = snapshot.optBoolean("departMode", false);
    String status = snapshot.optString("status", "On Time");

    boolean leaveLate = "late".equals(leavePhase) || "missed".equals(leavePhase);
    boolean leaveUrgent =
      leaveLate
        || "now".equals(leavePhase)
        || "urgent".equals(leavePhase)
        || "soon".equals(leavePhase);

    snapshot.put("label", "NEXT TRAIN");
    snapshot.put("primary", formatMinutesPrimary(minutesUntilDeparture));

    if (departMode) {
      snapshot.put("secondary", "");
      snapshot.put("urgent", false);
      snapshot.put("late", false);
    } else {
      snapshot.put("secondary", formatLeaveSecondary(leavePhase, minutesUntilLeave));
      snapshot.put("urgent", leaveUrgent);
      snapshot.put("late", leaveLate);
    }

    snapshot.put("statusCrumb", formatStatusCrumb(status));
    boolean stale = snapshot.optBoolean("stale", false);
    long refreshedAtMs = snapshot.optLong("refreshedAtMs", 0L);
    snapshot.put(
      "updatedLine",
      stale ? "Times may be out of date" : PerthTime.formatUpdatedAgo(refreshedAtMs)
    );
    return snapshot;
  }

  private static void putFollowingCache(JSONObject snapshot, JSONObject following) throws Exception {
    if (following == null) {
      clearFollowingCache(snapshot);
      return;
    }

    snapshot.put("followingDepartureIso", tripDepartureIso(following));
    snapshot.put("followingLeaveByIso", following.optString("leaveBy", ""));
    snapshot.put("followingDisplayTime", following.optString("displayTime", ""));
    snapshot.put("followingStatus", following.optString("status", "On Time"));
  }

  private static void clearFollowingCache(JSONObject snapshot) throws Exception {
    snapshot.put("followingDepartureIso", "");
    snapshot.put("followingLeaveByIso", "");
    snapshot.put("followingDisplayTime", "");
    snapshot.put("followingStatus", "");
  }

  /** True when a 1-minute local repaint is useful (within ~60 min of train or leave-by). */
  public static boolean needsLocalRepaint(JSONObject snapshot) {
    if (snapshot == null || snapshot.optBoolean("empty", false)) {
      return false;
    }

    if (needsNetworkRefresh(snapshot)) {
      return false;
    }

    String departureIso = snapshot.optString("departureIso", "");
    if (departureIso.isEmpty()) {
      return false;
    }

    long now = System.currentTimeMillis();
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    String leaveByIso = snapshot.optString("leaveByIso", "");
    long leaveByMs = leaveByIso.isEmpty() ? departureMs : PerthTime.epochMillisFromIso(leaveByIso);
    long nearestMs = Math.min(departureMs, leaveByMs) - now;
    return nearestMs <= 60L * 60L * 1000L && nearestMs >= -15L * 60L * 1000L;
  }

  /** First instant after the scheduled departure minute — time to fetch the next train. */
  static long departureAdvanceAtMs(String departureIso) {
    if (departureIso == null || departureIso.isEmpty()) {
      return 0L;
    }
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0L) {
      return 0L;
    }
    return ((departureMs / 60_000L) + 1L) * 60_000L;
  }

  /** Cached snapshot still shows a train whose departure minute has passed. */
  public static boolean needsNetworkRefresh(JSONObject snapshot) {
    if (snapshot == null || snapshot.optBoolean("empty", false)) {
      return false;
    }

    String departureIso = snapshot.optString("departureIso", "");
    if (departureIso.isEmpty()) {
      return false;
    }

    long advanceAt = departureAdvanceAtMs(departureIso);
    return advanceAt > 0L && System.currentTimeMillis() >= advanceAt;
  }

  static int roundMinutes(long deltaMs) {
    return (int) Math.round(deltaMs / 60_000.0);
  }

  static String getLeavePhase(int minutesUntilLeave, int minutesUntilDeparture) {
    if (minutesUntilDeparture <= 0) {
      return "missed";
    }
    if (minutesUntilLeave < 0) {
      return "late";
    }
    if (minutesUntilLeave <= 0) {
      return "now";
    }
    if (minutesUntilLeave <= 2) {
      return "urgent";
    }
    if (minutesUntilLeave <= 5) {
      return "soon";
    }
    return "calm";
  }

  private static String formatMinutesPrimary(int minutes) {
    if (minutes <= 0) {
      return "NOW";
    }
    if (minutes == 1) {
      return "1 min";
    }
    return minutes + " min";
  }

  private static String formatLeaveSecondary(String leavePhase, int minutesUntilLeave) {
    if ("late".equals(leavePhase) || "missed".equals(leavePhase)) {
      int minutesLate = minutesUntilLeave < 0 ? Math.abs(minutesUntilLeave) : 0;
      if (minutesLate == 1) {
        return "Leave 1 min ago";
      }
      if (minutesLate > 1) {
        return "Leave " + minutesLate + " min ago";
      }
      return "Leave now";
    }
    if ("now".equals(leavePhase)) {
      return "Leave now";
    }
    if (minutesUntilLeave <= 0) {
      return "Leave now";
    }
    if (minutesUntilLeave == 1) {
      return "Leave in 1 min";
    }
    return "Leave in " + minutesUntilLeave + " min";
  }

  private static String formatStatusCrumb(String status) {
    if (status == null || status.isEmpty() || "On Time".equalsIgnoreCase(status)) {
      return "";
    }
    return status;
  }
}
