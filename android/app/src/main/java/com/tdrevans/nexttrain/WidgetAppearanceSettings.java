package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONObject;

/** FB-36: widget container background opacity + transparent card flag. */
public final class WidgetAppearanceSettings {

  public static final int DEFAULT_BG_OPACITY = 0;

  public final int bgOpacity;
  public final boolean transparentBg;

  public WidgetAppearanceSettings(int bgOpacity, boolean transparentBg) {
    this.bgOpacity = bgOpacity;
    this.transparentBg = transparentBg;
  }

  public int effectiveBgOpacity() {
    if (transparentBg) {
      return 0;
    }
    return bgOpacity;
  }

  public boolean needsLegibilityAid() {
    return effectiveBgOpacity() < 50;
  }

  public static WidgetAppearanceSettings read(Context context) {
    try {
      String raw = WidgetSettingsStore.readSettings(context);
      if (raw == null || raw.isEmpty()) {
        return defaults();
      }
      JSONObject settings = new JSONObject(raw);
      String mode = WidgetAppearanceMode.read(context);
      boolean transparent = settings.optBoolean("widgetTransparentBg", false);
      int defaultOpacity =
        WidgetAppearanceMode.MODE_BLEND.equals(mode) ? DEFAULT_BG_OPACITY : 100;
      int opacity = settings.optInt("widgetBgOpacity", defaultOpacity);
      opacity = clampOpacity(opacity);
      if (!WidgetAppearanceMode.MODE_BLEND.equals(mode) && opacity > 0) {
        transparent = false;
      }
      if (transparent) {
        opacity = 0;
      }
      return new WidgetAppearanceSettings(opacity, transparent);
    } catch (Exception error) {
      return defaults();
    }
  }

  public static WidgetAppearanceSettings defaults() {
    return new WidgetAppearanceSettings(DEFAULT_BG_OPACITY, false);
  }

  static int clampOpacity(int value) {
    return Math.max(0, Math.min(100, value));
  }
}
