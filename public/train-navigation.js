(function (global) {
  const SKIP_KEY = "nextTrainSkip";
  const SWIPE_THRESHOLD_PX = 48;

  let deps = {};
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeLastX = 0;
  let swipeLastY = 0;
  let heroSwipePointerId = null;
  let heroSwipeInitialized = false;

  function getSkipTrains() {
    return deps.getSkipTrains?.() ?? 0;
  }

  function setSkipTrains(value) {
    deps.setSkipTrains?.(value);
  }

  function getLastApiData() {
    return deps.getLastApiData?.() ?? null;
  }

  function getLastRenderedNext() {
    return deps.getLastRenderedNext?.() ?? null;
  }

  function getJourneyModeActive() {
    return deps.getJourneyModeActive?.() ?? false;
  }

  function setJourneyModeActive(value) {
    deps.setJourneyModeActive?.(value);
  }

  function getSettings() {
    return deps.getSettings?.() ?? { journeys: [] };
  }

  function getNearbySession() {
    return deps.getNearbySession?.() ?? null;
  }

  function getNearbyBoard() {
    return deps.getNearbyBoard?.() ?? null;
  }

  function getActiveJourney() {
    return deps.getActiveJourney?.() ?? null;
  }

  function normalizeJourney(raw) {
    return deps.normalizeJourney?.(raw) ?? raw;
  }

  function persistSettings(next) {
    return deps.persistSettings?.(next);
  }

  function normalizeApiTrainData(data) {
    return deps.normalizeApiTrainData?.(data) ?? data;
  }

  function resolveTripDeparture(trip, referenceIso) {
    return deps.resolveTripDeparture?.(trip, referenceIso) ?? null;
  }

  function getLiveTiming(next) {
    return deps.getLiveTiming?.(next) ?? { minutesUntilDeparture: 0, minutesUntilLeave: 0, leavePhase: "calm", minutesLate: 0 };
  }

  function getEffectiveLeaveBeforeMinutes(journey) {
    return deps.getEffectiveLeaveBeforeMinutes?.(journey) ?? 10;
  }

  function journeyUsesLeaveBefore(journey) {
    return deps.journeyUsesLeaveBefore?.(journey) ?? true;
  }

  function getLeaveTripForActiveJourney(data = getLastApiData()) {
    return deps.getLeaveTripForActiveJourney?.(data) ?? null;
  }

  function journeyMatchesSchedule(journey, minutes, day) {
    return deps.journeyMatchesSchedule?.(journey, minutes, day) ?? false;
  }

  function parseTimeToMinutes(time) {
    return deps.parseTimeToMinutes?.(time) ?? NaN;
  }

  function getPerthLocalDateKey(date) {
    return deps.getPerthLocalDateKey?.(date) ?? "";
  }

  function minutesUntilPerthWallClock(isoString) {
    return deps.minutesUntilPerthWallClock?.(isoString) ?? 0;
  }

  function minutesUntilPerthClockMinutes(targetMinutes) {
    return deps.minutesUntilPerthClockMinutes?.(targetMinutes) ?? 0;
  }

  function isNearbyModeActive() {
    return deps.isNearbyModeActive?.() ?? false;
  }

  function getNearbyFocusedEntry() {
    return deps.getNearbyFocusedEntry?.() ?? null;
  }

  function getNearbySkip(direction) {
    return deps.getNearbySkip?.(direction) ?? 0;
  }

  function setNearbySkip(direction, skip) {
    deps.setNearbySkip?.(direction, skip);
  }

  function getNearbyPin() {
    return deps.getNearbyPin?.() ?? null;
  }

  function isNearbyPinHolding(pin) {
    return deps.isNearbyPinHolding?.(pin) ?? false;
  }

  function isNearbyPinShowing(direction) {
    return deps.isNearbyPinShowing?.(direction) ?? false;
  }

  function setNearbyPinFromTrip(direction, trip) {
    deps.setNearbyPinFromTrip?.(direction, trip);
  }

  function syncNearbyPinSettings() {
    deps.syncNearbyPinSettings?.();
  }

  function clearNearbyPin() {
    deps.clearNearbyPin?.();
  }

  function applyNearbySkip(data, skip) {
    return deps.applyNearbySkip?.(data, skip) ?? data;
  }

  function render(data, options) {
    return deps.render?.(data, options);
  }

  function fetchNextTrain() {
    return deps.fetchNextTrain?.();
  }

  function renderNearbyBoard(options) {
    return deps.renderNearbyBoard?.(options);
  }

  function fetchNearbyBoard() {
    return deps.fetchNearbyBoard?.();
  }

  function dismissSwipeHint() {
    deps.dismissSwipeHint?.();
  }

  function rescheduleNearbyPinReminders() {
    deps.rescheduleNearbyPinReminders?.();
  }

  function isUnconfiguredJourney(journey) {
    return deps.isUnconfiguredJourney?.(journey) ?? false;
  }

function skipStorageKey() {
  const journey = getActiveJourney();
  return `${SKIP_KEY}:${journey?.id ?? "none"}`;
}

function readSkipState() {
  try {
    const raw = sessionStorage.getItem(skipStorageKey());
    if (!raw) {
      return { count: 0, skippedUntil: null, skippedToDeparture: null };
    }

    const parsed = JSON.parse(raw);
    if (parsed.skippedUntil && new Date(parsed.skippedUntil) <= new Date()) {
      clearSkipState();
      return { count: 0, skippedUntil: null, skippedToDeparture: null };
    }

    return {
      count: Math.max(0, Number(parsed.count) || 0),
      skippedUntil: parsed.skippedUntil ?? null,
      skippedToDeparture: parsed.skippedToDeparture ?? null,
    };
  } catch {
    return { count: 0, skippedUntil: null, skippedToDeparture: null };
  }
}

function saveSkipState(count, skippedUntil, skippedToDeparture = null) {
  setSkipTrains(Math.max(0, count));
  const payload = {
    count: getSkipTrains(),
    skippedUntil: skippedUntil ?? null,
    skippedToDeparture: skippedToDeparture ?? null,
  };
  sessionStorage.setItem(skipStorageKey(), JSON.stringify(payload));
}

function clearSkipState() {
  setSkipTrains(0);
  sessionStorage.removeItem(skipStorageKey());
}

function saveSkipStateForTrip(data, trip) {
  if (!data || !trip) {
    clearSkipState();
    return;
  }

  const upcoming = getUpcomingTrips(data);
  const departure = resolveTripDeparture(trip);
  if (!departure) {
    clearSkipState();
    return;
  }

  const index = upcoming.findIndex(
    (candidate) => resolveTripDeparture(candidate) === departure
  );

  if (index <= 0) {
    clearSkipState();
    return;
  }

  saveSkipState(index, null, departure);
}

function getUpcomingTrips(data) {
  if (!data?.next) {
    return [];
  }
  return normalizeApiTrainData(data).upcoming ?? [];
}

function getHeroDepartLabel({ pinned = false, heroShowsPin = false, skipCount = 0 } = {}) {
  if (pinned) {
    return "Pinned Train";
  }
  if (heroShowsPin) {
    return "Target train";
  }
  if (skipCount > 0) {
    return "Later train";
  }
  return "Next Train";
}

function getNextThenTrain(data, skipCount = getSkipTrains()) {
  if (!data) {
    return null;
  }

  const normalized = normalizeApiTrainData(data);
  const upcoming = normalized.upcoming ?? [];
  const nextTrip = upcoming[skipCount + 1];

  if (nextTrip) {
    return slimFollowing(nextTrip);
  }

  if (skipCount === 0 && normalized.following) {
    return slimFollowing(normalized.following);
  }

  return null;
}

function reconcileSkipWithApi(data) {
  if (getSkipTrains() <= 0 || !data?.next) {
    return;
  }

  const { skippedToDeparture } = readSkipState();
  if (!skippedToDeparture) {
    return;
  }

  const apiNextDeparture = resolveTripDeparture(
    normalizeApiTrainData(data).next
  );
  if (apiNextDeparture && apiNextDeparture === skippedToDeparture) {
    clearSkipState();
  }
}

function getSkippedEarlierTrain(data) {
  if (getSkipTrains() <= 0 || !data) {
    return null;
  }

  const earlierTrip = getUpcomingTrips(data)[getSkipTrains() - 1];
  if (!earlierTrip) {
    return null;
  }

  const journey = getActiveJourney();
  const normalized = normalizeApiTrainData(data);
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;
  return ensureFullNext(
    earlierTrip,
    getEffectiveLeaveBeforeMinutes(journey),
    referenceIso
  );
}

function prepareDisplayData(data) {
  const normalized = normalizeApiTrainData(data);
  reconcileSkipWithApi(normalized);
  return applyClientSkip(normalized);
}

function preferredMinutesForLiveGlance(journey) {
  const raw = journey?.preferredTrainTime || "";
  if (!raw) {
    return -1;
  }

  const minutes = parseTimeToMinutes(raw);
  return Number.isNaN(minutes) ? -1 : minutes;
}

function liveHorizonMinutes(journey) {
  const untilRaw = journey?.defaultUntil || "";
  if (!untilRaw) {
    return 24 * 60;
  }

  const minutes = parseTimeToMinutes(untilRaw);
  return Number.isNaN(minutes) ? 24 * 60 : minutes;
}

function formatPreferredClock(totalMinutes) {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

function tripMatchesPreferredOrLater(trip, preferredMinutes, horizonMinutes) {
  const iso = trip?.departure ?? trip?.arrival;
  if (!iso) {
    return false;
  }

  const minutesUntilDeparture = minutesUntilPerthWallClock(iso);
  const minutesUntilPreferred = minutesUntilPerthClockMinutes(preferredMinutes);

  if (minutesUntilDeparture < minutesUntilPreferred) {
    return false;
  }

  if (horizonMinutes < 24 * 60) {
    const minutesUntilHorizon = minutesUntilPerthClockMinutes(horizonMinutes);
    if (
      minutesUntilPreferred <= minutesUntilHorizon &&
      minutesUntilDeparture > minutesUntilHorizon
    ) {
      return false;
    }
  }

  return true;
}

function leaveByArmedForDisplayedTrip(trip, journey = getActiveJourney(), skipCount = getSkipTrains()) {
  if (skipCount !== 0) {
    return true;
  }

  const preferredMinutes = preferredMinutesForLiveGlance(journey);
  if (preferredMinutes < 0) {
    return true;
  }

  if (!trip) {
    return false;
  }

  return tripMatchesPreferredOrLater(trip, preferredMinutes, liveHorizonMinutes(journey));
}

function tripHasDeparted(trip) {
  if (!trip) {
    return true;
  }
  return getLiveTiming(trip).minutesUntilDeparture <= 0;
}

function findTripByDepartureIso(data, departureIso) {
  if (!data || !departureIso) {
    return null;
  }
  return (
    getUpcomingTrips(data).find((trip) => resolveTripDeparture(trip) === departureIso) ?? null
  );
}

function findTripIndexInUpcoming(data, trip) {
  const departure = resolveTripDeparture(trip);
  if (!data || !departure) {
    return -1;
  }
  return getUpcomingTrips(data).findIndex(
    (candidate) => resolveTripDeparture(candidate) === departure
  );
}

function getTrueNextTrip(data) {
  if (!data) {
    return null;
  }

  const normalized = normalizeApiTrainData(data);
  for (const trip of getUpcomingTrips(normalized)) {
    if (!tripHasDeparted(trip)) {
      return trip;
    }
  }

  const next = normalized.next;
  if (next && !tripHasDeparted(next)) {
    return next;
  }

  return null;
}

function isJourneyOverrideActiveToday(journey) {
  return Boolean(
    journey?.journeyPinOverrideIso &&
      journey?.journeyPinOverrideDate === getPerthLocalDateKey()
  );
}

function isJourneyPinDismissedToday(journey) {
  return journey?.journeyPinDismissedDate === getPerthLocalDateKey();
}

function isJourneyTargetPinnedToday(journey) {
  const journeyClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  if (isJourneyOverrideActiveToday(journeyClean)) {
    return true;
  }
  if (preferredMinutesForLiveGlance(journeyClean) < 0) {
    return false;
  }
  return !isJourneyPinDismissedToday(journeyClean);
}

function sanitizeJourneyPinOverride(journey) {
  if (!journey?.journeyPinOverrideDate) {
    return journey;
  }
  if (journey.journeyPinOverrideDate !== getPerthLocalDateKey()) {
    return {
      ...journey,
      journeyPinOverrideIso: "",
      journeyPinOverrideDate: "",
    };
  }
  return journey;
}

function sanitizeJourneyPinDismissed(journey) {
  if (!journey?.journeyPinDismissedDate) {
    return journey;
  }
  if (journey.journeyPinDismissedDate !== getPerthLocalDateKey()) {
    return {
      ...journey,
      journeyPinDismissedDate: "",
    };
  }
  return journey;
}

function resolveJourneyPreferredTargetTrip(data, journey = getActiveJourney()) {
  if (!data || !journey) {
    return null;
  }

  const normalized = normalizeApiTrainData(data);
  const journeyClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  if (!journeyMatchesSchedule(journeyClean)) {
    return null;
  }

  const preferredMinutes = preferredMinutesForLiveGlance(journeyClean);
  if (preferredMinutes < 0) {
    return null;
  }

  const leaveBefore = getEffectiveLeaveBeforeMinutes(journeyClean);
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;
  const horizon = liveHorizonMinutes(journeyClean);
  for (const trip of getUpcomingTrips(normalized)) {
    if (tripHasDeparted(trip)) {
      continue;
    }
    if (tripMatchesPreferredOrLater(trip, preferredMinutes, horizon)) {
      return ensureFullNext(trip, leaveBefore, referenceIso);
    }
  }

  return null;
}

function resolveJourneyPinTrip(data, journey = getActiveJourney()) {
  if (!data || !journey) {
    return null;
  }

  const normalized = normalizeApiTrainData(data);
  const journeyClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  const leaveBefore = getEffectiveLeaveBeforeMinutes(journeyClean);
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;

  if (isJourneyOverrideActiveToday(journeyClean)) {
    const overrideTrip = findTripByDepartureIso(normalized, journeyClean.journeyPinOverrideIso);
    if (overrideTrip && !tripHasDeparted(overrideTrip)) {
      return ensureFullNext(overrideTrip, leaveBefore, referenceIso);
    }
  }

  if (!journeyMatchesSchedule(journeyClean)) {
    return null;
  }

  if (isJourneyPinDismissedToday(journeyClean)) {
    return null;
  }

  return resolveJourneyPreferredTargetTrip(normalized, journeyClean);
}

function persistJourneyPinDismissed(journeyId) {
  if (!journeyId) {
    return;
  }

  const today = getPerthLocalDateKey();
  const journeys = getSettings().journeys.map((journey) => {
    if (journey.id !== journeyId) {
      return sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(normalizeJourney(journey)));
    }

    return normalizeJourney({
      ...sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(normalizeJourney(journey))),
      journeyPinDismissedDate: today,
    });
  });

  persistSettings({ journeys });
  rescheduleNearbyPinReminders();
}

function clearJourneyPinDismissed(journeyId = getActiveJourney()?.id) {
  if (!journeyId) {
    return;
  }

  const journeys = getSettings().journeys.map((journey) => {
    if (journey.id !== journeyId) {
      return sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(normalizeJourney(journey)));
    }

    return normalizeJourney({
      ...sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(normalizeJourney(journey))),
      journeyPinDismissedDate: "",
    });
  });

  persistSettings({ journeys });
  rescheduleNearbyPinReminders();
}

