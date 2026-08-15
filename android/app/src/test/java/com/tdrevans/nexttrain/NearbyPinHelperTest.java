package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.json.JSONObject;
import org.junit.Test;

public class NearbyPinHelperTest {

  @Test
  public void isHolding_trueUntilOneMinuteAfterDeparture() throws Exception {
    long departureMs = System.currentTimeMillis() + 30L * 60_000L;
    JSONObject pin = new JSONObject();
    pin.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));
    pin.put("holdingUntilMs", departureMs + NearbyPinHelper.HOLD_MS);

    assertTrue(NearbyPinHelper.isHolding(pin));
    assertEquals(departureMs + NearbyPinHelper.HOLD_MS, NearbyPinHelper.holdingUntilMs(pin));
  }

  @Test
  public void isHolding_falseWhenExpired() throws Exception {
    long departureMs = System.currentTimeMillis() - NearbyPinHelper.HOLD_MS - 5_000L;
    JSONObject pin = new JSONObject();
    pin.put("departureIso", PerthTime.formatIsoFromEpochMs(departureMs));

    assertFalse(NearbyPinHelper.isHolding(pin));
  }

  @Test
  public void formatRoute_usesStationAndDirection() throws Exception {
    JSONObject pin = new JSONObject();
    pin.put("station", "Claremont Stn");
    pin.put("direction", "Perth");

    assertEquals("Claremont → Perth", NearbyPinHelper.formatRoute(pin));
  }
}
