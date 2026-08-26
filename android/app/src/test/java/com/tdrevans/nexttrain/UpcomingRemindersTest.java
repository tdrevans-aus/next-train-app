package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class UpcomingRemindersTest {

  @Test
  public void nextLeave_oneRowPerJourney_todaySubtitle() throws Exception {
    JSONObject morning = journey("morning", "Morning into town", "07:30", days(1, 2, 3, 4, 5));
    JSONObject evening = journey("evening", "Evening home", "17:30", days(1, 2, 3, 4, 5));
    evening.put("remindMe", false);

    JSONArray fires = UpcomingReminders.deriveFires(settingsWith(morning, evening), 6 * 60, 3);

    assertEquals(1, fires.length());
    JSONObject fire = fires.getJSONObject(0);
    assertEquals("morning", fire.optString("journeyId"));
    assertEquals("Leave today 7:20 for the 7:30", fire.optString("subtitle"));
  }

  @Test
  public void nextLeave_notToday_usesWeekdayNameOnce() throws Exception {
    JSONObject mondayOnly = journey("mon", "Monday into town", "07:30", days(1));

    JSONObject fire = UpcomingReminders.nextLeaveForJourney(mondayOnly, 8 * 60, 3);

    assertNotNull(fire);
    assertEquals(5, fire.optInt("dayOffset"));
    assertEquals("Leave Monday 7:20 for the 7:30", fire.optString("subtitle"));
  }

  @Test
  public void nextLeave_doneToday_usesNextWeekdayNotLeaveToday() throws Exception {
    JSONObject morning = journey("morning", "Morning into town", "07:30", days(1, 2, 3, 4, 5));

    JSONObject fire = UpcomingReminders.nextLeaveForJourney(morning, 6 * 60, 3, true);

    assertNotNull(fire);
    assertTrue(fire.optBoolean("doneToday"));
    assertEquals("Done today · next Thursday 7:20", fire.optString("subtitle"));
    assertFalse(fire.optString("subtitle").contains("Leave today"));
  }

  @Test
  public void pinLeaveFire_doneToday_isDoneTodayNotLeaveToday() throws Exception {
    java.time.ZonedDateTime dep = java.time.ZonedDateTime.now(PerthTime.zone())
      .plusHours(2)
      .withSecond(0)
      .withNano(0);
    JSONObject pin = new JSONObject();
    pin.put("station", "Warwick Stn");
    pin.put("direction", "Perth");
    pin.put("departureIso", dep.toInstant().toString());
    pin.put("notifyMe", true);
    pin.put("holdingUntilMs", dep.toInstant().toEpochMilli() + 60_000L);

    JSONObject settings = settingsWith();
    settings.put("nearbyPin", pin);
    settings.put("nearbyLeaveBeforeMinutes", 10);

    JSONObject fire = UpcomingReminders.pinLeaveFire(
      settings,
      System.currentTimeMillis(),
      java.util.Collections.singleton("nearby-pin")
    );
    assertNotNull(fire);
    assertEquals("Done today", fire.optString("subtitle"));
  }

  @Test
  public void deriveFires_sixJourneys_oneEachNotDayDump() throws Exception {
    JSONObject settings = settingsWith(
      journey("mon", "Monday into town", "07:30", days(1)),
      journey("tue", "Tuesday into town", "07:45", days(2)),
      journey("wed", "Wednesday into town", "08:00", days(3)),
      journey("thu", "Thursday into town", "08:15", days(4)),
      journey("fri", "Friday into town", "08:30", days(5)),
      journey("sun", "Sunday into town", "10:00", days(7))
    );

    JSONArray fires = UpcomingReminders.deriveFires(settings, 6 * 60, 3);

    assertEquals(6, fires.length());
    JSONObject wednesday = null;
    for (int index = 0; index < fires.length(); index += 1) {
      JSONObject fire = fires.getJSONObject(index);
      if ("wed".equals(fire.optString("journeyId"))) {
        wednesday = fire;
      }
    }
    assertNotNull(wednesday);
    assertEquals("Leave today 7:50 for the 8:00", wednesday.optString("subtitle"));
  }

  @Test
  public void nextLeave_remindMeOff_isNull() throws Exception {
    JSONObject off = journey("off", "Weekend", "09:00", days(6, 7));
    off.put("remindMe", false);
    assertNull(UpcomingReminders.nextLeaveForJourney(off, 6 * 60, 3));
  }

  @Test
  public void findLeftovers_unknownJourneyAndFastTest() throws Exception {
    JSONArray derived = UpcomingReminders.deriveFires(
      settingsWith(journey("morning", "Morning into town", "07:30", days(3))),
      6 * 60,
      3
    );

    JSONArray stored = new JSONArray();
    JSONObject ok = new JSONObject();
    ok.put("journeyId", "morning");
    ok.put("type", UpcomingReminders.TYPE_LEAVE_NOW);
    stored.put(ok);

    JSONObject ghost = new JSONObject();
    ghost.put("journeyId", "deleted");
    ghost.put("type", UpcomingReminders.TYPE_LEAVE_NOW);
    stored.put(ghost);

    JSONObject test = new JSONObject();
    test.put("journeyId", "morning");
    test.put("type", "fast_test:leave_now");
    stored.put(test);

    JSONArray leftovers = UpcomingReminders.findLeftovers(stored, derived);
    assertEquals(2, leftovers.length());
    assertTrue(UpcomingReminders.isLeftover(ghost, derived));
    assertFalse(UpcomingReminders.isLeftover(ok, derived));
  }

  @Test
  public void pinLeaveFire_nearbyRemindOn_oneRowNotAJourney() throws Exception {
    java.time.ZonedDateTime dep = java.time.ZonedDateTime.now(PerthTime.zone())
      .plusHours(2)
      .withSecond(0)
      .withNano(0);
    JSONObject pin = new JSONObject();
    pin.put("station", "Warwick Stn");
    pin.put("direction", "Perth");
    pin.put("departureIso", dep.toInstant().toString());
    pin.put("notifyMe", true);
    pin.put("holdingUntilMs", dep.toInstant().toEpochMilli() + 60_000L);

    JSONObject settings = settingsWith();
    settings.put("nearbyPin", pin);
    settings.put("nearbyLeaveBeforeMinutes", 10);

    JSONObject fire = UpcomingReminders.pinLeaveFire(settings, System.currentTimeMillis());
    assertNotNull(fire);
    assertEquals("nearby-pin", fire.optString("journeyId"));
    assertEquals("pin", fire.optString("kind"));
    assertTrue(fire.optString("journeyName").startsWith("Near me ·"));
    assertTrue(fire.optString("subtitle").startsWith("Leave today "));
    assertTrue(fire.optString("subtitle").contains(" for the "));
  }

  @Test
  public void pinLeaveFire_notifyOffOrExpired_isNull() throws Exception {
    JSONObject pin = new JSONObject();
    pin.put("station", "Warwick Stn");
    pin.put("direction", "Perth");
    pin.put("departureIso", java.time.Instant.now().plusSeconds(7200).toString());
    pin.put("notifyMe", false);
    pin.put("holdingUntilMs", System.currentTimeMillis() + 60_000L);
    JSONObject settings = settingsWith();
    settings.put("nearbyPin", pin);
    assertNull(UpcomingReminders.pinLeaveFire(settings, System.currentTimeMillis()));
  }

  @Test
  public void findLeftovers_currentPinIsNotLeftover() throws Exception {
    java.time.ZonedDateTime dep = java.time.ZonedDateTime.now(PerthTime.zone())
      .plusHours(2)
      .withSecond(0)
      .withNano(0);
    JSONObject pin = new JSONObject();
    pin.put("station", "Warwick Stn");
    pin.put("direction", "Perth");
    pin.put("departureIso", dep.toInstant().toString());
    pin.put("notifyMe", true);
    pin.put("holdingUntilMs", dep.toInstant().toEpochMilli() + 60_000L);
    JSONObject settings = settingsWith();
    settings.put("nearbyPin", pin);
    settings.put("nearbyLeaveBeforeMinutes", 10);

    JSONArray derived = UpcomingReminders.deriveFires(
      settings,
      PerthTime.minutesSinceMidnight(),
      PerthTime.dayOfWeekIso()
    );
    JSONObject storedPin = new JSONObject();
    storedPin.put("journeyId", "nearby-pin");
    storedPin.put("type", UpcomingReminders.TYPE_LEAVE_NOW);
    JSONArray stored = new JSONArray();
    stored.put(storedPin);

    assertFalse(UpcomingReminders.isLeftover(storedPin, derived));
    assertEquals(0, UpcomingReminders.findLeftovers(stored, derived).length());
  }

  private static JSONObject settingsWith(JSONObject... journeys) throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray array = new JSONArray();
    for (JSONObject journey : journeys) {
      array.put(journey);
    }
    settings.put("journeys", array);
    return settings;
  }

  private static JSONObject journey(String id, String name, String preferred, JSONArray days)
    throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("id", id);
    journey.put("kind", "journey");
    journey.put("name", name);
    journey.put("station", "Warwick Stn");
    journey.put("direction", "Perth");
    journey.put("remindMe", true);
    journey.put("useLeaveBefore", true);
    journey.put("leaveBeforeMinutes", 10);
    journey.put("preferredTrainTime", preferred);
    journey.put("remindDays", days);
    return journey;
  }

  private static JSONArray days(int... isoDays) {
    JSONArray array = new JSONArray();
    for (int day : isoDays) {
      array.put(day);
    }
    return array;
  }
}
