package com.tdrevans.nexttrain;

import org.json.JSONArray;
import org.json.JSONObject;

/** FB-26 pin / display contract — clock-injectable resolution for web parity tests. */
public final class PinResolutionHelper {

  private static final long DEFAULT_NEARBY_PIN_HOLD_MS = 30L * 60_000L;

  private PinResolutionHelper() {}

  public static final class Clock {
    public final long nowMs;
    public final String perthDateKey;

    public Clock(long nowMs, String perthDateKey) {
      this.nowMs = nowMs;
      this.perthDateKey = perthDateKey;
    }
  }

  public static final class Result {
    public String trueNextDeparture;
    public String pinDeparture;
    public String heroDeparture;
    public String leaveDeparture;
    public String secondaryNextDeparture;
    public String widgetFaceDeparture;
    public boolean isPinnedToday;
    public boolean heroShowsPin;
    public boolean isOverrideActiveToday;
    public boolean isPinDismissedToday;
    public boolean isSkipPreview;
    public boolean isHeroPinLockingSwipe;
    public boolean showSecondaryNext;
    public boolean leaveCardArmed;
    public String heroLabel;
  }

  public static Result resolvePinState(
    String mode,
    Clock clock,
    JSONObject payload,
    JSONObject journey,
    JSONObject nearbyPin,
    int skipTrains
  ) throws Exception {
    return resolvePinState(mode, clock, payload, journey, nearbyPin, skipTrains, false);
  }

