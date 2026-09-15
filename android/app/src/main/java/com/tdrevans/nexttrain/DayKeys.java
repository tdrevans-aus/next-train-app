package com.tdrevans.nexttrain;

import android.content.Context;
import java.time.ZoneId;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Single zone-aware day-key helper for the reminder day-key family: fired-for-day,
 * dismissed-for-day, alarm request-code and on-the-way session keys (closes #400 follow-up,
 * 15 Sep 2026).
 *
 * <p>Mark's #400 review found that {@link PreferredTrainReminder.ScheduleClock#live} reads
 * {@code hasLeaveNowFiredForDay} with the journey's own city zone, but every write site still
 * called the zero-argument, Perth-zone {@link PerthTime#localDateKey()} — so for a journey whose
 * local date has rolled over while Perth's has not (or vice versa), the read and write land on
 * different date strings and the "already fired today" guard silently fails. This class is the
 * one place that turns a journey (or a bare cityId, or a journeyId looked up against stored
 * settings) into the day key used at every read <em>and</em> write of those four key families, so
 * they can never drift apart again.
 */
public final class DayKeys {

  private DayKeys() {}

  /** Day key for a journey object that carries its own {@code cityId} (Perth is the fallback). */
  public static String forJourney(JSONObject journey, long nowMs) {
    return PerthTime.localDateKey(nowMs, zoneForJourney(journey));
  }

  public static ZoneId zoneForJourney(JSONObject journey) {
    return CityTimeZones.zoneFor(journey != null ? journey.optString("cityId", "") : "");
  }

  /** Day key for a bare cityId (nearby pin, or anywhere a full journey object isn't in hand). */
  public static String forCityId(String cityId, long nowMs) {
    return PerthTime.localDateKey(nowMs, CityTimeZones.zoneFor(cityId));
  }

  /**
   * Day key for a call site that only has a journeyId (a Capacitor plugin call from JS, e.g.
   * {@code acknowledgeDeparture}/{@code skipToday}) — looks the journey (or the nearby pin) up
   * in stored widget settings for its cityId. Falls back to Perth if the journey/pin can't be
   * found (e.g. a deleted journey), matching the pre-#398 default.
   */
  public static String forJourneyId(Context context, String journeyId, long nowMs) {
    return PerthTime.localDateKey(nowMs, zoneForJourneyId(context, journeyId));
  }

  /**
   * Recover the plain local-date string from a {@link PreferredTrainReminder.Target#dayKey}
   * (built as {@code journeyId + ":" + localDateKey} — see {@link PreferredTrainReminder},
   * {@link JourneyPinHelper} and {@link NearbyPinHelper}), so a call site holding only a
   * {@code Target} can reuse the exact zone-aware date it was built with instead of
   * recomputing (and risking a different zone/clock reads apart).
   */
  public static String dateFromDayKey(String dayKey, String journeyId) {
    if (dayKey == null || journeyId == null) {
      return null;
    }
    String prefix = journeyId + ":";
    return dayKey.startsWith(prefix) ? dayKey.substring(prefix.length()) : null;
  }

  static ZoneId zoneForJourneyId(Context context, String journeyId) {
    if (context == null || journeyId == null || journeyId.isEmpty()) {
      return CityTimeZones.zoneFor(null);
    }
    try {
      String raw = WidgetSettingsStore.readSettings(context);
      if (raw == null || raw.isEmpty()) {
        return CityTimeZones.zoneFor(null);
      }
      JSONObject settings = new JSONObject(raw);
      if (NearbyPinHelper.JOURNEY_ID.equals(journeyId)) {
        JSONObject pin = settings.optJSONObject("nearbyPin");
        return CityTimeZones.zoneFor(pin != null ? pin.optString("cityId", "") : "");
      }
      JSONArray journeys = settings.optJSONArray("journeys");
      if (journeys != null) {
        for (int index = 0; index < journeys.length(); index += 1) {
          JSONObject journey = journeys.optJSONObject(index);
          if (journey != null && journeyId.equals(journey.optString("id", ""))) {
            return zoneForJourney(journey);
          }
        }
      }
    } catch (Exception ignored) {
      // Fall back to Perth below.
    }
    return CityTimeZones.zoneFor(null);
  }
}