function journeysDepartureMatch(tripA, tripB) {
  const departureA = resolveTripDeparture(tripA);
  const departureB = resolveTripDeparture(tripB);
  return Boolean(departureA && departureB && departureA === departureB);
}

function persistJourneyPinOverride(journeyId, departureIso) {
  if (!journeyId) {
    return;
  }

  const today = getPerthLocalDateKey();
  const journeys = getSettings().journeys.map((journey) => {
    if (journey.id !== journeyId) {
      return sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(normalizeJourney(journey)));
    }

    const normalized = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(normalizeJourney(journey)));
    return normalizeJourney({
      ...normalized,
      journeyPinOverrideIso: departureIso || "",
      journeyPinOverrideDate: departureIso ? today : "",
      journeyPinDismissedDate: departureIso ? "" : normalized.journeyPinDismissedDate,
    });
  });

  persistSettings({ journeys });
  rescheduleNearbyPinReminders();
}

function clearJourneyPinOverride(journeyId = getActiveJourney()?.id) {
  if (!journeyId) {
    return;
  }
  persistJourneyPinOverride(journeyId, null);
}

function findPreferredTripSkipIndex(data, journey = getActiveJourney()) {
  const preferredMinutes = preferredMinutesForLiveGlance(journey);
  if (preferredMinutes < 0 || !data) {
    return -1;
  }

  const upcoming = getUpcomingTrips(data);
  const horizon = liveHorizonMinutes(journey);
  for (let index = 0; index < upcoming.length; index += 1) {
    if (tripMatchesPreferredOrLater(upcoming[index], preferredMinutes, horizon)) {
      return index;
    }
  }
  return -1;
}