  public static Result resolvePinState(
    String mode,
    Clock clock,
    JSONObject payload,
    JSONObject journey,
    JSONObject nearbyPin,
    int skipTrains,
    boolean browseLiveBoard
  ) throws Exception {
    Result result = new Result();
    boolean isSkipPreview = skipTrains > 0 || browseLiveBoard;

    result.trueNextDeparture = resolveTrueNextDeparture(payload, clock);

    if ("journey".equals(mode)) {
      result.pinDeparture = resolveJourneyPinDeparture(payload, journey, clock);
    } else if ("nearby".equals(mode)) {
      result.pinDeparture = resolveNearbyPinDeparture(payload, nearbyPin, clock);
    } else {
      result.pinDeparture = null;
    }

    String departedTargetDeparture =
      "journey".equals(mode)
        ? resolveDepartedJourneyTargetDeparture(payload, journey, clock)
        : null;
    JSONObject journeyClean =
      "journey".equals(mode) ? sanitizeJourneyPinFields(journey, clock) : null;
    int nowMinutes = PerthTime.minutesSinceMidnight(clock.nowMs);
    boolean insideActiveWindow =
      "journey".equals(mode)
        && journeyClean != null
        && matchesHoursWindow(journeyClean, nowMinutes);
    boolean outsideActiveWindow = "journey".equals(mode) && journeyClean != null && !insideActiveWindow;
    boolean outsideActiveDay =
      "journey".equals(mode) && journeyClean != null && !journeyMatchesActiveDay(journeyClean, clock);
    boolean retainDepartedOutsideWindow =
      outsideActiveWindow
        && journeyClean != null
        && isOvernightActiveWindow(journeyClean)
        && departedTargetDeparture != null;
    String activeTargetDeparture = result.pinDeparture;
    if (activeTargetDeparture == null && "journey".equals(mode)) {
      if (insideActiveWindow) {
        activeTargetDeparture = departedTargetDeparture;
      } else if (retainDepartedOutsideWindow) {
        activeTargetDeparture = departedTargetDeparture;
      }
    }

    result.isOverrideActiveToday =
      "journey".equals(mode) && isJourneyOverrideActiveToday(journeyClean, clock);
    result.isPinDismissedToday =
      "journey".equals(mode) && isJourneyPinDismissedToday(journeyClean, clock);

    String preferredTargetDeparture = null;
    if ("journey".equals(mode) && journeyClean != null && !JourneySelector.isRouteJourney(journeyClean)) {
      if (outsideActiveDay) {
        preferredTargetDeparture =
          resolveJourneyPreferredTargetDepartureOnRemindDays(payload, journeyClean, clock);
      } else if (insideActiveWindow) {
        preferredTargetDeparture =
          resolveJourneyPreferredTargetDeparture(payload, journeyClean, clock);
      } else if (!journeyMatchesActiveDay(journeyClean, clock)) {
        preferredTargetDeparture =
          resolveJourneyPreferredTargetDepartureOnRemindDays(payload, journeyClean, clock);
      }
    }

    int targetSkipIndex = indexOfDeparture(payload, preferredTargetDeparture);
    boolean isBrowsingLiveBoard =
      outsideActiveDay && !result.isOverrideActiveToday && browseLiveBoard;
    boolean isStaleBrowseSkip =
      outsideActiveDay
        && !result.isOverrideActiveToday
        && skipTrains > 0
        && !browseLiveBoard
        && skipTrains != targetSkipIndex;

    String skippedHeroDeparture =
      isBrowsingLiveBoard || (isSkipPreview && !isStaleBrowseSkip)
        ? resolveBoardHeroDeparture(payload, skipTrains, clock)
        : null;

    if (outsideActiveDay && !result.isOverrideActiveToday) {
      if (result.isPinDismissedToday) {
        result.heroDeparture =
          isBrowsingLiveBoard
            ? firstNonNull(skippedHeroDeparture, result.trueNextDeparture)
            : result.trueNextDeparture;
      } else if (isBrowsingLiveBoard) {
        result.heroDeparture = firstNonNull(skippedHeroDeparture, result.trueNextDeparture);
      } else if (isStaleBrowseSkip) {
        result.heroDeparture = preferredTargetDeparture;
      } else if (isSkipPreview && skippedHeroDeparture != null) {
        result.heroDeparture = skippedHeroDeparture;
      } else if (preferredTargetDeparture != null) {
        result.heroDeparture = preferredTargetDeparture;
      } else if (shouldShowPreviewHero(journeyClean, clock)) {
        result.heroDeparture = null;
      } else {
        result.heroDeparture = result.trueNextDeparture;
      }
    } else if (isSkipPreview) {
      result.heroDeparture = skippedHeroDeparture;
    } else {
      result.heroDeparture =
        activeTargetDeparture != null ? activeTargetDeparture : result.trueNextDeparture;
    }

    result.leaveDeparture =
      result.pinDeparture != null ? result.pinDeparture : result.trueNextDeparture;
    result.widgetFaceDeparture =
      "journey".equals(mode)
        ? resolveJourneyWidgetFaceDeparture(payload, journey, clock)
        : "nearby".equals(mode)
          ? result.pinDeparture
          : null;

    result.isPinnedToday =
      "journey".equals(mode)
        ? isJourneyPinnedToday(journey, clock)
        : result.pinDeparture != null;

    result.heroShowsPin =
      activeTargetDeparture != null
        && activeTargetDeparture.equals(result.heroDeparture)
        && ("nearby".equals(mode)
          || insideActiveWindow
          || result.isOverrideActiveToday
          || retainDepartedOutsideWindow);
    result.isSkipPreview = isSkipPreview;
    result.showSecondaryNext =
      !isSkipPreview
        && !isBrowsingLiveBoard
        && !isStaleBrowseSkip
        && result.trueNextDeparture != null
        && result.pinDeparture != null
        && !result.trueNextDeparture.equals(result.pinDeparture);
    result.secondaryNextDeparture = result.showSecondaryNext ? result.trueNextDeparture : null;

    boolean nearbyHolding = "nearby".equals(mode) && isNearbyPinHolding(nearbyPin, clock);
    boolean showsTargetTrain =
      !result.isOverrideActiveToday
        && !isBrowsingLiveBoard
        && ((preferredTargetDeparture != null && preferredTargetDeparture.equals(result.heroDeparture))
          || (outsideActiveDay && result.heroDeparture == null && shouldShowPreviewHero(journeyClean, clock)));
    boolean pinnedChrome =
      !isSkipPreview
        && result.heroShowsPin
        && ("nearby".equals(mode) || ("journey".equals(mode) && result.isOverrideActiveToday));
    result.isHeroPinLockingSwipe = "nearby".equals(mode) ? nearbyHolding : pinnedChrome;
    result.leaveCardArmed =
      ("nearby".equals(mode)
          || insideActiveWindow
          || (outsideActiveDay && result.isOverrideActiveToday))
        && resolveLeaveCardArmed(mode, journey, result.pinDeparture, result.isPinDismissedToday, clock);
    result.heroLabel =
      getHeroLabel(
        result.heroShowsPin && !isSkipPreview,
        (isSkipPreview || isBrowsingLiveBoard) && !showsTargetTrain,
        skipTrains,
        "nearby".equals(mode) && result.heroShowsPin,
        result.isOverrideActiveToday,
        showsTargetTrain
      );

    return result;
  }

