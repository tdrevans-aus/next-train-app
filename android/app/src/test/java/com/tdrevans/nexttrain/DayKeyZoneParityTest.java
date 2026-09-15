package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import java.time.Instant;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * Read/write parity for the day-key family (fired-for-day, dismissed-for-day, alarm
 * request-code, on-the-way session) — Mark's PR #400 review found
 * {@code PreferredTrainReminder.ScheduleClock.live} reading {@code hasLeaveNowFiredForDay} with
 * the journey's own city zone while every write site still used the zero-argument, Perth-zone
 * {@code PerthTime.localDateKey()}. {@link DayKeys} is the single place both sides now go
 * through (closes #400 follow-up, 15 Sep 2026).
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 28, manifest = Config.NONE)
public class DayKeyZoneParityTest {

  private static Context context() {
    return WidgetLayoutTestSupport.appContext();
  }

  private static JSONObject journeyWithCityId(String cityId) throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("id", "j-london");
    journey.put("cityId", cityId);
    return journey;
  }

  @Test
  public void writeAndReadParity_londonEvening_sameKeyBothSides() throws Exception {
    // 22:00 BST — still Monday in London, but Perth (UTC+8) is already Tuesday 05:00. The old
    // bug wrote with zero-arg Perth's date and read with the journey's zone, so a fired-for-day
    // guard set at this instant would never be found again.
    long londonEveningMs = Instant.parse("2026-08-10T22:00:00+01:00").toEpochMilli();
    JSONObject journey = journeyWithCityId("uk-west-midlands");
    String journeyId = journey.optString("id", "");

    String writeKey = DayKeys.forJourney(journey, londonEveningMs);
    LeaveReminderSettingsStore.markLeaveNowFiredForDay(context(), journeyId, writeKey);

    String readKey = DayKeys.forJourney(journey, londonEveningMs);
    assertEquals(writeKey, readKey);
    assertTrue(LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context(), journeyId, readKey));

    // Regression guard: the zone-aware key must actually differ from the old zero-arg Perth
    // key at this instant, or this test would pass even with the bug still present.
    String oldPerthKey = PerthTime.localDateKey(londonEveningMs);
    assertNotEquals(oldPerthKey, readKey);
    assertEquals("2026-08-10", readKey);
    assertEquals("2026-08-11", oldPerthKey);
  }

  @Test
  public void perthJourney_sameInstant_yieldsPerthDate() throws Exception {
    // Same instant as above, but a Perth (or cityId-less) journey must still land on Perth's
    // own date — this class must not blanket-convert everything to a fixed non-Perth zone.
    long londonEveningMs = Instant.parse("2026-08-10T22:00:00+01:00").toEpochMilli();
    JSONObject perthJourney = journeyWithCityId("perth");
    JSONObject blankCityJourney = new JSONObject();
    blankCityJourney.put("id", "j-perth-blank");

    assertEquals("2026-08-11", DayKeys.forJourney(perthJourney, londonEveningMs));
    assertEquals("2026-08-11", DayKeys.forJourney(blankCityJourney, londonEveningMs));
    assertEquals(PerthTime.localDateKey(londonEveningMs), DayKeys.forJourney(perthJourney, londonEveningMs));
  }

  @Test
  public void upgradeMigration_clearsPerthKeyedEntriesFromOldVersion_soNoStaleCompare() throws Exception {
    long londonEveningMs = Instant.parse("2026-08-10T22:00:00+01:00").toEpochMilli();
    String journeyId = "j-london";

    // Simulate 3.0.1 having already written fired-for-day with the old zero-arg Perth key,
    // written directly to the prefs file (not via markLeaveNowFiredForDay, which — on 3.0.2 —
    // would itself trigger the one-time migration below before this "legacy" entry ever lands).
    String legacyPerthKey = PerthTime.localDateKey(londonEveningMs);
    context()
      .getSharedPreferences("next_train_leave_reminders", Context.MODE_PRIVATE)
      .edit()
      .putBoolean("day_leave:" + journeyId + ":" + legacyPerthKey, true)
      .apply();

    // First read on 3.0.2 triggers the one-time migration before any zone-aware comparison.
    LeaveReminderSettingsStore.migrateDayKeysIfNeeded(context());

    // The legacy Perth-keyed entry is gone — a fresh zone-aware read must not match it (which
    // would otherwise either silently skip the day's reminder or compare against a stale key).
    assertFalse(LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context(), journeyId, legacyPerthKey));
    JSONObject journey = journeyWithCityId("uk-west-midlands");
    String zoneAwareKey = DayKeys.forJourney(journey, londonEveningMs);
    assertFalse(LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context(), journeyId, zoneAwareKey));

    // Migration only ever runs once: a write after migration must survive a repeated call.
    LeaveReminderSettingsStore.markLeaveNowFiredForDay(context(), journeyId, zoneAwareKey);
    LeaveReminderSettingsStore.migrateDayKeysIfNeeded(context());
    assertTrue(LeaveReminderSettingsStore.hasLeaveNowFiredForDay(context(), journeyId, zoneAwareKey));
  }
}