function isHeroPinLockingSwipe() {
  if (isNearbyModeActive()) {
    return isNearbyPinHolding();
  }

  if (getJourneyModeActive()) {
    return isJourneyOverrideActiveToday(getActiveJourney());
  }

  return false;
}

function canSkipToTargetTrain() {
  if (isNearbyModeActive() || !getJourneyModeActive() || !getLastApiData()) {
    return false;
  }

  const journey = getActiveJourney();
  if (!journey || preferredMinutesForLiveGlance(journey) < 0) {
    return false;
  }

  if (isJourneyOverrideActiveToday(journey)) {
    return false;
  }

  if (isJourneyPinDismissedToday(journey)) {
    return false;
  }

  const targetIndex = findPreferredTripSkipIndex(getLastApiData(), journey);
  if (targetIndex < 0) {
    return false;
  }

  return getSkipTrains() !== targetIndex;
}

function skipToTargetTrain() {
  if (!canSkipToTargetTrain() || !getLastApiData()) {
    return;
  }

  const targetIndex = findPreferredTripSkipIndex(getLastApiData());
  if (targetIndex < 0) {
    return;
  }

  if (targetIndex <= 0) {
    clearSkipState();
    setSkipTrains(0);
  } else {
    const normalized = normalizeApiTrainData(getLastApiData());
    const skippedToTrip = normalized.upcoming?.[targetIndex] ?? null;
    const skippedToDeparture = skippedToTrip ? resolveTripDeparture(skippedToTrip) : null;
    saveSkipState(targetIndex, null, skippedToDeparture);
    setSkipTrains(targetIndex);
  }

  dismissSwipeHint();
  render(applyClientSkip({ ...getLastApiData() }));
  fetchNextTrain();
}

