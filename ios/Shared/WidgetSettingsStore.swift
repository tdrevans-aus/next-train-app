import Foundation

enum WidgetSettingsStore {
    private static let settingsKey = "settings_json"
    private static let snapshotKey = "snapshot_json"
    private static let lastRefreshKey = "last_refresh_ms"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: WidgetAppGroup.identifier)
    }

    static func saveSettings(_ settingsJson: String) {
        defaults?.set(settingsJson, forKey: settingsKey)
    }

    static func readSettings() -> String? {
        defaults?.string(forKey: settingsKey)
    }

    static func saveSnapshot(_ snapshot: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: snapshot),
              let raw = String(data: data, encoding: .utf8) else {
            return
        }
        defaults?.set(raw, forKey: snapshotKey)
    }

    static func readSnapshot() -> [String: Any]? {
        guard let raw = defaults?.string(forKey: snapshotKey),
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return json
    }

    static func saveLastRefreshMs(_ value: Int64) {
        defaults?.set(value, forKey: lastRefreshKey)
    }

    static func readLastRefreshMs() -> Int64 {
        Int64(defaults?.double(forKey: lastRefreshKey) ?? 0)
    }
}
