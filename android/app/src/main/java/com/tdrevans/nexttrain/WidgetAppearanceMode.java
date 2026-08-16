package com.tdrevans.nexttrain;

import android.content.Context;
import org.json.JSONObject;

/** FB-40: blend-first widget appearance — blend / wallpaper / brand. */
public final class WidgetAppearanceMode {

  public static final String MODE_BLEND = "blend";
  public static final String MODE_WALLPAPER = "wallpaper";
  public static final String MODE_BRAND = "brand";

  private WidgetAppearanceMode() {}

  public static String read(Context context) {
    try {
      String raw = WidgetSettingsStore.readSettings(context);
      if (raw == null || raw.isEmpty()) {
        return MODE_BLEND;
      }
      JSONObject settings = new JSONObject(raw);
      String mode = settings.optString("widgetAppearanceMode", "").trim();
      if (isValidMode(mode)) {
        return mode;
      }
      String legacyTheme = settings.optString("widgetThemeId", "").trim();
      if (!legacyTheme.isEmpty()) {
        return migrateThemeId(legacyTheme);
      }
      return MODE_BLEND;
    } catch (Exception error) {
      return MODE_BLEND;
    }
  }

  public static boolean isWallpaperModeActive(Context context) {
    return MODE_WALLPAPER.equals(read(context));
  }

  public static boolean isBlendMode(Context context) {
    return MODE_BLEND.equals(read(context));
  }

  public static boolean isBrandMode(Context context) {
    return MODE_BRAND.equals(read(context));
  }

  public static String migrateThemeId(String themeId) {
    if (themeId == null || themeId.isEmpty()) {
      return MODE_BLEND;
    }
    if ("system".equals(themeId)) {
      return MODE_WALLPAPER;
    }
    if ("default".equals(themeId)) {
      return MODE_BRAND;
    }
  // ocean, midnight, slate, lavender, rose, amoled, forest → blend
    return MODE_BLEND;
  }

  private static boolean isValidMode(String mode) {
    return MODE_BLEND.equals(mode) || MODE_WALLPAPER.equals(mode) || MODE_BRAND.equals(mode);
  }
}
