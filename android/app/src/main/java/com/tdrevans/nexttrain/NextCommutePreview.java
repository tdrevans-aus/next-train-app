package com.tdrevans.nexttrain;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Next Active-hours / preferred-train preview for the widget when no journey is in window.
 * Settings only — no network.
 */
public final class NextCommutePreview {

  public static final class Preview {
    public JSONObject journey;
    public int dayOffset;
    public int dayOfWeekIso;
    public int fromMinutes;
    public int untilMinutes;
    public String preferredOrFromClock;
  }

  private NextCommutePreview() {}

  public static Preview findNext(JSONObject settings, int nowMinutes, int dayOfWeekIso)
    throws Exception {
    Preview windowed = findNextWindowed(settings, nowMinutes, dayOfWeekIso);
    if (windowed != null) {
      return windowed;
    }
    return findNextTargetOnly(settings, nowMinutes, dayOfWeekIso);
  }

  private static Preview findNextWindowed(
    JSONObject settings,
    int nowMinutes,
    int dayOfWeekIso
  ) throws Exception {
    if (settings == null) {
      return null;
    }
    JSONArray journeys = settings.optJSONArray("journeys");
    if (journeys == null || journeys.length() == 0) {
      return null;
    }

    Preview best = null;
    int bestSort = Integer.MAX_VALUE;

    for (int dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      int day = ((dayOfWeekIso - 1 + dayOffset) % 7) + 1;
      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.optJSONObject(index);
        if (journey == null) {
          continue;
        }
        String station = journey.optString("station", "");
        String direction = journey.optString("direction", "");
        if (station.isEmpty() || direction.isEmpty()) {
          continue;
        }
        if (!JourneySelector.hasWindow(journey)) {
          continue;
        }
        if (!PreferredTrainReminder.isRemindDay(journey, day)) {
          continue;
        }

        int from = PerthTime.parseClockMinutes(journey.optString("defaultFrom", ""));
        int until = PerthTime.parseClockMinutes(journey.optString("defaultUntil", ""));
        if (from < 0 || until < 0) {
          continue;
        }

        if (dayOffset == 0) {
          // Later today only — skip windows already finished; skip in-window (caller shouldn't ask).
          if (JourneySelector.matchesWindow(journey, nowMinutes)) {
            continue;
          }
          if (from <= nowMinutes) {
            // Window started earlier today and we're past it (or overnight edge handled by matches).
            if (from < until && nowMinutes >= until) {
              int targetMinutes =
                PerthTime.parseClockMinutes(journey.optString("preferredTrainTime", ""));
              if (targetMinutes < 0 || targetMinutes <= nowMinutes) {
                continue;
              }
            } else if (from < until) {
              continue;
            }
          }
        }

        int sortMinutes = from;
        if (dayOffset == 0 && from < until && nowMinutes >= until) {
          int targetMinutes =
            PerthTime.parseClockMinutes(journey.optString("preferredTrainTime", ""));
          if (targetMinutes >= 0 && targetMinutes > nowMinutes) {
            sortMinutes = targetMinutes;
          }
        }

        int sortKey = dayOffset * 24 * 60 + sortMinutes;
        if (sortKey >= bestSort) {
          continue;
        }

        Preview preview = new Preview();
        preview.journey = journey;
        preview.dayOffset = dayOffset;
        preview.dayOfWeekIso = day;
        preview.fromMinutes = from;
        preview.untilMinutes = until;
        preview.preferredOrFromClock = formatTimeLine(journey, from, until);
        best = preview;
        bestSort = sortKey;
      }
    }

