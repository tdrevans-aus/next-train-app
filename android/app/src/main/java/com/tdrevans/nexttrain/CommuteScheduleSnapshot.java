package com.tdrevans.nexttrain;

import org.json.JSONObject;

/** Widget JSON snapshot build + local countdown repaint (no network). */
public final class CommuteScheduleSnapshot {

  private CommuteScheduleSnapshot() {}

  public static JSONObject toWidgetSnapshot(CommuteSchedule.Result result) throws Exception {
    if (result.widgetLocked) {
      return CommuteSchedulePreview.widgetLockedSnapshot();
    }

    if (result.nearbyFallback) {
      return CommuteSchedulePreview.outsideHoursSnapshot(result.settings);
    }

    if (result.empty) {
      return CommuteSchedulePreview.emptyState();
    }

    if (result.next == null && result.payload == null) {
      return CommuteSchedulePreview.loadingState(result.journey);
    }

    if (result.next == null) {
      JSONObject snapshot = new JSONObject();
      snapshot.put("empty", false);
      snapshot.put("journeyId", result.journeyId);
      snapshot.put("route", result.route);
      snapshot.put(
        "stationLabel",
        result.route != null && !result.route.isEmpty()
          ? result.route
          : WidgetDataService.formatRoute(result.journey)
      );
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

  private static JSONObject buildLiveSnapshot(CommuteSchedule.Result result) throws Exception {
    JSONObject journey = result.journey;
    boolean departMode = result.departMode;
    JSONObject next = result.next;

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("journeyId", result.journeyId);
    snapshot.put("route", result.route);
    // Same bottom-bar shape as idle: Station → Direction.
    snapshot.put("stationLabel", result.route != null ? result.route : WidgetDataService.formatRoute(journey));
    snapshot.put(
      "journeyName",
      journey != null ? journey.optString("name", "Journey") : "Journey"
    );
    snapshot.put("stale", result.stale);

    String leavePhase = result.leavePhase;
    int minutesUntilLeave = result.minutesUntilLeave;
    String departureIso = result.departureIso != null ? result.departureIso : "";
    int minutesUntilDeparture = !departureIso.isEmpty()
      ? PerthTime.minutesUntilWallClock(departureIso, System.currentTimeMillis())
      : next.optInt("minutesUntilDeparture", 0);
    String displayTime = result.displayTime;
    String status = result.status;

    boolean leaveLate = false;
    boolean leaveUrgent =
      "now".equals(leavePhase)
        || "urgent".equals(leavePhase)
        || "soon".equals(leavePhase);

    // Live face: Pinned chrome (nearby / day override) vs default Target label.
    boolean widgetFacePinned = CommuteSchedule.isWidgetPinnedFace(journey);
    boolean widgetPinnedChrome = CommuteSchedule.isWidgetPinnedChromeLabel(journey);
    snapshot.put("widgetFacePinned", widgetFacePinned);
    snapshot.put("widgetPinnedChrome", widgetPinnedChrome);
    snapshot.put("label", CommuteSchedule.liveWidgetLabel(journey, next));
    snapshot.put("primary", formatMinutesPrimary(minutesUntilDeparture));
    snapshot.put("trainClock", displayTime != null ? displayTime : "");

    if (departMode) {
      snapshot.put("secondary", "");
      snapshot.put("urgent", false);
      snapshot.put("late", false);
      snapshot.put("leaveByArmed", false);
      snapshot.put("preferredHint", "");
    } else {
      boolean leaveArmed = CommuteSchedule.leaveByArmedForTrip(next, journey);
      snapshot.put("leaveByArmed", leaveArmed);
      if (leaveArmed) {
        String secondary = formatLeaveSecondary(leavePhase, minutesUntilLeave);
        snapshot.put("secondary", secondary);
        snapshot.put("preferredHint", "");
        // Grace "Leave now" (≤1 min past leave-by) stays urgent, not late-red.
        if ("Leave now".equals(secondary) && minutesUntilLeave <= 0) {
          leaveUrgent = true;
        }
        snapshot.put("urgent", leaveUrgent && !secondary.isEmpty());
        snapshot.put("late", leaveLate);
      } else {
        snapshot.put("secondary", "");
        snapshot.put("preferredHint", CommuteSchedule.preferredHintForJourney(journey));
        snapshot.put("urgent", false);
        snapshot.put("late", false);
      }
    }

    snapshot.put("preferredTrainTime", journey != null ? journey.optString("preferredTrainTime", "") : "");

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
      journey != null ? journey.optInt("leaveBeforeMinutes", 10) : 10
    );
    snapshot.put("updatingSinceMs", 0L);
    putFollowingCache(snapshot, CommuteSchedule.resolveFollowingTrip(result.payload, next));
    return snapshot;
  }

  /** Recompute countdown copy from cached absolute ISO times (no network). */
  public static JSONObject repaintSnapshot(JSONObject cached) throws Exception {
    if (
      cached == null ||
      cached.optBoolean("empty", false) ||
      cached.optBoolean("nearbyFallback", false) ||
      cached.optBoolean("outsideHoursIdle", false) ||
      cached.optBoolean("widgetLocked", false)
    ) {
      return cached;
    }

    String departureIso = cached.optString("departureIso", "");
    if (departureIso.isEmpty()) {
      return cached;
    }

    long now = System.currentTimeMillis();
    if (CommuteSchedule.hasDepartureMinutePassed(departureIso)) {
      JSONObject promoted = tryPromoteFollowing(cached, now);
      if (promoted != null) {
        return promoted;
      }
      return applyUpdatingState(cached);
    }

    return repaintActiveSnapshot(new JSONObject(cached.toString()), now);
  }

  private static JSONObject tryPromoteFollowing(JSONObject cached, long now) throws Exception {
    if (!shouldPromoteFollowingFace(cached)) {
      return null;
    }

    String followingDepartureIso = cached.optString("followingDepartureIso", "");
    if (
      followingDepartureIso.isEmpty()
        || CommuteSchedule.hasDepartureMinutePassed(followingDepartureIso)
    ) {
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
    long now = System.currentTimeMillis();
    long updatingSince = cached.optLong("updatingSinceMs", 0L);
    if (updatingSince <= 0L) {
      updatingSince = now;
    }

    long elapsed = now - updatingSince;
    if (elapsed >= CommuteSchedule.UPDATING_TIMEOUT_MS) {
      return finishUpdatingEpisode(cached, now);
    }

    if (
      cached.optBoolean("staleWhileFetching", false) ||
      hasUsefulStaleClock(cached) ||
      elapsed >= CommuteSchedule.STALE_FETCH_VISIBLE_MS
    ) {
      return applyStaleWhileFetching(cached, updatingSince);
    }

    JSONObject snapshot = new JSONObject(cached.toString());
    snapshot.put("staleWhileFetching", false);
    snapshot.put("label", CommuteSchedule.preservedLiveLabel(cached));
    snapshot.put("primary", "Updating…");
    snapshot.put("trainClock", "");
    snapshot.put("secondary", "Fetching next train…");
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    snapshot.put("statusCrumb", "");
    snapshot.put("updatingSinceMs", updatingSince);
    snapshot.put("updatedLine", "");
    return snapshot;
  }

  private static JSONObject applyStaleWhileFetching(JSONObject cached, long updatingSince)
    throws Exception {
    JSONObject snapshot = new JSONObject(cached.toString());
    String trainClock = cached.optString("trainClock", "");
    String primary = CommuteSchedulePreview.degradedPrimary(cached);

    snapshot.put("staleWhileFetching", true);
    snapshot.put("label", CommuteSchedule.preservedLiveLabel(cached));
    snapshot.put("primary", primary);
    snapshot.put(
      "trainClock",
      !trainClock.isEmpty() && primary.equals(trainClock) ? "" : trainClock
    );
    snapshot.put("secondary", "");
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    snapshot.put("statusCrumb", "");
    snapshot.put("stale", true);
    snapshot.put("updatingSinceMs", updatingSince);
    snapshot.put("updatedLine", "Refreshing…");
    return snapshot;
  }

  static boolean hasUsefulStaleClock(JSONObject cached) {
    if (cached == null) {
      return false;
    }

    String trainClock = cached.optString("trainClock", "");
    if (trainClock.isEmpty()) {
      return false;
    }

    String departureIso = cached.optString("departureIso", "");
    return !departureIso.isEmpty() && CommuteSchedule.hasDepartureMinutePassed(departureIso);
  }

  private static JSONObject finishUpdatingEpisode(JSONObject cached, long now) throws Exception {
    if (!cached.optBoolean("updatingRetried", false)) {
      JSONObject snapshot = applyStaleWhileFetching(cached, now);
      snapshot.put("updatingRetried", true);
      snapshot.put("triggerFetchRetry", true);
      return snapshot;
    }
    return applyStaleRefreshState(cached);
  }

  private static JSONObject applyStaleRefreshState(JSONObject cached) throws Exception {
    JSONObject snapshot = new JSONObject(cached.toString());
    snapshot.put("label", CommuteSchedule.preservedLiveLabel(cached));
    snapshot.put("primary", CommuteSchedulePreview.degradedPrimary(cached));
    snapshot.put("trainClock", "");
    snapshot.put("secondary", CommuteSchedulePreview.DEGRADED_SECONDARY);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    snapshot.put("statusCrumb", "");
    snapshot.put("stale", true);
    snapshot.put("updatingSinceMs", 0L);
    snapshot.put("updatingRetried", false);
    snapshot.put("updatedLine", "Times may be out of date");
    return snapshot;
  }

  private static JSONObject repaintActiveSnapshot(JSONObject snapshot, long now) throws Exception {
    String departureIso = snapshot.optString("departureIso", "");
    String leaveByIso = snapshot.optString("leaveByIso", "");

    int minutesUntilDeparture = PerthTime.minutesUntilWallClock(departureIso, now);
    int minutesUntilLeave =
      leaveByIso.isEmpty()
        ? minutesUntilDeparture
        : PerthTime.minutesUntilWallClock(leaveByIso, now);
    String leavePhase = CommuteSchedule.getLeavePhase(minutesUntilLeave, minutesUntilDeparture);
    boolean departMode = snapshot.optBoolean("departMode", false);
    String status = snapshot.optString("status", "On Time");

    boolean leaveLate = false;
    boolean leaveUrgent =
      "now".equals(leavePhase)
        || "urgent".equals(leavePhase)
        || "soon".equals(leavePhase);

    snapshot.put("label", CommuteSchedule.preservedLiveLabel(snapshot));
    snapshot.put("primary", formatMinutesPrimary(minutesUntilDeparture));

    if (departMode) {
      snapshot.put("secondary", "");
      snapshot.put("urgent", false);
      snapshot.put("late", false);
      snapshot.put("preferredHint", "");
    } else if (!snapshot.optBoolean("leaveByArmed", true)) {
      snapshot.put("secondary", "");
      snapshot.put("urgent", false);
      snapshot.put("late", false);
      // Keep preferredHint from buildLiveSnapshot.
    } else {
      String secondary = formatLeaveSecondary(leavePhase, minutesUntilLeave);
      snapshot.put("secondary", secondary);
      snapshot.put("preferredHint", "");
      if ("Leave now".equals(secondary) && minutesUntilLeave <= 0) {
        leaveUrgent = true;
      }
      snapshot.put("urgent", leaveUrgent && !secondary.isEmpty());
      snapshot.put("late", leaveLate);
    }

    snapshot.put("statusCrumb", formatStatusCrumb(status));
    boolean stale = snapshot.optBoolean("stale", false);
    long refreshedAtMs = snapshot.optLong("refreshedAtMs", 0L);
    snapshot.put(
      "updatedLine",
      stale ? "Times may be out of date" : PerthTime.formatUpdatedAgo(refreshedAtMs)
    );
    snapshot.put("updatingSinceMs", 0L);
    snapshot.put("updatingRetried", false);
    snapshot.put("staleWhileFetching", false);
    return snapshot;
  }

  private static void putFollowingCache(JSONObject snapshot, JSONObject following) throws Exception {
    if (following == null) {
      clearFollowingCache(snapshot);
      return;
    }

    snapshot.put("followingDepartureIso", CommuteSchedule.tripDepartureIso(following));
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

  /** True when a 1-minute local repaint should keep the countdown aligned with wall-clock minutes. */
  public static boolean needsLocalRepaint(JSONObject snapshot) {
    if (
      snapshot == null ||
      snapshot.optBoolean("empty", false) ||
      snapshot.optBoolean("nearbyFallback", false) ||
      snapshot.optBoolean("outsideHoursIdle", false)
    ) {
      return false;
    }

    if (needsNetworkRefresh(snapshot)) {
      // Keep ticking during handoff fetch (brief Updating or staleWhileFetching).
      String primary = snapshot.optString("primary", "");
      if (
        "Updating…".equals(primary) ||
        snapshot.optBoolean("staleWhileFetching", false) ||
        snapshot.optLong("updatingSinceMs", 0L) > 0L
      ) {
        return true;
      }
      return false;
    }

    return hasLiveCountdown(snapshot);
  }

  /** Live commute face with a departure still ahead on the wall clock. */
  public static boolean isLiveCommuteSnapshot(JSONObject snapshot) {
    if (
      snapshot == null ||
      snapshot.optBoolean("empty", false) ||
      snapshot.optBoolean("nearbyFallback", false) ||
      snapshot.optBoolean("outsideHoursIdle", false)
    ) {
      return false;
    }

    if (CommuteSchedulePreview.DEGRADED_SECONDARY.equals(snapshot.optString("secondary"))) {
      return false;
    }

    if ("No trains".equals(snapshot.optString("primary"))) {
      return false;
    }

    String departureIso = snapshot.optString("departureIso", "");
    return !departureIso.isEmpty() && !CommuteSchedule.hasDepartureMinutePassed(departureIso);
  }

  static boolean hasLiveCountdown(JSONObject snapshot) {
    if (!isLiveCommuteSnapshot(snapshot)) {
      return false;
    }

    String primary = snapshot.optString("primary", "");
    if (!primary.isEmpty()) {
      if (
        "Open".equals(primary) ||
        "Updating…".equals(primary) ||
        "…".equals(primary) ||
        WidgetUiBuilder.EMPTY_SETUP_PRIMARY.equals(primary) ||
        "—".equals(primary)
      ) {
        return false;
      }
    }

    return true;
  }

  /** Kick a background refresh when cached network data is getting old during a live commute. */
  public static boolean shouldOpportunisticRefresh(JSONObject snapshot) {
    if (!isLiveCommuteSnapshot(snapshot) || needsNetworkRefresh(snapshot)) {
      return false;
    }

    long refreshedAtMs = snapshot.optLong("refreshedAtMs", 0L);
    if (refreshedAtMs <= 0L) {
      return false;
    }

    long age = System.currentTimeMillis() - refreshedAtMs;
    if (age < CommuteSchedule.OPPORTUNISTIC_REFRESH_AGE_MS) {
      return false;
    }

    long lastOpportunistic = snapshot.optLong("lastOpportunisticRefreshMs", 0L);
    return System.currentTimeMillis() - lastOpportunistic >= CommuteSchedule.OPPORTUNISTIC_REFRESH_DEBOUNCE_MS;
  }

  /** Warm following-train cache shortly before the active departure minute rolls. */
  public static boolean needsPreDeparturePrefetch(JSONObject snapshot) {
    if (!isLiveCommuteSnapshot(snapshot)) {
      return false;
    }

    if (!snapshot.optString("followingDepartureIso", "").isEmpty()) {
      return false;
    }

    String departureIso = snapshot.optString("departureIso", "");
    if (departureIso.equals(snapshot.optString("prefetchDepartureIso", ""))) {
      return false;
    }

    int minutesUntilDeparture =
      PerthTime.minutesUntilWallClock(departureIso, System.currentTimeMillis());
    return minutesUntilDeparture >= 0
      && minutesUntilDeparture <= CommuteSchedule.PRE_DEPARTURE_PREFETCH_MINUTES;
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

    long advanceAt = CommuteSchedule.departureAdvanceAtMs(departureIso);
    return advanceAt > 0L && System.currentTimeMillis() >= advanceAt;
  }

  static String formatMinutesPrimary(int minutes) {
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
      // One-minute grace after leave-by: keep "Leave now", then hide (no "ago").
      if (minutesLate <= 1) {
        return "Leave now";
      }
      return "";
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

  /** Only advance cached following when the departed face was pin/target — not a leaked true-next. */
  private static boolean shouldPromoteFollowingFace(JSONObject cached) {
    if (cached == null) {
      return false;
    }
    if (cached.optBoolean("widgetFacePinned", false)) {
      return true;
    }
    if (cached.optBoolean("widgetPinnedChrome", false)) {
      return true;
    }
    return !cached.optString("preferredTrainTime", "").trim().isEmpty();
  }
}
