package com.tdrevans.nexttrain;

import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

/**
 * Mirrors {@code lib/providers/registry.js}'s per-city {@code timeZone} field so native code
 * (widget, reminders, notifications) can evaluate "now"/"today" in a journey's own local time
 * instead of the historical Australia/Perth-only assumption (FB widget-stuck-updating, 15 Sep
 * 2026). Keep this table's keys/zones in sync with the registry when new cities are added —
 * an unknown or blank cityId falls back to Australia/Perth, matching the server's default
 * ({@code /api/next-train} defaults to Perth when no {@code city} is given).
 */
public final class CityTimeZones {

  private static final ZoneId DEFAULT_ZONE = ZoneId.of("Australia/Perth");

  private static final Map<String, String> CITY_ZONE_IDS = buildTable();

  private CityTimeZones() {}

  public static ZoneId zoneFor(String cityId) {
    if (cityId == null || cityId.isEmpty()) {
      return DEFAULT_ZONE;
    }
    String zoneId = CITY_ZONE_IDS.get(cityId.trim().toLowerCase());
    if (zoneId == null) {
      return DEFAULT_ZONE;
    }
    try {
      return ZoneId.of(zoneId);
    } catch (Exception error) {
      return DEFAULT_ZONE;
    }
  }

  private static Map<String, String> buildTable() {
    Map<String, String> table = new HashMap<>();
    table.put("perth", "Australia/Perth");
    table.put("sydney", "Australia/Sydney");
    table.put("melbourne", "Australia/Melbourne");
    table.put("brisbane", "Australia/Brisbane");
    table.put("adelaide", "Australia/Adelaide");
    table.put("canberra", "Australia/Sydney");
    table.put("gold-coast", "Australia/Brisbane");
    table.put("newcastle", "Australia/Sydney");
    table.put("uk-west-midlands", "Europe/London");
    table.put("uk-london-tfl", "Europe/London");
    table.put("east-midlands", "Europe/London");
    table.put("south-yorkshire", "Europe/London");
    table.put("north-east", "Europe/London");
    table.put("west-of-england", "Europe/London");
    table.put("southwest", "Europe/London");
    table.put("cumbria", "Europe/London");
    table.put("rest-of-england", "Europe/London");
    table.put("south-wales", "Europe/London");
    table.put("west-yorkshire", "Europe/London");
    table.put("rest-of-wales", "Europe/London");
    table.put("rest-of-scotland", "Europe/London");
    table.put("london-se-national-rail", "Europe/London");
    table.put("glasgow", "Europe/London");
    table.put("edinburgh", "Europe/London");
    table.put("solent", "Europe/London");
    table.put("thames-valley", "Europe/London");
    table.put("greater-manchester", "Europe/London");
    table.put("liverpool-city-region", "Europe/London");
    table.put("greater-anglia", "Europe/London");
    table.put("auckland", "Pacific/Auckland");
    table.put("wellington", "Pacific/Auckland");
    table.put("amsterdam", "Europe/Amsterdam");
    table.put("rotterdam", "Europe/Amsterdam");
    table.put("vancouver", "America/Vancouver");
    table.put("stockholm", "Europe/Stockholm");
    table.put("goteborg", "Europe/Stockholm");
    table.put("malmo", "Europe/Stockholm");
    table.put("uppsala", "Europe/Stockholm");
    table.put("osaka", "Asia/Tokyo");
    table.put("hong-kong", "Asia/Hong_Kong");
    table.put("helsinki", "Europe/Helsinki");
    table.put("oslo", "Europe/Oslo");
    table.put("brussels", "Europe/Brussels");
    table.put("copenhagen", "Europe/Copenhagen");
    table.put("boston", "America/New_York");
    return table;
  }
}
