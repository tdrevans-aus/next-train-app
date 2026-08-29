import SwiftUI

/// iOS port of the Android widget appearance system (FB-35/FB-36/FB-40).
/// Reads `widgetAppearanceMode`, `widgetThemeId`, `widgetBgOpacity`, `widgetTransparentBg`
/// from the synced settings JSON and resolves the colours the widget should paint.
///
/// Preset ARGB values must stay byte-identical to
/// `android/app/src/main/java/com/tdrevans/nexttrain/WidgetThemePalette.java`
/// and the presets in `public/widget.js`.
enum WidgetAppearance {

    static let modeBlend = "blend"
    static let modeWallpaper = "wallpaper"
    static let modeBrand = "brand"

    static let themeDefault = "default"
    static let themeOcean = "ocean"
    static let themeMidnight = "midnight"
    /// Removed preset — migrate stored settings to default.
    private static let themeForestLegacy = "forest"
    private static let themeSystem = "system"

    private static let aaMinContrast = 4.5
    /// Android's blend default is 0 (wallpaper shows through). iOS has no
    /// wallpaper show-through, so an unset opacity paints the card fully.
    static let defaultBgOpacity = 100

    // MARK: palette

    struct Palette {
        let id: String
        let bg: UInt32
        let text: UInt32
        let muted: UInt32
        let accent: UInt32
        let border: UInt32
    }

    static let presets: [String: Palette] = [
        themeDefault: Palette(
            id: themeDefault,
            bg: 0xFFFFFFFF,
            text: 0xFF1A2F2C,
            muted: 0xFF5C726D,
            accent: 0xFF0B6E6A,
            border: 0x1A132523
        ),
        themeOcean: Palette(
            id: themeOcean,
            bg: 0xFFE8F4FC,
            text: 0xFF0F2942,
            muted: 0xFF4A6B85,
            accent: 0xFF0369A1,
            border: 0x1A0F2942
        ),
        themeMidnight: Palette(
            id: themeMidnight,
            bg: 0xFF1B3D6B,
            text: 0xFFE8EDF4,
            muted: 0xFF8B9CB3,
            accent: 0xFF93C5FD,
            border: 0x33E8EDF4
        ),
        "slate": Palette(
            id: "slate",
            bg: 0xFF5A5A63,
            text: 0xFFF4F4F5,
            muted: 0xFFA1A1AA,
            accent: 0xFFE2E8F0,
            border: 0x33F4F4F5
        ),
        "lavender": Palette(
            id: "lavender",
            bg: 0xFFF3EEFA,
            text: 0xFF2D2640,
            muted: 0xFF6B6280,
            accent: 0xFF7C3AED,
            border: 0x1A2D2640
        ),
        "rose": Palette(
            id: "rose",
            bg: 0xFFFDF2F4,
            text: 0xFF3D1F28,
            muted: 0xFF8B6570,
            accent: 0xFFD41D6F,
            border: 0x1A3D1F28
        ),
        "amoled": Palette(
            id: "amoled",
            bg: 0xFF000000,
            text: 0xFFF5F5F5,
            muted: 0xFFA3A3A3,
            accent: 0xFF14B8A6,
            border: 0x26F5F5F5
        ),
    ]

    /// Semantic leave colours — parity with `res/values/colors.xml`.
    static let leaveUrgentColor: UInt32 = 0xFFB45309
    static let lateColor: UInt32 = 0xFFBE123C

    // MARK: settings

