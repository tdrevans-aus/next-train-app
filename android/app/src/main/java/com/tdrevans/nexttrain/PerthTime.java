package com.tdrevans.nexttrain;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

public final class PerthTime {

  private static final ZoneId ZONE = ZoneId.of("Australia/Perth");

  private PerthTime() {}

  public static ZoneId zone() {
    return ZONE;
  }

  public static int minutesSinceMidnight() {
    return minutesSinceMidnight(System.currentTimeMillis());
  }

  public static int minutesSinceMidnight(long epochMs) {
    return minutesSinceMidnight(epochMs, ZONE);
  }

  /** Zone-aware variant — use a journey's own city zone, not the Perth default (FB 15 Sep 2026). */
  public static int minutesSinceMidnight(long epochMs, ZoneId zone) {
    ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), zone != null ? zone : ZONE);
    return time.getHour() * 60 + time.getMinute();
  }

  /** Minutes from now until target ISO, using clock-face minutes (ignores seconds). */
  public static int minutesUntilWallClock(String targetIso, long nowMs) {
    int target = minutesFromIso(targetIso);
    if (target < 0) {
      return 0;
    }

    int nowMinute = minutesSinceMidnight(nowMs);
    int diff = target - nowMinute;
    if (diff < -12 * 60) {
      diff += 24 * 60;
    } else if (diff > 12 * 60) {
      diff -= 24 * 60;
    }
    return diff;
  }

  /** Next wall-clock minute in Perth — aligns widget repaints with the status-bar clock. */
  public static long nextMinuteBoundaryMs() {
    ZonedDateTime now = ZonedDateTime.now(ZONE);
    return now.truncatedTo(ChronoUnit.MINUTES).plusMinutes(1).toInstant().toEpochMilli();
  }

  /** Floor to the start of the leave-by minute in Perth — matches in-app wall-clock leave phases. */
  public static long truncateToMinuteStartMs(long epochMs) {
    if (epochMs <= 0) {
      return epochMs;
    }
    ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), ZONE);
    return time.truncatedTo(ChronoUnit.MINUTES).toInstant().toEpochMilli();
  }

  public static int dayOfWeekIso() {
    return dayOfWeekIso(System.currentTimeMillis());
  }

  public static int dayOfWeekIso(long epochMs) {
    return dayOfWeekIso(epochMs, ZONE);
  }

  /** Zone-aware variant — a departure just after midnight is "tomorrow" in its own city, not Perth. */
  public static int dayOfWeekIso(long epochMs, ZoneId zone) {
    return ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), zone != null ? zone : ZONE)
      .getDayOfWeek()
      .getValue();
  }

  public static String localDateKey() {
    return localDateKey(System.currentTimeMillis());
  }

  public static String localDateKey(long epochMs) {
    return localDateKey(epochMs, ZONE);
  }

  /** Zone-aware variant of {@link #localDateKey(long)}. */
  public static String localDateKey(long epochMs, ZoneId zone) {
    return ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), zone != null ? zone : ZONE)
      .format(DateTimeFormatter.ISO_LOCAL_DATE);
  }

  public static int parseClockMinutes(String value) {
    if (value == null || value.isEmpty()) {
      return -1;
    }
    String[] parts = value.split(":");
    if (parts.length < 2) {
      return -1;
    }
    try {
      int hour = Integer.parseInt(parts[0]);
      int minute = Integer.parseInt(parts[1]);
      return hour * 60 + minute;
    } catch (NumberFormatException error) {
      return -1;
    }
  }

  public static int minutesFromIso(String iso) {
    return minutesFromIso(iso, ZONE);
  }

  /** Zone-aware variant of {@link #minutesFromIso(String)}. */
  public static int minutesFromIso(String iso, ZoneId zone) {
    ZonedDateTime time = parseIsoToZone(iso, zone != null ? zone : ZONE);
    if (time == null) {
      return -1;
    }
    return time.getHour() * 60 + time.getMinute();
  }

  public static long epochMillisFromIso(String iso) {
    ZonedDateTime time = parseIsoToPerth(iso);
    if (time == null) {
      return 0L;
    }
    return time.toInstant().toEpochMilli();
  }

  /** Accepts `Z` instants and offset timestamps used by pin-resolution fixtures. */
  static ZonedDateTime parseIsoToPerth(String iso) {
    return parseIsoToZone(iso, ZONE);
  }

  /** Zone-aware variant of {@link #parseIsoToPerth(String)}. */
  static ZonedDateTime parseIsoToZone(String iso, ZoneId zone) {
    if (iso == null || iso.isEmpty()) {
      return null;
    }
    ZoneId resolvedZone = zone != null ? zone : ZONE;
    try {
      return Instant.parse(iso).atZone(resolvedZone);
    } catch (Exception ignored) {
      try {
        return OffsetDateTime.parse(iso).atZoneSameInstant(resolvedZone);
      } catch (Exception error) {
        return null;
      }
    }
  }

  public static String formatClockFromIso(String iso) {
    return formatClockFromIso(iso, ZONE);
  }

  /** Zone-aware variant of {@link #formatClockFromIso(String)}. */
  public static String formatClockFromIso(String iso, ZoneId zone) {
    if (iso == null || iso.isEmpty()) {
      return "—";
    }
    try {
      ZonedDateTime time = ZonedDateTime.ofInstant(Instant.parse(iso), zone != null ? zone : ZONE);
      return time.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()));
    } catch (Exception error) {
      return "—";
    }
  }

  public static String formatClockFromEpochMs(long epochMs) {
    return formatClockFromEpochMs(epochMs, ZONE);
  }

  /** Zone-aware variant of {@link #formatClockFromEpochMs(long)}. */
  public static String formatClockFromEpochMs(long epochMs, ZoneId zone) {
    if (epochMs <= 0) {
      return "—";
    }
    try {
      ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), zone != null ? zone : ZONE);
      return time.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()));
    } catch (Exception error) {
      return "—";
    }
  }

  public static String formatIsoFromEpochMs(long epochMs) {
    if (epochMs <= 0) {
      return "";
    }
    try {
      ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), ZONE);
      return time.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    } catch (Exception error) {
      return "";
    }
  }

  public static String formatUpdatedLine(long updatedAtMs) {
    if (updatedAtMs <= 0) {
      return "Updating…";
    }
    ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(updatedAtMs), ZONE);
    return "Updated " + time.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()));
  }

  public static String formatUpdatedAgo(long updatedAtMs) {
    return formatUpdatedAgo(updatedAtMs, ZONE);
  }

  /** Zone-aware variant of {@link #formatUpdatedAgo(long)}. */
  public static String formatUpdatedAgo(long updatedAtMs, ZoneId zone) {
    if (updatedAtMs <= 0) {
      return "Updating…";
    }
    long minutes = Math.max(0, (System.currentTimeMillis() - updatedAtMs) / 60_000L);
    if (minutes < 1) {
      return "Updated just now";
    }
    if (minutes < 60) {
      return "Updated " + minutes + "m ago";
    }
    ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(updatedAtMs), zone != null ? zone : ZONE);
    return time.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()));
  }
}
