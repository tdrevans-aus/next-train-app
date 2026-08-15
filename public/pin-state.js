/**
 * FB-26 pin / display contract — pure resolution module.
 * See docs/fb-26-pin-state-design.md and qa/fixtures/pin-resolution/.
 */
(function pinState(global) {
  const DEFAULT_NEARBY_PIN_HOLD_MS = 30 * 60 * 1000;

  let deps = {};

  function init(injected = {}) {
    deps = { ...deps, ...injected };
  }

  function resolveClock(clock) {
    if (clock && typeof clock.nowMs === "number" && clock.perthDateKey) {
      return clock;
    }
    const nowMs = Date.now();
    return {
      nowMs,
      perthDateKey: getPerthLocalDateKey({ nowMs }),
    };
  }

  function parseTimeToMinutes(time) {
    if (deps.parseTimeToMinutes) {
      return deps.parseTimeToMinutes(time);
    }
    const [hour, minute] = String(time || "00:00").split(":").map(Number);
    return hour * 60 + (minute || 0);
  }

  function getPerthMinutesSinceMidnightFromDate(date) {
    if (deps.getPerthMinutesSinceMidnight) {
      return deps.getPerthMinutesSinceMidnight(date);
    }
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Perth",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  }

  function getPerthMinutesSinceMidnightFromIso(isoString) {
    return getPerthMinutesSinceMidnightFromDate(new Date(isoString));
  }

  function getPerthMinutesSinceMidnight(clock) {
    return getPerthMinutesSinceMidnightFromDate(new Date(clock.nowMs));
  }

  function getPerthLocalDateKey(clock) {
    if (clock?.perthDateKey) {
      return clock.perthDateKey;
    }
    if (deps.getPerthLocalDateKey) {
      return deps.getPerthLocalDateKey(new Date(clock.nowMs));
    }
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Perth",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(clock.nowMs));
    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  }

  function minutesUntilPerthClockMinutes(targetMinutes, clock) {
    if (deps.minutesUntilPerthClockMinutes && !clock) {
      return deps.minutesUntilPerthClockMinutes(targetMinutes);
    }
    const now = getPerthMinutesSinceMidnight(clock);
    let diff = targetMinutes - now;
    if (diff < -12 * 60) {
      diff += 24 * 60;
    } else if (diff > 12 * 60) {
      diff -= 24 * 60;
    }
    return diff;
  }

  function minutesUntilPerthWallClock(isoString, clock) {
    if (deps.minutesUntilPerthWallClock && !clock) {
      return deps.minutesUntilPerthWallClock(isoString);
    }
    return minutesUntilPerthClockMinutes(
      getPerthMinutesSinceMidnightFromIso(isoString),
      clock
    );
  }

  function tripHasDeparted(trip, clock) {
    if (!trip) {
      return true;
    }
    const iso = trip.departure ?? trip.arrival;
    if (!iso) {
      return true;
    }
    return minutesUntilPerthWallClock(iso, clock) <= 0;
  }

  function resolveTripDeparture(trip) {
    if (deps.resolveTripDeparture) {
      return deps.resolveTripDeparture(trip);
    }
    return trip?.departure ?? trip?.arrival ?? null;
  }

  function normalizeApiTrainData(data) {
    if (deps.normalizeApiTrainData) {
      return deps.normalizeApiTrainData(data);
    }
    if (!data?.next) {
      return data;
    }
    const upcoming =
      data.upcoming?.length > 0 ? data.upcoming : data.following ? [data.next, data.following] : [data.next];
    return {
      ...data,
      next: data.next,
      following: data.following ?? null,
      upcoming,
    };
  }

  function getUpcomingTrips(data) {
    if (!data?.next) {
      return [];
    }
    return normalizeApiTrainData(data).upcoming ?? [];
  }

  function findTripByDepartureIso(data, departureIso) {
    if (!data || !departureIso) {
      return null;
    }
    return (
      getUpcomingTrips(data).find((trip) => resolveTripDeparture(trip) === departureIso) ?? null
    );
  }

  function preferredMinutesForLiveGlance(journey) {
    if (deps.preferredMinutesForLiveGlance) {
      return deps.preferredMinutesForLiveGlance(journey);
    }
    const raw = journey?.preferredTrainTime || "";
    if (!raw) {
      return -1;
    }
    const minutes = parseTimeToMinutes(raw);
    return Number.isNaN(minutes) ? -1 : minutes;
  }

  function liveHorizonMinutes(journey) {
    if (deps.liveHorizonMinutes) {
      return deps.liveHorizonMinutes(journey);
    }
    const untilRaw = journey?.defaultUntil || "";
    if (!untilRaw) {
      return 24 * 60;
    }
    const minutes = parseTimeToMinutes(untilRaw);
    return Number.isNaN(minutes) ? 24 * 60 : minutes;
  }

  function journeyUsesLeaveBefore(journey) {
    return journey?.useLeaveBefore !== false;
  }

  function journeyMatchesSchedule(journey, clock) {
    if (deps.journeyMatchesSchedule) {
      return deps.journeyMatchesSchedule(journey, getPerthMinutesSinceMidnight(clock));
    }
    const minutes = getPerthMinutesSinceMidnight(clock);
    const from = parseTimeToMinutes(journey?.defaultFrom || "00:00");
    const until = parseTimeToMinutes(journey?.defaultUntil || "23:59");
    if (from === until) {
      return true;
    }
    if (from < until) {
      return minutes >= from && minutes < until;
    }
    return minutes >= from || minutes < until;
  }

  function tripMatchesPreferredOrLater(trip, preferredMinutes, horizonMinutes, clock) {
    const iso = trip?.departure ?? trip?.arrival;
    if (!iso) {
      return false;
    }

    const minutesUntilDeparture = minutesUntilPerthWallClock(iso, clock);
    const minutesUntilPreferred = minutesUntilPerthClockMinutes(preferredMinutes, clock);

    if (minutesUntilDeparture < minutesUntilPreferred) {
      return false;
    }

    if (horizonMinutes < 24 * 60) {
      const minutesUntilHorizon = minutesUntilPerthClockMinutes(horizonMinutes, clock);
      if (
        minutesUntilPreferred <= minutesUntilHorizon &&
        minutesUntilDeparture > minutesUntilHorizon
      ) {
        return false;
      }
    }

    return true;
  }

  function isJourneyOverrideActiveToday(journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    return Boolean(
      journey?.journeyPinOverrideIso &&
        journey?.journeyPinOverrideDate === getPerthLocalDateKey(resolvedClock)
    );
  }

  function isJourneyPinDismissedToday(journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    return journey?.journeyPinDismissedDate === getPerthLocalDateKey(resolvedClock);
  }

  function sanitizeJourneyPinOverride(journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!journey?.journeyPinOverrideDate) {
      return journey;
    }
    if (journey.journeyPinOverrideDate !== getPerthLocalDateKey(resolvedClock)) {
      return {
        ...journey,
        journeyPinOverrideIso: "",
        journeyPinOverrideDate: "",
      };
    }
    return journey;
  }

  function sanitizeJourneyPinDismissed(journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!journey?.journeyPinDismissedDate) {
      return journey;
    }
    if (journey.journeyPinDismissedDate !== getPerthLocalDateKey(resolvedClock)) {
      return {
        ...journey,
        journeyPinDismissedDate: "",
      };
    }
    return journey;
  }

  function sanitizeJourneyPinFields(journey, clock = resolveClock()) {
    return sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey, clock), clock);
  }

  function isJourneyPinnedToday(journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);
    if (isJourneyOverrideActiveToday(journeyClean, resolvedClock)) {
      return true;
    }
    if (preferredMinutesForLiveGlance(journeyClean) < 0) {
      return false;
    }
    return !isJourneyPinDismissedToday(journeyClean, resolvedClock);
  }

  function resolveTrueNextDeparture(payload, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!payload) {
      return null;
    }
    const normalized = normalizeApiTrainData(payload);
    for (const trip of getUpcomingTrips(normalized)) {
      if (!tripHasDeparted(trip, resolvedClock)) {
        return resolveTripDeparture(trip);
      }
    }
    const next = normalized.next;
    if (next && !tripHasDeparted(next, resolvedClock)) {
      return resolveTripDeparture(next);
    }
    return null;
  }

  function resolveJourneyPreferredTargetDeparture(payload, journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!payload || !journey) {
      return null;
    }

    const normalized = normalizeApiTrainData(payload);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);
    if (!journeyMatchesSchedule(journeyClean, resolvedClock)) {
      return null;
    }

    const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
    if (preferredMinutes < 0) {
      return null;
    }

    const horizon = liveHorizonMinutes(journeyClean);
    for (const trip of getUpcomingTrips(normalized)) {
      if (tripHasDeparted(trip, resolvedClock)) {
        continue;
      }
      if (tripMatchesPreferredOrLater(trip, preferredMinutes, horizon, resolvedClock)) {
        return resolveTripDeparture(trip);
      }
    }

    return null;
  }

  function resolveJourneyPinDeparture(payload, journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!payload || !journey) {
      return null;
    }

    const normalized = normalizeApiTrainData(payload);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);

    if (isJourneyOverrideActiveToday(journeyClean, resolvedClock)) {
      const overrideTrip = findTripByDepartureIso(normalized, journeyClean.journeyPinOverrideIso);
      if (overrideTrip && !tripHasDeparted(overrideTrip, resolvedClock)) {
        return resolveTripDeparture(overrideTrip);
      }
    }

    if (!journeyMatchesSchedule(journeyClean, resolvedClock)) {
      return null;
    }

    if (isJourneyPinDismissedToday(journeyClean, resolvedClock)) {
      return null;
    }

    return resolveJourneyPreferredTargetDeparture(normalized, journeyClean, resolvedClock);
  }

  function nearbyPinExpiryMs(pin) {
    if (!pin?.departureIso) {
      return 0;
    }
    const departureMs = Date.parse(pin.departureIso);
    if (!Number.isFinite(departureMs)) {
      return 0;
    }
    if (typeof pin.holdingUntilMs === "number") {
      return pin.holdingUntilMs;
    }
    const holdMs = deps.NEARBY_PIN_HOLD_MS ?? DEFAULT_NEARBY_PIN_HOLD_MS;
    return departureMs + holdMs;
  }

  function isNearbyPinHolding(pin, clock = resolveClock()) {
    if (deps.isNearbyPinHolding && !clock) {
      return deps.isNearbyPinHolding(pin);
    }
    if (!pin?.departureIso) {
      return false;
    }
    const resolvedClock = resolveClock(clock);
    return resolvedClock.nowMs < nearbyPinExpiryMs(pin);
  }

  function resolveNearbyPinDeparture(payload, nearbyPin, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!nearbyPin || !isNearbyPinHolding(nearbyPin, resolvedClock)) {
      return null;
    }

    const departureIso = nearbyPin.departureIso;
    if (!departureIso) {
      return null;
    }

    const normalized = payload ? normalizeApiTrainData(payload) : null;
    const trip = normalized ? findTripByDepartureIso(normalized, departureIso) : { departure: departureIso };
    if (trip && tripHasDeparted(trip, resolvedClock)) {
      return null;
    }

    return departureIso;
  }

  function resolveSkippedHeroDeparture(payload, skipTrains, clock) {
    const resolvedClock = resolveClock(clock);
    if (!payload || skipTrains <= 0) {
      return null;
    }

    const upcoming = getUpcomingTrips(normalizeApiTrainData(payload));
    if (!upcoming.length) {
      return null;
    }

    const skip = Math.min(skipTrains, upcoming.length - 1);
    const trip = upcoming[skip];
    if (!trip || tripHasDeparted(trip, resolvedClock)) {
      return null;
    }
    return resolveTripDeparture(trip);
  }

  function resolveLeaveCardArmed(input, state) {
    const { pinDeparture, isPinDismissedToday } = state;

    if (input.mode === "nearby") {
      return Boolean(pinDeparture);
    }

    const journey = input.journey;
    if (!journeyUsesLeaveBefore(journey) || isPinDismissedToday) {
      return false;
    }

    if (pinDeparture) {
      return true;
    }

    return preferredMinutesForLiveGlance(journey) < 0;
  }

  function getHeroLabel({ heroShowsPin = false, isSkipPreview = false, pinnedChrome = false } = {}) {
    if (pinnedChrome) {
      return "Pinned Train";
    }
    if (heroShowsPin) {
      return "Target train";
    }
    if (isSkipPreview) {
      return "Later train";
    }
    return "Next Train";
  }

  function resolveHeroDeparture(input) {
    const clock = resolveClock(input.clock);
    const skipTrains = input.skipTrains ?? 0;
    const pinDeparture =
      input.mode === "journey"
        ? resolveJourneyPinDeparture(input.payload, input.journey, clock)
        : resolveNearbyPinDeparture(input.payload, input.nearbyPin, clock);
    const trueNextDeparture = resolveTrueNextDeparture(input.payload, clock);

    if (skipTrains > 0) {
      return resolveSkippedHeroDeparture(input.payload, skipTrains, clock);
    }
    return pinDeparture ?? trueNextDeparture;
  }

  function resolveLeaveDeparture(input) {
    const clock = resolveClock(input.clock);
    const pinDeparture =
      input.mode === "journey"
        ? resolveJourneyPinDeparture(input.payload, input.journey, clock)
        : resolveNearbyPinDeparture(input.payload, input.nearbyPin, clock);
    const trueNextDeparture = resolveTrueNextDeparture(input.payload, clock);
    return pinDeparture ?? trueNextDeparture;
  }

  function resolveSecondaryNextDeparture(input) {
    const state = resolvePinState(input);
    return state.secondaryNextDeparture;
  }

  function resolvePinState(input = {}) {
    const clock = resolveClock(input.clock);
    const skipTrains = input.skipTrains ?? 0;
    const mode = input.mode;
    const isSkipPreview = skipTrains > 0;

    const trueNextDeparture = resolveTrueNextDeparture(input.payload, clock);

    const pinDeparture =
      mode === "journey"
        ? resolveJourneyPinDeparture(input.payload, input.journey, clock)
        : mode === "nearby"
          ? resolveNearbyPinDeparture(input.payload, input.nearbyPin, clock)
          : null;

    const heroDeparture = isSkipPreview
      ? resolveSkippedHeroDeparture(input.payload, skipTrains, clock)
      : pinDeparture ?? trueNextDeparture;

    const leaveDeparture = pinDeparture ?? trueNextDeparture;
    const widgetFaceDeparture = pinDeparture ?? trueNextDeparture;

    const journeyClean =
      mode === "journey" ? sanitizeJourneyPinFields(input.journey, clock) : null;
    const isOverrideActiveToday =
      mode === "journey" && isJourneyOverrideActiveToday(journeyClean, clock);
    const isPinDismissedToday =
      mode === "journey" && isJourneyPinDismissedToday(journeyClean, clock);
    const isPinnedToday =
      mode === "journey"
        ? isJourneyPinnedToday(input.journey, clock)
        : Boolean(pinDeparture);

    const heroShowsPin = Boolean(pinDeparture && heroDeparture === pinDeparture);
    const showSecondaryNext = Boolean(
      !isSkipPreview &&
        trueNextDeparture &&
        pinDeparture &&
        trueNextDeparture !== pinDeparture
    );
    const secondaryNextDeparture = showSecondaryNext ? trueNextDeparture : null;

    const nearbyHolding = mode === "nearby" && isNearbyPinHolding(input.nearbyPin, clock);
    const isHeroPinLockingSwipe = isOverrideActiveToday || nearbyHolding;

    const leaveCardArmed = resolveLeaveCardArmed(input, {
      pinDeparture,
      isPinDismissedToday,
    });

    const heroLabel = getHeroLabel({
      heroShowsPin,
      isSkipPreview,
      pinnedChrome: mode === "nearby" && heroShowsPin,
    });

    return {
      trueNextDeparture,
      pinDeparture,
      heroDeparture,
      leaveDeparture,
      secondaryNextDeparture,
      widgetFaceDeparture,
      isPinnedToday,
      heroShowsPin,
      isOverrideActiveToday,
      isPinDismissedToday,
      isSkipPreview,
      isHeroPinLockingSwipe,
      showSecondaryNext,
      leaveCardArmed,
      heroLabel,
    };
  }

  const api = {
    init,
    resolvePinState,
    isJourneyOverrideActiveToday,
    isJourneyPinDismissedToday,
    isJourneyPinnedToday,
    sanitizeJourneyPinFields,
    resolveJourneyPinDeparture,
    resolveTrueNextDeparture,
    resolveNearbyPinDeparture,
    resolveHeroDeparture,
    resolveLeaveDeparture,
    resolveSecondaryNextDeparture,
    getHeroLabel,
    tripHasDeparted,
    isNearbyPinHolding,
  };

  global.nextTrainPinState = api;
})(window);