    private static func settingsObject() -> [String: Any] {
        guard let raw = WidgetSettingsStore.readSettings(),
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return [:]
        }
        return json
    }

    static func readMode(settings: [String: Any]) -> String {
        let mode = (settings["widgetAppearanceMode"] as? String ?? "")
            .trimmingCharacters(in: .whitespaces)
        if mode == modeBlend || mode == modeWallpaper || mode == modeBrand {
            return mode
        }
        let legacy = (settings["widgetThemeId"] as? String ?? "")
            .trimmingCharacters(in: .whitespaces)
        if legacy == themeSystem { return modeWallpaper }
        if legacy == themeDefault { return modeBrand }
        if !legacy.isEmpty { return modeBlend }
        return modeBlend
    }

    /// Blend paint: curated preset from settings; defaults to ocean when unset (FB-42).
    static func readBlendThemeId(settings: [String: Any]) -> String {
        let id = (settings["widgetThemeId"] as? String ?? "")
            .trimmingCharacters(in: .whitespaces)
        if id.isEmpty || id == themeSystem { return themeOcean }
        if id == themeForestLegacy { return themeDefault }
        return presets[id] != nil ? id : themeOcean
    }

    static func readOpacityPercent(settings: [String: Any], mode: String) -> Int {
        var transparent = settings["widgetTransparentBg"] as? Bool ?? false
        var opacity: Int
        if let value = settings["widgetBgOpacity"] as? NSNumber {
            opacity = value.intValue
        } else {
            opacity = defaultBgOpacity
        }
        opacity = max(0, min(100, opacity))
        if mode != modeBlend && opacity > 0 {
            transparent = false
        }
        if transparent {
            opacity = 0
        }
        return opacity
    }

    // MARK: resolution

    struct Resolved {
        /// Card tint painted over the system background (alpha carries the opacity).
        let cardTint: Color
        let text: Color
        let muted: Color
        let accent: Color
        let leaveUrgent: Color
        let late: Color
    }

    static func resolve(colorScheme: ColorScheme) -> Resolved {
        let settings = settingsObject()
        let mode = readMode(settings: settings)
        let opacity = readOpacityPercent(settings: settings, mode: mode)
        let dark = colorScheme == .dark

        let palette: Palette
        switch mode {
        case modeBrand:
            palette = presets[themeDefault]!
        case modeWallpaper:
            // No Monet equivalent on iOS: follow the system appearance with
            // the same curated pairs Android falls back to (night → midnight).
            palette = presets[dark ? themeMidnight : themeDefault]!
        default:
            palette = presets[readBlendThemeId(settings: settings)]!
        }

        // Approximate the system background the tinted card composites over.
        let base: UInt32 = dark ? 0xFF000000 : 0xFFFFFFFF
        let effectiveBg = composite(palette.bg, alphaPercent: opacity, over: base)

        // AA guard — parity with WidgetThemePalette.applySystemContrastGuard,
        // extended to every mode because opacity changes the effective backdrop.
        let fallback = presets[dark ? themeMidnight : themeDefault]!
        var text = palette.text
        var accent = palette.accent
        var muted = palette.muted
        if contrastRatio(text, effectiveBg) < aaMinContrast {
            text = fallback.text
        }
        if contrastRatio(accent, effectiveBg) < aaMinContrast {
            accent = fallback.accent
        }
        if contrastRatio(muted, effectiveBg) < 3.0 {
            muted = fallback.muted
        }

        return Resolved(
            cardTint: color(palette.bg).opacity(Double(opacity) / 100.0),
            text: color(text),
            muted: color(muted),
            accent: color(accent),
            leaveUrgent: color(leaveUrgentColor),
            late: color(lateColor)
        )
    }

    // MARK: colour math (parity with WidgetThemePalette.java)

    static func color(_ argb: UInt32) -> Color {
        Color(
            .sRGB,
            red: Double((argb >> 16) & 0xFF) / 255.0,
            green: Double((argb >> 8) & 0xFF) / 255.0,
            blue: Double(argb & 0xFF) / 255.0,
            opacity: Double((argb >> 24) & 0xFF) / 255.0
        )
    }

    static func composite(_ top: UInt32, alphaPercent: Int, over base: UInt32) -> UInt32 {
        let alpha = Double(max(0, min(100, alphaPercent))) / 100.0
        func mix(_ shift: UInt32) -> UInt32 {
            let t = Double((top >> shift) & 0xFF)
            let b = Double((base >> shift) & 0xFF)
            return UInt32((t * alpha + b * (1.0 - alpha)).rounded()) & 0xFF
        }
        return 0xFF000000 | (mix(16) << 16) | (mix(8) << 8) | mix(0)
    }

    /// WCAG relative luminance contrast ratio (≥ 4.5:1 = AA for normal text).
    static func contrastRatio(_ foreground: UInt32, _ background: UInt32) -> Double {
        let l1 = relativeLuminance(foreground)
        let l2 = relativeLuminance(background)
        let lighter = max(l1, l2)
        let darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
    }

    private static func relativeLuminance(_ argb: UInt32) -> Double {
        let r = linearChannel(Double((argb >> 16) & 0xFF))
        let g = linearChannel(Double((argb >> 8) & 0xFF))
        let b = linearChannel(Double(argb & 0xFF))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    private static func linearChannel(_ channel: Double) -> Double {
        let value = channel / 255.0
        return value <= 0.03928 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4)
    }
}
