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

  function getActiveTimeZone() {
    return (
      window.NextTrainCitySession?.readActiveTimeZone?.() || "Australia/Perth"
    );
  }

  function getPerthMinutesSinceMidnightFromDate(date) {
    if (deps.getPerthMinutesSinceMidnight) {
      return deps.getPerthMinutesSinceMidnight(date);
    }
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: getActiveTimeZone(),
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
      timeZone: getActiveTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(clock.nowMs));
    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";
    const day = parts.find((part) => part.type === "day")?.value ?? "01";
    return `${year}-${month}-${day}`;
  }

  function minutesUntilPerthClockMinutes(targetMinutes, clock, { strictNext = false } = {}) {
    if (deps.minutesUntilPerthClockMinutes && !clock) {
      return deps.minutesUntilPerthClockMinutes(targetMinutes);
    }
    const now = getPerthMinutesSinceMidnight(clock);
    let diff = targetMinutes - now;

    if (strictNext) {
      if (diff < 0) {
        diff += 24 * 60;
      }
      return diff;
    }

    if (diff < -12 * 60) {
      diff += 24 * 60;
    } else if (diff > 12 * 60) {
      diff -= 24 * 60;
    }
    return diff;
  }

  function minutesUntilPerthWallClock(isoString, clock, options = {}) {
    if (deps.minutesUntilPerthWallClock && !clock) {
      return deps.minutesUntilPerthWallClock(isoString);
    }
    return minutesUntilPerthClockMinutes(
      getPerthMinutesSinceMidnightFromIso(isoString),
      clock,
      options
    );
  }

  function tripHasDeparted(trip, clock, options = {}) {
    if (!trip) {
      return true;
    }
    const iso = trip.departure ?? trip.arrival;
    if (!iso) {
      return true;
    }
    return minutesUntilPerthWallClock(iso, clock, options) <= 0;
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

  function targetTripHorizonMinutes(journey, clock = resolveClock()) {
    const journeyClean = sanitizeJourneyPinFields(journey, clock);
    return liveHorizonMinutes(journeyClean);
  }

  function isOvernightActiveWindow(journey) {
    const from = parseTimeToMinutes(journey?.defaultFrom || "00:00");
    const until = parseTimeToMinutes(journey?.defaultUntil || "23:59");
    return from > until;
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

  function tripMatchesPreferredOrLater(trip, preferredMinutes, horizonMinutes, clock, options = {}) {
    const iso = trip?.departure ?? trip?.arrival;
    if (!iso) {
      return false;
    }

    const minutesUntilDeparture = minutesUntilPerthWallClock(iso, clock);
    const minutesUntilPreferred = minutesUntilPerthClockMinutes(preferredMinutes, clock, options);

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

  function isRouteJourney(journey) {
    return String(journey?.kind || "").toLowerCase() === "route";
  }

  function isJourneyPinnedToday(journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);
    if (isRouteJourney(journeyClean)) {
      return isJourneyOverrideActiveToday(journeyClean, resolvedClock);
    }
    if (isJourneyOverrideActiveToday(journeyClean, resolvedClock)) {
      return true;
    }
    if (preferredMinutesForLiveGlance(journeyClean) < 0) {
      return false;
    }
    return !isJourneyPinDismissedToday(journeyClean, resolvedClock);
  }

  function resolveTrueNextDeparture(payload, clock = resolveClock(), options = {}) {
    const resolvedClock = resolveClock(clock);
    if (!payload) {
      return null;
    }
    const normalized = normalizeApiTrainData(payload);
    for (const trip of getUpcomingTrips(normalized)) {
      if (!tripHasDeparted(trip, resolvedClock, options)) {
        return resolveTripDeparture(trip);
      }
    }
    const next = normalized.next;
    if (next && !tripHasDeparted(next, resolvedClock, options)) {
      return resolveTripDeparture(next);
    }
    return null;
  }

  function getPerthDayOfWeekIsoFromDate(date) {
    if (deps.getPerthDayOfWeekIso) {
      return deps.getPerthDayOfWeekIso(date);
    }
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: getActiveTimeZone(),
      weekday: "long",
    }).format(date);
    const map = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };
    return map[weekday] ?? 1;
  }

  function getJourneyRemindDays(journey) {
    const days = journey?.remindDays;
    if (Array.isArray(days) && days.length) {
      return [...new Set(days.map((value) => Number(value)).filter((value) => value >= 1 && value <= 7))];
    }
    return [1, 2, 3, 4, 5];
  }

  function journeyMatchesActiveDay(journey, clock) {
    const resolvedClock = resolveClock(clock);
    const day = getPerthDayOfWeekIsoFromDate(new Date(resolvedClock.nowMs));
    return getJourneyRemindDays(journey).includes(day);
  }

  function tripMatchesJourneyRemindDay(trip, journey, clock) {
    const iso = trip?.departure ?? trip?.arrival;
    if (!iso) {
      return false;
    }
    const tripDay = getPerthDayOfWeekIsoFromDate(new Date(iso));
    return getJourneyRemindDays(journey).includes(tripDay);
  }

  function resolveJourneyPreferredTargetDepartureOnRemindDays(
    payload,
    journey,
    clock = resolveClock()
  ) {
    const resolvedClock = resolveClock(clock);
    if (!payload || !journey) {
      return null;
    }

    const normalized = normalizeApiTrainData(payload);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);
    const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
    if (preferredMinutes < 0) {
      return null;
    }

    // Next remind-day target may be days away — do not clip to today's Active-until horizon.
    for (const trip of getUpcomingTrips(normalized)) {
      const departureIso = resolveTripDeparture(trip);
      if (!departureIso) {
        continue;
      }
      const departureMs = Date.parse(departureIso);
      if (!Number.isFinite(departureMs) || departureMs <= resolvedClock.nowMs) {
        continue;
      }
      if (!tripMatchesJourneyRemindDay(trip, journeyClean, resolvedClock)) {
        continue;
      }
      const tripMinutes = getPerthMinutesSinceMidnightFromIso(departureIso);
      if (tripMinutes < preferredMinutes) {
        continue;
      }
      return departureIso;
    }

    return null;
  }

  function resolveJourneyPreferredTargetDeparture(
    payload,
    journey,
    clock = resolveClock(),
    horizonOverride = null
  ) {
    const resolvedClock = resolveClock(clock);
    if (!payload || !journey) {
      return null;
    }

    const normalized = normalizeApiTrainData(payload);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);

    const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
    if (preferredMinutes < 0) {
      return null;
    }

    const insideActiveWindow = journeyMatchesSchedule(journeyClean, resolvedClock);
    const options = { strictNext: !insideActiveWindow };

    const horizon =
      horizonOverride != null
        ? horizonOverride
        : targetTripHorizonMinutes(journeyClean, resolvedClock);
    for (const trip of getUpcomingTrips(normalized)) {
      if (tripHasDeparted(trip, resolvedClock)) {
        continue;
      }
      if (tripMatchesPreferredOrLater(trip, preferredMinutes, horizon, resolvedClock, options)) {
        return resolveTripDeparture(trip);
      }
    }

    return null;
  }

  function resolveDepartedJourneyTargetDepartureIgnoringDismiss(
    payload,
    journey,
    clock = resolveClock()
  ) {
    const resolvedClock = resolveClock(clock);
    if (!payload || !journey || isRouteJourney(journey)) {
      return null;
    }

    const normalized = normalizeApiTrainData(payload);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);
    const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
    if (preferredMinutes < 0) {
      return null;
    }

    const insideActiveWindow = journeyMatchesSchedule(journeyClean, resolvedClock);
    const options = { strictNext: !insideActiveWindow };

    const horizon = targetTripHorizonMinutes(journeyClean, resolvedClock);
    for (const trip of getUpcomingTrips(normalized)) {
      if (!tripMatchesPreferredOrLater(trip, preferredMinutes, horizon, resolvedClock, options)) {
        continue;
      }
      if (tripHasDeparted(trip, resolvedClock)) {
        return resolveTripDeparture(trip);
      }
      return null;
    }

    return null;
  }

  function resolveJourneyWidgetFaceDeparture(payload, journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!payload || !journey) {
      return null;
    }

    const normalized = normalizeApiTrainData(payload);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);
    if (!journeyClean) {
      return null;
    }

    if (isJourneyOverrideActiveToday(journeyClean, resolvedClock)) {
      const overrideTrip = findTripByDepartureIso(normalized, journeyClean.journeyPinOverrideIso);
      if (overrideTrip && !tripHasDeparted(overrideTrip, resolvedClock)) {
        return resolveTripDeparture(overrideTrip);
      }
      return null;
    }

    if (isRouteJourney(journeyClean)) {
      return null;
    }

    const insideActiveWindow = journeyMatchesSchedule(journeyClean, resolvedClock);
    const preferredDeparture = resolveJourneyPreferredTargetDeparture(
      normalized,
      journeyClean,
      resolvedClock,
      insideActiveWindow ? null : 24 * 60
    );
    if (preferredDeparture) {
      return preferredDeparture;
    }

    if (!insideActiveWindow) {
      if (isOvernightActiveWindow(journeyClean)) {
        const departed = resolveDepartedJourneyTargetDepartureIgnoringDismiss(
          payload,
          journeyClean,
          resolvedClock
        );
        if (departed) {
          return departed;
        }
      }
      return resolveJourneyPreferredTargetDepartureOnRemindDays(
        normalized,
        journeyClean,
        resolvedClock
      );
    }

    return resolveDepartedJourneyTargetDepartureIgnoringDismiss(
      payload,
      journeyClean,
      resolvedClock
    );
  }

  function resolveJourneyPinDeparture(payload, journey, clock = resolveClock(), { nearbyPin = null } = {}) {
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

    if (isRouteJourney(journeyClean)) {
      return null;
    }

    if (isJourneyPinDismissedToday(journeyClean, resolvedClock)) {
      return null;
    }

    const insideActiveWindow = journeyMatchesSchedule(journeyClean, resolvedClock);
    const onActiveDay = journeyMatchesActiveDay(journeyClean, resolvedClock);
    
    const preferredDeparture = resolveJourneyPreferredTargetDeparture(
      normalized,
      journeyClean,
      resolvedClock,
      insideActiveWindow && onActiveDay ? null : 24 * 60
    );

    if (preferredDeparture) {
      // Pin Target train only if inside band and nothing else is pinned (no steal).
      if (insideActiveWindow && onActiveDay) {
        if (nearbyPin && isNearbyPinHolding(nearbyPin, resolvedClock)) {
          return null;
        }

        // Do not auto-pin a train that already left (i.e. the next train is now a following one).
        const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
        const trip = findTripByDepartureIso(normalized, preferredDeparture);
        const scheduledIso = trip?.scheduledDeparture || preferredDeparture;
        const scheduledMinutes = getPerthMinutesSinceMidnightFromIso(scheduledIso);

        if (scheduledMinutes > preferredMinutes) {
          return null;
        }

        return preferredDeparture;
      }
    }

    return resolveJourneyPreferredTargetDepartureOnRemindDays(
      normalized,
      journeyClean,
      resolvedClock
    );
  }

  function resolveDepartedJourneyTargetDeparture(payload, journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!payload || !journey || isRouteJourney(journey)) {
      return null;
    }

    const normalized = normalizeApiTrainData(payload);
    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);

    if (isJourneyOverrideActiveToday(journeyClean, resolvedClock)) {
      const overrideTrip = findTripByDepartureIso(normalized, journeyClean.journeyPinOverrideIso);
      if (overrideTrip && tripHasDeparted(overrideTrip, resolvedClock)) {
        return resolveTripDeparture(overrideTrip);
      }
      return null;
    }

    if (isJourneyPinDismissedToday(journeyClean, resolvedClock)) {
      return null;
    }

    const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
    if (preferredMinutes < 0) {
      return null;
    }

    const insideActiveWindow = journeyMatchesSchedule(journeyClean, resolvedClock);
    const options = { strictNext: !insideActiveWindow };

    const horizon = targetTripHorizonMinutes(journeyClean, resolvedClock);
    for (const trip of getUpcomingTrips(normalized)) {
      if (!tripMatchesPreferredOrLater(trip, preferredMinutes, horizon, resolvedClock, options)) {
        continue;
      }
      if (tripHasDeparted(trip, resolvedClock)) {
        return resolveTripDeparture(trip);
      }
      return null;
    }

    return null;
  }

  function resolveJourneyActiveTargetDeparture(payload, journey, clock = resolveClock(), options = {}) {
    const pinDeparture = resolveJourneyPinDeparture(payload, journey, clock, options);
    if (pinDeparture) {
      return pinDeparture;
    }
    return resolveDepartedJourneyTargetDeparture(payload, journey, clock);
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

  function formatPreviewClock(minutesSinceMidnight) {
    const wrapped = ((minutesSinceMidnight % (24 * 60)) + 24 * 60) % (24 * 60);
    const hour = Math.floor(wrapped / 60);
    const minute = wrapped % 60;
    return `${hour}:${String(minute).padStart(2, "0")}`;
  }

  function previewDayName(dayOfWeekIso) {
    switch (dayOfWeekIso) {
      case 1:
        return "Monday";
      case 2:
        return "Tuesday";
      case 3:
        return "Wednesday";
      case 4:
        return "Thursday";
      case 5:
        return "Friday";
      case 6:
        return "Saturday";
      case 7:
        return "Sunday";
      default:
        return "";
    }
  }

  function formatPreviewDayWord(dayOffset, dayOfWeekIso) {
    if (dayOffset === 0) {
      return "Today";
    }
    if (dayOffset === 1) {
      return "Tomorrow";
    }
    return previewDayName(dayOfWeekIso);
  }

  function resolveJourneyPreviewHero(journey, clock = resolveClock()) {
    const resolvedClock = resolveClock(clock);
    if (!journey) {
      return null;
    }

    const journeyClean = sanitizeJourneyPinFields(journey, resolvedClock);
    if (!journeyClean || isRouteJourney(journeyClean)) {
      return null;
    }

    const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
    if (preferredMinutes < 0) {
      return null;
    }

    const remindDays = getJourneyRemindDays(journeyClean);
    const nowDay = getPerthDayOfWeekIsoFromDate(new Date(resolvedClock.nowMs));
    const nowMinutes = getPerthMinutesSinceMidnight(resolvedClock);
    const onActiveDay = journeyMatchesActiveDay(journeyClean, resolvedClock);
    const insideActiveWindow = journeyMatchesSchedule(journeyClean, resolvedClock);

    if (onActiveDay && !insideActiveWindow && preferredMinutes > nowMinutes) {
      return {
        dayOffset: 0,
        dayOfWeekIso: nowDay,
        heroPreviewDayLabel: formatPreviewDayWord(0, nowDay),
        heroPreviewClock: formatPreviewClock(preferredMinutes),
      };
    }

    for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
      const day = ((nowDay - 1 + dayOffset) % 7) + 1;
      if (!remindDays.includes(day)) {
        continue;
      }

      return {
        dayOffset,
        dayOfWeekIso: day,
        heroPreviewDayLabel: formatPreviewDayWord(dayOffset, day),
        heroPreviewClock: formatPreviewClock(preferredMinutes),
      };
    }

    return null;
  }

  function resolveBoardHeroDeparture(payload, skipTrains, clock, options = {}) {
    const resolvedClock = resolveClock(clock);
    if (!payload) {
      return null;
    }

    const upcoming = getUpcomingTrips(normalizeApiTrainData(payload));
    if (!upcoming.length) {
      return null;
    }

    const skip = Math.max(0, Math.min(skipTrains, upcoming.length - 1));
    const trip = upcoming[skip];
    if (!trip || tripHasDeparted(trip, resolvedClock, options)) {
      return null;
    }
    return resolveTripDeparture(trip);
  }

  function resolveSkippedHeroDeparture(payload, skipTrains, clock, options = {}) {
    if (!payload || skipTrains <= 0) {
      return null;
    }
    return resolveBoardHeroDeparture(payload, skipTrains, clock, options);
  }

  function resolveLeaveCardArmed(input, state) {
    const { pinDeparture, isPinDismissedToday } = state;
    const clock = resolveClock(input.clock);

    if (input.mode === "nearby") {
      return Boolean(pinDeparture);
    }

    const journey = input.journey;
    if (isRouteJourney(journey)) {
      return Boolean(pinDeparture) && !isPinDismissedToday;
    }
    if (!journeyUsesLeaveBefore(journey) || isPinDismissedToday || !pinDeparture) {
      return false;
    }

    const journeyClean = sanitizeJourneyPinFields(journey, clock);
    return isJourneyPinnedToday(journeyClean, clock);
  }

  function getHeroLabel({
    heroShowsPin = false,
    isSkipPreview = false,
    browseSkipCount = 0,
    pinnedChrome = false,
    isDayOverridePin = false,
    showsTargetTrain = false,
  } = {}) {
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

  function resolveHeroDeparture(input) {
    const clock = resolveClock(input.clock);
    const skipTrains = input.skipTrains ?? 0;
    const pinDeparture =
      input.mode === "journey"
        ? resolveJourneyPinDeparture(input.payload, input.journey, clock, { nearbyPin: input.nearbyPin })
        : resolveNearbyPinDeparture(input.payload, input.nearbyPin, clock);
    const trueNextDeparture = resolveTrueNextDeparture(input.payload, clock);

    if (skipTrains > 0) {
      return resolveSkippedHeroDeparture(input.payload, skipTrains, clock);
    }
    if (input.mode === "journey") {
      return (
        resolveJourneyActiveTargetDeparture(input.payload, input.journey, clock, { nearbyPin: input.nearbyPin }) ??
        trueNextDeparture
      );
    }
    return pinDeparture ?? trueNextDeparture;
  }

  function resolveLeaveDeparture(input) {
    const clock = resolveClock(input.clock);
    const pinDeparture =
      input.mode === "journey"
        ? resolveJourneyPinDeparture(input.payload, input.journey, clock, { nearbyPin: input.nearbyPin })
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
    const browseLiveBoard = Boolean(input.browseLiveBoard);
    const mode = input.mode;
    const isSkipPreview = skipTrains > 0 || browseLiveBoard;

    const pinDeparture =
      mode === "journey"
        ? resolveJourneyPinDeparture(input.payload, input.journey, clock, { nearbyPin: input.nearbyPin })
        : mode === "nearby"
          ? resolveNearbyPinDeparture(input.payload, input.nearbyPin, clock)
          : null;

    const departedTargetDeparture =
      mode === "journey"
        ? resolveDepartedJourneyTargetDeparture(input.payload, input.journey, clock)
        : null;
    const journeyClean =
      mode === "journey" ? sanitizeJourneyPinFields(input.journey, clock) : null;
    const insideActiveWindow =
      mode === "journey" && journeyClean && journeyMatchesSchedule(journeyClean, clock);
    const options = { strictNext: !insideActiveWindow };
    const trueNextDeparture = resolveTrueNextDeparture(input.payload, clock, options);

    const isPinnedToday =
      mode === "journey"
        ? isJourneyPinnedToday(input.journey, clock)
        : Boolean(pinDeparture);

    // Filter pinDeparture for UI display: don't show "Pinned" chrome for auto-target pins outside active window.
    const uiPinDeparture =
      mode === "journey" && journeyClean
        ? !insideActiveWindow &&
          !isJourneyOverrideActiveToday(journeyClean, clock) &&
          !isOvernightActiveWindow(journeyClean)
          ? null // Outside window, not manually overridden: treat as Target train (auto-outline), not a solid Pinned train.
          : pinDeparture
        : pinDeparture;

    const retainDepartedOutsideWindow = Boolean(
      outsideActiveWindow &&
        journeyClean &&
        isOvernightActiveWindow(journeyClean) &&
        departedTargetDeparture
    );
    let activeTargetDeparture = uiPinDeparture;
    if (!activeTargetDeparture && mode === "journey") {
      if (insideActiveWindow) {
        activeTargetDeparture = departedTargetDeparture;
      } else if (retainDepartedOutsideWindow) {
        activeTargetDeparture = departedTargetDeparture;
      }
    }

    const isOverrideActiveToday =
      mode === "journey" && isJourneyOverrideActiveToday(journeyClean, clock);
    const isPinDismissedToday =
      mode === "journey" && isJourneyPinDismissedToday(journeyClean, clock);

    const outsideActiveWindow = mode === "journey" && journeyClean && !insideActiveWindow;
    const outsideActiveDay =
      mode === "journey" && journeyClean && !journeyMatchesActiveDay(journeyClean, clock);
    const preferredTargetDeparture =
      mode === "journey" && journeyClean && !isRouteJourney(journeyClean)
        ? outsideActiveDay || !insideActiveWindow
          ? resolveJourneyPreferredTargetDeparture(
              input.payload,
              journeyClean,
              clock,
              24 * 60
            ) ||
            resolveJourneyPreferredTargetDepartureOnRemindDays(
              input.payload,
              journeyClean,
              clock
            )
          : resolveJourneyPreferredTargetDeparture(input.payload, journeyClean, clock)
        : null;

    const previewHero =
      mode === "journey" && journeyClean && outsideActiveDay && !preferredTargetDeparture
        ? resolveJourneyPreviewHero(journeyClean, clock)
        : null;

    const targetSkipIndex =
      preferredTargetDeparture && input.payload
        ? (() => {
            const normalized = normalizeApiTrainData(input.payload);
            const trips = getUpcomingTrips(normalized);
            for (let index = 0; index < trips.length; index += 1) {
              const trip = trips[index];
              if (resolveTripDeparture(trip) === preferredTargetDeparture) {
                return index;
              }
            }
            return -1;
          })()
        : -1;

    const isBrowsingLiveBoard = Boolean(
      outsideActiveDay &&
        !isOverrideActiveToday &&
        browseLiveBoard &&
        (skipTrains > 0 || browseLiveBoard)
    );
    const isStaleBrowseSkip = Boolean(
      outsideActiveDay &&
        !isOverrideActiveToday &&
        skipTrains > 0 &&
        !browseLiveBoard &&
        skipTrains !== targetSkipIndex
    );

    const skippedHeroDeparture =
      isBrowsingLiveBoard || (isSkipPreview && !isStaleBrowseSkip)
        ? resolveBoardHeroDeparture(input.payload, skipTrains, clock, options)
        : null;

    let heroMode = "live";
    let heroPreviewDayLabel = null;
    let heroPreviewClock = null;
    let heroDeparture;

    if (outsideActiveDay && !isOverrideActiveToday) {
      if (isPinDismissedToday) {
        heroDeparture = isBrowsingLiveBoard
          ? skippedHeroDeparture ?? trueNextDeparture
          : trueNextDeparture;
        heroMode = "live";
      } else if (isBrowsingLiveBoard) {
        heroDeparture = skippedHeroDeparture ?? trueNextDeparture;
        heroMode = "live";
      } else if (isStaleBrowseSkip) {
        heroDeparture = preferredTargetDeparture ?? null;
        heroMode = preferredTargetDeparture ? "live" : "preview";
      } else if (isSkipPreview && skippedHeroDeparture) {
        heroDeparture = skippedHeroDeparture;
        heroMode = "live";
      } else if (preferredTargetDeparture) {
        heroDeparture = preferredTargetDeparture;
        heroMode = "live";
      } else if (previewHero) {
        heroDeparture = null;
        heroMode = "preview";
        heroPreviewDayLabel = previewHero.heroPreviewDayLabel;
        heroPreviewClock = previewHero.heroPreviewClock;
      } else {
        // Fallback to true next departure on the live board if no target today/tomorrow.
        // We use the 'strictNext: false' version for this fallback to match ANY next train.
        const nonStrictNextDeparture = resolveTrueNextDeparture(input.payload, clock, { strictNext: false });
        heroDeparture = nonStrictNextDeparture;
        heroMode = heroDeparture ? "live" : "preview";
      }
    } else {
      heroDeparture = isSkipPreview
        ? skippedHeroDeparture
        : activeTargetDeparture ?? trueNextDeparture;

      if (!heroDeparture && outsideActiveWindow) {
        const preview = resolveJourneyPreviewHero(journeyClean, clock);
        if (preview) {
          heroMode = "preview";
          heroPreviewDayLabel = preview.heroPreviewDayLabel;
          heroPreviewClock = preview.heroPreviewClock;
        } else {
          heroMode = "preview";
        }
      } else {
        heroMode = heroDeparture ? "live" : "preview";
      }
    }

    const leaveDeparture = uiPinDeparture ?? trueNextDeparture;
    const widgetFaceDeparture =
      mode === "journey"
        ? resolveJourneyWidgetFaceDeparture(input.payload, input.journey, clock)
        : mode === "nearby"
          ? uiPinDeparture
          : null;

    const heroShowsPin = Boolean(
      activeTargetDeparture &&
        heroDeparture === activeTargetDeparture &&
        (mode === "nearby" ||
          insideActiveWindow ||
          isOverrideActiveToday ||
          retainDepartedOutsideWindow)
    );
    const showSecondaryNext = Boolean(
      !isSkipPreview &&
        !isBrowsingLiveBoard &&
        !isStaleBrowseSkip &&
        trueNextDeparture &&
        uiPinDeparture &&
        trueNextDeparture !== uiPinDeparture
    );
    const secondaryNextDeparture = showSecondaryNext ? trueNextDeparture : null;

    const showsTargetTrain = Boolean(
      !isOverrideActiveToday &&
        !isBrowsingLiveBoard &&
        ((preferredTargetDeparture && heroDeparture === preferredTargetDeparture) ||
          heroMode === "preview")
    );
    const nearbyPinLocking = Boolean(
      mode === "nearby" &&
        input.nearbyPin &&
        input.nearbyFocusedDirection &&
        input.nearbyPin.direction === input.nearbyFocusedDirection &&
        isNearbyPinHolding(input.nearbyPin, clock)
    );
    const pinnedChrome = Boolean(
      !isSkipPreview &&
        heroShowsPin &&
        (mode === "nearby" || (mode === "journey" && isOverrideActiveToday))
    );
    // Lock browse only when the pin control is actually on (override / nearby hold).
    // Preferred "Target train" keeps an outlined pin so later trains stay swipeable.
    const isHeroPinLockingSwipe =
      mode === "nearby" ? nearbyPinLocking : pinnedChrome;

    const leaveCardArmed =
      (mode === "nearby" ||
        insideActiveWindow ||
        (outsideActiveDay && isOverrideActiveToday)) &&
      resolveLeaveCardArmed(input, {
        pinDeparture: uiPinDeparture,
        isPinDismissedToday,
      });

    const isBrowseSwipeAllowed = Boolean(outsideActiveDay && !isOverrideActiveToday);

    const heroLabel = getHeroLabel({
      heroShowsPin: heroShowsPin && !isSkipPreview,
      showsTargetTrain,
      isSkipPreview: (isSkipPreview || isBrowsingLiveBoard) && !showsTargetTrain,
      browseSkipCount: skipTrains,
      pinnedChrome,
      isDayOverridePin: isOverrideActiveToday,
    });

    return {
      trueNextDeparture,
      pinDeparture: uiPinDeparture,
      heroDeparture,
      leaveDeparture,
      secondaryNextDeparture,
      widgetFaceDeparture,
      isPinnedToday,
      heroShowsPin,
      showsTargetTrain,
      pinnedChrome,
      isOverrideActiveToday,
      isPinDismissedToday,
      isSkipPreview,
      isHeroPinLockingSwipe,
      showSecondaryNext,
      leaveCardArmed,
      heroLabel,
      heroMode,
      heroPreviewDayLabel,
      heroPreviewClock,
      isBrowseSwipeAllowed,
    };
  }

  const api = {
    init,
    resolvePinState,
    isJourneyOverrideActiveToday,
    isJourneyPinDismissedToday,
    isJourneyPinnedToday,
    isJourneyTargetPinnedToday: isJourneyPinnedToday,
    sanitizeJourneyPinFields,
    resolveJourneyPinDeparture,
    resolveJourneyPreferredTargetDeparture,
    resolveJourneyWidgetFaceDeparture,
    resolveJourneyPreviewHero,
    resolveDepartedJourneyTargetDeparture,
    resolveJourneyActiveTargetDeparture,
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
