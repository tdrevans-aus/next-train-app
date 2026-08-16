package com.tdrevans.nexttrain

import android.content.Context
import android.os.Build
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb

/** Resolved Glance paint tokens for blend / wallpaper / brand modes (FB-40). */
data class WidgetGlanceColors(
  val surfaceArgb: Int,
  val surfaceAlpha: Float,
  val onSurfaceArgb: Int,
  val mutedArgb: Int,
  val accentArgb: Int,
  val borderArgb: Int,
  val needsScrim: Boolean,
  val showBorder: Boolean,
) {
  fun surfaceColor(): Color = Color(surfaceArgb).copy(alpha = surfaceAlpha.coerceIn(0f, 1f))

  fun borderColor(): Color {
    val base = Color(borderArgb)
  return base.copy(alpha = base.alpha * surfaceAlpha.coerceIn(0f, 1f))
  }
}

object WidgetGlanceTheme {

  @JvmStatic
  fun resolve(context: Context): WidgetGlanceColors {
    val mode = WidgetAppearanceMode.read(context)
    val appearance = WidgetAppearanceSettings.read(context)
    return when (mode) {
      WidgetAppearanceMode.MODE_WALLPAPER -> resolveWallpaper(context, appearance)
      WidgetAppearanceMode.MODE_BRAND -> resolveBrand(appearance)
      else -> resolveBlend(context, appearance)
    }
  }

  private fun resolveBlend(context: Context, appearance: WidgetAppearanceSettings): WidgetGlanceColors {
    val palette =
      WidgetThemePalette.resolve(context, WidgetThemePalette.readBlendWidgetThemeId(context))
    val opacity = appearance.effectiveBgOpacity()
    val alpha = opacity / 100f
    val needsScrim = appearance.needsLegibilityAid()
    return WidgetGlanceColors(
      surfaceArgb = palette.bg,
      surfaceAlpha = alpha,
      onSurfaceArgb = palette.text,
      mutedArgb = palette.muted,
      accentArgb = palette.accent,
      borderArgb = palette.border,
      needsScrim = needsScrim,
      showBorder = alpha > 0f && opacity >= 100,
    )
  }

  private fun resolveBrand(appearance: WidgetAppearanceSettings): WidgetGlanceColors {
    val brand = WidgetThemePalette.brandPalette()
    val opacity = appearance.effectiveBgOpacity()
    val alpha = opacity / 100f
    return WidgetGlanceColors(
      surfaceArgb = brand.bg,
      surfaceAlpha = alpha,
      onSurfaceArgb = brand.text,
      mutedArgb = brand.muted,
      accentArgb = brand.accent,
      borderArgb = brand.border,
      needsScrim = appearance.needsLegibilityAid(),
      showBorder = alpha > 0f && opacity >= 100,
    )
  }

  private fun resolveWallpaper(
    context: Context,
    appearance: WidgetAppearanceSettings,
  ): WidgetGlanceColors {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return resolveBrand(appearance)
    }
    val palette =
      WidgetThemePalette.resolve(context, WidgetThemePalette.ID_SYSTEM)
    val opacity = appearance.effectiveBgOpacity()
    val alpha = opacity / 100f
    return WidgetGlanceColors(
      surfaceArgb = palette.bg,
      surfaceAlpha = alpha,
      onSurfaceArgb = palette.text,
      mutedArgb = palette.muted,
      accentArgb = palette.accent,
      borderArgb = palette.border,
      needsScrim = appearance.needsLegibilityAid(),
      showBorder = alpha > 0f && opacity >= 100,
    )
  }

  /** Monet preview for web swatch bridge — API 31+ dynamic scheme slots. */
  @JvmStatic
  fun dynamicPreviewArgb(context: Context, night: Boolean): Map<String, String> {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      val brand = WidgetThemePalette.brandPalette()
      return mapOf(
        "bg" to WidgetThemePalette.colorToArgbHex(brand.bg),
        "text" to WidgetThemePalette.colorToArgbHex(brand.text),
        "muted" to WidgetThemePalette.colorToArgbHex(brand.muted),
        "accent" to WidgetThemePalette.colorToArgbHex(brand.accent),
        "border" to WidgetThemePalette.colorToArgbHex(brand.border),
      )
    }
    val scheme =
      if (night) {
        dynamicDarkColorScheme(context)
      } else {
        dynamicLightColorScheme(context)
      }
    val text = scheme.onSurface.toArgb()
    return mapOf(
      "bg" to WidgetThemePalette.colorToArgbHex(scheme.surface.toArgb()),
      "text" to WidgetThemePalette.colorToArgbHex(text),
      "muted" to WidgetThemePalette.colorToArgbHex(scheme.onSurfaceVariant.toArgb()),
      "accent" to WidgetThemePalette.colorToArgbHex(scheme.primary.toArgb()),
      "border" to WidgetThemePalette.colorToArgbHex(Color(text).copy(alpha = 0.1f).toArgb()),
    )
  }
}
