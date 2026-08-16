package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class NextCommutePreviewTest {

  @Test
  public void findNext_picksLaterTodayWindow() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-evening", "Evening home", "Edgewater Stn", "Perth", "15:00", "18:00", "")
    );

    NextCommutePreview.Preview preview =
      NextCommutePreview.findNext(settings, 12 * 60, 2);

    assertNotNull(preview);
    assertEquals(0, preview.dayOffset);
    assertEquals("Today 15:00–18:00", NextCommutePreview.formatPrimary(preview));
  }

  @Test
  public void findNext_skipsFinishedWindowToday() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-morning", "Morning", "Edgewater Stn", "Perth", "06:00", "09:00", ""),
      journey("j-evening", "Evening", "Edgewater Stn", "Perth", "15:00", "18:00", "")
    );

    NextCommutePreview.Preview preview =
      NextCommutePreview.findNext(settings, 12 * 60, 2);

    assertNotNull(preview);
    assertEquals("j-evening", preview.journey.optString("id"));
    assertEquals("Today 15:00–18:00", NextCommutePreview.formatPrimary(preview));
  }

  @Test
  public void findNext_fridayEveningJumpsToMondayMorning() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-morning", "Morning", "Edgewater Stn", "Perth", "06:00", "09:00", "")
    );

    NextCommutePreview.Preview preview =
      NextCommutePreview.findNext(settings, 19 * 60, 5);

    assertNotNull(preview);
    assertEquals(3, preview.dayOffset);
    assertEquals(1, preview.dayOfWeekIso);
    assertEquals("Monday 6:00–9:00", NextCommutePreview.formatPrimary(preview));
  }

  @Test
  public void findNext_prefersPreferredTrainClock() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-morning", "Morning", "Edgewater Stn", "Perth", "06:00", "09:00", "07:30")
    );

    NextCommutePreview.Preview preview =
      NextCommutePreview.findNext(settings, 9 * 60 + 30, 2);

    assertNotNull(preview);
    assertEquals("Tomorrow 7:30", NextCommutePreview.formatPrimary(preview));
    assertEquals("Tomorrow", NextCommutePreview.formatDayWord(preview));
    assertEquals("7:30", preview.preferredOrFromClock);
  }

  @Test
  public void findNext_keepsTodayWhenTargetIsLaterOutsideWindow() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-morning", "Morning", "Edgewater Stn", "Perth", "06:00", "09:00", "16:00")
    );

    NextCommutePreview.Preview preview =
      NextCommutePreview.findNext(settings, 10 * 60, 2);

    assertNotNull(preview);
    assertEquals(0, preview.dayOffset);
    assertEquals("Today 16:00", NextCommutePreview.formatPrimary(preview));
    assertEquals("Today", NextCommutePreview.formatDayWord(preview));
    assertEquals("16:00", preview.preferredOrFromClock);
    assertEquals("Target Train", NextCommutePreview.idleWidgetLabel(preview.journey));
  }

  @Test
  public void outsideHoursSnapshot_fitsSmallWidgetSlots() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-morning", "Morning", "Warwick Stn", "Perth", "06:00", "09:00", "07:30")
    );

    JSONObject snapshot = CommuteSchedule.outsideHoursSnapshot(settings, 22 * 60 + 12, 1);

    assertEquals("Target Train", snapshot.optString("label"));
    assertEquals("7:30", snapshot.optString("primary"));
    assertEquals("Tomorrow", snapshot.optString("trainClock"));
    assertEquals("Warwick → Perth", snapshot.optString("route"));
    assertEquals("Warwick → Perth", snapshot.optString("stationLabel"));
    assertEquals("", snapshot.optString("departureIso"));
    assertEquals(true, snapshot.optBoolean("outsideHoursIdle"));
  }

  @Test
  public void findNext_skipsRoutesWithoutWindows() throws Exception {
    JSONObject route = new JSONObject();
    route.put("id", "j-route");
    route.put("kind", "route");
    route.put("name", "Route");
    route.put("station", "Edgewater Stn");
    route.put("direction", "Perth");

    JSONObject settings = settingsWithJourney(route);

    assertNull(NextCommutePreview.findNext(settings, 12 * 60, 2));
  }

  @Test
  public void findNext_returnsNullWithoutConfiguredWindows() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("id", "j1");
    journey.put("name", "Custom");
    journey.put("station", "Edgewater Stn");
    journey.put("direction", "Perth");
    journey.put("remindDays", new JSONArray(new int[] { 1, 2, 3, 4, 5 }));

    JSONObject settings = settingsWithJourney(journey);

    assertNull(NextCommutePreview.findNext(settings, 12 * 60, 2));
  }

  @Test
  public void findNext_returnsTargetOnlyWhenNoWindows() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-target", "Target only", "Edgewater Stn", "Perth", "", "", "07:30")
    );

    NextCommutePreview.Preview preview =
      NextCommutePreview.findNext(settings, 12 * 60, 2);

    assertNotNull(preview);
    assertEquals("j-target", preview.journey.optString("id"));
    assertEquals("Tomorrow 7:30", NextCommutePreview.formatPrimary(preview));
    assertEquals("Target Train", NextCommutePreview.idleWidgetLabel(preview.journey));
  }

  @Test
  public void findNext_prefersWindowedJourneyOverTargetOnly() throws Exception {
    JSONObject settings = settingsWithJourney(
      journey("j-target", "Target only", "Edgewater Stn", "Perth", "", "", "07:30"),
      journey("j-evening", "Evening", "Edgewater Stn", "Perth", "15:00", "18:00", "")
    );

    NextCommutePreview.Preview preview =
      NextCommutePreview.findNext(settings, 12 * 60, 2);

    assertNotNull(preview);
    assertEquals("j-evening", preview.journey.optString("id"));
    assertEquals("Next Journey", NextCommutePreview.idleWidgetLabel(preview.journey));
  }

  private static JSONObject settingsWithJourney(JSONObject... journeys) throws Exception {
    JSONObject settings = new JSONObject();
    JSONArray array = new JSONArray();
    for (JSONObject journey : journeys) {
      array.put(journey);
    }
    settings.put("journeys", array);
    return settings;
  }

  private static JSONObject journey(
    String id,
    String name,
    String station,
    String direction,
    String from,
    String until,
    String preferred
  ) throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("id", id);
    journey.put("name", name);
    journey.put("station", station);
    journey.put("direction", direction);
    journey.put("defaultFrom", from);
    journey.put("defaultUntil", until);
    journey.put("preferredTrainTime", preferred);
    journey.put("kind", "commute");
    journey.put("remindDays", new JSONArray(new int[] { 1, 2, 3, 4, 5 }));
    return journey;
  }
}
