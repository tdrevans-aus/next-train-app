package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;

/** Shared journey fetch + leave-by computation for widget and leave reminders. */
public final class CommuteSchedule {

  public static final long STALE_THRESHOLD_MS = 120L * 60L * 1000L;
  public static final long STALE_FETCH_VISIBLE_MS = 45L * 1000L;
  public static final long UPDATING_TIMEOUT_MS = 90L * 1000L;
  public static final long OPPORTUNISTIC_REFRESH_AGE_MS = 12L * 60L * 1000L;
  public static final long OPPORTUNISTIC_REFRESH_DEBOUNCE_MS = 5L * 60L * 1000L;
  static final int PRE_DEPARTURE_PREFETCH_MINUTES = 3;
  static final int DEGRADED_CLOCK_MINUTES_PAST = 20;
  public static final String DEGRADED_SECONDARY = "Open app";

  public static final class Result {

    public JSONObject settings;
    public JSONObject journey;
    public JSONObject payload;
    public JSONObject next;
    public boolean departMode;
    public boolean stale;
    public boolean empty;
    public boolean nearbyFallback;
    public boolean widgetLocked;
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
      if (!hasWidgetAccess(result.settings)) {
        result.widgetLocked = true;
        result.empty = false;
        return result;
      }

      Result pinnedResult = WidgetPinResolver.loadBestPinnedResult(context, result.settings);
      if (pinnedResult != null) {
        pinnedResult.refreshedAtMs = System.currentTimeMillis();
        WidgetSettingsStore.saveLastRefreshMs(context, pinnedResult.refreshedAtMs);
        pinnedResult.stale = false;
        return pinnedResult;
      }

      result.journey = JourneySelector.selectJourney(result.settings);
      if (result.journey == null) {
        result.journey = JourneySelector.selectActiveRoute(result.settings);
      }
      if (result.journey == null) {
        if (JourneySelector.hasConfiguredJourneys(result.settings)) {
          result.nearbyFallback = true;
          result.empty = false;
        } else {
          result.empty = true;
        }
        return result;
      }

      boolean routeJourney = JourneySelector.isRouteJourney(result.journey);
      result.journeyId = result.journey.optString("id");
      result.route = WidgetDataService.formatRoute(result.journey);
      result.departMode = routeJourney || !result.journey.optBoolean("useLeaveBefore", true);

      int leaveBefore = result.departMode ? 0 : result.journey.optInt("leaveBeforeMinutes", 10);
      result.payload = NextTrainApiClient.fetchNextTrain(
        result.journey.optString("station"),
        result.journey.optString("direction"),
        leaveBefore
      );
      result.refreshedAtMs = System.currentTimeMillis();
      WidgetSettingsStore.saveLastRefreshMs(context, result.refreshedAtMs);
      result.stale = false;
      result.next =
        routeJourney
          ? resolveActiveNextTrip(result.payload, result.journey)
          : JourneyPinHelper.resolvePinnedTrip(result.payload, result.journey);
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

  static Result tryLoadNearbyPin(Context context, JSONObject settings) throws Exception {
    JSONObject pin = settings.optJSONObject("nearbyPin");
    if (!NearbyPinHelper.isHolding(pin)) {
      return null;
    }

    int leaveBefore = settings.optInt("nearbyLeaveBeforeMinutes", 10);
    PreferredTrainReminder.Target target = NearbyPinHelper.computeTarget(pin, leaveBefore, false);
    if (target == null) {
      return null;
    }

    JSONObject payload = NextTrainApiClient.fetchNextTrain(
      pin.optString("station", ""),
      pin.optString("direction", ""),
      leaveBefore
    );

    Result result = new Result();
    result.settings = settings;
    result.journeyId = NearbyPinHelper.JOURNEY_ID;
    result.route = target.route;
    result.departMode = false;
    result.payload = payload;
    result.refreshedAtMs = System.currentTimeMillis();
    WidgetSettingsStore.saveLastRefreshMs(context, result.refreshedAtMs);
    result.stale = false;

    JSONObject trip = NearbyPinHelper.findTripByDeparture(payload, target.departureIso);
    if (trip == null) {
      trip = NearbyPinHelper.buildSyntheticTrip(pin, leaveBefore);
    }
    result.next = trip;
    fillTripFields(result);
    return result;
  }

  static void fillTripFields(Result result) {
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
    if (result == null) {
      return 0L;
    }
    return PerthTime.epochMillisFromIso(result.leaveByIso);
  }

