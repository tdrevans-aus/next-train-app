package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class WidgetUiBuilderTest {

  @Test
  public void compactUpdatedLine_shortensForNarrowWidget() {
    assertEquals("Just now", WidgetUiBuilder.compactUpdatedLine("Updated just now"));
    assertEquals("3m ago", WidgetUiBuilder.compactUpdatedLine("Updated 3m ago"));
    assertEquals("Updating…", WidgetUiBuilder.compactUpdatedLine("Updating…"));
    assertEquals("9:10 am", WidgetUiBuilder.compactUpdatedLine("9:10 am"));
  }

  @Test
  public void compactLeaveSecondary_shortensForNarrowWidget() {
    assertEquals("Leave now", WidgetUiBuilder.compactLeaveSecondary("Leave now"));
    assertEquals("In 5m", WidgetUiBuilder.compactLeaveSecondary("Leave in 5 min"));
    assertEquals("In 1m", WidgetUiBuilder.compactLeaveSecondary("Leave in 1 min"));
    assertEquals("5m ago", WidgetUiBuilder.compactLeaveSecondary("Leave 5 min ago"));
    assertEquals("1m ago", WidgetUiBuilder.compactLeaveSecondary("Leave 1 min ago"));
    assertEquals("Fetching…", WidgetUiBuilder.compactLeaveSecondary("Fetching next train…"));
    assertEquals("Tap app", WidgetUiBuilder.compactLeaveSecondary("Tap to refresh"));
    assertEquals("", WidgetUiBuilder.compactLeaveSecondary(""));
  }

  @Test
  public void compactPrimary_shortensUpdatingForNarrowWidget() {
    assertEquals("…", WidgetUiBuilder.compactPrimary("Updating…"));
    assertEquals("5 min", WidgetUiBuilder.compactPrimary("5 min"));
  }

  @Test
  public void compactUpdatedLine_shortensStaleMessage() {
    assertEquals("Out of date", WidgetUiBuilder.compactUpdatedLine("Times may be out of date"));
  }
}
