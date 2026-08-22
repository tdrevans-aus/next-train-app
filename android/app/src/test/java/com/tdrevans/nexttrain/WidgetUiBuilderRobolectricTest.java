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
  public void small2x1_liveFace_showsPrimaryLeaveAndRouteAtBottom() throws Exception {
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
    assertEquals("Target train", binding.text(R.id.widget_label));
    assertEquals("LEAVE IN", binding.text(R.id.widget_leave_label));
    assertEquals("4", binding.text(R.id.widget_leave_value));
    assertEquals("min", binding.text(R.id.widget_leave_unit));
    assertEquals("5:42 pm", binding.text(R.id.widget_train_clock));
    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_route));
    assertTrue(binding.text(R.id.widget_route).contains("Warwick"));
    assertTrue(binding.text(R.id.widget_route).contains("Perth"));
    assertEquals(View.GONE, binding.visibility(R.id.widget_updated));
    assertEquals(View.INVISIBLE, binding.visibility(R.id.widget_bottom_spacer));
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
  public void medium3x1_delayedTrain_hidesStatusCrumb() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyWithLeave();
    snapshot.put("statusCrumb", "2 min late");
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.medium3x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals(View.GONE, binding.visibility(R.id.widget_status));
    assertEquals("", binding.text(R.id.widget_status));
    assertEquals("LEAVE IN", binding.text(R.id.widget_leave_label));
  }

  @Test
  public void small2x1_noLeave_showsRouteAtBottom() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyNoLeave();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_route));
    assertEquals("23:15", binding.text(R.id.widget_train_clock));
    assertTrue(binding.text(R.id.widget_route).contains("Edgewater"));
    assertTrue(binding.text(R.id.widget_route).contains("Perth"));
    assertEquals(
      10f,
      WidgetUiBuilder.liveRouteLineTextSizeSp("Edgewater → Perth", size),
      0.01f
    );
  }

  @Test
  public void narrowTwoByTwo_abbreviatesRouteAndKeepsSmallText() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyNoLeave();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.narrowTwoByTwo();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_route));
    assertEquals("Perth", binding.text(R.id.widget_route));
    assertEquals(
      13f,
      WidgetUiBuilder.liveRouteLineTextSizeSp("Edgewater → Perth", size),
      0.01f
    );
    assertEquals("Updated just now", binding.text(R.id.widget_updated));
  }

  @Test
  public void resolveTapIntent_opensJourneyForLiveFace() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("journeyId", "edgewater-am");
    snapshot.put("label", "Target");
    android.content.Intent intent =
      WidgetUiBuilder.resolveTapIntent(WidgetLayoutTestSupport.appContext(), snapshot);
    assertEquals("nexttrain://journey/edgewater-am", intent.getData().toString());
  }

  @Test
  public void resolveTapIntent_opensNearbyForNearbyPin() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("journeyId", NearbyPinHelper.JOURNEY_ID);
    android.content.Intent intent =
      WidgetUiBuilder.resolveTapIntent(WidgetLayoutTestSupport.appContext(), snapshot);
    assertEquals("nexttrain://nearby", intent.getData().toString());
  }

  @Test
  public void resolveTapIntent_opensJourneyForOutsideHoursPreview() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("outsideHoursIdle", true);
    snapshot.put("openNearbyOnTap", true);
    snapshot.put("journeyId", "morning-commute");
    android.content.Intent intent =
      WidgetUiBuilder.resolveTapIntent(WidgetLayoutTestSupport.appContext(), snapshot);
    assertEquals("nexttrain://journey/morning-commute", intent.getData().toString());
  }

  @Test
  public void resolveTapIntent_opensNearbyForNearMeFallback() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("nearbyFallback", true);
    snapshot.put("journeyId", "nearby");
    android.content.Intent intent =
      WidgetUiBuilder.resolveTapIntent(WidgetLayoutTestSupport.appContext(), snapshot);
    assertEquals("nexttrain://nearby", intent.getData().toString());
  }

  @Test
  public void resolveTapIntent_emptySetupOpensAddJourney() throws Exception {
    JSONObject snapshot = new JSONObject();
    snapshot.put("empty", true);
    android.content.Intent intent =
      WidgetUiBuilder.resolveTapIntent(WidgetLayoutTestSupport.appContext(), snapshot);
    assertEquals("nexttrain://journey/new", intent.getData().toString());
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
  public void small2x1_liveNearbyPin_showsRouteAtBottom() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveNearbyPin();
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals("Pinned train", binding.text(R.id.widget_label));
    assertEquals("15:30", binding.text(R.id.widget_train_clock));
    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_route));
    assertTrue(binding.text(R.id.widget_route).contains("Edgewater"));
    assertTrue(binding.text(R.id.widget_route).contains("Perth"));
  }

  @Test
  public void small2x1_liveFace_emptyClockStillShowsRoute() throws Exception {
    JSONObject snapshot = WidgetSnapshotFixtures.liveJourneyWithLeave();
    snapshot.put("trainClock", "");
    WidgetUiBuilder.WidgetSize size = WidgetLayoutTestSupport.small2x1();
    WidgetLayoutTestSupport.RemoteViewsBinding binding =
      WidgetLayoutTestSupport.capture(
        WidgetUiBuilder.build(WidgetLayoutTestSupport.appContext(), snapshot, size)
      );

    assertEquals(View.GONE, binding.visibility(R.id.widget_train_clock));
    assertEquals(View.VISIBLE, binding.visibility(R.id.widget_route));
    assertTrue(binding.text(R.id.widget_route).contains("Warwick"));
  }

  @Test
  public void small2x1_emptySetup_showsNeutralSetupCopy() throws Exception {
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
