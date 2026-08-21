package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class LeaveAlarmFb34Test {

  @Test
  public void leaveNow_usesAlarmClock_getReadyDoesNot() {
    assertTrue(LeaveReminderScheduler.shouldUseAlarmClock(LeaveReminderScheduler.TYPE_LEAVE_NOW));
    assertFalse(LeaveReminderScheduler.shouldUseAlarmClock(LeaveReminderScheduler.TYPE_GET_READY));
    assertFalse(LeaveReminderScheduler.shouldUseAlarmClock(null));
  }

  @Test
  public void departureMsFromKey_parsesIsoAfterColon() {
    long ms = PerthTime.epochMillisFromIso("2026-08-19T07:42:00+08:00");
    assertTrue(ms > 0);
    assertEquals(
      ms,
      LeaveReminderNotifier.departureMsFromKey("journey-1:2026-08-19T07:42:00+08:00")
    );
  }

  @Test
  public void departureMsFromKey_missingIso_returnsZero() {
    assertEquals(0L, LeaveReminderNotifier.departureMsFromKey(null));
    assertEquals(0L, LeaveReminderNotifier.departureMsFromKey(""));
    assertEquals(0L, LeaveReminderNotifier.departureMsFromKey("no-colon"));
  }

  @Test
  public void alarmChannelId_isDedicated() {
    assertEquals("leave_alarm_v2", LeaveReminderNotifier.ALARM_CHANNEL_ID);
  }
}
