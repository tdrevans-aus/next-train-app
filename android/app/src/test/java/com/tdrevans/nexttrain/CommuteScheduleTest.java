package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class CommuteScheduleTest {

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
    morning.put("remindDays", new JSONArray(new int[] { 1, 2, 3, 4, 5 }));
    JSONObject evening = new JSONObject();
    evening.put("id", "j-evening");
    evening.put("name", "Evening");
    evening.put("station", "Edgewater Stn");
    evening.put("direction", "Perth");
    evening.put("defaultFrom", "15:00");
    evening.put("defaultUntil", "18:00");
    evening.put("preferredTrainTime", "");
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
    assertTrue(snapshot.optBoolean("openNearbyOnTap"));
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
  public void resolveActiveNextTrip_skipsDepartedUpcomingTrain() throws Exception {
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

    JSONObject active = CommuteSchedule.resolveActiveNextTrip(payload);

    assertEquals(PerthTime.formatIsoFromEpochMs(nextMs), CommuteSchedule.tripDepartureIso(active));
  }

  @Test
  public void resolveActiveNextTrip_trueNext_evenWhenPreferredSet() throws Exception {
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
    JSONObject active = CommuteSchedule.resolveActiveNextTrip(payload, journey);
    assertEquals(PerthTime.formatIsoFromEpochMs(earlyMs), CommuteSchedule.tripDepartureIso(active));
    assertFalse(CommuteSchedule.leaveByArmedForTrip(active, journey));
    assertEquals(
      "Target " + NextCommutePreview.formatClock(preferredMinutes),
      CommuteSchedule.preferredHintForJourney(journey)
    );

    JSONObject withoutPreferred = CommuteSchedule.resolveActiveNextTrip(payload, new JSONObject());
    assertEquals(PerthTime.formatIsoFromEpochMs(earlyMs), CommuteSchedule.tripDepartureIso(withoutPreferred));
    assertTrue(CommuteSchedule.leaveByArmedForTrip(withoutPreferred, new JSONObject()));
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
