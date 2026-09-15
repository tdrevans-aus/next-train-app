package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.stream.Collectors;
import org.json.JSONObject;
import org.junit.Test;

public class PreferredTrainReminderTest {

  private static final long MONDAY_6AM_PERTH_MS = Instant.parse("2026-08-10T06:00:00+08:00").toEpochMilli();
  private static final String MONDAY_DATE = "2026-08-10";
  private static final int MONDAY_ISO = 1;
  private static final int SATURDAY_ISO = 6;

  private static JSONObject loadFixture(String name) throws Exception {
    String path = "/leave-reminders/" + name;
    InputStream stream = PreferredTrainReminderTest.class.getResourceAsStream(path);
    if (stream == null) {
      throw new IllegalStateException("Missing fixture: " + path);
    }

    try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
      String json = reader.lines().collect(Collectors.joining("\n"));
      return new JSONObject(json);
    }
  }

  private static PreferredTrainReminder.ScheduleClock mondayMorningClock(boolean leaveNowFiredToday) {
    return new PreferredTrainReminder.ScheduleClock(
      MONDAY_6AM_PERTH_MS,
      MONDAY_ISO,
      MONDAY_DATE,
      leaveNowFiredToday
    );
  }

  private static PreferredTrainReminder.ScheduleClock saturdayMorningClock() {
    return new PreferredTrainReminder.ScheduleClock(
      MONDAY_6AM_PERTH_MS,
      SATURDAY_ISO,
      "2026-08-15",
      false
    );
  }

  @Test
  public void preferred720_picks730_not710() throws Exception {
    JSONObject journey = loadFixture("journey-morning.json");
    JSONObject payload = loadFixture("payload-710-730.json");

    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      mondayMorningClock(false)
    );

    assertNotNull(target);
    assertEquals("2026-08-10T07:30:00+08:00", target.departureIso);
    assertEquals("7:30 am", target.trainTime);
    assertEquals(Instant.parse("2026-08-10T07:20:00+08:00").toEpochMilli(), target.leaveByMs);
  }

  @Test
  public void preferred720_neverPicks600() throws Exception {
    JSONObject journey = loadFixture("journey-morning.json");
    JSONObject payload = loadFixture("payload-600-710-730.json");

    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      mondayMorningClock(false)
    );

    assertNotNull(target);
    assertEquals("2026-08-10T07:30:00+08:00", target.departureIso);
    assertTrue(!target.departureIso.contains("T06:00:00"));
  }

  @Test
  public void remindDaysMonFri_noTargetOnSaturday() throws Exception {
    JSONObject journey = loadFixture("journey-morning.json");
    JSONObject payload = loadFixture("payload-710-730.json");

    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      saturdayMorningClock()
    );

    assertNull(target);
  }

  @Test
  public void leaveNowFiredToday_blocksSecondCompute() throws Exception {
    JSONObject journey = loadFixture("journey-morning.json");
    JSONObject payload = loadFixture("payload-710-730.json");

    PreferredTrainReminder.Target first = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      mondayMorningClock(false)
    );
    PreferredTrainReminder.Target second = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      mondayMorningClock(true)
    );

    assertNotNull(first);
    assertNull(second);
  }

  @Test
  public void pastLeaveBy_stillTargetsUpcomingPreferredTrain() throws Exception {
    // 07:25 — leave-by for 7:30 train was 07:20 (10 min walk); strip must still arm.
    JSONObject journey = loadFixture("journey-morning.json");
    JSONObject payload = loadFixture("payload-710-730.json");
    PreferredTrainReminder.ScheduleClock afterLeaveBy = new PreferredTrainReminder.ScheduleClock(
      Instant.parse("2026-08-10T07:25:00+08:00").toEpochMilli(),
      MONDAY_ISO,
      MONDAY_DATE,
      false
    );

    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      afterLeaveBy
    );

    assertNotNull(target);
    assertEquals("2026-08-10T07:30:00+08:00", target.departureIso);
    assertEquals(Instant.parse("2026-08-10T07:20:00+08:00").toEpochMilli(), target.leaveByMs);
  }

  @Test
  public void pastLeaveBy_stripClockIgnoresLeaveNowAlreadyFired() throws Exception {
    // Reminder ping already fired; Live countdown toggled on mid-window must still resolve.
    JSONObject journey = loadFixture("journey-morning.json");
    JSONObject payload = loadFixture("payload-710-730.json");
    PreferredTrainReminder.ScheduleClock stripClock = new PreferredTrainReminder.ScheduleClock(
      Instant.parse("2026-08-10T07:25:00+08:00").toEpochMilli(),
      MONDAY_ISO,
      MONDAY_DATE,
      true
    );

    PreferredTrainReminder.Target blocked = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      stripClock
    );
    assertNull(blocked);

    PreferredTrainReminder.ScheduleClock forStrip = new PreferredTrainReminder.ScheduleClock(
      Instant.parse("2026-08-10T07:25:00+08:00").toEpochMilli(),
      MONDAY_ISO,
      MONDAY_DATE,
      false
    );
    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      forStrip
    );
    assertNotNull(target);
    assertEquals("2026-08-10T07:30:00+08:00", target.departureIso);
  }

  @Test
  public void emptyActiveUntil_doesNotArmAfternoonForMorningPreferred() throws Exception {
    JSONObject journey = loadFixture("journey-morning.json");
    journey.put("defaultFrom", "");
    journey.put("defaultUntil", "");
    journey.put("preferredTrainTime", "07:30");

    // Afternoon payload — same shape as morning but 15:12 / 17:13 style times.
    JSONObject payload = new JSONObject(
      "{"
        + "\"upcoming\":["
        + "{\"departure\":\"2026-08-10T15:12:00+08:00\",\"leaveBy\":\"2026-08-10T15:02:00+08:00\",\"displayTime\":\"3:12 pm\"},"
        + "{\"departure\":\"2026-08-10T17:13:00+08:00\",\"leaveBy\":\"2026-08-10T17:03:00+08:00\",\"displayTime\":\"5:13 pm\"}"
        + "]"
        + "}"
    );

    PreferredTrainReminder.ScheduleClock afternoon = new PreferredTrainReminder.ScheduleClock(
      Instant.parse("2026-08-10T17:11:00+08:00").toEpochMilli(),
      MONDAY_ISO,
      MONDAY_DATE,
      false
    );

    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      afternoon
    );

    assertNull(target);
  }

  @Test
  public void tuesdayNightMorningTarget_schedulesTomorrowNotTonight() throws Exception {
    JSONObject journey = new JSONObject(
      "{"
        + "\"id\":\"j-morning\","
        + "\"kind\":\"journey\","
        + "\"station\":\"Perth Underground Stn\","
        + "\"direction\":\"Mandurah\","
        + "\"preferredTrainTime\":\"07:30\","
        + "\"defaultFrom\":\"06:00\","
        + "\"defaultUntil\":\"09:00\","
        + "\"remindDays\":[1,2,3,4,5],"
        + "\"leaveBeforeMinutes\":10,"
        + "\"useLeaveBefore\":true"
        + "}"
    );
    JSONObject payload = new JSONObject(
      "{"
        + "\"next\":{\"departure\":\"2026-08-18T23:15:00+08:00\",\"leaveBy\":\"2026-08-18T23:05:00+08:00\",\"displayTime\":\"23:15\"},"
        + "\"upcoming\":["
        + "{\"departure\":\"2026-08-18T23:15:00+08:00\",\"leaveBy\":\"2026-08-18T23:05:00+08:00\",\"displayTime\":\"23:15\"},"
        + "{\"departure\":\"2026-08-19T07:30:00+08:00\",\"leaveBy\":\"2026-08-19T07:20:00+08:00\",\"displayTime\":\"07:30\"}"
        + "]"
        + "}"
    );
    PreferredTrainReminder.ScheduleClock tuesdayNight = new PreferredTrainReminder.ScheduleClock(
      Instant.parse("2026-08-18T22:53:00+08:00").toEpochMilli(),
      2,
      "2026-08-18",
      false
    );

    PreferredTrainReminder.Target target = PreferredTrainReminder.computeForJourney(
      journey,
      payload,
      false,
      tuesdayNight
    );

    assertNotNull(target);
    assertEquals("2026-08-19T07:30:00+08:00", target.departureIso);
    assertEquals(Instant.parse("2026-08-19T07:20:00+08:00").toEpochMilli(), target.leaveByMs);
    assertTrue(!target.departureIso.contains("T23:15:00"));
  }

  @Test
  public void isRemindDay_zoneAware_londonEveningStaysOnLocalMonday() throws Exception {
    // 23:30 BST Monday — CommuteStripScheduler and LeaveReminderScheduler both call
    // isRemindDay(journey, nowMs) (this method) instead of the zero-arg Perth-zone overload
    // Mark flagged in #398. Perth is UTC+8 vs London's UTC+1 here, so the old bug would have
    // evaluated this instant as Tuesday 06:30 Perth time and wrongly skipped a Monday-only
    // reminder.
    JSONObject journey = new JSONObject();
    journey.put("cityId", "uk-west-midlands");
    journey.put("remindDays", new org.json.JSONArray(new int[] {MONDAY_ISO}));
    long londonMondayLateNightMs = Instant.parse("2026-08-10T23:30:00+01:00").toEpochMilli();

    assertTrue(PreferredTrainReminder.isRemindDay(journey, londonMondayLateNightMs));
  }

  @Test
  public void isRemindDay_zoneAware_londonEveningDoesNotFalsePositiveAsTuesday() throws Exception {
    // Same instant as above, but remindDays is Tuesday-only: the old Perth-zone bug (which
    // reads this instant as Tuesday 06:30 Perth time) would have wrongly fired here. The
    // zone-aware check correctly says it's still Monday in London, so this must be false.
    JSONObject journey = new JSONObject();
    journey.put("cityId", "uk-west-midlands");
    int tuesdayIso = 2;
    journey.put("remindDays", new org.json.JSONArray(new int[] {tuesdayIso}));
    long londonMondayLateNightMs = Instant.parse("2026-08-10T23:30:00+01:00").toEpochMilli();

    assertTrue(!PreferredTrainReminder.isRemindDay(journey, londonMondayLateNightMs));
  }

  @Test
  public void getReadyOffsetMath() {
    long leaveByMs = Instant.parse("2026-08-10T07:20:00+08:00").toEpochMilli();

    assertEquals(
      Instant.parse("2026-08-10T07:15:00+08:00").toEpochMilli(),
      PreferredTrainReminder.computeGetReadyAtMs(leaveByMs, 5)
    );
    assertEquals(leaveByMs, PreferredTrainReminder.computeGetReadyAtMs(leaveByMs, 0));
  }
}
