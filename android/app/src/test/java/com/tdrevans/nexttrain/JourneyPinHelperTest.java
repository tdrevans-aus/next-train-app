package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.util.Locale;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class JourneyPinHelperTest {

  @Test
  public void isOverrideActiveToday_matchesPerthDate() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("journeyPinOverrideDate", PerthTime.localDateKey());
    journey.put("journeyPinOverrideIso", "2026-08-14T07:45:00+08:00");

    assertTrue(JourneyPinHelper.isOverrideActiveToday(journey));
  }

  @Test
  public void isOverrideActiveToday_falseForStaleDate() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("journeyPinOverrideDate", "2026-08-13");
    journey.put("journeyPinOverrideIso", "2026-08-14T07:45:00+08:00");

    assertFalse(JourneyPinHelper.isOverrideActiveToday(journey));
  }

  @Test
  public void resolvePinnedTrip_prefersOverrideOverPreferred() throws Exception {
    long departureMs = System.currentTimeMillis() + 45L * 60_000L;
    String overrideIso = PerthTime.formatIsoFromEpochMs(departureMs);
    String earlierIso = PerthTime.formatIsoFromEpochMs(departureMs - 15L * 60_000L);

    JSONObject journey = new JSONObject();
    journey.put("preferredTrainTime", "07:30");
    journey.put("journeyPinOverrideDate", PerthTime.localDateKey());
    journey.put("journeyPinOverrideIso", overrideIso);

    JSONArray upcoming = new JSONArray();
    JSONObject early = new JSONObject();
    early.put("departure", earlierIso);
    early.put("displayTime", "07:15");
    early.put("leaveBy", PerthTime.formatIsoFromEpochMs(departureMs - 25L * 60_000L));
    upcoming.put(early);

    JSONObject pinned = new JSONObject();
    pinned.put("departure", overrideIso);
    pinned.put("displayTime", "07:45");
    pinned.put("leaveBy", PerthTime.formatIsoFromEpochMs(departureMs - 10L * 60_000L));
    upcoming.put(pinned);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    JSONObject resolved = JourneyPinHelper.resolvePinnedTrip(payload, journey);

    assertEquals(overrideIso, resolved.optString("departure"));
  }

  @Test
  public void resolvePinnedTrip_dismissedStillShowsPreferredTarget() throws Exception {
    long departureMs = System.currentTimeMillis() + 45L * 60_000L;
    String preferredIso = PerthTime.formatIsoFromEpochMs(departureMs);
    String earlierIso = PerthTime.formatIsoFromEpochMs(departureMs - 30L * 60_000L);

    int preferredMinutes = PerthTime.minutesFromIso(preferredIso);
    String preferredTrainTime =
      String.format(
        Locale.US,
        "%02d:%02d",
        preferredMinutes / 60,
        preferredMinutes % 60
      );

    JSONObject journey = new JSONObject();
    journey.put("preferredTrainTime", preferredTrainTime);
    journey.put("defaultFrom", "00:00");
    journey.put("defaultUntil", "23:59");
    journey.put("journeyPinDismissedDate", PerthTime.localDateKey());

    JSONArray upcoming = new JSONArray();
    JSONObject early = new JSONObject();
    early.put("departure", earlierIso);
    early.put("displayTime", "07:15");
    upcoming.put(early);

    JSONObject preferred = new JSONObject();
    preferred.put("departure", preferredIso);
    preferred.put("displayTime", "07:45");
    upcoming.put(preferred);

    JSONObject payload = new JSONObject();
    payload.put("upcoming", upcoming);

    JSONObject resolved = JourneyPinHelper.resolvePinnedTrip(payload, journey);

    assertNotNull(resolved);
    assertEquals(preferredIso, resolved.optString("departure"));
  }

  @Test
  public void routePinLeaveBeforeMinutes_prefersJourneyWalkTime() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("leaveBeforeMinutes", 23);
    JSONObject settings = new JSONObject();
    settings.put("nearbyLeaveBeforeMinutes", 10);

    assertEquals(23, JourneyPinHelper.routePinLeaveBeforeMinutes(journey, settings));
  }

  @Test
  public void routePinLeaveBeforeMinutes_fallsBackToNearbySlider() throws Exception {
    JSONObject journey = new JSONObject();
    JSONObject settings = new JSONObject();
    settings.put("nearbyLeaveBeforeMinutes", 23);

    assertEquals(23, JourneyPinHelper.routePinLeaveBeforeMinutes(journey, settings));
  }

  @Test
  public void buildSyntheticRoutePinTrip_computesLeaveByFromWalkTime() throws Exception {
    long departureMs = System.currentTimeMillis() + 45L * 60_000L;
    String departureIso = PerthTime.formatIsoFromEpochMs(departureMs);
    JSONObject journey = new JSONObject();
    journey.put("station", "Edgewater");
    journey.put("direction", "towards Perth");

    JSONObject trip = JourneyPinHelper.buildSyntheticRoutePinTrip(journey, departureIso, 23);

    assertEquals(departureIso, trip.optString("departure"));
    long leaveByMs =
      PerthTime.epochMillisFromIso(trip.optString("leaveBy")) -
      (departureMs - 23L * 60_000L);
    assertEquals(0L, leaveByMs);
  }
}
