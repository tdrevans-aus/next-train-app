package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
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

  @Test
  public void opacity40_paintsBackgroundWithExpectedAlphaAndScrim() throws Exception {
    Context context = WidgetLayoutTestSupport.appContext();
    WidgetSettingsStore.saveSettings(context, "{\"widgetBgOpacity\":40,\"journeys\":[]}");
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyWithLeave();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetAppearanceSettings appearance = WidgetAppearanceSettings.read(context);
    WidgetThemePalette palette = WidgetUiBuilder.resolveAppearancePalette(context);
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(context, snapshot, size)
      );

    assertEquals(40, appearance.effectiveBgOpacity());
    assertTrue(appearance.needsLegibilityAid());
    assertEquals(102, Color.alpha(WidgetBackgroundPainter.resolveFillColor(palette.bg, 40)));
    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_bg_layer));
    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_text_scrim));
    Bitmap bg = binding.bitmap(R.id.widget_bg_layer);
    assertTrue(bg != null);
    assertEquals(110, bg.getWidth());
    assertEquals(40, bg.getHeight());
    assertEquals(Color.TRANSPARENT, binding.backgroundColor(R.id.widget_root).intValue());
  }

  @Test
  public void brandModeOpacity40_paintsBackgroundWithExpectedAlpha() throws Exception {
    Context context = WidgetLayoutTestSupport.appContext();
    WidgetSettingsStore.saveSettings(
      context,
      "{\"widgetAppearanceMode\":\"brand\",\"widgetBgOpacity\":40,\"widgetTransparentBg\":true,\"journeys\":[]}"
    );
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyWithLeave();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetAppearanceSettings appearance = WidgetAppearanceSettings.read(context);
    WidgetThemePalette palette = WidgetUiBuilder.resolveAppearancePalette(context);
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(context, snapshot, size)
      );

    assertEquals(40, appearance.effectiveBgOpacity());
    assertFalse(appearance.transparentBg);
    assertEquals(102, Color.alpha(WidgetBackgroundPainter.resolveFillColor(palette.bg, 40)));
    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_bg_layer));
    Bitmap bg = binding.bitmap(R.id.widget_bg_layer);
    assertTrue(bg != null);
    assertEquals(110, bg.getWidth());
    assertEquals(40, bg.getHeight());
  }

  @Test
  public void transparentCard_hidesBackgroundLayer() throws Exception {
    Context context = WidgetLayoutTestSupport.appContext();
    WidgetSettingsStore.saveSettings(
      context,
      "{\"widgetBgOpacity\":0,\"widgetTransparentBg\":true,\"journeys\":[]}"
    );
    JSONObject snapshot = WidgetSnapshotFixtures.emptySetup();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(context, snapshot, size)
      );

    assertEquals(View.GONE, binding.visibility(R.id.widget_bg_layer));
    assertEquals(View.GONE, binding.visibility(R.id.widget_text_scrim));
    assertEquals(Color.TRANSPARENT, binding.backgroundColor(R.id.widget_root).intValue());
  }
}
