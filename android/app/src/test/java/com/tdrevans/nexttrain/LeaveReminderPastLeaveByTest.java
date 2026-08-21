package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.time.Instant;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class LeaveReminderPastLeaveByTest {

  @Test
  public void resolveLeaveNowTriggerAtMs_futureLeaveBy_usesLeaveBy() {
    long now = 1_000_000L;
    long leaveBy = now + 5 * 60_000L + 45_000L;
    assertEquals(
      PerthTime.truncateToMinuteStartMs(leaveBy),
      LeaveReminderScheduler.resolveLeaveNowTriggerAtMs(leaveBy, now)
    );
  }

  @Test
  public void resolveLeaveNowTriggerAtMs_alignsToLeaveByMinuteStart() {
    long leaveBy =
      Instant.parse("2026-08-21T22:15:47+08:00").toEpochMilli();
    long now = Instant.parse("2026-08-21T22:14:30+08:00").toEpochMilli();
    assertEquals(
      Instant.parse("2026-08-21T22:15:00+08:00").toEpochMilli(),
      LeaveReminderScheduler.resolveLeaveNowTriggerAtMs(leaveBy, now)
    );
  }

  @Test
  public void resolveLeaveNowTriggerAtMs_pastLeaveBy_firesImmediately() {
    long now = 1_000_000L;
    long leaveBy = now - 60_000L;
    assertEquals(now, LeaveReminderScheduler.resolveLeaveNowTriggerAtMs(leaveBy, now));
  }

  @Test
  public void isLeaveNowStillArmed_nearbyPin_requiresNotifyMe() throws Exception {
    JSONObject settings = new JSONObject();
    JSONObject pin = new JSONObject();
    pin.put("notifyMe", false);
    settings.put("nearbyPin", pin);
    assertFalse(
      LeaveReminderScheduler.isLeaveNowStillArmed(settings, NearbyPinHelper.JOURNEY_ID)
    );

    pin.put("notifyMe", true);
    assertTrue(
      LeaveReminderScheduler.isLeaveNowStillArmed(settings, NearbyPinHelper.JOURNEY_ID)
    );
  }

  @Test
  public void isLeaveNowStillArmed_journey_requiresRemindMe() throws Exception {
    JSONObject settings = new JSONObject();
    JSONObject journey = new JSONObject();
    journey.put("id", "j1");
    journey.put("kind", "journey");
    journey.put("remindMe", false);
    settings.put("journeys", new JSONArray().put(journey));
    assertFalse(LeaveReminderScheduler.isLeaveNowStillArmed(settings, "j1"));

    journey.put("remindMe", true);
    assertTrue(LeaveReminderScheduler.isLeaveNowStillArmed(settings, "j1"));
  }
}
