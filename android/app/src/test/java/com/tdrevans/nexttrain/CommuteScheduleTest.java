package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONObject;
import org.junit.Test;

public class CommuteScheduleTest {

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
  public void needsLocalRepaint_falseFarAway() throws Exception {
    long nowMs = System.currentTimeMillis();
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", false);
    snapshot.put("departureIso", PerthTime.formatIsoFromEpochMs(nowMs + 3L * 60L * 60_000L));
    snapshot.put("leaveByIso", PerthTime.formatIsoFromEpochMs(nowMs + 3L * 60L * 60_000L));

    assertFalse(CommuteSchedule.needsLocalRepaint(snapshot));
  }

  @Test
  public void repaintSnapshot_showsLeaveMinutesAgoWhenPastLeaveBy() throws Exception {
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

    assertEquals("Leave 5 min ago", repainted.optString("secondary"));
    assertTrue(repainted.optBoolean("late"));
  }

  @Test
  public void repaintSnapshot_showsSingularLeaveMinuteAgo() throws Exception {
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

    assertEquals("Leave 1 min ago", repainted.optString("secondary"));
  }

  @Test
  public void repaintSnapshot_showsLeaveEightMinutesAgo() throws Exception {
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

    assertEquals("Leave 8 min ago", repainted.optString("secondary"));
    assertTrue(repainted.optBoolean("late"));
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
  public void repaintSnapshot_showsUpdatingWhenDeparturePassedWithoutFollowing() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("trainClock", "10:47 am");
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 3L * 60_000L);
    cached.put("stale", false);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("Updating…", repainted.optString("primary"));
    assertEquals("", repainted.optString("trainClock"));
    assertEquals("Fetching next train…", repainted.optString("secondary"));
    assertTrue(repainted.optLong("updatingSinceMs", 0L) > 0L);
  }

  @Test
  public void repaintSnapshot_showsStaleRefreshWhenUpdatingTimedOut() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 5L * 60_000L);
    cached.put("updatingSinceMs", nowMs - 4L * 60_000L);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("—", repainted.optString("primary"));
    assertEquals("Tap to refresh", repainted.optString("secondary"));
    assertEquals("Times may be out of date", repainted.optString("updatedLine"));
    assertTrue(repainted.optBoolean("stale"));
    assertEquals(0L, repainted.optLong("updatingSinceMs", -1L));
  }

  @Test
  public void repaintSnapshot_showsStaleRefreshWhenRefreshAgeExceeded() throws Exception {
    long nowMs = System.currentTimeMillis();
    long departureMs = nowMs - 2L * 60_000L;

    JSONObject cached = new JSONObject();
    cached.put("empty", false);
    cached.put("journeyId", "j1");
    cached.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    cached.put("leaveByIso", PerthTime.formatIsoFromEpochMs(departureMs - 11L * 60_000L));
    cached.put("departMode", false);
    cached.put("refreshedAtMs", nowMs - 58L * 60_000L);

    JSONObject repainted = CommuteSchedule.repaintSnapshot(cached);

    assertEquals("—", repainted.optString("primary"));
    assertEquals("Tap to refresh", repainted.optString("secondary"));
    assertTrue(repainted.optBoolean("stale"));
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
}
