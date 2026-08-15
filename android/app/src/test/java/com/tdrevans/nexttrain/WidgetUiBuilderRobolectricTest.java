package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * FB-28: widget layout regression — assert {@link WidgetUiBuilder} RemoteViews bind
 * expected text / visibility and that layouts define the target view ids.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 28, manifest = Config.NONE)
public class WidgetUiBuilderRobolectricTest {

  @Test
  public void small2x1_liveFace_showsPrimaryLeaveAndFoldedClock() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyWithLeave();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.assertLayoutDefines(
      size,
      R.id.widget_primary_value,
      R.id.widget_leave_label,
      R.id.widget_train_clock,
      R.id.widget_route
    );
    RemoteViews remoteViews = WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size);
    WidgetLayoutTestSupport.RemoteViewsBinding binding = WidgetLayoutTestSupport.capture(remoteViews);

    assertEquals("11 min", binding.primaryDisplay());
    assertEquals("LEAVE IN", binding.text(R.id.widget_leave_label));
    assertEquals("4", binding.text(R.id.widget_leave_value));
    assertEquals("min", binding.text(R.id.widget_leave_unit));
    assertTrue(binding.text(R.id.widget_train_clock).contains("5:42 pm"));
    assertTrue(binding.text(R.id.widget_train_clock).contains("·"));
    assertEquals(View.GONE, binding.visibility(R.id.widget_route));
    assertEquals(View.GONE, binding.visibility(R.id.widget_updated));
  }

  @Test
  public void small2x1_updating_showsEllipsisPrimaryNotTruncatedWord() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveUpdating();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals("…", binding.text(R.id.widget_primary_value));
    assertFalse(binding.text(R.id.widget_primary_value).contains("Upd"));
  }

  @Test
  public void medium3x1_liveFace_showsUpdatedLineAndLeave() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyWithLeave();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.medium3x1();
    WidgetLayoutTestSupport.assertLayoutDefines(
      size,
      R.id.widget_updated,
      R.id.widget_route,
      R.id.widget_leave_row
    );
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals("11 min", binding.primaryDisplay());
    assertEquals("5:42 pm", binding.text(R.id.widget_train_clock));
    assertEquals("Updated just now", binding.text(R.id.widget_updated));
    assertEquals("LEAVE IN", binding.text(R.id.widget_leave_label));
    assertTrue(binding.text(R.id.widget_route).contains("Warwick"));
  }

  @Test
  public void medium3x1_updating_hidesConflictingUpdatedWhileFetching() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveUpdating();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.medium3x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals("…", binding.text(R.id.widget_primary_value));
    assertEquals("", binding.text(R.id.widget_updated));
  }

  @Test
  public void small2x1_outsideHoursIdle_showsPreferredWindowWithoutLeaveTwin() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.outsideHoursIdle();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals("7:30", binding.text(R.id.widget_primary_value));
    assertEquals("Tomorrow", binding.text(R.id.widget_train_clock));
    assertEquals(View.GONE, binding.visibility(R.id.widget_leave_row));
    assertTrue(binding.text(R.id.widget_route).contains("Edgewater"));
  }

  @Test
  public void small2x1_emptySetup_showsTapToSetUpCopy() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.emptySetup();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals("NEXT TRAIN", binding.text(R.id.widget_label));
    assertEquals(
      WidgetUiBuilder.EMPTY_SETUP_PRIMARY,
      binding.text(R.id.widget_primary_value)
    );
    assertEquals(
      WidgetUiBuilder.EMPTY_SETUP_SUB,
      binding.text(R.id.widget_train_clock)
    );
  }
}