function getLeavePhase(minutesUntilLeave, minutesUntilDeparture) {
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

function buildNextFromFollowing(following, leaveBeforeMinutes, referenceIso) {
  const departureIso = resolveTripDeparture(
    following,
    referenceIso ?? following?.departure ?? following?.arrival
  );
  if (!departureIso) {
    return null;
  }

  const departure = new Date(departureIso);
  const leaveByMs = departure.getTime() - leaveBeforeMinutes * 60 * 1000;
  const leaveByIso = new Date(leaveByMs).toISOString();
  const timing = getLiveTiming({
    departure: departureIso,
    arrival: departureIso,
    leaveBy: leaveByIso,
  });

  return {
    ...following,
    leaveBy: leaveByIso,
    departure: departureIso,
    arrival: departureIso,
    minutesUntilDeparture: timing.minutesUntilDeparture,
    minutesUntilArrival: timing.minutesUntilDeparture,
    minutesUntilLeave: timing.minutesUntilLeave,
    minutesLate: timing.minutesLate,
    leavePhase: timing.leavePhase,
    isDelayed: Number(following.timingOffsetMinutes ?? 0) >= 2,
  };
}

function slimFollowing(trip) {
  const departure = trip.departure ?? trip.arrival;
  return {
    displayTime: trip.displayTime,
    scheduledDisplayTime: trip.scheduledDisplayTime,
    platform: trip.platform,
    status: trip.status,
    departure,
    arrival: departure,
  };
}

function ensureFullNext(trip, leaveBeforeMinutes, referenceIso) {
  if (!trip) {
    return null;
  }
  if (trip.leaveBy) {
    return trip;
  }
  return buildNextFromFollowing(trip, leaveBeforeMinutes, referenceIso);
}

function applyClientSkip(data) {
  if (!data || getSkipTrains() <= 0) {
    return data;
  }

  const normalized = normalizeApiTrainData(data);
  const journey = getActiveJourney();
  const referenceIso = normalized.next?.departure ?? normalized.next?.arrival;

  if (!normalized.upcoming?.length) {
    return normalized;
  }

  const skip = Math.min(getSkipTrains(), normalized.upcoming.length - 1);
  const next = ensureFullNext(
    normalized.upcoming[skip] ?? normalized.next,
    getEffectiveLeaveBeforeMinutes(journey),
    referenceIso
  );
  const followingTrip = normalized.upcoming[skip + 1] ?? null;
  const following = getNextThenTrain(normalized, skip) ?? (followingTrip ? slimFollowing(followingTrip) : null);

  return {
    ...normalized,
    next,
    following,
  };
}

function canSkipToNextTrain() {
  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    const upcoming = getUpcomingTrips(entry?.data);
    return getNearbySkip(entry?.direction) < upcoming.length - 1;
  }

  if (!getLastApiData()) {
    return false;
  }

  const upcoming = getUpcomingTrips(getLastApiData());
  return getSkipTrains() < upcoming.length - 1;
}

