package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 31, manifest = Config.NONE)
public class WidgetThemePaletteTest {

  private static final double AA_MIN = 4.5;

  private Context context() {
    return WidgetLayoutTestSupport.appContext();
  }

  @Test
  public void allPresetIdsResolveWithAaContrast() {
    Context context = context();
    for (String id : WidgetThemePalette.presetIds()) {
      if (WidgetThemePalette.ID_SYSTEM.equals(id)) {
        WidgetThemePalette system = WidgetThemePalette.resolve(context, id);
        assertEquals(WidgetThemePalette.ID_SYSTEM, system.id);
        assertContrast(system);
        continue;
      }
      WidgetThemePalette palette = WidgetThemePalette.resolve(context, id);
      assertEquals(id, palette.id);
      assertContrast(palette);
    }
  }

  @Test
  public void unknownIdFallsBackToDefault() {
    Context context = context();
    WidgetThemePalette palette = WidgetThemePalette.resolve(context, "neon-punk");
    assertEquals(WidgetThemePalette.ID_DEFAULT, palette.id);
    assertEquals(
      WidgetThemePalette.resolve(context, WidgetThemePalette.ID_DEFAULT).bg,
      palette.bg
    );
  }

  @Test
  public void readBlendWidgetThemeId_defaultsToOceanWhenMissing() {
    Context context = context();
    WidgetSettingsStore.saveSettings(context, "{\"journeys\":[]}");
    assertEquals(
      WidgetThemePalette.ID_OCEAN,
      WidgetThemePalette.readBlendWidgetThemeId(context)
    );
  }

  @Test
  public void readBlendWidgetThemeId_readsStoredPreset() {
    Context context = context();
    WidgetSettingsStore.saveSettings(
      context,
      "{\"widgetThemeId\":\"midnight\",\"journeys\":[]}"
    );
    assertEquals(
      WidgetThemePalette.ID_MIDNIGHT,
      WidgetThemePalette.readBlendWidgetThemeId(context)
    );
  }

  @Test
  public void readWidgetThemeId_defaultsWhenMissing() {
    Context context = context();
    WidgetSettingsStore.saveSettings(context, "{\"journeys\":[]}");
    assertEquals(
      WidgetThemePalette.ID_DEFAULT,
      WidgetThemePalette.readWidgetThemeId(context)
    );
  }

  @Test
  public void readWidgetThemeId_readsStoredValue() {
    Context context = context();
    WidgetSettingsStore.saveSettings(
      context,
      "{\"widgetThemeId\":\"ocean\",\"journeys\":[]}"
    );
    assertEquals(WidgetThemePalette.ID_OCEAN, WidgetThemePalette.readWidgetThemeId(context));
  }

  @Test
  public void isSystemThemeActive_whenWallpaperModeSelected() {
    Context context = context();
    WidgetSettingsStore.saveSettings(
      context,
      "{\"widgetAppearanceMode\":\"wallpaper\",\"journeys\":[]}"
    );
    assertTrue(WidgetThemePalette.isSystemThemeActive(context));
  }

  @Test
  public void supportsDynamicSystemColors_onApi31() {
    assertTrue(WidgetThemePalette.supportsDynamicSystemColors());
  }

  @Test
  public void colorToArgbHex_formatsAlpha() {
    assertEquals("#FF0B6E6A", WidgetThemePalette.colorToArgbHex(0xFF0B6E6A));
    assertEquals("#1A132523", WidgetThemePalette.colorToArgbHex(0x1A132523));
  }

  private static void assertContrast(WidgetThemePalette palette) {
    assertTrue(
      palette.id + " text/bg " + palette.textOnBgContrast(),
      palette.textOnBgContrast() >= AA_MIN
    );
    assertTrue(
      palette.id + " accent/bg " + palette.accentOnBgContrast(),
      palette.accentOnBgContrast() >= AA_MIN
    );
  }
}
