package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

/** FB-26 shared pin-resolution fixtures — native contract parity with web pin-state.js. */
@RunWith(Parameterized.class)
public class PinResolutionFixtureTest {

  private final String fixtureId;
  private final JSONObject fixture;

  public PinResolutionFixtureTest(String fixtureId, JSONObject fixture) {
    this.fixtureId = fixtureId;
    this.fixture = fixture;
  }

  @Parameterized.Parameters(name = "{0}")
  public static Collection<Object[]> fixtures() throws Exception {
    List<Object[]> cases = new ArrayList<>();
    InputStream index = PinResolutionFixtureTest.class.getResourceAsStream("/pin-resolution/index.txt");
    if (index == null) {
      throw new AssertionError("Missing /pin-resolution/index.txt — run copyPinResolutionFixtures");
    }

    try (BufferedReader reader =
      new BufferedReader(new InputStreamReader(index, StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        String name = line.trim();
        if (name.isEmpty()) {
          continue;
        }
        InputStream stream =
          PinResolutionFixtureTest.class.getResourceAsStream("/pin-resolution/" + name);
        assertNotNull("Missing fixture resource " + name, stream);
        String json =
          new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))
            .lines()
            .collect(Collectors.joining("\n"));
        JSONObject fixture = new JSONObject(json);
        cases.add(new Object[] { fixture.optString("id", name), fixture });
      }
    }

    assertTrue("No pin-resolution fixtures found", !cases.isEmpty());
    return cases;
  }

  @Test
  public void resolvePinState_matchesFixtureContract() throws Exception {
    JSONObject clock = fixture.getJSONObject("clock");
    JSONObject input = fixture.getJSONObject("input");
    JSONObject expected = fixture.getJSONObject("expected");

    PinResolutionHelper.Clock pinClock =
      new PinResolutionHelper.Clock(
        PerthTime.epochMillisFromIso(clock.getString("nowIso")),
        clock.getString("perthDateKey")
      );

    String mode = input.getString("mode");
    JSONObject payload = input.optJSONObject("payload");
    JSONObject journey = input.optJSONObject("journey");
    JSONObject nearbyPin = input.optJSONObject("nearbyPin");
    int skipTrains = input.optInt("skipTrains", 0);

    PinResolutionHelper.Result actual =
      PinResolutionHelper.resolvePinState(
        mode,
        pinClock,
        payload,
        journey,
        nearbyPin,
        skipTrains
      );

    assertDeparture("trueNextDeparture", expected, actual.trueNextDeparture);
    assertDeparture("pinDeparture", expected, actual.pinDeparture);
    assertDeparture("heroDeparture", expected, actual.heroDeparture);
    assertDeparture("leaveDeparture", expected, actual.leaveDeparture);
    assertDeparture("secondaryNextDeparture", expected, actual.secondaryNextDeparture);
    assertDeparture("widgetFaceDeparture", expected, actual.widgetFaceDeparture);

    assertBoolean("isPinnedToday", expected, actual.isPinnedToday);
    assertBoolean("heroShowsPin", expected, actual.heroShowsPin);
    assertBoolean("isOverrideActiveToday", expected, actual.isOverrideActiveToday);
    assertBoolean("isPinDismissedToday", expected, actual.isPinDismissedToday);
    assertBoolean("isSkipPreview", expected, actual.isSkipPreview);
    assertBoolean("isHeroPinLockingSwipe", expected, actual.isHeroPinLockingSwipe);
    assertBoolean("showSecondaryNext", expected, actual.showSecondaryNext);
    assertBoolean("leaveCardArmed", expected, actual.leaveCardArmed);

    if (expected.has("heroLabel")) {
      assertEquals(fixtureId + " heroLabel", expected.getString("heroLabel"), actual.heroLabel);
    }
  }

  private void assertDeparture(String key, JSONObject expected, String actual) throws Exception {
    if (!expected.has(key)) {
      return;
    }
    Object value = expected.get(key);
    if (value == JSONObject.NULL) {
      assertEquals(fixtureId + " " + key, null, actual);
      return;
    }
    assertEquals(fixtureId + " " + key, expected.getString(key), actual);
  }

  private void assertBoolean(String key, JSONObject expected, boolean actual) throws Exception {
    if (!expected.has(key)) {
      return;
    }
    assertEquals(fixtureId + " " + key, expected.getBoolean(key), actual);
  }
}
