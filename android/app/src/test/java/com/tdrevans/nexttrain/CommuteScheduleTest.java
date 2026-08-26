package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class CommuteScheduleTest {

  @Test
  public void widgetLockedSnapshot_usesPausedCopy() throws Exception {
    CommuteSchedule.Result result = new CommuteSchedule.Result();
    result.widgetLocked = true;
    result.empty = false;

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);

    assertTrue(snapshot.optBoolean("widgetLocked"));
    assertEquals("Widget paused", snapshot.optString("primary"));
    assertEquals(
      "Your Pro trial ended. Unlock once to keep leave-by on your home screen.",
      snapshot.optString("trainClock")
    );
    assertEquals("Unlock Pro", snapshot.optString("route"));
    assertFalse(snapshot.optBoolean("stale"));
  }

  @Test
  public void hasWidgetAccess_alwaysTrue() throws Exception {
    JSONObject settings = new JSONObject();
    settings.put(
      "pro",
      new JSONObject().put("hasWidgetAccess", false)
    );
    assertTrue(CommuteSchedule.hasWidgetAccess(settings));
    assertTrue(CommuteSchedule.hasWidgetAccess(new JSONObject()));
  }

  @Test
  public void emptyWidgetSnapshot_promptsTapToSetUp() throws Exception {
    CommuteSchedule.Result result = new CommuteSchedule.Result();
    result.empty = true;

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);

    assertTrue(snapshot.optBoolean("empty"));
    assertEquals(WidgetUiBuilder.EMPTY_SETUP_PRIMARY, snapshot.optString("primary"));
    assertEquals(WidgetUiBuilder.EMPTY_SETUP_SUB, snapshot.optString("trainClock"));
    assertEquals("", snapshot.optString("secondary"));
  }

  @Test
  public void nearbyFallbackWidgetSnapshot_promptsNearMe() throws Exception {
    CommuteSchedule.Result result = new CommuteSchedule.Result();
    result.nearbyFallback = true;
    result.empty = false;

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);

    assertTrue(snapshot.optBoolean("nearbyFallback"));
    assertEquals("NEAR ME", snapshot.optString("label"));
    assertEquals("Near me", snapshot.optString("primary"));
    assertEquals("See trains near you", snapshot.optString("trainClock"));
  }

  @Test
  public void outsideHoursSnapshot_showsNextCommutePreview() throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray journeys = new JSONArray();
    JSONObject morning = new JSONObject();
    morning.put("id", "j-morning");
    morning.put("name", "Morning");
    morning.put("station", "Edgewater Stn");
    morning.put("direction", "Perth");
    morning.put("defaultFrom", "06:00");
    morning.put("defaultUntil", "09:00");
    morning.put("preferredTrainTime", "07:30");
    morning.put("kind", "journey");
    morning.put("remindDays", new JSONArray(new int[] { 1, 2, 3, 4, 5 }));
    JSONObject evening = new JSONObject();
    evening.put("id", "j-evening");
    evening.put("name", "Evening");
    evening.put("station", "Edgewater Stn");
    evening.put("direction", "Perth");
    evening.put("defaultFrom", "15:00");
    evening.put("defaultUntil", "18:00");
    evening.put("preferredTrainTime", "");
    evening.put("kind", "journey");
    evening.put("remindDays", new JSONArray(new int[] { 1, 2, 3, 4, 5 }));
    journeys.put(morning);
    journeys.put(evening);
    settings.put("journeys", journeys);

    JSONObject snapshot =
      CommuteSchedule.outsideHoursSnapshot(settings, 12 * 60, 2);

    assertTrue(snapshot.optBoolean("outsideHoursIdle"));
    assertFalse(snapshot.optBoolean("nearbyFallback"));
    assertEquals("Next Journey", snapshot.optString("label"));
    assertEquals("15:00–18:00", snapshot.optString("primary"));
    assertEquals("Today", snapshot.optString("trainClock"));
    assertEquals("Edgewater → Perth", snapshot.optString("route"));
    assertEquals("Edgewater → Perth", snapshot.optString("stationLabel"));
    assertEquals("", snapshot.optString("departureIso"));
    assertFalse(snapshot.optBoolean("openNearbyOnTap"));
    assertEquals("", snapshot.optString("updatedLine"));
  }

  @Test
  public void needsLocalRepaint_falseForOutsideHoursIdle() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("outsideHoursIdle", true);
    snapshot.put("primary", "Today 15:00–18:00");

    assertFalse(CommuteSchedule.needsLocalRepaint(snapshot));
    assertFalse(CommuteSchedule.isLiveCommuteSnapshot(snapshot));
  }

  @Test
  public void getLeavePhase_matchesTrainTimesJs() {
    assertEquals("calm", CommuteSchedule.getLeavePhase(10, 20));
    assertEquals("soon", CommuteSchedule.getLeavePhase(4, 20));
    assertEquals("urgent", CommuteSchedule.getLeavePhase(2, 20));
    assertEquals("now", CommuteSchedule.getLeavePhase(0, 20));
    assertEquals("late", CommuteSchedule.getLeavePhase(-1, 20));
    assertEquals("missed", CommuteSchedule.getLeavePhase(5, 0));
  }

  @Test
  public void repaintSnapshot_recomputesMinutesFromIso() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs + 20L * 60_000L;
    long leaveByMs = nowMs + 10L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("route", "Edgewater → Perth");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(leaveByMs));
    cached.put("departMode", false);
    cached.put("trainClock", "7:30 am");
    cached.put("refreshedAtMs", nowMs);
    cached.put("stale", false);
    cached.put("primary", "99 min");
    cached.put("secondary", "Leave in 99 min");

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("20 min", repainted.optString("primary"));
    assertEquals("Leave in 10 min", repainted.optString("secondary"));
    assertFalse(repainted.optBoolean("urgent"));
  }

  @Test
  public void needsLocalRepaint_trueWithinHour() throws Exception {
    long nowMs = System.currentTimeMillis();
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(nowMs + 30L * 60_000L));
    snapshot.put("leaveByIso", PerthTime.formatIsoFromEpochMs(nowMs + 20L * 60_000L));

    assertTrue(CommuteSchedule.needsLocalRepaint(snapshot));
  }

  @Test
  public void needsLocalRepaint_trueForFarFutureCountdown() throws Exception {
    long nowMs = System.currentTimeMillis();
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(nowMs + 3L * 60L * 60_000L));
    snapshot.put("leaveByIso", PerthTime.formatIsoFromEpochMs(nowMs + 3L * 60L * 60_000L - 10L * 60_000L));
    snapshot.put("primary", "180 min");

    assertTrue(CommuteSchedule.needsLocalRepaint(snapshot));
  }

  @Test
  public void needsLocalRepaint_falseForDegradedState() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(System.currentTimeMillis() + 20L * 60_000L));
    snapshot.put("primary", "Open");
    snapshot.put("secondary", CommuteSchedule.DEGRADED_SECONDARY);

    assertFalse(CommuteSchedule.needsLocalRepaint(snapshot));
  }

  @Test
  public void repaintSnapshot_hidesLeaveWhenPastGrace() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs + 8L * 60_000L;
    long leaveByMs = nowMs - 5L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("route", "Edgewater → Perth");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(leaveByMs));
    cached.put("departMode", false);
    cached.put("trainClock", "7:30 am");
    cached.put("refreshedAtMs", nowMs);
    cached.put("stale", false);
    cached.put("status", "On Time");

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("", repainted.optString("secondary"));
    assertFalse(repainted.optBoolean("late"));
  }

  @Test
  public void repaintSnapshot_keepsLeaveNowForOneMinuteGrace() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs + 12L * 60_000L;
    long leaveByMs = nowMs - 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(leaveByMs));
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs);
    cached.put("stale", false);
    cached.put("status", "On Time");

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("Leave now", repainted.optString("secondary"));
    assertFalse(repainted.optBoolean("late"));
    assertTrue(repainted.optBoolean("urgent"));
  }

  @Test
  public void repaintSnapshot_hidesLeaveEightMinutesPastLeaveBy() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs + 2L * 60_000L;
    long leaveByMs = nowMs - 8L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(leaveByMs));
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs);
    cached.put("stale", false);
    cached.put("status", "On Time");

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("", repainted.optString("secondary"));
    assertFalse(repainted.optBoolean("late"));
  }

  @Test
  public void needsNetworkRefresh_trueAfterDepartureMinutePasses() throws Exception {
    long departureMs = System.currentTimeMillis() - 90_000L;

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));

    assertTrue(CommuteSchedule.needsNetworkRefresh(snapshot));
  }

  @Test
  public void needsNetworkRefresh_falseBeforeDepartureMinuteEnds() throws Exception {
    long departureMs = System.currentTimeMillis() + 90_000L;

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));

    assertFalse(CommuteSchedule.needsNetworkRefresh(snapshot));
  }

  @Test
  public void needsLocalRepaint_falseWhenNetworkRefreshNeeded() throws Exception {
    long departureMs = System.currentTimeMillis() - 90_000L;

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    snapshot.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 10L * 60_000L));

    assertFalse(CommuteSchedule.needsLocalRepaint(snapshot));
  }

  @Test
  public void needsLocalRepaint_trueWhileUpdatingPastTimeout() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    snapshot.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 10L * 60_000L));
    snapshot.put("primary", "Updating…");
    snapshot.put("updatingSinceMs", nowMs - 2L * 60_000L);
    snapshot.put("updatingRetried", true);

    assertTrue(CommuteSchedule.needsLocalRepaint(snapshot));
  }

  @Test
  public void repaintSnapshot_showsStaleFaceWhenDeparturePassedWithoutFollowing() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("trainClock", "10:47 am");
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 2L * 60_000L);
    cached.put("stale", false);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("10:47 am", repainted.optString("primary"));
    assertEquals("", repainted.optString("secondary"));
    assertEquals("Refreshing…", repainted.optString("updatedLine"));
    assertTrue(repainted.optBoolean("staleWhileFetching"));
    assertTrue(repainted.optLong("updatingSinceMs", 0L) > 0L);
  }

  @Test
  public void repaintSnapshot_showsBriefUpdatingWhenNoStaleClockYet() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("trainClock", "");
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 2L * 60_000L);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("Updating…", repainted.optString("primary"));
    assertEquals("Fetching next train…", repainted.optString("secondary"));
    assertFalse(repainted.optBoolean("staleWhileFetching"));
  }

  @Test
  public void repaintSnapshot_showsDegradedWhenUpdatingRetryExhausted() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("trainClock", "10:47 am");
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 5L * 60_000L);
    cached.put("updatingSinceMs", nowMs - 2L * 60_000L);
    cached.put("updatingRetried", true);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("10:47 am", repainted.optString("primary"));
    assertEquals(CommuteSchedule.DEGRADED_SECONDARY, repainted.optString("secondary"));
    assertEquals("Times may be out of date", repainted.optString("updatedLine"));
    assertTrue(repainted.optBoolean("stale"));
    assertEquals(0L, repainted.optLong("updatingSinceMs", -1L));
    assertFalse(repainted.optBoolean("updatingRetried"));
  }

  @Test
  public void repaintSnapshot_retriesOnceBeforeDegraded() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("trainClock", "10:47 am");
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 5L * 60_000L);
    cached.put("updatingSinceMs", nowMs - 2L * 60_000L);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("10:47 am", repainted.optString("primary"));
    assertEquals("", repainted.optString("secondary"));
    assertEquals("Refreshing…", repainted.optString("updatedLine"));
    assertTrue(repainted.optBoolean("staleWhileFetching"));
    assertTrue(repainted.optBoolean("updatingRetried"));
    assertTrue(repainted.optBoolean("triggerFetchRetry"));
  }

  @Test
  public void repaintSnapshot_showsDegradedWhenRefreshAgeExceeded() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 58L * 60_000L);
    cached.put("updatingRetried", true);
    cached.put("updatingSinceMs", nowMs - 2L * 60_000L);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("Open", repainted.optString("primary"));
    assertEquals(CommuteSchedule.DEGRADED_SECONDARY, repainted.optString("secondary"));
    assertTrue(repainted.optBoolean("stale"));
  }

  @Test
  public void degradedPrimary_keepsCountdownWhileDepartureStillFuture() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs + 12L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("trainClock", "7:30 am");

    assertEquals("12 min", CommuteSchedule.degradedPrimary(cached));
  }

  @Test
  public void needsLocalRepaint_trueWhileUpdating() throws Exception {
    long departureMs = System.currentTimeMillis() - 90_000L;

    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    snapshot.put("updatingSinceMs", System.currentTimeMillis() - 60_000L);

    assertTrue(CommuteSchedule.needsLocalRepaint(snapshot));
  }

  @Test
  public void repaintSnapshot_promotesCachedFollowingAfterDeparture() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;
    long followingDepartureMs = nowMs + 15L * 60_000L;
    long followingLeaveMs = nowMs + 5L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 10L * 60_000L));
    cached.put("trainClock", "10:47 am");
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs);
    cached.put("preferredTrainTime", "07:30");
    cached.put("widgetFacePinned", true);
    cached.put("followingDepartureIso", PerthTime.formatIsoFromEpochMs(followingDepartureMs));
    cached.put("followingLeaveByIso", PerthTime.formatIsoFromEpochMs(followingLeaveMs));
    cached.put("followingDisplayTime", "11:05 am");

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("15 min", repainted.optString("primary"));
    assertEquals("11:05 am", repainted.optString("trainClock"));
    assertEquals("Leave in 5 min", repainted.optString("secondary"));
    assertEquals("", repainted.optString("followingDepartureIso"));
  }

  @Test
  public void repaintSnapshot_doesNotPromoteFollowingWithoutPinOrTarget() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;
    long followingDepartureMs = nowMs + 15L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j-route");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 10L * 60_000L));
    cached.put("trainClock", "10:47 am");
    cached.put("departMode", true);
    cached.put("refreshedAtMs", nowMs - 2L * 60_000L);
    cached.put("followingDepartureIso", PerthTime.formatIsoFromEpochMs(followingDepartureMs));
    cached.put("followingDisplayTime", "11:05 am");

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("10:47 am", repainted.optString("primary"));
    assertEquals(PerthTime.formatIsoFromEpochMs(departureMs), repainted.optString("departureIso"));
    assertTrue(repainted.optBoolean("staleWhileFetching"));
  }

  @Test
  public void resolvePinnedTrip_journeyShowsTargetNotTrueNext() throws Exception {
    long nowMs = System.currentTimeMillis();
    long earlyMs = nowMs + 4L * 60_000L;
    long targetMs = nowMs + 45L * 60_000L;
    int targetMinutes = PerthTime.minutesSinceMidnight(targetMs);

    JSONArray upcoming = new JSONArray();
    JSONObject early = new JSONObject();
    early.put("departure", PerthTime.formatIsoFromEpochMs(earlyMs));
    early.put("displayTime", "early");
    JSONObject target = new JSONObject();
    target.put("departure", PerthTime.formatIsoFromEpochMs(targetMs));
    target.put("displayTime", "target");
    upcoming.put(early);
    upcoming.put(target);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    JSONObject journey = new JSONObject();
    journey.put("kind", "journey");
    journey.put("id", "j-morning");
    journey.put("station", "Edgewater Stn");
    journey.put("direction", "Perth");
    journey.put(
      "preferredTrainTime",
      String.format(
        java.util.Locale.US,
        "%02d:%02d",
        targetMinutes / 60,
        targetMinutes % 60
      )
    );
    journey.put("defaultFrom", "00:00");
    journey.put("defaultUntil", "23:59");
    journey.put("useLeaveBefore", true);
    journey.put("remindDays", new JSONArray(new int[] { PerthTime.dayOfWeekIso(nowMs) }));

    JSONObject resolved = JourneyPinHelper.resolvePinnedTrip(payload, journey);

    assertEquals(PerthTime.formatIsoFromEpochMs(targetMs), CommuteSchedule.tripDepartureIso(resolved));
  }

  @Test
  public void resolvePinnedTrip_journeyWithoutTargetReturnsNull() throws Exception {
    long nowMs = System.currentTimeMillis();
    long earlyMs = nowMs + 4L * 60_000L;

    JSONArray upcoming = new JSONArray();
    JSONObject early = new JSONObject();
    early.put("departure", PerthTime.formatIsoFromEpochMs(earlyMs));
    early.put("displayTime", "6:34 am");
    upcoming.put(early);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    JSONObject journey = new JSONObject();
    journey.put("kind", "journey");
    journey.put("id", "j-custom");
    journey.put("station", "Edgewater Stn");
    journey.put("direction", "Perth");
    journey.put("defaultFrom", "06:00");
    journey.put("defaultUntil", "09:00");
    journey.put("useLeaveBefore", true);
    journey.put("remindDays", new JSONArray(new int[] { PerthTime.dayOfWeekIso(nowMs) }));

    assertEquals(null, JourneyPinHelper.resolvePinnedTrip(payload, journey));
  }

  @Test
  public void resolveTrueNextTrip_skipsDepartedUpcomingTrain() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departedMs = nowMs - 2L * 60_000L;
    long nextMs = nowMs + 20L * 60_000L;

    org.json.JSONArray upcoming = new org.json.JSONArray();
    JSONObject departed = new JSONObject();
    departed.put("departure", PerthTime.formatIsoFromEpochMs(departedMs));
    departed.put("displayTime", "10:47 am");
    JSONObject next = new JSONObject();
    next.put("departure", PerthTime.formatIsoFromEpochMs(nextMs));
    next.put("displayTime", "11:07 am");
    upcoming.put(departed);
    upcoming.put(next);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    JSONObject active = CommuteSchedule.resolveTrueNextTrip(payload);

    assertEquals(PerthTime.formatIsoFromEpochMs(nextMs), CommuteSchedule.tripDepartureIso(active));
  }

  @Test
  public void resolveTrueNextTrip_evenWhenPreferredSet() throws Exception {
    long nowMs = System.currentTimeMillis();
    long earlyMs = nowMs + 20L * 60_000L;
    long preferredMs = nowMs + 90L * 60_000L;
    long afterHorizonMs = nowMs + 5L * 60L * 60_000L;

    org.json.JSONArray upcoming = new org.json.JSONArray();
    JSONObject early = new JSONObject();
    early.put("departure", PerthTime.formatIsoFromEpochMs(earlyMs));
    early.put("displayTime", "early");
    JSONObject preferred = new JSONObject();
    preferred.put("departure", PerthTime.formatIsoFromEpochMs(preferredMs));
    preferred.put("displayTime", "preferred");
    JSONObject afterHorizon = new JSONObject();
    afterHorizon.put("departure", PerthTime.formatIsoFromEpochMs(afterHorizonMs));
    afterHorizon.put("displayTime", "late");
    upcoming.put(early);
    upcoming.put(preferred);
    upcoming.put(afterHorizon);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    int preferredMinutes = PerthTime.minutesFromIso(PerthTime.formatIsoFromEpochMs(preferredMs));
    int horizonMinutes = PerthTime.minutesFromIso(PerthTime.formatIsoFromEpochMs(nowMs + 3L * 60L * 60_000L));

    JSONObject journey = new JSONObject();
    journey.put(
      "preferredTrainTime",
      String.format(
        java.util.Locale.US,
        "%02d:%02d",
        preferredMinutes / 60,
        preferredMinutes % 60
      )
    );
    journey.put(
      "defaultUntil",
      String.format(
        java.util.Locale.US,
        "%02d:%02d",
        horizonMinutes / 60,
        horizonMinutes % 60
      )
    );

    // U-11 lock B: hero = true next; preferred only gates Leave By.
    JSONObject active = CommuteSchedule.resolveTrueNextTrip(payload);
    assertEquals(PerthTime.formatIsoFromEpochMs(earlyMs), CommuteSchedule.tripDepartureIso(active));
    assertFalse(CommuteSchedule.leaveByArmedForTrip(active, journey));
    assertEquals(
      "Target " + NextCommutePreview.formatClock(preferredMinutes),
      CommuteSchedule.preferredHintForJourney(journey)
    );

    JSONObject withoutPreferred = CommuteSchedule.resolveTrueNextTrip(payload);
    assertEquals(PerthTime.formatIsoFromEpochMs(earlyMs), CommuteSchedule.tripDepartureIso(withoutPreferred));
    JSONObject commuteNoPreferred = new JSONObject();
    commuteNoPreferred.put("kind", "journey");
    commuteNoPreferred.put("useLeaveBefore", true);
    assertTrue(CommuteSchedule.leaveByArmedForTrip(withoutPreferred, commuteNoPreferred));

    assertEquals("Target train", CommuteSchedule.liveWidgetLabel(journey, active));
    JSONObject targetTrip = new JSONObject();
    targetTrip.put("departure", PerthTime.formatIsoFromEpochMs(preferredMs));
    assertEquals("Target train", CommuteSchedule.liveWidgetLabel(journey, targetTrip));

    JSONObject dismissedJourney = new JSONObject(journey.toString());
    dismissedJourney.put("journeyPinDismissedDate", PerthTime.localDateKey());
    assertEquals("Target train", CommuteSchedule.liveWidgetLabel(dismissedJourney, targetTrip));
    assertEquals("Target train", CommuteSchedule.liveWidgetLabel(new JSONObject(), active));
  }

  @Test
  public void liveWidgetLabel_routeJourneyUsesTarget() throws Exception {
    JSONObject route = new JSONObject();
    route.put("kind", "route");
    route.put("station", "Edgewater Stn");
    route.put("direction", "Perth");
    route.put("preferredTrainTime", "07:30");

    JSONObject trip = new JSONObject();
    trip.put("departure", PerthTime.formatIsoFromEpochMs(System.currentTimeMillis() + 15L * 60_000L));

    assertEquals("Target train", CommuteSchedule.liveWidgetLabel(route, trip));
  }

  @Test
  public void liveWidgetLabel_dayOverrideUsesPinnedTrain() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("preferredTrainTime", "07:30");
    journey.put("journeyPinOverrideDate", PerthTime.localDateKey());
    journey.put("journeyPinOverrideIso", PerthTime.formatIsoFromEpochMs(System.currentTimeMillis() + 45L * 60_000L));

    JSONObject trip = new JSONObject();
    trip.put("departure", journey.optString("journeyPinOverrideIso"));

    assertEquals("Pinned train", CommuteSchedule.liveWidgetLabel(journey, trip));
  }

  @Test
  public void repaintSnapshot_keepsTargetLabelWhenLeaveByNotArmed() throws Exception {
    long departureMs = System.currentTimeMillis() + 45L * 60_000L;
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("label", "Target train");
    snapshot.put("widgetFacePinned", false);
    snapshot.put("leaveByArmed", false);
    snapshot.put("preferredTrainTime", "07:30");
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    snapshot.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 10L * 60_000L));
    snapshot.put("departMode", false);
    snapshot.put("status", "On Time");

    JSONObject repainted = CommuteSchedule.repaintSnapshot(snapshot);

    assertEquals("Target train", repainted.optString("label"));
  }

  @Test
  public void liveWidgetLabel_preferredTargetCommuteUsesTarget() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("preferredTrainTime", "07:30");
    journey.put("defaultFrom", "00:00");
    journey.put("defaultUntil", "23:59");

    JSONObject trip = new JSONObject();
    trip.put("departure", PerthTime.formatIsoFromEpochMs(System.currentTimeMillis() + 45L * 60_000L));

    assertEquals("Target train", CommuteSchedule.liveWidgetLabel(journey, trip));
  }

  @Test
  public void preservedLiveLabel_migratesLegacyPreferredTargetPinnedToTarget() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("label", "Pinned");
    snapshot.put("widgetFacePinned", true);
    snapshot.put("journeyId", "j-morning");

    assertEquals("Target train", CommuteSchedule.preservedLiveLabel(snapshot));
  }

  @Test
  public void preservedLiveLabel_keepsNearbyPinnedLabel() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("label", "Pinned");
    snapshot.put("journeyId", NearbyPinHelper.JOURNEY_ID);

    assertEquals("Pinned train", CommuteSchedule.preservedLiveLabel(snapshot));
  }

  @Test
  public void leaveByArmedForTrip_falseForRouteJourney() throws Exception {
    JSONObject route = new JSONObject();
    route.put("kind", "route");
    route.put("station", "Edgewater Stn");
    route.put("direction", "Perth");
    route.put("useLeaveBefore", true);
    route.put("preferredTrainTime", "07:30");

    JSONObject trip = new JSONObject();
    trip.put("departure", PerthTime.formatIsoFromEpochMs(System.currentTimeMillis() + 15L * 60_000L));

    assertFalse(CommuteSchedule.leaveByArmedForTrip(trip, route));
  }

  @Test
  public void toWidgetSnapshot_routeWithoutPinShowsNoTrains() throws Exception {
    CommuteSchedule.Result result = new CommuteSchedule.Result();
    JSONObject route = new JSONObject();
    route.put("kind", "route");
    route.put("id", "j-route");
    route.put("name", "Evening route");
    route.put("station", "Edgewater Stn");
    route.put("direction", "Perth");
    result.journey = route;
    result.journeyId = "j-route";
    result.route = "Edgewater → Perth";
    result.departMode = true;
    result.refreshedAtMs = System.currentTimeMillis();
    result.payload = new JSONObject().put("upcoming", new JSONArray());
    result.next = null;

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);

    assertEquals(WidgetUiBuilder.UNSET_PIN_PRIMARY, snapshot.optString("primary"));
    assertEquals(WidgetUiBuilder.UNSET_PIN_SUB, snapshot.optString("trainClock"));
    assertEquals("", snapshot.optString("secondary"));
    assertEquals("", snapshot.optString("route"));
    assertFalse(snapshot.optBoolean("leaveByArmed"));
  }

  @Test
  public void toWidgetSnapshot_journeyTargetWithoutLiveTripShowsTargetPreview() throws Exception {
    CommuteSchedule.Result result = new CommuteSchedule.Result();
    JSONObject journey = new JSONObject();
    journey.put("kind", "journey");
    journey.put("id", "j-morning");
    journey.put("name", "Morning into town");
    journey.put("station", "Edgewater Stn");
    journey.put("direction", "Perth");
    journey.put("preferredTrainTime", "07:30");
    JSONArray remindDays = new JSONArray();
    for (int day = 1; day <= 7; day += 1) {
      remindDays.put(day);
    }
    journey.put("remindDays", remindDays);
    result.journey = journey;
    result.journeyId = "j-morning";
    result.settings = new JSONObject().put("journeys", new JSONArray().put(journey));
    result.payload = new JSONObject().put("upcoming", new JSONArray());
    result.next = null;

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);

    assertFalse(WidgetUiBuilder.UNSET_PIN_PRIMARY.equals(snapshot.optString("primary")));
    assertEquals("Target Train", snapshot.optString("label"));
  }

  @Test
  public void toWidgetSnapshot_routePinOverrideUsesDepartModeWithoutLeaveBy() throws Exception {
    CommuteSchedule.Result result = new CommuteSchedule.Result();
    JSONObject route = new JSONObject();
    route.put("kind", "route");
    route.put("id", "j-route");
    route.put("name", "Evening route");
    route.put("station", "Edgewater Stn");
    route.put("direction", "Perth");
    route.put("journeyPinOverrideDate", PerthTime.localDateKey());
    route.put(
      "journeyPinOverrideIso",
      PerthTime.formatIsoFromEpochMs(System.currentTimeMillis() + 8L * 60_000L)
    );
    result.journey = route;
    result.journeyId = "j-route";
    result.route = "Edgewater → Perth";
    result.departMode = true;
    result.refreshedAtMs = System.currentTimeMillis();
    result.next = new JSONObject()
      .put("departure", route.optString("journeyPinOverrideIso"))
      .put("displayTime", "7:30 am")
      .put("status", "On Time")
      .put("minutesUntilDeparture", 8)
      .put("minutesUntilLeave", 8)
      .put("leavePhase", "calm");

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);

    assertEquals("Pinned train", snapshot.optString("label"));
    assertEquals("", snapshot.optString("secondary"));
    assertFalse(snapshot.optBoolean("leaveByArmed"));
    assertTrue(snapshot.optBoolean("departMode"));
  }

  @Test
  public void repaintSnapshot_showsRefreshingLineWhileStaleFetching() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("trainClock", "10:47 am");
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 5L * 60_000L);
    cached.put("stale", false);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("10:47 am", repainted.optString("primary"));
    assertEquals("", repainted.optString("secondary"));
    assertEquals("Refreshing…", repainted.optString("updatedLine"));
    assertTrue(repainted.optBoolean("staleWhileFetching"));
  }

  @Test
  public void resolveFollowingTrip_findsNextUpcomingAfterActive() throws Exception {
    long nowMs = System.currentTimeMillis();
    long activeMs = nowMs + 20L * 60_000L;
    long followingMs = nowMs + 35L * 60_000L;

    org.json.JSONArray upcoming = new org.json.JSONArray();
    JSONObject active = new JSONObject();
    active.put("departure", PerthTime.formatIsoFromEpochMs(activeMs));
    active.put("displayTime", "11:07 am");
    JSONObject following = new JSONObject();
    following.put("departure", PerthTime.formatIsoFromEpochMs(followingMs));
    following.put("displayTime", "11:22 am");
    upcoming.put(active);
    upcoming.put(following);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    JSONObject resolved = CommuteSchedule.resolveFollowingTrip(payload, active);

    assertEquals(PerthTime.formatIsoFromEpochMs(followingMs), CommuteSchedule.tripDepartureIso(resolved));
  }

  @Test
  public void resolveFollowingTrip_findsLaterTripWhenActiveNotAdjacent() throws Exception {
    long nowMs = System.currentTimeMillis();
    long activeMs = nowMs + 20L * 60_000L;
    long middleMs = nowMs + 25L * 60_000L;
    long followingMs = nowMs + 40L * 60_000L;

    org.json.JSONArray upcoming = new org.json.JSONArray();
    JSONObject active = new JSONObject();
    active.put("departure", PerthTime.formatIsoFromEpochMs(activeMs));
    JSONObject middle = new JSONObject();
    middle.put("departure", PerthTime.formatIsoFromEpochMs(middleMs));
    JSONObject following = new JSONObject();
    following.put("departure", PerthTime.formatIsoFromEpochMs(followingMs));
    upcoming.put(active);
    upcoming.put(middle);
    upcoming.put(following);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    JSONObject resolved = CommuteSchedule.resolveFollowingTrip(payload, active);

    assertEquals(PerthTime.formatIsoFromEpochMs(middleMs), CommuteSchedule.tripDepartureIso(resolved));
  }

  @Test
  public void buildLiveSnapshot_primaryFromDepartureIsoWhenApiMinutesMissing() throws Exception {
    long departureMs = System.currentTimeMillis() + 9L * 60_000L;
    String departureIso = PerthTime.formatIsoFromEpochMs(departureMs);

    CommuteSchedule.Result result = new CommuteSchedule.Result();
    JSONObject journey = new JSONObject();
    journey.put("id", "j-morning");
    journey.put("name", "Morning");
    journey.put("station", "Edgewater Stn");
    journey.put("direction", "Perth");
    journey.put("preferredTrainTime", "07:30");
    journey.put("useLeaveBefore", true);
    result.journey = journey;
    result.journeyId = "j-morning";
    result.route = "Edgewater → Perth";
    result.departureIso = departureIso;
    result.displayTime = "7:30 am";
    result.refreshedAtMs = System.currentTimeMillis();
    result.next = new JSONObject()
      .put("departure", departureIso)
      .put("displayTime", "7:30 am")
      .put("status", "On Time");
    // No minutesUntilDeparture on trip — must compute from departureIso.

    JSONObject snapshot = CommuteSchedule.toWidgetSnapshot(result);

    assertEquals("9 min", snapshot.optString("primary"));
    assertEquals(departureIso, snapshot.optString("departureIso"));
  }

  @Test
  public void shouldOpportunisticRefresh_trueWhenLiveAndStale() throws Exception {
    long nowMs = System.currentTimeMillis();
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(nowMs + 30L * 60_000L));
    snapshot.put("primary", "30 min");
    snapshot.put("refreshedAtMs", nowMs - 15L * 60_000L);

    assertTrue(CommuteSchedule.shouldOpportunisticRefresh(snapshot));
  }

  @Test
  public void shouldOpportunisticRefresh_falseWhenRecentlyRefreshed() throws Exception {
    long nowMs = System.currentTimeMillis();
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(nowMs + 30L * 60_000L));
    snapshot.put("primary", "30 min");
    snapshot.put("refreshedAtMs", nowMs - 5L * 60_000L);

    assertFalse(CommuteSchedule.shouldOpportunisticRefresh(snapshot));
  }

  @Test
  public void needsPreDeparturePrefetch_trueWhenFollowingMissingAndDepartureSoon() throws Exception {
    long nowMs = System.currentTimeMillis();
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(nowMs + 2L * 60_000L));
    snapshot.put("primary", "2 min");

    assertTrue(CommuteSchedule.needsPreDeparturePrefetch(snapshot));
  }

  @Test
  public void needsPreDeparturePrefetch_falseWhenFollowingCached() throws Exception {
    long nowMs = System.currentTimeMillis();
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(nowMs + 2L * 60_000L));
    snapshot.put("followingDepartureIso", PerthTime.formatIsoFromEpochMs(nowMs + 17L * 60_000L));
    snapshot.put("primary", "2 min");

    assertFalse(CommuteSchedule.needsPreDeparturePrefetch(snapshot));
  }
}
