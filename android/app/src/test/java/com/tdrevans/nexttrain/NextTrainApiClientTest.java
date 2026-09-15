package com.tdrevans.nexttrain;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Regression coverage for FB widget-stuck-updating (15 Sep 2026): {@code WidgetPinResolver}'s
 * two fetch call sites previously used the 3-arg {@code fetchNextTrain} overload, which silently
 * drops {@code cityId} and lets the server default to Perth — every England pin then asked the
 * Perth catalog for a station it doesn't have ("Unknown station"), threw, and left the widget
 * stuck on "Updating…" forever. The request-URL builder itself is what actually needs to always
 * carry a non-Perth city; the call sites are covered by code review (both now pass {@code
 * journey.optString("cityId", "")} / {@code pin.optString("cityId", "")}).
 */
public class NextTrainApiClientTest {

  @Test
  public void buildRequestUrl_includesNonPerthCityId() throws Exception {
    String url =
      NextTrainApiClient.buildRequestUrl(
        "Birmingham New Street",
        "Bournemouth (CrossCountry)",
        10,
        "uk-west-midlands"
      );

    assertTrue(url.contains("city=uk-west-midlands"));
    assertTrue(url.contains("station=Birmingham"));
  }

  @Test
  public void buildRequestUrl_omitsCityParamWhenBlank() throws Exception {
    String url = NextTrainApiClient.buildRequestUrl("Perth Underground Stn", "Byford", 10, "");

    assertFalse(url.contains("city="));
  }

  @Test
  public void buildRequestUrl_omitsCityParamWhenNull() throws Exception {
    String url = NextTrainApiClient.buildRequestUrl("Perth Underground Stn", "Byford", 10, null);

    assertFalse(url.contains("city="));
  }
}
