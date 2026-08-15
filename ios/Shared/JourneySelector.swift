import Foundation

enum JourneySelector {
    private static let kindRoute = "route"
    private static let kindCommute = "commute"

    static func journeyKind(_ journey: [String: Any]) -> String {
        let explicit = (journey["kind"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if explicit == kindRoute || explicit == kindCommute {
            return explicit
        }
        let templateKey = journey["templateKey"] as? String ?? ""
        if templateKey == "morning" || templateKey == "evening" {
            return kindCommute
        }
        if let preferred = journey["preferredTrainTime"] as? String, !preferred.isEmpty {
            return kindCommute
        }
        if journey["remindMe"] as? Bool == true {
            return kindCommute
        }
        return kindRoute
    }

    static func isCommuteJourney(_ journey: [String: Any]) -> Bool {
        journeyKind(journey) == kindCommute
    }

    static func isRouteJourney(_ journey: [String: Any]) -> Bool {
        journeyKind(journey) == kindRoute
    }

    static func selectJourney(_ settings: [String: Any]) -> [String: Any]? {
        guard let journeys = settings["journeys"] as? [[String: Any]] else {
            return nil
        }
        let configured = configuredJourneys(journeys)
        guard !configured.isEmpty else { return nil }
        let minutes = PerthTime.minutesSinceMidnight()
        for journey in configured where isCommuteJourney(journey) && matchesWindow(journey, minutes: minutes) {
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
