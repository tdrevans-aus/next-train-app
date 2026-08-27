package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class WidgetPinResolverTest {

  @Test
  public void pickSoonestPinned_prefersEarlierJourneyPinOverLaterNearby() throws Exception {
    long earlierMs = System.currentTimeMillis() + 20L * 60_000L;
    long laterMs = System.currentTimeMillis() + 50L * 60_000L;
    String earlierIso = PerthTime.formatIsoFromEpochMs(earlierMs);
    String laterIso = PerthTime.formatIsoFromEpochMs(laterMs);

    JSONObject settings = new JSONObject();
    settings.put(
      "nearbyPin",
      new JSONObject()
        .put("station", "Claremont Stn")
        .put("direction", "Perth")
        .put("departureIso", laterIso)
        .put("holdingUntilMs", laterMs + NearbyPinHelper.HOLD_MS)
        .put("displayTime", "16:30")
        .put("platform", "2")
        .put("status", "On Time")
    );

    CommuteSchedule.Result nearby = new CommuteSchedule.Result();
    nearby.journeyId = NearbyPinHelper.JOURNEY_ID;
    nearby.departureIso = laterIso;
    nearby.next = new JSONObject().put("departure", laterIso);

    CommuteSchedule.Result journey = new CommuteSchedule.Result();
    journey.journeyId = "j-morning";
    journey.departureIso = earlierIso;
    journey.next = new JSONObject().put("departure", earlierIso);

    List<CommuteSchedule.Result> candidates = new ArrayList<>();
    candidates.add(nearby);
    candidates.add(journey);

    CommuteSchedule.Result picked = WidgetPinResolver.pickSoonestPinned(settings, candidates);

    assertNotNull(picked);
    assertEquals("j-morning", picked.journeyId);
  }

  @Test
  public void pickSoonestPinned_prefersEarlierNearbyOverLaterJourney() throws Exception {
    long earlierMs = System.currentTimeMillis() + 15L * 60_000L;
    long laterMs = System.currentTimeMillis() + 45L * 60_000L;
    String earlierIso = PerthTime.formatIsoFromEpochMs(earlierMs);
    String laterIso = PerthTime.formatIsoFromEpochMs(laterMs);

    JSONObject settings = new JSONObject();
    settings.put(
      "nearbyPin",
      new JSONObject()
        .put("station", "Claremont Stn")
        .put("direction", "Perth")
        .put("departureIso", earlierIso)
        .put("holdingUntilMs", earlierMs + NearbyPinHelper.HOLD_MS)
        .put("displayTime", "16:07")
        .put("platform", "1")
        .put("status", "On Time")
    );

    CommuteSchedule.Result nearby = new CommuteSchedule.Result();
    nearby.journeyId = NearbyPinHelper.JOURNEY_ID;
    nearby.departureIso = earlierIso;
    nearby.next = new JSONObject().put("departure", earlierIso);

    CommuteSchedule.Result journey = new CommuteSchedule.Result();
    journey.journeyId = "j-morning";
    journey.departureIso = laterIso;
    journey.next = new JSONObject().put("departure", laterIso);

    List<CommuteSchedule.Result> candidates = new ArrayList<>();
    candidates.add(nearby);
    candidates.add(journey);

    CommuteSchedule.Result picked = WidgetPinResolver.pickSoonestPinned(settings, candidates);

    assertNotNull(picked);
    assertEquals(NearbyPinHelper.JOURNEY_ID, picked.journeyId);
  }

  @Test
  public void isJourneyPinnedToday_overrideOrPreferredNotDismissed() throws Exception {
    JSONObject override = new JSONObject();
    override.put("journeyPinOverrideDate", PerthTime.localDateKey());
    override.put("journeyPinOverrideIso", "2026-08-14T08:00:00+08:00");
    assertTrue(JourneyPinHelper.isJourneyPinnedToday(override));

    JSONObject preferredInWindow = new JSONObject();
    preferredInWindow.put("preferredTrainTime", "07:30");
    preferredInWindow.put("defaultFrom", "00:00");
    preferredInWindow.put("defaultUntil", "23:59");
    assertTrue(JourneyPinHelper.isJourneyPinnedToday(preferredInWindow));

    JSONObject preferredNoWindow = new JSONObject();
    preferredNoWindow.put("preferredTrainTime", "07:30");
    assertFalse(JourneyPinHelper.isJourneyPinnedToday(preferredNoWindow));

    JSONObject dismissed = new JSONObject();
    dismissed.put("preferredTrainTime", "07:30");
    dismissed.put("defaultFrom", "00:00");
    dismissed.put("defaultUntil", "23:59");
    dismissed.put("journeyPinDismissedDate", PerthTime.localDateKey());
    assertFalse(JourneyPinHelper.isJourneyPinnedToday(dismissed));
  }

  @Test
  public void pickSoonestPinned_skipsDepartedJourneyPin() throws Exception {
    long pastMs = System.currentTimeMillis() - 10L * 60_000L;
    long futureMs = System.currentTimeMillis() + 30L * 60_000L;
    String pastIso = PerthTime.formatIsoFromEpochMs(pastMs);
    String futureIso = PerthTime.formatIsoFromEpochMs(futureMs);

    JSONObject settings = new JSONObject();

    CommuteSchedule.Result departed = new CommuteSchedule.Result();
    departed.journeyId = "j-old";
    departed.departureIso = pastIso;
    departed.next = new JSONObject().put("departure", pastIso);

    CommuteSchedule.Result future = new CommuteSchedule.Result();
    future.journeyId = "j-new";
    future.departureIso = futureIso;
    future.next = new JSONObject().put("departure", futureIso);

    List<CommuteSchedule.Result> candidates = new ArrayList<>();
    candidates.add(departed);
    candidates.add(future);

    CommuteSchedule.Result picked = WidgetPinResolver.pickSoonestPinned(settings, candidates);

    assertNotNull(picked);
    assertEquals("j-new", picked.journeyId);
  }

  @Test
  public void pickSoonestPinned_returnsNullWhenNoEligibleCandidates() throws Exception {
    JSONObject settings = new JSONObject();
    List<CommuteSchedule.Result> candidates = new ArrayList<>();
    assertNull(WidgetPinResolver.pickSoonestPinned(settings, candidates));
  }
}
