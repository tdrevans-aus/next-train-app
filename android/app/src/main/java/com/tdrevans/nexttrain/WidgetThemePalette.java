package com.tdrevans.nexttrain;

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import androidx.core.content.ContextCompat;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

/**
 * Widget-only colour presets (FB-35). Semantic leave / urgent / late colours stay in
 * {@code colors.xml} — only bg, text, muted, accent, and card border vary per preset.
 */
public final class WidgetThemePalette {

  public static final String ID_DEFAULT = "default";
  public static final String ID_OCEAN = "ocean";
  public static final String ID_MIDNIGHT = "midnight";
  public static final String ID_SLATE = "slate";
  public static final String ID_LAVENDER = "lavender";
  public static final String ID_ROSE = "rose";
  public static final String ID_AMOLED = "amoled";
  public static final String ID_SYSTEM = "system";

  private static final double AA_MIN = 4.5;

  /** Removed preset — migrate stored settings to default. */
  private static final String ID_FOREST_LEGACY = "forest";

  private static final List<String> PRESET_IDS =
    Collections.unmodifiableList(
      Arrays.asList(
        ID_DEFAULT,
        ID_OCEAN,
        ID_MIDNIGHT,
        ID_SLATE,
        ID_LAVENDER,
        ID_ROSE,
        ID_AMOLED,
        ID_SYSTEM
      )
    );

  private static final Map<String, WidgetThemePalette> PRESETS = buildPresets();

  public final String id;
  public final int bg;
  public final int text;
  public final int muted;
  public final int accent;
  public final int border;

  public WidgetThemePalette(String id, int bg, int text, int muted, int accent, int border) {
    this.id = id;
    this.bg = bg;
    this.text = text;
    this.muted = muted;
    this.accent = accent;
    this.border = border;
  }

  public static List<String> presetIds() {
    return PRESET_IDS;
  }

  public static WidgetThemePalette brandPalette() {
    return preset(ID_DEFAULT);
  }

  public static WidgetThemePalette resolve(Context context, String themeId) {
    if (themeId == null || themeId.isEmpty()) {
      return preset(ID_DEFAULT);
    }
    if (ID_SYSTEM.equals(themeId)) {
      return resolveSystem(context);
    }
    WidgetThemePalette palette = PRESETS.get(themeId);
    return palette != null ? palette : preset(ID_DEFAULT);
  }

  public static String readWidgetThemeId(Context context) {
    try {
      String raw = WidgetSettingsStore.readSettings(context);
      if (raw == null || raw.isEmpty()) {
        return ID_DEFAULT;
      }
      JSONObject settings = new JSONObject(raw);
      String id = settings.optString("widgetThemeId", ID_DEFAULT).trim();
      if (id.isEmpty() || ID_FOREST_LEGACY.equals(id)) {
        return ID_DEFAULT;
      }
      return id;
    } catch (Exception error) {
      return ID_DEFAULT;
    }
  }

  public static boolean isSystemThemeActive(Context context) {
    return WidgetAppearanceMode.isWallpaperModeActive(context);
  }