function canSkipToEarlierTrain() {
  if (isNearbyModeActive()) {
    return getNearbySkip(getNearbyFocusedEntry()?.direction) > 0;
  }

  return getSkipTrains() > 0;
}

function applyNearbySkipOptimistic(direction, skip) {
  if (!getNearbyBoard()?.entries?.length || !direction) {
    return;
  }

  for (const entry of getNearbyBoard().entries) {
    if (entry.direction !== direction || !entry.data) {
      continue;
    }

    entry.data = applyNearbySkip(normalizeApiTrainData(entry.data), skip);
  }

  renderNearbyBoard();
}

function shouldAdvanceLeavePinOnSkip() {
  const journey = getActiveJourney();
  if (!journey || !journeyUsesLeaveBefore(journey) || !getLastApiData()) {
    return false;
  }

  const leaveTrip = getLeaveTripForActiveJourney();
  if (!leaveTrip) {
    return false;
  }

  const { leavePhase } = getLiveTiming(leaveTrip);
  return leavePhase === "late" || leavePhase === "missed";
}

function advanceLeavePinToNextTrain() {
  const journey = getActiveJourney();
  if (!journey || !getLastApiData() || !canSkipToNextTrain()) {
    return false;
  }

  const normalized = normalizeApiTrainData(getLastApiData());
  const upcoming = getUpcomingTrips(normalized);
  const pinTrip = resolveJourneyPinTrip(getLastApiData(), journey);
  let pinIndex = findTripIndexInUpcoming(normalized, pinTrip);
  if (pinIndex < 0) {
    pinIndex = 0;
  }

  let targetIndex = pinIndex + 1;
  if (getSkipTrains() > pinIndex) {
    targetIndex = getSkipTrains();
  }

  if (targetIndex >= upcoming.length || targetIndex <= pinIndex) {
    return false;
  }

  const targetDeparture = resolveTripDeparture(upcoming[targetIndex]);
  if (!targetDeparture) {
    return false;
  }

  clearSkipState();
  setSkipTrains(0);
  clearJourneyPinDismissed(journey.id);
  persistJourneyPinOverride(journey.id, targetDeparture);
  dismissSwipeHint();

  render(applyClientSkip({ ...getLastApiData() }));
  fetchNextTrain();
  return true;
}

