package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.junit.Test;

public class PerthTimeTest {

  // FB widget-stuck-updating (15 Sep 2026): a UK journey evaluated with a Perth-only "now"
  // reports the wrong wall-clock minute/day — these prove the zone-aware overloads fix that.

  // 20:00 UTC on 14 Sep 2026 (Monday): already 04:00 Tuesday in Perth (UTC+8) but still
  // 21:00 Monday in London (UTC+1 BST) — a UK journey's evening must not be read as Perth's
  // "04:00am, well outside any evening commute window", and vice versa for day-of-week logic.
  private static final Instant CROSS_MIDNIGHT_INSTANT =
    ZonedDateTime.of(2026, 9, 14, 20, 0, 0, 0, ZoneId.of("UTC")).toInstant();

  @Test
  public void minutesSinceMidnight_zoneAwareDiffersFromPerthForSameInstant() {
    long epochMs = CROSS_MIDNIGHT_INSTANT.toEpochMilli();

    int perthMinutes = PerthTime.minutesSinceMidnight(epochMs, ZoneId.of("Australia/Perth"));
    int londonMinutes = PerthTime.minutesSinceMidnight(epochMs, ZoneId.of("Europe/London"));

    assertEquals(4 * 60, perthMinutes);
    assertEquals(21 * 60, londonMinutes);
  }

  @Test
  public void dayOfWeekIso_zoneAwareCanDifferAcrossMidnight() {
    long epochMs = CROSS_MIDNIGHT_INSTANT.toEpochMilli();

    assertEquals(2, PerthTime.dayOfWeekIso(epochMs, ZoneId.of("Australia/Perth")));
    assertEquals(1, PerthTime.dayOfWeekIso(epochMs, ZoneId.of("Europe/London")));
  }

  @Test
  public void localDateKey_zoneAwareCanDifferAcrossMidnight() {
    long epochMs = CROSS_MIDNIGHT_INSTANT.toEpochMilli();

    assertEquals("2026-09-15", PerthTime.localDateKey(epochMs, ZoneId.of("Australia/Perth")));
    assertEquals("2026-09-14", PerthTime.localDateKey(epochMs, ZoneId.of("Europe/London")));
  }

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
