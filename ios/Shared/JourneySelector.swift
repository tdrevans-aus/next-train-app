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
        let matching = commutesInActiveWindow(settings)
        guard !matching.isEmpty else { return nil }
        return pickScheduledCommute(matching, minutes: PerthTime.minutesSinceMidnight())
    }

    static func selectActiveRoute(_ settings: [String: Any]) -> [String: Any]? {
        let activeId = (settings["activeJourneyId"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !activeId.isEmpty,
              let journeys = settings["journeys"] as? [[String: Any]] else {
            return nil
        }
        let configured = configuredJourneys(journeys)
        for journey in configured where (journey["id"] as? String ?? "") == activeId {
            return isRouteJourney(journey) ? journey : nil
        }
        return nil
    }

    static func commutesInActiveWindow(_ settings: [String: Any]) -> [[String: Any]] {
        guard let journeys = settings["journeys"] as? [[String: Any]] else {
            return []
        }
        let configured = configuredJourneys(journeys)
        let minutes = PerthTime.minutesSinceMidnight()
        return configured.filter { isCommuteJourney($0) && matchesWindow($0, minutes: minutes) }
    }

    static func pickScheduledCommute(_ commutes: [[String: Any]], minutes: Int = PerthTime.minutesSinceMidnight()) -> [String: Any]? {
        guard !commutes.isEmpty else { return nil }
        if commutes.count == 1 {
            return commutes[0]
        }

        let withTarget = commutes.filter { preferredMinutesFromJourney($0) >= 0 }
        if withTarget.count < 2 {
            return commutes[0]
        }

        let sorted = withTarget.sorted {
            preferredMinutesFromJourney($0) < preferredMinutesFromJourney($1)
        }

        for index in 0..<(sorted.count - 1) {
            let midpoint = (preferredMinutesFromJourney(sorted[index]) + preferredMinutesFromJourney(sorted[index + 1])) / 2
            if minutes < midpoint {
                return sorted[index]
            }
        }

        return sorted.last
    }

    private static func preferredMinutesFromJourney(_ journey: [String: Any]) -> Int {
        PerthTime.parseClockMinutes(journey["preferredTrainTime"] as? String ?? "")
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