    return best;
  }

  /** Combo B — Target + Active days but no window; used when no windowed journey ranks higher. */
  private static Preview findNextTargetOnly(
    JSONObject settings,
    int nowMinutes,
    int dayOfWeekIso
  ) throws Exception {
    if (settings == null) {
      return null;
    }
    JSONArray journeys = settings.optJSONArray("journeys");
    if (journeys == null || journeys.length() == 0) {
      return null;
    }

    Preview best = null;
    int bestSort = Integer.MAX_VALUE;

    for (int dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      int day = ((dayOfWeekIso - 1 + dayOffset) % 7) + 1;
      for (int index = 0; index < journeys.length(); index += 1) {
        JSONObject journey = journeys.optJSONObject(index);
        if (journey == null) {
          continue;
        }
        String station = journey.optString("station", "");
        String direction = journey.optString("direction", "");
        if (station.isEmpty() || direction.isEmpty()) {
          continue;
        }
        if (JourneySelector.hasWindow(journey) || !hasTargetTrainClock(journey)) {
          continue;
        }
        if (!PreferredTrainReminder.isRemindDay(journey, day)) {
          continue;
        }

        int targetMinutes =
          PerthTime.parseClockMinutes(journey.optString("preferredTrainTime", ""));
        if (targetMinutes < 0) {
          continue;
        }

        if (dayOffset == 0 && targetMinutes <= nowMinutes) {
          continue;
        }

        int sortKey = dayOffset * 24 * 60 + targetMinutes;
        if (sortKey >= bestSort) {
          continue;
        }

        Preview preview = new Preview();
        preview.journey = journey;
        preview.dayOffset = dayOffset;
        preview.dayOfWeekIso = day;
        preview.fromMinutes = targetMinutes;
        preview.untilMinutes = targetMinutes;
        preview.preferredOrFromClock = formatClock(targetMinutes);
        best = preview;
        bestSort = sortKey;
      }
    }

    return best;
  }

  static String formatTimeLine(JSONObject journey, int fromMinutes, int untilMinutes) {
    String preferred = journey.optString("preferredTrainTime", "");
    if (!preferred.isEmpty()) {
      int preferredMinutes = PerthTime.parseClockMinutes(preferred);
      if (preferredMinutes >= 0) {
        return formatClock(preferredMinutes);
      }
      return preferred;
    }
    return formatClock(fromMinutes) + "–" + formatClock(untilMinutes);
  }

  static String preferredOrFromClock(JSONObject journey, int fromMinutes) {
    return formatTimeLine(journey, fromMinutes, fromMinutes);
  }

  /** True when the journey has an explicit target clock (not just an active-hours window). */
  static boolean hasTargetTrainClock(JSONObject journey) {
    if (journey == null) {
      return false;
    }
    String preferred = journey.optString("preferredTrainTime", "");
    return !preferred.isEmpty() && PerthTime.parseClockMinutes(preferred) >= 0;
  }

  /** Idle widget face label when outside active hours. */
  static String idleWidgetLabel(JSONObject journey) {
    return hasTargetTrainClock(journey) ? "Target Train" : "Next Journey";
  }

  static String formatClock(int minutesSinceMidnight) {
    int wrapped = ((minutesSinceMidnight % (24 * 60)) + (24 * 60)) % (24 * 60);
    int hour = wrapped / 60;
    int minute = wrapped % 60;
    return String.format(java.util.Locale.US, "%d:%02d", hour, minute);
  }

  static String formatPrimary(Preview preview) {
    if (preview == null) {
      return "";
    }
    return formatDayWord(preview) + " " + preview.preferredOrFromClock;
  }

  /** Today / Tomorrow / Thursday — for the small widget clock line under the time. */
  static String formatDayWord(Preview preview) {
    if (preview == null) {
      return "";
    }
    if (preview.dayOffset == 0) {
      return "Today";
    }
    if (preview.dayOffset == 1) {
      return "Tomorrow";
    }
    return dayName(preview.dayOfWeekIso);
  }

  static String dayName(int dayOfWeekIso) {
    switch (dayOfWeekIso) {
      case 1:
        return "Monday";
      case 2:
        return "Tuesday";
      case 3:
        return "Wednesday";
      case 4:
        return "Thursday";
      case 5:
        return "Friday";
      case 6:
        return "Saturday";
      case 7:
        return "Sunday";
      default:
        return "";
    }
  }
}
