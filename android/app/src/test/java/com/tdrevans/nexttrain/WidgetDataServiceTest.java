package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;

import org.json.JSONObject;
import org.junit.Test;

public class WidgetDataServiceTest {

  @Test
  public void formatDisplayName_collapsesPerthCluster() {
    assertEquals("Perth", WidgetDataService.formatDisplayName("Perth Underground Stn"));
    assertEquals("Perth", WidgetDataService.formatDisplayName("Perth Underground"));
    assertEquals("Perth", WidgetDataService.formatDisplayName("Perth Stn"));
    assertEquals("Perth", WidgetDataService.formatDisplayName("Perth"));
  }

  @Test
  public void formatStationLabel_usesPerthAlias() throws Exception {
    JSONObject journey = new JSONObject();
    journey.put("station", "Perth Underground Stn");
    journey.put("direction", "Yanchep");
    assertEquals("Perth", WidgetDataService.formatStationLabel(journey));
    assertEquals("Perth → Yanchep", WidgetDataService.formatRoute(journey));
  }

  @Test
  public void formatDisplayName_stripsStnOtherwise() {
    assertEquals("Edgewater", WidgetDataService.formatDisplayName("Edgewater Stn"));
    assertEquals("Cockburn", WidgetDataService.formatDisplayName("Cockburn Central Stn"));
  }
}
