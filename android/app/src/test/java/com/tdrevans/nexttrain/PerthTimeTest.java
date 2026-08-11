package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.time.ZonedDateTime;
import org.junit.Test;

public class PerthTimeTest {

  @Test
  public void minutesUntilWallClock_statusBarExample_843To856() {
    ZonedDateTime departure =
      ZonedDateTime.of(2026, 8, 10, 8, 56, 0, 0, PerthTime.zone());
    ZonedDateTime now = ZonedDateTime.of(2026, 8, 10, 8, 43, 15, 0, PerthTime.zone());
    String departureIso = PerthTime.formatIsoFromEpochMs(departure.toInstant().toEpochMilli());

    assertEquals(13, PerthTime.minutesUntilWallClock(departureIso, now.toInstant().toEpochMilli()));
  }

  @Test
  public void minutesUntilWallClock_usesClockFaceNotEpochRounding() {
    ZonedDateTime departure =
      ZonedDateTime.of(2026, 8, 10, 16, 53, 0, 0, PerthTime.zone());
    ZonedDateTime now = departure.minusMinutes(9).plusSeconds(31);
    String departureIso = PerthTime.formatIsoFromEpochMs(departure.toInstant().toEpochMilli());
    long nowMs = now.toInstant().toEpochMilli();

    assertEquals(9, PerthTime.minutesUntilWallClock(departureIso, nowMs));
  }

  @Test
  public void minutesUntilWallClock_matchesLeaveByAgo() {
    ZonedDateTime leaveBy = ZonedDateTime.of(2026, 8, 10, 16, 42, 0, 0, PerthTime.zone());
    ZonedDateTime now = ZonedDateTime.of(2026, 8, 10, 16, 44, 20, 0, PerthTime.zone());
    String leaveByIso = PerthTime.formatIsoFromEpochMs(leaveBy.toInstant().toEpochMilli());

    assertEquals(-2, PerthTime.minutesUntilWallClock(leaveByIso, now.toInstant().toEpochMilli()));
  }

  @Test
  public void nextMinuteBoundaryMs_isStartOfNextPerthMinute() {
    long nowMs = System.currentTimeMillis();
    long boundaryMs = PerthTime.nextMinuteBoundaryMs();

    assertTrue(boundaryMs > nowMs);
    assertTrue(boundaryMs - nowMs <= 60_000L);
    assertEquals(
      PerthTime.minutesSinceMidnight(nowMs) + 1,
      PerthTime.minutesSinceMidnight(boundaryMs)
    );
  }
}