  /** Widget face: override or preferred target in Active window; no true-next fallback. */
  static String resolveJourneyWidgetFaceDeparture(
    JSONObject payload,
    JSONObject journey,
    Clock clock
  ) throws Exception {
    if (payload == null || journey == null) {
      return null;
    }

    JSONObject journeyClean = sanitizeJourneyPinFields(journey, clock);
    if (journeyClean == null) {
      return null;
    }

    if (isJourneyOverrideActiveToday(journeyClean, clock)) {
      String overrideIso = journeyClean.optString("journeyPinOverrideIso", "");
      JSONObject overrideTrip =
        JourneyPinHelper.findTripByDeparture(
          CommuteSchedule.collectUpcomingTrips(payload),
          overrideIso
        );
      if (overrideTrip != null && !tripHasDeparted(overrideTrip, clock)) {
        return CommuteSchedule.tripDepartureIso(overrideTrip);
      }
      return null;
    }

    if (JourneySelector.isRouteJourney(journeyClean)) {
      return null;
    }

    int nowMinutes = PerthTime.minutesSinceMidnight(clock.nowMs);
    if (!matchesHoursWindow(journeyClean, nowMinutes)) {
      if (isOvernightActiveWindow(journeyClean)) {
        return resolveDepartedJourneyTargetDepartureIgnoringDismiss(payload, journeyClean, clock);
      }
      if (!journeyMatchesActiveDay(journeyClean, clock)) {
        return resolveJourneyPreferredTargetDepartureOnRemindDays(payload, journeyClean, clock);
      }
      return null;
    }

    String preferredDeparture = resolveJourneyPreferredTargetDeparture(payload, journeyClean, clock);
    if (preferredDeparture != null && !preferredDeparture.isEmpty()) {
      return preferredDeparture;
    }

    return resolveDepartedJourneyTargetDepartureIgnoringDismiss(payload, journeyClean, clock);
  }