  public static JSONObject toWidgetSnapshot(Result result) throws Exception {
    if (result.widgetLocked) {
      return widgetLockedSnapshot();
    }

    if (result.nearbyFallback) {
      return outsideHoursSnapshot(result.settings);
    }

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
    snapshot.put("openNearbyOnTap", true);
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

  private static JSONObject nearbyFallbackState() throws Exception {
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

  private static JSONObject emptyState() throws Exception {
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

  public static boolean hasWidgetAccess(JSONObject settings) {
    if (settings == null) {
      return true;
    }
    JSONObject pro = settings.optJSONObject("pro");
    if (pro == null) {
      return true;
    }
    return pro.optBoolean("hasWidgetAccess", true);
  }

  public static boolean hasWidgetAccessFromContext(Context context) {
    try {
      String json = WidgetSettingsStore.readSettings(context);
      if (json == null || json.isEmpty()) {
        return true;
      }
      return hasWidgetAccess(new JSONObject(json));
    } catch (Exception error) {
      return true;
    }
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

  private static JSONObject loadingState(JSONObject journey) throws Exception {
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

  private static JSONObject buildLiveSnapshot(Result result) throws Exception {
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
    int minutesUntilDeparture = next.optInt("minutesUntilDeparture", 0);
    String displayTime = result.displayTime;
    String status = result.status;

    boolean leaveLate = false;
    boolean leaveUrgent =
      "now".equals(leavePhase)
        || "urgent".equals(leavePhase)
        || "soon".equals(leavePhase);

    // Match main screen: Next Train vs Target Train when the face is the preferred trip.
    snapshot.put("label", liveWidgetLabel(journey, next));
    snapshot.put("primary", formatMinutesPrimary(minutesUntilDeparture));
    snapshot.put("trainClock", displayTime != null ? displayTime : "");

    if (departMode) {
      snapshot.put("secondary", "");
      snapshot.put("urgent", false);
      snapshot.put("late", false);
      snapshot.put("leaveByArmed", false);
      snapshot.put("preferredHint", "");
    } else {
      boolean leaveArmed = leaveByArmedForTrip(next, journey);
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
        snapshot.put("preferredHint", preferredHintForJourney(journey));
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
    putFollowingCache(snapshot, resolveFollowingTrip(result.payload, next));
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
    return resolveActiveNextTrip(payload, null);
  }

  /**
   * True soonest not-yet-departed train (classic next).
   */
  static JSONObject resolveTrueNextTrip(JSONObject payload) {
    return resolveActiveNextTrip(payload, null);
  }

  /**
   * Next live trip for the widget/commute face = true soonest not-yet-departed train
   * when no journey pin context. With journey, use {@link JourneyPinHelper#resolvePinnedTrip}.
   */
  static JSONObject resolveActiveNextTrip(JSONObject payload, JSONObject journey) {
    if (payload == null) {
      return null;
    }

    JSONArray upcoming = collectUpcomingTrips(payload);
    if (upcoming.length() > 0) {
      for (int index = 0; index < upcoming.length(); index += 1) {
        JSONObject trip = upcoming.optJSONObject(index);
        if (trip == null || hasDepartureMinutePassed(trip)) {
          continue;
        }
        return trip;
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

  /** Leave By / leave twin only when no preferred, or this trip is at/after preferred. */
  static boolean leaveByArmedForTrip(JSONObject trip, JSONObject journey) {
    if (journey == null || JourneySelector.isRouteJourney(journey)) {
      return false;
    }
    if (!journey.optBoolean("useLeaveBefore", true)) {
      return false;
    }
    if (trip == null) {
      return false;
    }
    if (JourneyPinHelper.isOverrideActiveToday(journey)) {
      return true;
    }
    int preferredMinutes = preferredMinutesForLiveGlance(journey);
    if (preferredMinutes < 0) {
      return true;
    }
    return tripMatchesPreferredOrLater(trip, preferredMinutes, liveHorizonMinutes(journey));
  }

  /**
   * Live face label: Target Train when the shown trip is at/after preferred; otherwise Next Train.
   * (Idle outside-hours uses {@link NextCommutePreview#idleWidgetLabel}.)
   */
  static String liveWidgetLabel(JSONObject journey, JSONObject trip) {
    if (trip == null) {
      return "NEXT TRAIN";
    }
    if (journey != null && JourneySelector.isRouteJourney(journey)) {
      return "NEXT TRAIN";
    }
    if (journey != null && NearbyPinHelper.JOURNEY_ID.equals(journey.optString("id", ""))) {
      return "Pinned Train";
    }
    if (JourneyPinHelper.isOverrideActiveToday(journey)) {
      return "Target Train";
    }
    int preferredMinutes = preferredMinutesForLiveGlance(journey);
    if (preferredMinutes < 0) {
      return "NEXT TRAIN";
    }
    if (tripMatchesPreferredOrLater(trip, preferredMinutes, liveHorizonMinutes(journey))) {
      return "Target Train";
    }
    return "NEXT TRAIN";
  }

  static String liveWidgetLabelFromSnapshot(JSONObject snapshot) {
    if (snapshot == null) {
      return "NEXT TRAIN";
    }
    int preferredMinutes = PerthTime.parseClockMinutes(snapshot.optString("preferredTrainTime", ""));
    if (preferredMinutes < 0) {
      return "NEXT TRAIN";
    }
    if (snapshot.optBoolean("leaveByArmed", false)) {
      return "Target Train";
    }
    return "NEXT TRAIN";
  }

  /** Preserve Target Train / Next Train across Updating… / stale paints. */
  static String preservedLiveLabel(JSONObject cached) {
    if (cached == null) {
      return "NEXT TRAIN";
    }
    String label = cached.optString("label", "");
    if ("Target Train".equalsIgnoreCase(label) || "TARGET TRAIN".equalsIgnoreCase(label)) {
      return "Target Train";
    }
    if (!label.isEmpty()) {
      return label;
    }
    return liveWidgetLabelFromSnapshot(cached);
  }

  /** Medium widget orientation when Leave By is hidden for an earlier train. */
  static String preferredHintForJourney(JSONObject journey) {
    int preferredMinutes = preferredMinutesForLiveGlance(journey);
    if (preferredMinutes < 0) {
      return "";
    }
    return "Target " + NextCommutePreview.formatClock(preferredMinutes);
  }

  /** Explicit preferred only — do not fall back to Active from (unlike reminders legacy). */
  static int preferredMinutesForLiveGlance(JSONObject journey) {
    if (journey == null) {
      return -1;
    }
    return PerthTime.parseClockMinutes(journey.optString("preferredTrainTime", ""));
  }

  static int liveHorizonMinutes(JSONObject journey) {
    if (journey == null) {
      return 24 * 60;
    }
    int untilMinutes = PerthTime.parseClockMinutes(journey.optString("defaultUntil", ""));
    if (untilMinutes >= 0) {
      return untilMinutes;
    }
    return 24 * 60;
  }

  static boolean tripMatchesPreferredOrLater(
    JSONObject trip,
    int preferredMinutes,
    int horizonMinutes
  ) {
    String departureIso = tripDepartureIso(trip);
    int departureMinutes = PerthTime.minutesFromIso(departureIso);
    if (departureMinutes < 0) {
      return false;
    }
    if (departureMinutes < preferredMinutes) {
      return false;
    }
    // Same-day Active until only (preferred before until). Overnight windows skip horizon clip.
    if (
      horizonMinutes < 24 * 60 &&
      preferredMinutes < horizonMinutes &&
      departureMinutes >= horizonMinutes
    ) {
      return false;
    }
    return true;
  }

  static JSONArray collectUpcomingTrips(JSONObject payload) {
    JSONArray upcoming = payload.optJSONArray("upcoming");
    if (upcoming != null && upcoming.length() > 0) {
      return upcoming;
    }
    JSONArray built = new JSONArray();
    JSONObject next = payload.optJSONObject("next");
    if (next != null) {
      built.put(next);
    }
    JSONObject following = payload.optJSONObject("following");
    if (following != null) {
      built.put(following);
    }
    return built;
  }

  static JSONObject resolveFollowingTrip(JSONObject payload, JSONObject activeNext) {
    if (payload == null || activeNext == null) {
      return null;
    }

    String activeDeparture = tripDepartureIso(activeNext);
    JSONArray upcoming = payload.optJSONArray("upcoming");
    if (upcoming != null && upcoming.length() > 0) {
      JSONObject fromArray = followingFromUpcoming(upcoming, activeDeparture);
      if (fromArray != null) {
        return fromArray;
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

  static JSONObject followingFromUpcoming(JSONArray upcoming, String activeDeparture) {
    int activeIndex = findTripIndex(upcoming, activeDeparture);
    if (activeIndex >= 0 && activeIndex + 1 < upcoming.length()) {
      JSONObject candidate = upcoming.optJSONObject(activeIndex + 1);
      if (candidate != null && !hasDepartureMinutePassed(candidate)) {
        return candidate;
      }
    }

    return firstUpcomingAfter(upcoming, activeDeparture);
  }

  static int findTripIndex(JSONArray upcoming, String activeDeparture) {
    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip != null && tripDepartureIso(trip).equals(activeDeparture)) {
        return index;
      }
    }
    return -1;
  }

  static JSONObject firstUpcomingAfter(JSONArray upcoming, String activeDeparture) {
    long activeMs = PerthTime.epochMillisFromIso(activeDeparture);
    if (activeMs <= 0L) {
      return null;
    }

    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip == null || hasDepartureMinutePassed(trip)) {
        continue;
      }
      String departureIso = tripDepartureIso(trip);
      if (departureIso.equals(activeDeparture)) {
        continue;
      }
      if (PerthTime.epochMillisFromIso(departureIso) > activeMs) {
        return trip;
      }
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
    long now = System.currentTimeMillis();
    long updatingSince = cached.optLong("updatingSinceMs", 0L);
    if (updatingSince <= 0L) {
      updatingSince = now;
    }

    long elapsed = now - updatingSince;
    if (elapsed >= UPDATING_TIMEOUT_MS) {
      return finishUpdatingEpisode(cached, now);
    }

    if (
      cached.optBoolean("staleWhileFetching", false) ||
      hasUsefulStaleClock(cached) ||
      elapsed >= STALE_FETCH_VISIBLE_MS
    ) {
      return applyStaleWhileFetching(cached, updatingSince);
    }

    JSONObject snapshot = new JSONObject(cached.toString());
    snapshot.put("staleWhileFetching", false);
    snapshot.put("label", preservedLiveLabel(cached));
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
    String primary = degradedPrimary(cached);

    snapshot.put("staleWhileFetching", true);
    snapshot.put("label", preservedLiveLabel(cached));
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
    return !departureIso.isEmpty() && hasDepartureMinutePassed(departureIso);
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
    snapshot.put("label", preservedLiveLabel(cached));
    snapshot.put("primary", degradedPrimary(cached));
    snapshot.put("trainClock", "");
    snapshot.put("secondary", DEGRADED_SECONDARY);
    snapshot.put("urgent", false);
    snapshot.put("late", false);
    snapshot.put("statusCrumb", "");
    snapshot.put("stale", true);
    snapshot.put("updatingSinceMs", 0L);
    snapshot.put("updatingRetried", false);
    snapshot.put("updatedLine", "Times may be out of date");
    return snapshot;
  }

  static String degradedPrimary(JSONObject cached) {
    long now = System.currentTimeMillis();
    String departureIso = cached.optString("departureIso", "");
    String trainClock = cached.optString("trainClock", "");

    if (!departureIso.isEmpty()) {
      int minutesUntilDeparture = PerthTime.minutesUntilWallClock(departureIso, now);
      if (minutesUntilDeparture >= 0) {
        return formatMinutesPrimary(minutesUntilDeparture);
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

  private static JSONObject repaintActiveSnapshot(JSONObject snapshot, long now) throws Exception {
    String departureIso = snapshot.optString("departureIso", "");
    String leaveByIso = snapshot.optString("leaveByIso", "");

    int minutesUntilDeparture = PerthTime.minutesUntilWallClock(departureIso, now);
    int minutesUntilLeave =
      leaveByIso.isEmpty()
        ? minutesUntilDeparture
        : PerthTime.minutesUntilWallClock(leaveByIso, now);
    String leavePhase = getLeavePhase(minutesUntilLeave, minutesUntilDeparture);
    boolean departMode = snapshot.optBoolean("departMode", false);
    String status = snapshot.optString("status", "On Time");

    boolean leaveLate = false;
    boolean leaveUrgent =
      "now".equals(leavePhase)
        || "urgent".equals(leavePhase)
        || "soon".equals(leavePhase);

    snapshot.put("label", liveWidgetLabelFromSnapshot(snapshot));
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

    if (DEGRADED_SECONDARY.equals(snapshot.optString("secondary"))) {
      return false;
    }

    if ("No trains".equals(snapshot.optString("primary"))) {
      return false;
    }

    String departureIso = snapshot.optString("departureIso", "");
    return !departureIso.isEmpty() && !hasDepartureMinutePassed(departureIso);
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
    if (age < OPPORTUNISTIC_REFRESH_AGE_MS) {
      return false;
    }

    long lastOpportunistic = snapshot.optLong("lastOpportunisticRefreshMs", 0L);
    return System.currentTimeMillis() - lastOpportunistic >= OPPORTUNISTIC_REFRESH_DEBOUNCE_MS;
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
    return minutesUntilDeparture >= 0 && minutesUntilDeparture <= PRE_DEPARTURE_PREFETCH_MINUTES;
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
}
