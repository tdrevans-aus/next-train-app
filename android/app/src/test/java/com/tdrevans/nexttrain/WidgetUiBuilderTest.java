package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class WidgetUiBuilderTest {

  @Test
  public void splitMinutesPrimary_splitsNumberAndUnit() {
    WidgetUiBuilder.PrimaryParts five = WidgetUiBuilder.splitMinutesPrimary("5 min");
    assertEquals("5", five.value);
    assertEquals("min", five.unit);

    WidgetUiBuilder.PrimaryParts one = WidgetUiBuilder.splitMinutesPrimary("1 min");
    assertEquals("1", one.value);
    assertEquals("min", one.unit);
  }

  @Test
  public void splitMinutesPrimary_keepsNowAndStatusCopyWhole() {
    WidgetUiBuilder.PrimaryParts now = WidgetUiBuilder.splitMinutesPrimary("NOW");
    assertEquals("NOW", now.value);
    assertEquals("", now.unit);

    WidgetUiBuilder.PrimaryParts updating = WidgetUiBuilder.splitMinutesPrimary("Updating…");
    assertEquals("…", updating.value);
    assertEquals("", updating.unit);

    WidgetUiBuilder.PrimaryParts setup =
      WidgetUiBuilder.splitMinutesPrimary(WidgetUiBuilder.EMPTY_SETUP_PRIMARY);
    assertEquals(WidgetUiBuilder.EMPTY_SETUP_PRIMARY, setup.value);
    assertEquals("", setup.unit);
  }

  @Test
  public void parseLeaveParts_splitsCaptionAndMinutes() {
    WidgetUiBuilder.LeaveParts leave = WidgetUiBuilder.parseLeaveParts("Leave in 1 min");
    assertTrue(leave.visible);
    assertEquals("LEAVE IN", leave.label);
    assertEquals("1", leave.value);
    assertEquals("min", leave.unit);

    WidgetUiBuilder.LeaveParts now = WidgetUiBuilder.parseLeaveParts("Leave now");
    assertEquals("LEAVE", now.label);
    assertEquals("NOW", now.value);
    assertEquals("", now.unit);
  }

  @Test
  public void compactLeaveSecondary_shortensForNarrowWidget() {
    assertEquals("Leave now", WidgetUiBuilder.compactLeaveSecondary("Leave now"));
    assertEquals("Leave in 5m", WidgetUiBuilder.compactLeaveSecondary("Leave in 5 min"));
    assertEquals("Leave in 1m", WidgetUiBuilder.compactLeaveSecondary("Leave in 1 min"));
    assertEquals("Fetching…", WidgetUiBuilder.compactLeaveSecondary("Fetching next train…"));
    assertEquals("Open", WidgetUiBuilder.compactLeaveSecondary("Open app"));
    assertEquals("", WidgetUiBuilder.compactLeaveSecondary(""));
  }

  @Test
  public void routeLineTextSizeSp_shrinksLongRoutes() {
    assertEquals(13f, WidgetUiBuilder.routeLineTextSizeSp("Warwick → Perth"), 0.01f);
    assertEquals(12f, WidgetUiBuilder.routeLineTextSizeSp("Perth Underground → Yanchep"), 0.01f);
    assertEquals(
      11f,
      WidgetUiBuilder.routeLineTextSizeSp("Elizabeth Quay → Cockburn Central"),
      0.01f
    );
  }

  @Test
  public void idlePrimaryTextSizeSp_shrinksWindowRanges() {
    assertEquals(31f, WidgetUiBuilder.idlePrimaryTextSizeSp("7:30", R.layout.widget_small), 0.01f);
    assertEquals(24f, WidgetUiBuilder.idlePrimaryTextSizeSp("6:00–9:00", R.layout.widget_small), 0.01f);
    assertEquals(20f, WidgetUiBuilder.idlePrimaryTextSizeSp("15:00–18:00", R.layout.widget_small), 0.01f);
    assertEquals(36f, WidgetUiBuilder.idlePrimaryTextSizeSp("7:30", R.layout.widget_medium), 0.01f);
    assertEquals(24f, WidgetUiBuilder.idlePrimaryTextSizeSp("15:00–18:00", R.layout.widget_medium), 0.01f);
  }

  @Test
  public void idleRouteLineTextSizeSp_scalesDownForOutsideHoursFace() {
    assertEquals(11.44f, WidgetUiBuilder.idleRouteLineTextSizeSp("Warwick → Perth"), 0.01f);
    assertEquals(11f, WidgetUiBuilder.idleRouteLineTextSizeSp("Elizabeth Quay → Cockburn Central"), 0.01f);
  }

  @Test
  public void shouldShowUpdatedLine_onlyOnMediumLayout() {
    assertFalse(WidgetUiBuilder.shouldShowUpdatedLine(R.layout.widget_small));
    assertTrue(WidgetUiBuilder.shouldShowUpdatedLine(R.layout.widget_medium));
  }

  @Test
  public void layoutForSizeDp_keepsDefaultTwoByOneSmall() {
    assertEquals(R.layout.widget_small, WidgetUiBuilder.layoutForSizeDp(110, 40));
    assertEquals(R.layout.widget_small, WidgetUiBuilder.layoutForSizeDp(180, 70));
  }

  @Test
  public void layoutForSizeDp_usesMediumForThreeByOneOrTwoByTwo() {
    assertEquals(R.layout.widget_medium, WidgetUiBuilder.layoutForSizeDp(250, 40));
    assertEquals(R.layout.widget_medium, WidgetUiBuilder.layoutForSizeDp(110, 110));
    assertEquals(R.layout.widget_medium, WidgetUiBuilder.layoutForSizeDp(300, 140));
  }

  @Test
  public void resolveMediumUpdatedLine_hidesConflictingFetchingCopy() {
    assertEquals(
      "",
      WidgetUiBuilder.resolveMediumUpdatedLine("Updated 3m ago", "Updating…", "Fetching…", false)
    );
    assertEquals(
      "Times may be out of date",
      WidgetUiBuilder.resolveMediumUpdatedLine("Updated 3m ago", "Open", "Open app", true)
    );
    assertEquals(
      "Updated just now",
      WidgetUiBuilder.resolveMediumUpdatedLine("Updated just now", "14 min", "Leave in 4 min", false)
    );
  }

  @Test
  public void planSmallWidgetColumns_leaveShowing_showsStationNotUpdated() {
    WidgetUiBuilder.WidgetSmallColumnPlan plan =
      WidgetUiBuilder.planSmallWidgetColumns("Leave in 5 min", "Edgewater", false);
    assertTrue(plan.showLeave);
    assertTrue(plan.showStation);
    assertTrue(plan.showRightColumn);
  }

  @Test
  public void planSmallWidgetColumns_leaveHidden_stillShowsStation() {
    WidgetUiBuilder.WidgetSmallColumnPlan plan =
      WidgetUiBuilder.planSmallWidgetColumns("", "Edgewater", false);
    assertFalse(plan.showLeave);
    assertTrue(plan.showStation);
    assertFalse(plan.showRightColumn);
  }

  @Test
  public void planSmallWidgetColumns_noLeaveNoStation_collapsesRightColumn() {
    WidgetUiBuilder.WidgetSmallColumnPlan plan =
      WidgetUiBuilder.planSmallWidgetColumns("", "", false);
    assertFalse(plan.showLeave);
    assertFalse(plan.showStation);
    assertFalse(plan.showRightColumn);
  }
}