  private static String resolveDepartedJourneyTargetDepartureIgnoringDismiss(
    JSONObject payload,
    JSONObject journey,
    Clock clock
  ) throws Exception {
    int preferredMinutes = CommuteSchedule.preferredMinutesForLiveGlance(journey);
    if (preferredMinutes < 0) {
      return null;
    }

    int horizon = targetTripHorizonMinutes(journey, clock);
    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);
    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip == null || !tripMatchesPreferredOrLater(trip, preferredMinutes, horizon, clock)) {
        continue;
      }
      if (tripHasDeparted(trip, clock)) {
        return CommuteSchedule.tripDepartureIso(trip);
      }
      return null;
    }

    return null;
  }

  static String resolveTrueNextDeparture(JSONObject payload, Clock clock) throws Exception {
    if (payload == null) {
      return null;
    }

    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);
    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip != null && !tripHasDeparted(trip, clock)) {
        return CommuteSchedule.tripDepartureIso(trip);
      }
    }

    JSONObject next = payload.optJSONObject("next");
    if (next != null && !tripHasDeparted(next, clock)) {
      return CommuteSchedule.tripDepartureIso(next);
    }

    return null;
  }

  static String resolveJourneyPinDeparture(
    JSONObject payload,
    JSONObject journey,
    Clock clock
  ) throws Exception {
    if (payload == null || journey == null) {
      return null;
    }

    JSONObject journeyClean = sanitizeJourneyPinFields(journey, clock);
    if (isJourneyOverrideActiveToday(journeyClean, clock)) {
      String overrideIso = journeyClean.optString("journeyPinOverrideIso", "");
      JSONObject overrideTrip = JourneyPinHelper.findTripByDeparture(
        CommuteSchedule.collectUpcomingTrips(payload),
        overrideIso
      );
      if (overrideTrip != null && !tripHasDeparted(overrideTrip, clock)) {
        return CommuteSchedule.tripDepartureIso(overrideTrip);
      }
    }

    if (JourneySelector.isRouteJourney(journeyClean)) {
      return null;
    }

    if (isJourneyPinDismissedToday(journeyClean, clock)) {
      return null;
    }

    if (!matchesHoursWindow(journeyClean, PerthTime.minutesSinceMidnight(clock.nowMs))) {
      if (!journeyMatchesActiveDay(journeyClean, clock)) {
        return resolveJourneyPreferredTargetDepartureOnRemindDays(payload, journeyClean, clock);
      }
      return null;
    }

    return resolveJourneyPreferredTargetDeparture(payload, journeyClean, clock);
  }

  static String resolveDepartedJourneyTargetDeparture(
    JSONObject payload,
    JSONObject journey,
    Clock clock
  ) throws Exception {
    if (payload == null || journey == null || JourneySelector.isRouteJourney(journey)) {
      return null;
    }

    JSONObject journeyClean = sanitizeJourneyPinFields(journey, clock);
    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);

    if (isJourneyOverrideActiveToday(journeyClean, clock)) {
      String overrideIso = journeyClean.optString("journeyPinOverrideIso", "");
      JSONObject overrideTrip = JourneyPinHelper.findTripByDeparture(upcoming, overrideIso);
      if (overrideTrip != null && tripHasDeparted(overrideTrip, clock)) {
        return CommuteSchedule.tripDepartureIso(overrideTrip);
      }
      return null;
    }

    if (isJourneyPinDismissedToday(journeyClean, clock)) {
      return null;
    }

    int preferredMinutes = CommuteSchedule.preferredMinutesForLiveGlance(journeyClean);
    if (preferredMinutes < 0) {
      return null;
    }

    int horizon = targetTripHorizonMinutes(journeyClean, clock);
    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip == null || !tripMatchesPreferredOrLater(trip, preferredMinutes, horizon, clock)) {
        continue;
      }
      if (tripHasDeparted(trip, clock)) {
        return CommuteSchedule.tripDepartureIso(trip);
      }
      return null;
    }

    return null;
  }

  static String resolveNearbyPinDeparture(
    JSONObject payload,
    JSONObject nearbyPin,
    Clock clock
  ) throws Exception {
    if (nearbyPin == null || !isNearbyPinHolding(nearbyPin, clock)) {
      return null;
    }

    String departureIso = nearbyPin.optString("departureIso", "");
    if (departureIso.isEmpty()) {
      return null;
    }

    if (payload != null) {
      JSONObject trip = NearbyPinHelper.findTripByDeparture(payload, departureIso);
      if (trip != null && tripHasDeparted(trip, clock)) {
        return null;
      }
    }

    return departureIso;
  }

  static boolean isJourneyOverrideActiveToday(JSONObject journey, Clock clock) {
    if (journey == null) {
      return false;
    }
    String overrideDate = journey.optString("journeyPinOverrideDate", "");
    String overrideIso = journey.optString("journeyPinOverrideIso", "");
    return !overrideDate.isEmpty()
      && !overrideIso.isEmpty()
      && overrideDate.equals(clock.perthDateKey);
  }

  static boolean isJourneyPinDismissedToday(JSONObject journey, Clock clock) {
    if (journey == null) {
      return false;
    }
    String dismissedDate = journey.optString("journeyPinDismissedDate", "");
    return !dismissedDate.isEmpty() && dismissedDate.equals(clock.perthDateKey);
  }

  static JSONObject sanitizeJourneyPinFields(JSONObject journey, Clock clock) throws Exception {
    if (journey == null) {
      return null;
    }
    JSONObject copy = new JSONObject(journey.toString());
    if (!copy.optString("journeyPinOverrideDate", "").isEmpty()
      && !copy.optString("journeyPinOverrideDate", "").equals(clock.perthDateKey)) {
      copy.put("journeyPinOverrideIso", "");
      copy.put("journeyPinOverrideDate", "");
    }
    if (!copy.optString("journeyPinDismissedDate", "").isEmpty()
      && !copy.optString("journeyPinDismissedDate", "").equals(clock.perthDateKey)) {
      copy.put("journeyPinDismissedDate", "");
    }
    return copy;
  }

  static boolean isJourneyPinnedToday(JSONObject journey, Clock clock) throws Exception {
    JSONObject journeyClean = sanitizeJourneyPinFields(journey, clock);
    if (journeyClean == null) {
      return false;
    }
    if (JourneySelector.isRouteJourney(journeyClean)) {
      return isJourneyOverrideActiveToday(journeyClean, clock);
    }
    if (isJourneyOverrideActiveToday(journeyClean, clock)) {
      return true;
    }
    if (CommuteSchedule.preferredMinutesForLiveGlance(journeyClean) < 0) {
      return false;
    }
    return !isJourneyPinDismissedToday(journeyClean, clock);
  }

  static boolean isNearbyPinHolding(JSONObject pin, Clock clock) {
    if (pin == null) {
      return false;
    }
    String departureIso = pin.optString("departureIso", "");
    if (departureIso.isEmpty()) {
      return false;
    }
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0) {
      return false;
    }
    long holdUntilMs =
      pin.has("holdingUntilMs")
        ? pin.optLong("holdingUntilMs", departureMs + DEFAULT_NEARBY_PIN_HOLD_MS)
        : departureMs + DEFAULT_NEARBY_PIN_HOLD_MS;
    return clock.nowMs < holdUntilMs;
  }

  private static String resolveJourneyPreferredTargetDeparture(
    JSONObject payload,
    JSONObject journey,
    Clock clock
  ) throws Exception {
    int preferredMinutes = CommuteSchedule.preferredMinutesForLiveGlance(journey);
    if (preferredMinutes < 0) {
      return null;
    }

    int horizon = targetTripHorizonMinutes(journey, clock);
    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);
    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip == null || tripHasDeparted(trip, clock)) {
        continue;
      }
      if (tripMatchesPreferredOrLater(trip, preferredMinutes, horizon, clock)) {
        return CommuteSchedule.tripDepartureIso(trip);
      }
    }

    return null;
  }

  /**
   * Outside active days: pick the next preferred (or later) train that lands on a remind day.
   * Do not clip to today's Active-until horizon — the target may be days away.
   */
  private static String resolveJourneyPreferredTargetDepartureOnRemindDays(
    JSONObject payload,
    JSONObject journey,
    Clock clock
  ) throws Exception {
    int preferredMinutes = CommuteSchedule.preferredMinutesForLiveGlance(journey);
    if (preferredMinutes < 0) {
      return null;
    }

    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);
    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip == null) {
        continue;
      }
      String departureIso = CommuteSchedule.tripDepartureIso(trip);
      if (departureIso.isEmpty()) {
        continue;
      }
      long departureMs = PerthTime.epochMillisFromIso(departureIso);
      if (departureMs <= 0 || departureMs <= clock.nowMs) {
        continue;
      }
      if (!tripMatchesJourneyRemindDay(trip, journey)) {
        continue;
      }
      int tripMinutes = PerthTime.minutesFromIso(departureIso);
      if (tripMinutes < preferredMinutes) {
        continue;
      }
      return departureIso;
    }

    return null;
  }

  private static boolean shouldShowPreviewHero(JSONObject journey, Clock clock) {
    if (journey == null || JourneySelector.isRouteJourney(journey)) {
      return false;
    }
    if (journeyMatchesActiveDay(journey, clock)) {
      return false;
    }
    return CommuteSchedule.preferredMinutesForLiveGlance(journey) >= 0;
  }

  private static String firstNonNull(String left, String right) {
    return left != null ? left : right;
  }

  private static int indexOfDeparture(JSONObject payload, String departureIso) throws Exception {
    if (payload == null || departureIso == null || departureIso.isEmpty()) {
      return -1;
    }
    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);
    for (int index = 0; index < upcoming.length(); index += 1) {
      JSONObject trip = upcoming.optJSONObject(index);
      if (trip != null && departureIso.equals(CommuteSchedule.tripDepartureIso(trip))) {
        return index;
      }
    }
    return -1;
  }

  private static String resolveBoardHeroDeparture(JSONObject payload, int skipTrains, Clock clock)
    throws Exception {
    if (payload == null) {
      return null;
    }
    JSONArray upcoming = CommuteSchedule.collectUpcomingTrips(payload);
    if (upcoming.length() == 0) {
      return null;
    }
    int skip = Math.max(0, Math.min(skipTrains, upcoming.length() - 1));
    JSONObject trip = upcoming.optJSONObject(skip);
    if (trip == null || tripHasDeparted(trip, clock)) {
      return null;
    }
    return CommuteSchedule.tripDepartureIso(trip);
  }

  /** Hours-only Active window — remind days checked separately (web journeyMatchesSchedule). */
  private static boolean matchesHoursWindow(JSONObject journey, int minutes) {
    if (!JourneySelector.hasWindow(journey)) {
      return false;
    }
    int from = PerthTime.parseClockMinutes(journey.optString("defaultFrom", "00:00"));
    int until = PerthTime.parseClockMinutes(journey.optString("defaultUntil", "23:59"));
    if (from < 0) {
      from = 0;
    }
    if (until < 0) {
      until = 24 * 60 - 1;
    }
    if (from == until) {
      return true;
    }
    if (from < until) {
      return minutes >= from && minutes < until;
    }
    return minutes >= from || minutes < until;
  }

  /** Web pin-state default: Mon–Fri when remindDays is empty. */
  private static boolean journeyMatchesActiveDay(JSONObject journey, Clock clock) {
    return isPinRemindDay(journey, PerthTime.dayOfWeekIso(clock.nowMs));
  }

  private static boolean tripMatchesJourneyRemindDay(JSONObject trip, JSONObject journey) {
    String departureIso = CommuteSchedule.tripDepartureIso(trip);
    if (departureIso.isEmpty()) {
      return false;
    }
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0) {
      return false;
    }
    return isPinRemindDay(journey, PerthTime.dayOfWeekIso(departureMs));
  }

  private static boolean isPinRemindDay(JSONObject journey, int dayOfWeekIso) {
    JSONArray days = journey != null ? journey.optJSONArray("remindDays") : null;
    if (days == null || days.length() == 0) {
      return dayOfWeekIso >= 1 && dayOfWeekIso <= 5;
    }
    for (int index = 0; index < days.length(); index += 1) {
      if (days.optInt(index, -1) == dayOfWeekIso) {
        return true;
      }
    }
    return false;
  }

  private static int targetTripHorizonMinutes(JSONObject journey, Clock clock) throws Exception {
    return CommuteSchedule.liveHorizonMinutes(journey);
  }

  private static boolean isOvernightActiveWindow(JSONObject journey) throws Exception {
    int from = PerthTime.parseClockMinutes(journey.optString("defaultFrom", "00:00"));
    int until = PerthTime.parseClockMinutes(journey.optString("defaultUntil", "23:59"));
    return from > until;
  }

  private static boolean tripMatchesPreferredOrLater(
    JSONObject trip,
    int preferredMinutes,
    int horizonMinutes,
    Clock clock
  ) {
    String departureIso = CommuteSchedule.tripDepartureIso(trip);
    int minutesUntilDeparture = PerthTime.minutesUntilWallClock(departureIso, clock.nowMs);
    int minutesUntilPreferred = minutesUntilPerthClockMinutes(preferredMinutes, clock);
    if (minutesUntilDeparture < minutesUntilPreferred) {
      return false;
    }
    if (horizonMinutes < 24 * 60) {
      int minutesUntilHorizon = minutesUntilPerthClockMinutes(horizonMinutes, clock);
      if (minutesUntilPreferred <= minutesUntilHorizon && minutesUntilDeparture > minutesUntilHorizon) {
        return false;
      }
    }
    return true;
  }

  private static int minutesUntilPerthClockMinutes(int targetMinutes, Clock clock) {
    int now = PerthTime.minutesSinceMidnight(clock.nowMs);
    int diff = targetMinutes - now;
    if (diff < -12 * 60) {
      diff += 24 * 60;
    } else if (diff > 12 * 60) {
      diff -= 24 * 60;
    }
    return diff;
  }

  private static boolean tripHasDeparted(JSONObject trip, Clock clock) {
    if (trip == null) {
      return true;
    }
    String departureIso = CommuteSchedule.tripDepartureIso(trip);
    if (departureIso.isEmpty()) {
      return true;
    }
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    if (departureMs <= 0) {
      return true;
    }
    return departureMs <= clock.nowMs;
  }

  private static boolean resolveLeaveCardArmed(
    String mode,
    JSONObject journey,
    String pinDeparture,
    boolean isPinDismissedToday,
    Clock clock
  ) throws Exception {
    if ("nearby".equals(mode)) {
      return pinDeparture != null;
    }
    if (journey == null) {
      return false;
    }
    if (JourneySelector.isRouteJourney(journey)) {
      return pinDeparture != null && !isPinDismissedToday;
    }
    if (!journey.optBoolean("useLeaveBefore", true) || isPinDismissedToday || pinDeparture == null) {
      return false;
    }
    return isJourneyPinnedToday(journey, clock);
  }

  private static String getHeroLabel(
    boolean heroShowsPin,
    boolean isSkipPreview,
    int browseSkipCount,
    boolean pinnedChrome,
    boolean isDayOverridePin,
    boolean showsTargetTrain
  ) {
    if (pinnedChrome || (heroShowsPin && isDayOverridePin)) {
      return "Pinned Train";
    }
    if (heroShowsPin || showsTargetTrain) {
      return "Target train";
    }
    if (isSkipPreview) {
      return browseSkipCount > 0 ? "Later train" : "Next Train";
    }
    return "Next Train";
  }
}
