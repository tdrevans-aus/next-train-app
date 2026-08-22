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
  public static final String DEGRADED_SECONDARY = CommuteSchedulePreview.DEGRADED_SECONDARY;

  /** Widget/reminder load bag. Extends {@link CommuteScheduleResult} for existing call sites. */
  public static final class Result extends CommuteScheduleResult {}

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
      // Widget face: pin or target only — never true-next (FB-20 / FB-43).
      result.next = JourneyPinHelper.resolvePinnedTrip(result.payload, result.journey);
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
    return CommuteScheduleSnapshot.toWidgetSnapshot(result);
  }

  public static JSONObject nearbyFallbackIfOutsideHours(Context context) {
    return CommuteSchedulePreview.nearbyFallbackIfOutsideHours(context);
  }

  public static JSONObject outsideHoursSnapshot(JSONObject settings) throws Exception {
    return CommuteSchedulePreview.outsideHoursSnapshot(settings);
  }

  static JSONObject outsideHoursSnapshot(
    JSONObject settings,
    int nowMinutes,
    int dayOfWeekIso
  ) throws Exception {
    return CommuteSchedulePreview.outsideHoursSnapshot(settings, nowMinutes, dayOfWeekIso);
  }

  public static boolean hasWidgetAccess(JSONObject settings) {
    return true;
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
    return CommuteSchedulePreview.widgetLockedSnapshot();
  }

  public static JSONObject repaintSnapshot(JSONObject cached) throws Exception {
    return CommuteScheduleSnapshot.repaintSnapshot(cached);
  }

  /**
   * Soonest not-yet-departed train (classic next). Hero/widget may show a pin instead;
   * use {@link JourneyPinHelper#resolvePinnedTrip} for the active commute face.
   */
  static JSONObject resolveTrueNextTrip(JSONObject payload) {
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

  /** True when the widget live face is an actively pinned train (nearby, override, or commute pin). */
  static boolean isWidgetPinnedFace(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    if (NearbyPinHelper.JOURNEY_ID.equals(journey.optString("id", ""))) {
      return true;
    }
    if (JourneyPinHelper.isOverrideActiveToday(journey)) {
      return true;
    }
    if (JourneySelector.isRouteJourney(journey)) {
      return false;
    }
    return JourneyPinHelper.isJourneyPinnedToday(journey);
  }

  /** True when the widget label should read Pinned (nearby or day override — not preferred target). */
  static boolean isWidgetPinnedChromeLabel(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    if (NearbyPinHelper.JOURNEY_ID.equals(journey.optString("id", ""))) {
      return true;
    }
    return JourneyPinHelper.isOverrideActiveToday(journey);
  }

  static boolean isWidgetLiveFaceLabel(String label) {
    if (label == null || label.isEmpty()) {
      return false;
    }
    String normalized = label.trim().toLowerCase(java.util.Locale.US);
    return normalized.equals("pinned")
      || normalized.equals("target")
      || normalized.equals("pinned train")
      || normalized.equals("target train");
  }

  static String normalizeWidgetLiveFaceLabel(String label) {
    if (label == null || label.isEmpty()) {
      return "Target train";
    }
    String normalized = label.trim().toLowerCase(java.util.Locale.US);
    if (normalized.equals("pinned") || normalized.equals("pinned train")) {
      return "Pinned train";
    }
    if (normalized.equals("target") || normalized.equals("target train")) {
      return "Target train";
    }
    return label;
  }

  /**
   * Live face label: Pinned train (nearby / day override) or Target train (preferred target + default).
   * (Idle outside-hours uses {@link NextCommutePreview#idleWidgetLabel}.)
   */
  static String liveWidgetLabel(JSONObject journey, JSONObject trip) {
    if (trip == null) {
      return "";
    }
    if (isWidgetPinnedChromeLabel(journey)) {
      return "Pinned train";
    }
    return "Target train";
  }

  static String liveWidgetLabelFromSnapshot(JSONObject snapshot) {
    if (snapshot == null) {
      return "Target train";
    }
    if (snapshot.optBoolean("widgetPinnedChrome", false)) {
      return "Pinned train";
    }
    return "Target train";
  }

  /** Preserve Pinned / Target across Updating… / stale paints. */
  static String preservedLiveLabel(JSONObject cached) {
    if (cached == null) {
      return "";
    }
    String label = cached.optString("label", "");
    if (isWidgetLiveFaceLabel(label)) {
      String normalized = normalizeWidgetLiveFaceLabel(label);
      // Legacy snapshots stored preferred-target face as Pinned before widgetPinnedChrome existed.
      if (
        "Pinned train".equals(normalized) &&
        !cached.optBoolean("widgetPinnedChrome", false) &&
        !NearbyPinHelper.JOURNEY_ID.equals(cached.optString("journeyId", ""))
      ) {
        return "Target train";
      }
      return normalized;
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

  public static boolean needsLocalRepaint(JSONObject snapshot) {
    return CommuteScheduleSnapshot.needsLocalRepaint(snapshot);
  }

  public static boolean isLiveCommuteSnapshot(JSONObject snapshot) {
    return CommuteScheduleSnapshot.isLiveCommuteSnapshot(snapshot);
  }

  public static boolean shouldOpportunisticRefresh(JSONObject snapshot) {
    return CommuteScheduleSnapshot.shouldOpportunisticRefresh(snapshot);
  }

  public static boolean needsPreDeparturePrefetch(JSONObject snapshot) {
    return CommuteScheduleSnapshot.needsPreDeparturePrefetch(snapshot);
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

  public static boolean needsNetworkRefresh(JSONObject snapshot) {
    return CommuteScheduleSnapshot.needsNetworkRefresh(snapshot);
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

  static String degradedPrimary(JSONObject cached) {
    return CommuteSchedulePreview.degradedPrimary(cached);
  }
}
