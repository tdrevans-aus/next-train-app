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
  public void getReadyOffsetMath() {
    long leaveByMs = Instant.parse("2026-08-10T07:20:00+08:00").toEpochMilli();

    assertEquals(
      Instant.parse("2026-08-10T07:15:00+08:00").toEpochMilli(),
      PreferredTrainReminder.computeGetReadyAtMs(leaveByMs, 5)
    );
    assertEquals(leaveByMs, PreferredTrainReminder.computeGetReadyAtMs(leaveByMs, 0));
  }
}