function shouldAdvancePinOnNextTrain() {
  if (isNearbyModeActive()) {
    return isNearbyPinHolding() && canSkipToNextTrain();
  }

  const journey = getActiveJourney();
  if (!journey || !getLastApiData()) {
    return false;
  }

  if (!isJourneyTargetPinnedToday(journey)) {
    return false;
  }

  if (!resolveJourneyPinTrip(getLastApiData(), journey)) {
    return false;
  }

  return canSkipToNextTrain() && shouldAdvanceLeavePinOnSkip();
}

function advanceNearbyPinToNextTrain() {
  const entry = getNearbyFocusedEntry();
  if (!entry?.data || !entry.direction) {
    return false;
  }

  const pin = getNearbyPin();
  if (!pin || !isNearbyPinHolding(pin)) {
    return false;
  }

  if (pin.direction !== entry.direction) {
    return false;
  }

  const direction = entry.direction;
  const normalized = normalizeApiTrainData(entry.data);
  const upcoming = getUpcomingTrips(normalized);
  const pinTrip = findTripByDepartureIso(normalized, pin.departureIso) ?? pin.trip;
  let pinIndex = findTripIndexInUpcoming(normalized, pinTrip);
  if (pinIndex < 0) {
    pinIndex = 0;
  }

  let targetIndex = pinIndex + 1;
  const nearbySkip = getNearbySkip(direction);
  if (nearbySkip > pinIndex) {
    targetIndex = nearbySkip;
  }

  if (targetIndex >= upcoming.length || targetIndex <= pinIndex) {
    return false;
  }

  const targetTrip = upcoming[targetIndex];
  const targetDeparture = resolveTripDeparture(targetTrip);
  if (!targetDeparture) {
    return false;
  }

  setNearbyPinFromTrip(direction, targetTrip);
  syncNearbyPinSettings();
  setNearbySkip(direction, 0);
  dismissSwipeHint();
  renderNearbyBoard();
  void fetchNearbyBoard()
    .then(() => renderNearbyBoard())
    .catch((error) => {
      if (deps.errorEl) {
        deps.errorEl.textContent = error?.message ?? "Could not load departures";
        deps.errorEl.hidden = false;
      }
      renderNearbyBoard({ stale: true });
    });
  return true;
}

function skipToNextTrain() {
  if (shouldAdvancePinOnNextTrain()) {
    if (isNearbyModeActive()) {
      advanceNearbyPinToNextTrain();
    } else {
      advanceLeavePinToNextTrain();
    }
    return;
  }

  if (isHeroPinLockingSwipe()) {
    return;
  }

  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    if (!entry || !canSkipToNextTrain()) {
      return;
    }

    const nextSkip = getNearbySkip(entry.direction) + 1;
    setNearbySkip(entry.direction, nextSkip);
    dismissSwipeHint();
    applyNearbySkipOptimistic(entry.direction, nextSkip);
    fetchNearbyBoard()
      .then(() => renderNearbyBoard())
      .catch((error) => {
        deps.errorEl.textContent = error.message;
        deps.errorEl.hidden = false;
        renderNearbyBoard({ stale: true });
      });
    return;
  }

  if (!canSkipToNextTrain()) {
    return;
  }

  setSkipTrains(getSkipTrains() + 1);
  const normalized = normalizeApiTrainData(getLastApiData());
  const skippedToTrip = normalized.upcoming?.[getSkipTrains()] ?? null;
  const skippedToDeparture = skippedToTrip ? resolveTripDeparture(skippedToTrip) : null;
  saveSkipState(getSkipTrains(), null, skippedToDeparture);
  dismissSwipeHint();

  if (getLastApiData()) {
    render(applyClientSkip({ ...getLastApiData() }));
    fetchNextTrain();
  }
}

