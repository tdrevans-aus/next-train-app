import Foundation

enum JourneySelector {
    static func selectJourney(_ settings: [String: Any]) -> [String: Any]? {
        guard let journeys = settings["journeys"] as? [[String: Any]] else {
            return nil
        }
        let configured = configuredJourneys(journeys)
        guard !configured.isEmpty else { return nil }
        let minutes = PerthTime.minutesSinceMidnight()
        for journey in configured where matchesWindow(journey, minutes: minutes) {
            return journey
        }
        return nil
    }

    static func hasConfiguredJourneys(_ settings: [String: Any]) -> Bool {
        guard let journeys = settings["journeys"] as? [[String: Any]] else {
            return false
        }
        return !configuredJourneys(journeys).isEmpty
    }

    static func hasWindow(_ journey: [String: Any]) -> Bool {
        let from = journey["defaultFrom"] as? String ?? ""
        let until = journey["defaultUntil"] as? String ?? ""
        return !from.isEmpty && !until.isEmpty
    }

    static func matchesWindow(_ journey: [String: Any], minutes: Int) -> Bool {
        guard hasWindow(journey) else { return false }
        guard PreferredTrainReminder.isRemindDay(journey) else { return false }
        let from = PerthTime.parseClockMinutes(journey["defaultFrom"] as? String ?? "")
        let until = PerthTime.parseClockMinutes(journey["defaultUntil"] as? String ?? "")
        if from == until { return true }
        if from < until {
            return minutes >= from && minutes < until
        }
        return minutes >= from || minutes < until
    }

    private static func configuredJourneys(_ journeys: [[String: Any]]) -> [[String: Any]] {
        journeys.filter { journey in
            let station = journey["station"] as? String ?? ""
            let direction = journey["direction"] as? String ?? ""
            return !station.isEmpty && !direction.isEmpty
        }
    }
}

enum PreferredTrainReminder {
    static func isRemindDay(_ journey: [String: Any], dayOfWeekIso: Int = PerthTime.dayOfWeekIso()) -> Bool {
        guard let days = journey["remindDays"] as? [Int], !days.isEmpty else {
            return true
        }
        return days.contains(dayOfWeekIso)
    }
}
