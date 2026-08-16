package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 31, manifest = Config.NONE)
public class WidgetAppearanceSettingsTest {

  private Context context() {
    return WidgetLayoutTestSupport.appContext();
  }

  @Test
  public void defaultsToBlendTransparent() {
    WidgetSettingsStore.saveSettings(context(), "{\"journeys\":[]}");
    WidgetAppearanceSettings settings = WidgetAppearanceSettings.read(context());
    assertEquals(WidgetAppearanceSettings.DEFAULT_BG_OPACITY, settings.bgOpacity);
    assertFalse(settings.transparentBg);
    assertEquals(0, settings.effectiveBgOpacity());
    assertTrue(settings.needsLegibilityAid());
  }

  @Test
  public void clampsOpacityAndHonoursTransparentFlag() {
    WidgetSettingsStore.saveSettings(
      context(),
      "{\"widgetBgOpacity\":140,\"widgetTransparentBg\":true,\"journeys\":[]}"
    );
    WidgetAppearanceSettings settings = WidgetAppearanceSettings.read(context());
    assertTrue(settings.transparentBg);
    assertEquals(0, settings.effectiveBgOpacity());
    assertTrue(settings.needsLegibilityAid());
  }

  @Test
  public void opacity40NeedsLegibilityAid() {
    WidgetSettingsStore.saveSettings(context(), "{\"widgetBgOpacity\":40,\"journeys\":[]}");
    WidgetAppearanceSettings settings = WidgetAppearanceSettings.read(context());
    assertEquals(40, settings.bgOpacity);
    assertFalse(settings.transparentBg);
    assertTrue(settings.needsLegibilityAid());
  }

  @Test
  public void brandModeIgnoresStaleTransparentWhenOpacitySet() {
    WidgetSettingsStore.saveSettings(
      context(),
      "{\"widgetAppearanceMode\":\"brand\",\"widgetBgOpacity\":40,\"widgetTransparentBg\":true,\"journeys\":[]}"
    );
    WidgetAppearanceSettings settings = WidgetAppearanceSettings.read(context());
    assertEquals(40, settings.bgOpacity);
    assertFalse(settings.transparentBg);
    assertEquals(40, settings.effectiveBgOpacity());
  }

  @Test
  public void clampOpacityBounds() {
    assertEquals(0, WidgetAppearanceSettings.clampOpacity(-5));
    assertEquals(100, WidgetAppearanceSettings.clampOpacity(250));
    assertEquals(42, WidgetAppearanceSettings.clampOpacity(42));
  }
}
