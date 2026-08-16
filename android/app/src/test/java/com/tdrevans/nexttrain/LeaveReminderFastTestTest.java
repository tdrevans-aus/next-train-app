package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class LeaveReminderFastTestTest {

  @Test
  public void fastTestTriggerIsSixtySecondsFromNow() {
    long now = 1_700_000_000_000L;
    assertEquals(now + LeaveReminderScheduler.FAST_TEST_DELAY_MS, LeaveReminderScheduler.computeFastTestTriggerAtMs(now));
  }
}
