package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class JourneySelectorTest {

  /** Fixed ISO weekday so CI does not depend on runner clock / Perth calendar day. */
  private static final int TEST_DAY = 2;

  @Test
  public void selectJourney_returnsInWindowJourneyOnly() throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray journeys = new JSONArray();
    journeys.put(
      journey("j-morning", "Morning", "Edgewater Stn", "Perth", "06:00", "09:00")
    );
    journeys.put(
      journey("j-evening", "Evening", "Perth Underground Stn", "Mandurah", "15:00", "18:00")
    );
    settings.put("journeys", journeys);
    settings.put("activeJourneyId", "j-evening");

    assertTrue(JourneySelector.matchesWindow(journeys.getJSONObject(0), 7 * 60 + 30, TEST_DAY));
    assertTrue(JourneySelector.matchesWindow(journeys.getJSONObject(1), 16 * 60, TEST_DAY));
  }

  @Test
  public void matchesWindow_excludesMiddayForStandardJourneys() throws Exception {
    JSONObject morning = journey(
      "j-morning",
      "Morning",
      "Edgewater Stn",
      "Perth",
      "06:00",
      "09:00"
    );
    JSONObject evening = journey(
      "j-evening",
      "Evening",
      "Perth Underground Stn",
      "Mandurah",
      "15:00",
      "18:00"
    );
    int noon = 12 * 60;
    org.junit.Assert.assertFalse(JourneySelector.matchesWindow(morning, noon, TEST_DAY));
    org.junit.Assert.assertFalse(JourneySelector.matchesWindow(evening, noon, TEST_DAY));
  }

  @Test
  public void selectJourney_returnsNullOutsideAllWindows() throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray journeys = new JSONArray();
    journeys.put(
      journey("j-morning", "Morning", "Edgewater Stn", "Perth", "06:00", "09:00")
    );
    journeys.put(
      journey("j-evening", "Evening", "Perth Underground Stn", "Mandurah", "15:00", "18:00")
    );
    settings.put("journeys", journeys);
    settings.put("activeJourneyId", "j-evening");

    int noon = 12 * 60;
    assertFalse(JourneySelector.matchesWindow(journeys.getJSONObject(0), noon, TEST_DAY));
    assertFalse(JourneySelector.matchesWindow(journeys.getJSONObject(1), noon, TEST_DAY));
  }

  @Test
  public void selectJourney_doesNotFallbackToSoleJourneyWithoutWindow() throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray journeys = new JSONArray();
    journeys.put(journey("j-custom", "Custom", "Edgewater Stn", "Perth", "", ""));
    settings.put("journeys", journeys);
    settings.put("activeJourneyId", "j-custom");

    assertNull(JourneySelector.selectJourney(settings));
    assertTrue(JourneySelector.hasConfiguredJourneys(settings));
  }

  @Test
  public void journeyKind_infersJourneyFromPreferredTrain() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("station", "Edgewater Stn");
    journey.put("direction", "Perth");
    journey.put("preferredTrainTime", "07:30");
    assertEquals("journey", JourneySelector.journeyKind(journey));
    assertTrue(JourneySelector.isJourneyKind(journey));
  }

  @Test
  public void journeyKind_explicitRoute() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("kind", "route");
    journey.put("station", "Edgewater Stn");
    journey.put("direction", "Perth");
    journey.put("preferredTrainTime", "07:30");
    assertTrue(JourneySelector.isRouteJourney(journey));
  }

  @Test
  public void selectJourney_skipsRoutesEvenInWindow() throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray journeys = new JSONArray();
    JSONObject route = journey("j-route", "Route", "Edgewater Stn", "Perth", "06:00", "09:00");
    route.put("kind", "route");
    route.remove("preferredTrainTime");
    journeys.put(route);
    settings.put("journeys", journeys);
    assertNull(JourneySelector.selectJourney(settings));
  }

  @Test
  public void pickScheduledJourney_switchesAtMidpoint() throws Exception {
    JSONArray journeys = new JSONArray();
    JSONObject morning = journey("j-morning", "Morning", "Edgewater Stn", "Perth", "06:00", "09:00");
    morning.put("preferredTrainTime", "07:00");
    JSONObject later = journey("j-later", "Later", "Edgewater Stn", "Perth", "06:00", "09:00");
    later.put("preferredTrainTime", "08:00");
    journeys.put(morning);
    journeys.put(later);

    assertEquals(
      "j-morning",
      JourneySelector.pickScheduledJourney(journeys, 7 * 60 + 20).optString("id")
    );
    assertEquals(
      "j-later",
      JourneySelector.pickScheduledJourney(journeys, 7 * 60 + 40).optString("id")
    );
  }

  @Test
  public void selectActiveRoute_returnsActiveRouteOnly() throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray journeys = new JSONArray();
    JSONObject route = journey("j-route", "Route", "Edgewater Stn", "Perth", "", "");
    route.put("kind", "route");
    route.remove("preferredTrainTime");
    route.remove("defaultFrom");
    route.remove("defaultUntil");
    journeys.put(route);
    settings.put("journeys", journeys);
    settings.put("activeJourneyId", "j-route");

    assertNotNull(JourneySelector.selectActiveRoute(settings));
    settings.put("activeJourneyId", "missing");
    assertNull(JourneySelector.selectActiveRoute(settings));
  }

  private static JSONObject journey(
    String id,
    String name,
    String station,
    String direction,
    String from,
    String until
  ) throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("id", id);
    journey.put("name", name);
    journey.put("station", station);
    journey.put("direction", direction);
    journey.put("defaultFrom", from);
    journey.put("defaultUntil", until);
    journey.put("preferredTrainTime", "07:30");
    journey.put("kind", "journey");
    journey.put("leaveBeforeMinutes", 10);
    journey.put("useLeaveBefore", true);
    JSONArray remindDays = new JSONArray();
    for (int day = 1; day <= 7; day += 1) {
      remindDays.put(day);
    }
    journey.put("remindDays", remindDays);
    return journey;
  }
}
