package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;

import java.time.ZoneId;
import org.junit.Test;

public class CityTimeZonesTest {

  @Test
  public void zoneFor_knownUkCityReturnsLondon() {
    assertEquals(ZoneId.of("Europe/London"), CityTimeZones.zoneFor("uk-west-midlands"));
    assertEquals(ZoneId.of("Europe/London"), CityTimeZones.zoneFor("greater-manchester"));
  }

  @Test
  public void zoneFor_isCaseAndWhitespaceInsensitive() {
    assertEquals(ZoneId.of("Europe/London"), CityTimeZones.zoneFor("  UK-West-Midlands  "));
  }

  @Test
  public void zoneFor_blankOrUnknownDefaultsToPerth() {
    assertEquals(ZoneId.of("Australia/Perth"), CityTimeZones.zoneFor(""));
    assertEquals(ZoneId.of("Australia/Perth"), CityTimeZones.zoneFor(null));
    assertEquals(ZoneId.of("Australia/Perth"), CityTimeZones.zoneFor("not-a-real-city"));
  }

  @Test
  public void zoneFor_otherLiveCities() {
    assertEquals(ZoneId.of("Australia/Sydney"), CityTimeZones.zoneFor("sydney"));
    assertEquals(ZoneId.of("Europe/Stockholm"), CityTimeZones.zoneFor("goteborg"));
    assertEquals(ZoneId.of("Pacific/Auckland"), CityTimeZones.zoneFor("auckland"));
  }
}
