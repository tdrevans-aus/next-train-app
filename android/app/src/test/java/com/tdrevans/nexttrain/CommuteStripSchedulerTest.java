package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;

import java.time.Instant;
import org.json.JSONObject;
import org.junit.Test;

public class CommuteStripSchedulerTest {

  private static final long LEAVE_BY_MS = Instant.parse("2026-08-10T07:20:00+08:00").toEpochMilli();
  private static final String DEPARTURE_ISO = "2026-08-10T07:30:00+08:00";

  @Test
  public void stripStartAtLeaveByWhenEarlyOff() throws Exception {
    JSONObject settings = new JSONObject();
    settings.put("earlyHeadsUp", false);
    settings.put("earlyOffsetMinutes", 5);

    long start = CommuteStripScheduler.computeStripStartMsFromSettings(settings, LEAVE_BY_MS);
    assertEquals(LEAVE_BY_MS, start);
  }

  @Test
  public void stripStartEarlyWhenEarlyOn() throws Exception {
    JSONObject settings = new JSONObject();
    settings.put("earlyHeadsUp", true);
    settings.put("earlyOffsetMinutes", 5);

    long start = CommuteStripScheduler.computeStripStartMsFromSettings(settings, LEAVE_BY_MS);
    assertEquals(Instant.parse("2026-08-10T07:15:00+08:00").toEpochMilli(), start);
  }

  @Test
  public void stripEndUsesDepartureGraceCap() {
    long startAtMs = Instant.parse("2026-08-10T07:15:00+08:00").toEpochMilli();
    long end = CommuteStripScheduler.computeStripEndMs(startAtMs, DEPARTURE_ISO);
    assertEquals(Instant.parse("2026-08-10T07:40:00+08:00").toEpochMilli(), end);
  }

  @Test
  public void stripEndUsesNinetyMinuteCap() {
    long startAtMs = Instant.parse("2026-08-10T06:00:00+08:00").toEpochMilli();
    long end = CommuteStripScheduler.computeStripEndMs(startAtMs, DEPARTURE_ISO);
    assertEquals(startAtMs + CommuteStripScheduler.MAX_RUNTIME_MS, end);
  }
}
