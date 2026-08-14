import Foundation

enum PerthTime {
    private static let zone = TimeZone(identifier: "Australia/Perth")!

    static func minutesSinceMidnight(nowMs: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) -> Int {
        let date = Date(timeIntervalSince1970: TimeInterval(nowMs) / 1000)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let hour = calendar.component(.hour, from: date)
        let minute = calendar.component(.minute, from: date)
        return hour * 60 + minute
    }

    static func dayOfWeekIso(nowMs: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) -> Int {
        let date = Date(timeIntervalSince1970: TimeInterval(nowMs) / 1000)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        return calendar.component(.weekday, from: date)
    }

    static func parseClockMinutes(_ value: String) -> Int {
        let parts = value.split(separator: ":")
        guard parts.count >= 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]) else {
            return -1
        }
        return hour * 60 + minute
    }

    static func minutesFromIso(_ iso: String) -> Int {
        guard let date = ISO8601DateFormatter().date(from: iso) else {
            return -1
        }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let hour = calendar.component(.hour, from: date)
        let minute = calendar.component(.minute, from: date)
        return hour * 60 + minute
    }

    static func epochMillisFromIso(_ iso: String) -> Int64 {
        guard let date = ISO8601DateFormatter().date(from: iso) else {
            return 0
        }
        return Int64(date.timeIntervalSince1970 * 1000)
    }

    static func minutesUntilWallClock(_ targetIso: String, nowMs: Int64) -> Int {
        let target = minutesFromIso(targetIso)
        guard target >= 0 else { return 0 }
        let nowMinute = minutesSinceMidnight(nowMs: nowMs)
        var diff = target - nowMinute
        if diff < -12 * 60 { diff += 24 * 60 }
        else if diff > 12 * 60 { diff -= 24 * 60 }
        return diff
    }

    static func nextMinuteBoundaryMs() -> Int64 {
        let now = Date()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: now)
        guard let minuteStart = calendar.date(from: components),
              let next = calendar.date(byAdding: .minute, value: 1, to: minuteStart) else {
            return nowMs()
        }
        return Int64(next.timeIntervalSince1970 * 1000)
    }

    static func formatUpdatedAgo(_ updatedAtMs: Int64) -> String {
        guard updatedAtMs > 0 else { return "Updating…" }
        let minutes = max(0, (nowMs() - updatedAtMs) / 60_000)
        if minutes < 1 { return "Updated just now" }
        if minutes < 60 { return "Updated \(minutes)m ago" }
        return formatClockFromEpochMs(updatedAtMs)
    }

    static func formatClockFromEpochMs(_ epochMs: Int64) -> String {
        guard epochMs > 0 else { return "—" }
        let date = Date(timeIntervalSince1970: TimeInterval(epochMs) / 1000)
        let formatter = DateFormatter()
        formatter.timeZone = zone
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        return formatter.string(from: date)
    }

    static func formatIsoFromEpochMs(_ epochMs: Int64) -> String {
        guard epochMs > 0 else { return "" }
        let date = Date(timeIntervalSince1970: TimeInterval(epochMs) / 1000)
        return ISO8601DateFormatter().string(from: date)
    }

    static func localDateKey(nowMs: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(nowMs) / 1000)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let year = calendar.component(.year, from: date)
        let month = calendar.component(.month, from: date)
        let day = calendar.component(.day, from: date)
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    private static func nowMs() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }
}