  public static boolean isNightMode(Context context) {
    return (context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
      == Configuration.UI_MODE_NIGHT_YES;
  }

  public static boolean supportsDynamicSystemColors() {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
  }

  public static String colorToArgbHex(int color) {
    return String.format("#%08X", color & 0xFFFFFFFFL);
  }

  /** WCAG relative luminance contrast ratio (≥ 4.5:1 = AA for normal text). */
  public static double contrastRatio(int foreground, int background) {
    double l1 = relativeLuminance(foreground);
    double l2 = relativeLuminance(background);
    double lighter = Math.max(l1, l2);
    double darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  public double textOnBgContrast() {
    return contrastRatio(text, bg);
  }

  public double accentOnBgContrast() {
    return contrastRatio(accent, bg);
  }

  private static WidgetThemePalette preset(String id) {
    WidgetThemePalette palette = PRESETS.get(id);
    if (palette == null) {
      throw new IllegalStateException("Missing preset: " + id);
    }
    return palette;
  }

  private static Map<String, WidgetThemePalette> buildPresets() {
    Map<String, WidgetThemePalette> map = new HashMap<>();
    map.put(
      ID_DEFAULT,
      new WidgetThemePalette(
        ID_DEFAULT,
        parse("#FFFFFF"),
        parse("#1A2F2C"),
        parse("#5C726D"),
        parse("#0B6E6A"),
        parse("#1A132523")
      )
    );
    map.put(
      ID_OCEAN,
      new WidgetThemePalette(
        ID_OCEAN,
        parse("#E8F4FC"),
        parse("#0F2942"),
        parse("#4A6B85"),
        parse("#0369A1"),
        parse("#1A0F2942")
      )
    );
    map.put(
      ID_MIDNIGHT,
      new WidgetThemePalette(
        ID_MIDNIGHT,
        parse("#1A2332"),
        parse("#E8EDF4"),
        parse("#8B9CB3"),
        parse("#60A5FA"),
        parse("#33E8EDF4")
      )
    );
    map.put(
      ID_SLATE,
      new WidgetThemePalette(
        ID_SLATE,
        parse("#1C1C1E"),
        parse("#F2F2F7"),
        parse("#98989D"),
        parse("#A1A1AA"),
        parse("#33F2F2F7")
      )
    );
    map.put(
      ID_LAVENDER,
      new WidgetThemePalette(
        ID_LAVENDER,
        parse("#F3EEFA"),
        parse("#2D2640"),
        parse("#6B6280"),
        parse("#7C3AED"),
        parse("#1A2D2640")
      )
    );
    map.put(
      ID_ROSE,
      new WidgetThemePalette(
        ID_ROSE,
        parse("#FDF2F4"),
        parse("#3D1F28"),
        parse("#8B6570"),
        parse("#D41D6F"),
        parse("#1A3D1F28")
      )
    );
    map.put(
      ID_AMOLED,
      new WidgetThemePalette(
        ID_AMOLED,
        parse("#000000"),
        parse("#F5F5F5"),
        parse("#A3A3A3"),
        parse("#14B8A6"),
        parse("#26F5F5F5")
      )
    );
    return map;
  }

  /**
   * API 31+: Material You {@code system_*} tokens. API 26–30: Default preset.
   */
  private static WidgetThemePalette resolveSystem(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      WidgetThemePalette fallback = preset(ID_DEFAULT);
      return new WidgetThemePalette(
        ID_SYSTEM,
        fallback.bg,
        fallback.text,
        fallback.muted,
        fallback.accent,
        fallback.border
      );
    }

    boolean night = isNightMode(context);
    WidgetThemePalette fallbackPreset = night ? preset(ID_MIDNIGHT) : preset(ID_DEFAULT);

    int bg =
      resolveSystemColor(
        context,
        night ? android.R.color.system_neutral1_900 : android.R.color.system_neutral1_10,
        night ? android.R.color.system_neutral1_800 : android.R.color.system_neutral1_50,
        fallbackPreset.bg
      );
    int text =
      resolveSystemColor(
        context,
        night ? android.R.color.system_neutral1_50 : android.R.color.system_neutral1_900,
        night ? android.R.color.system_neutral1_100 : android.R.color.system_neutral1_800,
        fallbackPreset.text
      );
    int muted =
      resolveSystemColor(
        context,
        night ? android.R.color.system_neutral2_200 : android.R.color.system_neutral2_700,
        night ? android.R.color.system_neutral2_300 : android.R.color.system_neutral2_600,
        fallbackPreset.muted
      );
    int accent =
      resolveSystemColor(
        context,
        night ? android.R.color.system_accent1_200 : android.R.color.system_accent1_600,
        night ? android.R.color.system_accent1_100 : android.R.color.system_accent1_700,
        fallbackPreset.accent
      );

    WidgetThemePalette palette =
      new WidgetThemePalette(ID_SYSTEM, bg, text, muted, accent, withAlphaFraction(text, 0.1f));
    return applySystemContrastGuard(palette, fallbackPreset);
  }

  private static WidgetThemePalette applySystemContrastGuard(
    WidgetThemePalette palette,
    WidgetThemePalette fallbackPreset
  ) {
    int text = palette.text;
    int accent = palette.accent;
    int bg = palette.bg;

    if (contrastRatio(text, bg) < AA_MIN) {
      text = fallbackPreset.text;
    }
    if (contrastRatio(accent, bg) < AA_MIN) {
      accent = fallbackPreset.accent;
    }

    return new WidgetThemePalette(
      ID_SYSTEM,
      bg,
      text,
      palette.muted,
      accent,
      withAlphaFraction(text, 0.1f)
    );
  }

  private static int resolveSystemColor(
    Context context,
    int primaryResId,
    int alternateResId,
    int fallbackColor
  ) {
    int color = readSystemColor(context, primaryResId);
    if (!isUsableColor(color)) {
      color = readSystemColor(context, alternateResId);
    }
    if (!isUsableColor(color)) {
      return fallbackColor;
    }
    return color;
  }

  private static int readSystemColor(Context context, int resId) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return 0;
    }
    try {
      return ContextCompat.getColor(context, resId);
    } catch (Exception error) {
      return 0;
    }
  }

  private static boolean isUsableColor(int color) {
    return color != 0 && Color.alpha(color) != 0;
  }

  private static int parse(String hex) {
    return Color.parseColor(hex);
  }

  private static int withAlphaFraction(int color, float alphaFraction) {
    int alpha = Math.round(Math.max(0f, Math.min(1f, alphaFraction)) * 255f);
    return (alpha << 24) | (color & 0x00FFFFFF);
  }

  private static double relativeLuminance(int color) {
    double r = linearChannel(Color.red(color));
    double g = linearChannel(Color.green(color));
    double b = linearChannel(Color.blue(color));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private static double linearChannel(int channel) {
    double value = channel / 255.0;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }
}
