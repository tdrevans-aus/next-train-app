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
    ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), ZONE);
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
    return ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), ZONE).getDayOfWeek().getValue();
  }

  public static String localDateKey() {
    return ZonedDateTime.now(ZONE).format(DateTimeFormatter.ISO_LOCAL_DATE);
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
    ZonedDateTime time = parseIsoToPerth(iso);
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
    if (iso == null || iso.isEmpty()) {
      return null;
    }
    try {
      return Instant.parse(iso).atZone(ZONE);
    } catch (Exception ignored) {
      try {
        return OffsetDateTime.parse(iso).atZoneSameInstant(ZONE);
      } catch (Exception error) {
        return null;
      }
    }
  }

  public static String formatClockFromIso(String iso) {
    if (iso == null || iso.isEmpty()) {
      return "—";
    }
    try {
      ZonedDateTime time = ZonedDateTime.ofInstant(Instant.parse(iso), ZONE);
      return time.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()));
    } catch (Exception error) {
      return "—";
    }
  }

  public static String formatClockFromEpochMs(long epochMs) {
    if (epochMs <= 0) {
      return "—";
    }
    try {
      ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(epochMs), ZONE);
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
    ZonedDateTime time = ZonedDateTime.ofInstant(Instant.ofEpochMilli(updatedAtMs), ZONE);
    return time.format(DateTimeFormatter.ofPattern("h:mm a", Locale.getDefault()));
  }
}
