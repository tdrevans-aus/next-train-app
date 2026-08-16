package com.tdrevans.nexttrain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import android.content.Context;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 30, manifest = Config.NONE)
public class WidgetThemePaletteApi30Test {

  @Test
  public void systemThemeOnApi30UsesDefaultPreset() {
    Context context = WidgetLayoutTestSupport.appContext();
    WidgetThemePalette palette =
      WidgetThemePalette.resolve(context, WidgetThemePalette.ID_SYSTEM);
    WidgetThemePalette defaultPalette =
      WidgetThemePalette.resolve(context, WidgetThemePalette.ID_DEFAULT);

    assertEquals(WidgetThemePalette.ID_SYSTEM, palette.id);
    assertEquals(defaultPalette.bg, palette.bg);
    assertEquals(defaultPalette.text, palette.text);
    assertEquals(defaultPalette.accent, palette.accent);
    assertFalse(WidgetThemePalette.supportsDynamicSystemColors());
  }
}
