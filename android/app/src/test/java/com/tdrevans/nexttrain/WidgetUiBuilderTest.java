package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class WidgetUiBuilderTest {

  @Test
  public void isOutsideHoursIdleFace_liveTargetKeepsLiveFace() throws Exception {
    org.json.JSONObject live = new org.json.JSONObject();
    live.put("label", "Target train");
    live.put("outsideHoursIdle", false);
    live.put("trainClock", "5:42 pm");
    live.put("primary", "3 min");
    assertFalse(WidgetUiBuilder.isOutsideHoursIdleFace(live));

    org.json.JSONObject idle = new org.json.JSONObject();
    idle.put("label", "Target Train");
    idle.put("outsideHoursIdle", true);
    idle.put("primary", "7:30");
    assertTrue(WidgetUiBuilder.isOutsideHoursIdleFace(idle));

    org.json.JSONObject nextJourney = new org.json.JSONObject();
    nextJourney.put("label", "Next Journey");
    assertTrue(WidgetUiBuilder.isOutsideHoursIdleFace(nextJourney));
  }

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
  public void liveLeaveValueTextSizeSp_shrinksOnCompact2x1() {
    WidgetUiBuilder.WidgetSize compact = WidgetLayoutTestSupport.small2x1();
    assertEquals(20f, WidgetUiBuilder.liveLeaveValueTextSizeSp("NOW", compact), 0.01f);
    assertEquals(28f, WidgetUiBuilder.liveLeaveValueTextSizeSp("4", compact), 0.01f);
    assertEquals(24f, WidgetUiBuilder.liveLeaveValueTextSizeSp("NOW", false, 1f), 0.01f);
    assertEquals(28f, WidgetUiBuilder.liveLeaveValueTextSizeSp("4", false, 1f), 0.01f);
    assertEquals(34f, WidgetUiBuilder.liveLeaveValueTextSizeSp("NOW", true, 1f), 0.01f);
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
  public void formatWidgetRouteLine_abbreviatesOnTwoCellWidth() {
    WidgetUiBuilder.WidgetSize narrow =
      new WidgetUiBuilder.WidgetSize(110, 110, R.layout.widget_medium);
    WidgetUiBuilder.WidgetSize wide =
      new WidgetUiBuilder.WidgetSize(250, 80, R.layout.widget_medium);
    assertEquals("Perth", WidgetUiBuilder.formatWidgetRouteLine("Edgewater → Perth", narrow));
    assertEquals(
      "Edgewater → Perth",
      WidgetUiBuilder.formatWidgetRouteLine("Edgewater → Perth", wide)
    );
  }

  @Test
  public void liveRouteLineTextSizeSp_doesNotUpscaleOnTallNarrowCell() {
    WidgetUiBuilder.WidgetSize narrowTwoByTwo =
      new WidgetUiBuilder.WidgetSize(110, 110, R.layout.widget_medium);
    assertEquals(
      13f,
      WidgetUiBuilder.liveRouteLineTextSizeSp("Perth", narrowTwoByTwo),
      0.01f
    );
    assertEquals(
      13f,
      WidgetUiBuilder.liveRouteLineTextSizeSp("Edgewater → Perth", narrowTwoByTwo),
      0.01f
    );
    WidgetUiBuilder.WidgetSize compact2x1 = WidgetLayoutTestSupport.small2x1();
    assertEquals(
      10f,
      WidgetUiBuilder.liveRouteLineTextSizeSp("Edgewater → Perth", compact2x1),
      0.01f
    );
    WidgetUiBuilder.WidgetSize wide =
      new WidgetUiBuilder.WidgetSize(250, 110, R.layout.widget_medium);
    assertEquals(
      14f,
      WidgetUiBuilder.liveRouteLineTextSizeSp("Warwick → Perth", wide),
      0.01f
    );
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
  public void widgetSize_typeScale_growsOnTallMediumCells() {
    WidgetUiBuilder.WidgetSize twoByOne =
      new WidgetUiBuilder.WidgetSize(110, 40, R.layout.widget_small);
    WidgetUiBuilder.WidgetSize threeByOne =
      new WidgetUiBuilder.WidgetSize(250, 40, R.layout.widget_medium);
    WidgetUiBuilder.WidgetSize twoByTwo =
      new WidgetUiBuilder.WidgetSize(110, 110, R.layout.widget_medium);

    assertEquals(1f, twoByOne.typeScale(), 0.01f);
    assertEquals(1f, threeByOne.typeScale(), 0.01f);
    assertEquals(1.28f, twoByTwo.typeScale(), 0.01f);
    assertFalse(twoByTwo.useTallIdleLayout());
    assertFalse(threeByOne.useTallIdleLayout());
  }

  @Test
  public void idlePrimaryTextSizeSp_shrinksWindowRanges() {
    assertEquals(24f, WidgetUiBuilder.idlePrimaryTextSizeSp("7:30", R.layout.widget_small), 0.01f);
    assertEquals(17f, WidgetUiBuilder.idlePrimaryTextSizeSp("6:00–9:00", R.layout.widget_small), 0.01f);
    assertEquals(15f, WidgetUiBuilder.idlePrimaryTextSizeSp("15:00–18:00", R.layout.widget_small), 0.01f);
    assertEquals(24f, WidgetUiBuilder.idlePrimaryTextSizeSp("7:30", R.layout.widget_medium), 0.01f);
    assertEquals(15f, WidgetUiBuilder.idlePrimaryTextSizeSp("15:00–18:00", R.layout.widget_medium), 0.01f);
  }

  @Test
  public void idlePrimaryTextSizeSp_capsFurtherWhenDayWordShows() {
    assertEquals(
      22f,
      WidgetUiBuilder.idlePrimaryTextSizeSp("16:30", true),
      0.01f
    );
  }

  @Test
  public void idleRouteLineTextSizeSp_scalesDownForOutsideHoursFace() {
    assertEquals(11.05f, WidgetUiBuilder.idleRouteLineTextSizeSp("Warwick → Perth"), 0.01f);
    assertEquals(9.35f, WidgetUiBuilder.idleRouteLineTextSizeSp("Elizabeth Quay → Cockburn Central"), 0.01f);
  }

  @Test
  public void shouldShowUpdatedLine_onlyOnMediumLayout() {
    assertFalse(WidgetUiBuilder.shouldShowUpdatedLine(R.layout.widget_small));
    assertTrue(WidgetUiBuilder.shouldShowUpdatedLine(R.layout.widget_medium));
  }

  @Test
  public void layoutForSizeDp_keepsDefaultTwoByOneSmall() {
    assertEquals(R.layout.widget_small, WidgetUiBuilder.layoutForSizeDp(110, 40));
    assertEquals(R.layout.widget_small, WidgetUiBuilder.layoutForSizeDp(170, 70));
    assertEquals(R.layout.widget_small, WidgetUiBuilder.layoutForSizeDp(180, 40));
    assertEquals(R.layout.widget_small, WidgetUiBuilder.layoutForSizeDp(250, 40));
    assertEquals(R.layout.widget_small, WidgetUiBuilder.layoutForSizeDp(187, 95));
  }

  @Test
  public void layoutForSizeDp_usesMediumForTallWideOrTwoByTwo() {
    assertEquals(R.layout.widget_medium, WidgetUiBuilder.layoutForSizeDp(180, 55));
    assertEquals(R.layout.widget_medium, WidgetUiBuilder.layoutForSizeDp(180, 70));
    assertEquals(R.layout.widget_medium, WidgetUiBuilder.layoutForSizeDp(110, 110));
    assertEquals(R.layout.widget_medium, WidgetUiBuilder.layoutForSizeDp(300, 140));
  }

  @Test
  public void widgetSize_isShortCell_belowFiftyFiveDp() {
    WidgetUiBuilder.WidgetSize shortCell =
      new WidgetUiBuilder.WidgetSize(180, 40, R.layout.widget_small);
    WidgetUiBuilder.WidgetSize tallCell =
      new WidgetUiBuilder.WidgetSize(180, 70, R.layout.widget_medium);
    assertTrue(shortCell.isShortCell());
    assertFalse(tallCell.isShortCell());
  }

  @Test
  public void foldRouteIntoTrainClock_joinsDayAndRoute() {
    assertEquals("Monday · Joondalup", WidgetUiBuilder.foldRouteIntoTrainClock("Monday", "Joondalup"));
    assertEquals("Joondalup", WidgetUiBuilder.foldRouteIntoTrainClock("", "Joondalup"));
    assertEquals("Monday", WidgetUiBuilder.foldRouteIntoTrainClock("Monday", ""));
  }

  @Test
  public void compactRouteLine_keepsArrowWithoutSpaces() {
    assertEquals("Warwick Stn→Perth", WidgetUiBuilder.compactRouteLine("Warwick Stn → Perth"));
    assertEquals("Edgewater→Perth", WidgetUiBuilder.compactRouteLine("Edgewater → Perth"));
  }

  @Test
  public void abbreviateRouteLine_keepsDestinationOnly() {
    assertEquals("Perth", WidgetUiBuilder.abbreviateRouteLine("Warwick → Perth"));
    assertEquals("Joondalup", WidgetUiBuilder.abbreviateRouteLine("Joondalup"));
  }

  @Test
  public void resolveMediumUpdatedLine_showsFreshUpdatedOnMediumLayout() {
    assertEquals(
      "Updated just now",
      WidgetUiBuilder.resolveMediumUpdatedLine("Updated just now", "14 min", "Leave in 4 min", false)
    );
    assertEquals(
      "",
      WidgetUiBuilder.visibleUpdatedLine("Updated 3m ago", R.layout.widget_small)
    );
    assertEquals(
      "Updated 3m ago",
      WidgetUiBuilder.visibleUpdatedLine("Updated 3m ago", R.layout.widget_medium)
    );
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
      "Refreshing…",
      WidgetUiBuilder.resolveMediumUpdatedLine("Refreshing…", "10:47 am", "", true)
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
