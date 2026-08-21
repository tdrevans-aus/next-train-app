package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class OnTheWayFb16Test {

  @Test
  public void departureIsoFromKey_stripsJourneyPrefix() {
    assertEquals(
      "2026-08-21T07:42:00+08:00",
      CommuteStripScheduler.departureIsoFromKey("j1:2026-08-21T07:42:00+08:00")
    );
  }

  @Test
  public void departureIsoFromKey_empty_returnsEmpty() {
    assertEquals("", CommuteStripScheduler.departureIsoFromKey(null));
    assertEquals("", CommuteStripScheduler.departureIsoFromKey(""));
    assertEquals("", CommuteStripScheduler.departureIsoFromKey("no-colon"));
  }

  @Test
  public void stripEnd_afterLeaveBy_includesGrace() {
    long leaveBy = 1_000_000L;
    String depIso = PerthTime.formatIsoFromEpochMs(leaveBy + 15 * 60_000L);
    long end = CommuteStripScheduler.computeStripEndMs(leaveBy, depIso);
    long departureMs = PerthTime.epochMillisFromIso(depIso);
    assertEquals(departureMs + CommuteStripScheduler.GRACE_MS, end);
    assertTrue(end > leaveBy);
  }

  @Test
  public void onTheWayReusesLeaveAlarmNotificationId() {
    assertEquals(
      LeaveReminderNotifier.NOTIFICATION_ID,
      CommuteStripNotifier.NOTIFICATION_ID_ON_THE_WAY
    );
  }

  @Test
  public void computeChronoEndMs_isDepartureMinute() {
    long departureMs = PerthTime.epochMillisFromIso("2026-08-21T23:10:00+08:00");
    assertEquals(
      PerthTime.epochMillisFromIso("2026-08-21T23:10:00+08:00"),
      CommuteStripNotifier.computeChronoEndMs(departureMs)
    );
  }

  @Test
  public void computeOneMinPhaseMs_isOneMinuteBeforeDeparture() {
    long departureMs = PerthTime.epochMillisFromIso("2026-08-21T23:10:00+08:00");
    assertEquals(
      PerthTime.epochMillisFromIso("2026-08-21T23:09:00+08:00"),
      CommuteStripNotifier.computeOneMinPhaseMs(departureMs)
    );
  }

  @Test
  public void resolveOnTheWayDisplay_chronometerCountsToTrainNotOneMinuteEarly() {
    long departureMs = PerthTime.epochMillisFromIso("2026-08-21T23:10:00+08:00");
    long nowMs = PerthTime.epochMillisFromIso("2026-08-21T23:03:47+08:00");
    CommuteStripNotifier.OnTheWayDisplay display =
      CommuteStripNotifier.resolveOnTheWayDisplay(departureMs, nowMs);

    assertEquals(CommuteStripNotifier.OnTheWayPhase.CHRONOMETER, display.phase);
    assertEquals("Train countdown", display.title);
    assertTrue(display.usesChronometer(nowMs));
    assertEquals(
      PerthTime.epochMillisFromIso("2026-08-21T23:10:00+08:00"),
      display.chronometerToMs
    );
    assertEquals(6 * 60 + 13, (display.chronometerToMs - nowMs) / 1000L);
  }

  @Test
  public void resolveOnTheWayDisplay_staticOneMinute() {
    long departureMs = PerthTime.epochMillisFromIso("2026-08-21T22:45:00+08:00");
    long nowMs = PerthTime.epochMillisFromIso("2026-08-21T22:44:10+08:00");
    CommuteStripNotifier.OnTheWayDisplay display =
      CommuteStripNotifier.resolveOnTheWayDisplay(departureMs, nowMs);

    assertEquals(CommuteStripNotifier.OnTheWayPhase.STATIC_ONE_MIN, display.phase);
    assertEquals("Train countdown · 1 min", display.title);
    assertFalse(display.usesChronometer(nowMs));
  }

  @Test
  public void resolveOnTheWayDisplay_staticNow() {
    long departureMs = PerthTime.epochMillisFromIso("2026-08-21T22:45:00+08:00");
    long nowMs = PerthTime.epochMillisFromIso("2026-08-21T22:45:00+08:00");
    CommuteStripNotifier.OnTheWayDisplay display =
      CommuteStripNotifier.resolveOnTheWayDisplay(departureMs, nowMs);

    assertEquals(CommuteStripNotifier.OnTheWayPhase.STATIC_NOW, display.phase);
    assertEquals("Train countdown · now", display.title);
    assertFalse(display.usesChronometer(nowMs));
  }

  @Test
  public void formatMinutesToTrain_usesWallClockMinutes() {
    String departureIso = "2026-08-21T22:45:00+08:00";
    long departureMs = PerthTime.epochMillisFromIso(departureIso);
    long nowMs = PerthTime.epochMillisFromIso("2026-08-21T22:42:30+08:00");
    assertEquals(
      "Train countdown · 3 min",
      CommuteStripNotifier.formatMinutesToTrain(departureMs, nowMs)
    );
    assertEquals(
      "Train countdown · now",
      CommuteStripNotifier.formatMinutesToTrain(
        PerthTime.epochMillisFromIso("2026-08-21T22:40:00+08:00"),
        nowMs
      )
    );
  }
}