function skipToEarlierTrain() {
  if (isHeroPinLockingSwipe()) {
    return;
  }

  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    if (!entry || !canSkipToEarlierTrain()) {
      return;
    }

    const nextSkip = Math.max(0, getNearbySkip(entry.direction) - 1);
    setNearbySkip(entry.direction, nextSkip);
    dismissSwipeHint();
    applyNearbySkipOptimistic(entry.direction, nextSkip);
    fetchNearbyBoard()
      .then(() => renderNearbyBoard())
      .catch((error) => {
        deps.errorEl.textContent = error.message;
        deps.errorEl.hidden = false;
        renderNearbyBoard({ stale: true });
      });
    return;
  }

  if (!canSkipToEarlierTrain() || !getLastApiData()) {
    return;
  }

  setSkipTrains(getSkipTrains() - 1);
  if (getSkipTrains() <= 0) {
    clearSkipState();
  } else {
    const normalized = normalizeApiTrainData(getLastApiData());
    const skippedToTrip = normalized.upcoming?.[getSkipTrains()] ?? null;
    const skippedToDeparture = skippedToTrip ? resolveTripDeparture(skippedToTrip) : null;
    saveSkipState(getSkipTrains(), null, skippedToDeparture);
  }

  dismissSwipeHint();
  render(applyClientSkip({ ...getLastApiData() }));
  fetchNextTrain();
}

function resetHeroSwipePointer(event) {
  if (heroSwipePointerId === null) {
    return;
  }

  if (event && event.pointerId !== heroSwipePointerId) {
    return;
  }

  if (deps.heroEl?.hasPointerCapture?.(heroSwipePointerId)) {
    try {
      deps.heroEl.releasePointerCapture(heroSwipePointerId);
    } catch {
      // Ignore if capture was already released.
    }
  }

  heroSwipePointerId = null;
  swipeLastX = 0;
  swipeLastY = 0;
}

function handleHeroSwipeEnd(event) {
  if (deps.heroEl.classList.contains("hero-setup")) {
    resetHeroSwipePointer(event);
    return;
  }

  if (heroSwipePointerId === null || event.pointerId !== heroSwipePointerId) {
    return;
  }

  if (event.target?.closest?.(".hero-pin-btn, .nearby-dont-wait-btn, button, a, input, label")) {
    resetHeroSwipePointer(event);
    return;
  }

  swipeLastX = event.clientX;
  swipeLastY = event.clientY;
  const deltaX = swipeLastX - swipeStartX;
  const deltaY = swipeLastY - swipeStartY;
  resetHeroSwipePointer(event);

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < SWIPE_THRESHOLD_PX || absX <= absY) {
    return;
  }

  if (isHeroPinLockingSwipe()) {
    return;
  }

  dismissSwipeHint();

  if (deltaX < 0) {
    skipToNextTrain();
  } else {
    skipToEarlierTrain();
  }
}

function initHeroSwipe() {
  if (heroSwipeInitialized || !deps.heroEl) {
    return;
  }
  heroSwipeInitialized = true;

  const trackHeroPointer = (event) => {
    if (deps.heroEl.classList.contains("hero-setup") || !event.isPrimary) {
      return;
    }

    if (event.target.closest(".hero-pin-btn, .nearby-dont-wait-btn, button, a, input, label")) {
      return;
    }

    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipeLastX = event.clientX;
    swipeLastY = event.clientY;
    heroSwipePointerId = event.pointerId;

    try {
      deps.heroEl.setPointerCapture(event.pointerId);
    } catch {
      // Keep tracking — window pointerup handles release when capture fails.
    }
  };

  const moveHeroPointer = (event) => {
    if (heroSwipePointerId !== event.pointerId) {
      return;
    }

    swipeLastX = event.clientX;
    swipeLastY = event.clientY;
  };

  deps.heroEl.addEventListener("pointerdown", trackHeroPointer, { passive: true });
  deps.heroEl.addEventListener("pointermove", moveHeroPointer, { passive: true });
  deps.heroEl.addEventListener("pointerup", handleHeroSwipeEnd);
  deps.heroEl.addEventListener("pointercancel", handleHeroSwipeEnd);
  deps.heroEl.addEventListener("lostpointercapture", handleHeroSwipeEnd);
  window.addEventListener("pointerup", handleHeroSwipeEnd);
  window.addEventListener("pointercancel", handleHeroSwipeEnd);
}

function jumpToTargetTrain() {
  if (!getJourneyModeActive() || getSkipTrains() <= 0) {
    return;
  }

  clearSkipState();
  dismissSwipeHint();
  if (getLastApiData()) {
    render(prepareDisplayData(getLastApiData()));
    fetchNextTrain();
  }
}

async function toggleHeroPin() {
  if (isNearbyModeActive()) {
    const entry = getNearbyFocusedEntry();
    const next = entry?.data?.next ?? getLastRenderedNext();
    if (!next || !entry?.direction) {
      return;
    }

    if (isNearbyPinShowing(entry.direction)) {
      clearNearbyPin();
      renderNearbyBoard();
      deps.heroPinBtn?.blur();
      return;
    }

    // Notify me stays off until the user turns it on — pin alone must not
    // trigger the notification permission dialog.
    if (getNearbySession().pinNotifyMe === undefined) {
      getNearbySession().pinNotifyMe = false;
    }

    setNearbyPinFromTrip(entry.direction, next);
    syncNearbyPinSettings();
    renderNearbyBoard();
    deps.heroPinBtn?.blur();
    return;
  }

  const journey = getActiveJourney();
  if (!getJourneyModeActive() || !journey || isUnconfiguredJourney(journey) || !getLastRenderedNext()) {
    return;
  }

  const heroDeparture = resolveTripDeparture(getLastRenderedNext());
  if (!heroDeparture) {
    return;
  }

  const journeyClean = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(journey));
  const pinTrip = resolveJourneyPinTrip(getLastApiData(), journeyClean);
  const isPinnedView =
    getSkipTrains() === 0 &&
    isJourneyTargetPinnedToday(journeyClean) &&
    pinTrip &&
    journeysDepartureMatch(getLastRenderedNext(), pinTrip);

  if (isPinnedView) {
    clearJourneyPinOverride(journey.id);
    persistJourneyPinDismissed(journey.id);
    saveSkipStateForTrip(getLastApiData(), getLastRenderedNext());
  } else {
    if (getSkipTrains() > 0) {
      clearSkipState();
    }
    clearJourneyPinDismissed(journey.id);
    const freshJourney = sanitizeJourneyPinDismissed(sanitizeJourneyPinOverride(getActiveJourney()));
    const defaultTarget = resolveJourneyPreferredTargetTrip(getLastApiData(), freshJourney);
    if (defaultTarget && journeysDepartureMatch(getLastRenderedNext(), defaultTarget)) {
      clearJourneyPinOverride(journey.id);
    } else {
      persistJourneyPinOverride(journey.id, heroDeparture);
    }
  }

  if (getLastApiData()) {
    render(prepareDisplayData(getLastApiData()));
  }

  deps.syncHeroPinChrome?.();
  deps.heroPinBtn?.blur();
}


  function init(nextDeps = {}) {
    deps = nextDeps;
  }

  const api = {
    init,
    advanceLeavePinToNextTrain,
    advanceNearbyPinToNextTrain,
    applyClientSkip,
    applyNearbySkipOptimistic,
    buildNextFromFollowing,
    canSkipToEarlierTrain,
    canSkipToNextTrain,
    canSkipToTargetTrain,
    clearJourneyPinDismissed,
    clearJourneyPinOverride,
    clearSkipState,
    ensureFullNext,
    findPreferredTripSkipIndex,
    findTripByDepartureIso,
    findTripIndexInUpcoming,
    getHeroDepartLabel,
    getNextThenTrain,
    getSkippedEarlierTrain,
    getTrueNextTrip,
    getUpcomingTrips,
    handleHeroSwipeEnd,
    initHeroSwipe,
    isHeroPinLockingSwipe,
    isJourneyOverrideActiveToday,
    isJourneyPinDismissedToday,
    isJourneyTargetPinnedToday,
    journeysDepartureMatch,
    jumpToTargetTrain,
    leaveByArmedForDisplayedTrip,
    liveHorizonMinutes,
    persistJourneyPinDismissed,
    persistJourneyPinOverride,
    preferredMinutesForLiveGlance,
    prepareDisplayData,
    readSkipState,
    reconcileSkipWithApi,
    resetHeroSwipePointer,
    resolveJourneyPinTrip,
    resolveJourneyPreferredTargetTrip,
    sanitizeJourneyPinDismissed,
    sanitizeJourneyPinOverride,
    saveSkipState,
    saveSkipStateForTrip,
    shouldAdvanceLeavePinOnSkip,
    shouldAdvancePinOnNextTrain,
    skipStorageKey,
    skipToEarlierTrain,
    skipToNextTrain,
    skipToTargetTrain,
    slimFollowing,
    toggleHeroPin,
    tripHasDeparted,
    tripMatchesPreferredOrLater,
  };

  global.nextTrainNavigation = api;
})(window);
