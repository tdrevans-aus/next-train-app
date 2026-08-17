import Foundation

enum NextCommutePreview {
    struct Preview {
        var journey: [String: Any]
        var dayOffset: Int
        var dayOfWeekIso: Int
        var fromMinutes: Int
        var untilMinutes: Int
        var preferredOrFromClock: String
    }

    static func findNext(settings: [String: Any], nowMinutes: Int, dayOfWeekIso: Int) -> Preview? {
        if let windowed = findNextWindowed(settings: settings, nowMinutes: nowMinutes, dayOfWeekIso: dayOfWeekIso) {
            return windowed
        }
        return findNextTargetOnly(settings: settings, nowMinutes: nowMinutes, dayOfWeekIso: dayOfWeekIso)
    }

    static func idleWidgetLabel(_ journey: [String: Any]) -> String {
        hasTargetTrainClock(journey) ? "Target Train" : "Next Journey"
    }

    static func formatDayWord(_ preview: Preview) -> String {
        if preview.dayOffset == 0 { return "Today" }
        if preview.dayOffset == 1 { return "Tomorrow" }
        return dayName(preview.dayOfWeekIso)
    }

    static func formatClock(_ minutesSinceMidnight: Int) -> String {
        let wrapped = ((minutesSinceMidnight % (24 * 60)) + (24 * 60)) % (24 * 60)
        let hour = wrapped / 60
        let minute = wrapped % 60
        return String(format: "%d:%02d", hour, minute)
    }

    static func hasTargetTrainClock(_ journey: [String: Any]) -> Bool {
        let preferred = journey["preferredTrainTime"] as? String ?? ""
        return !preferred.isEmpty && PerthTime.parseClockMinutes(preferred) >= 0
    }

    private static func findNextWindowed(settings: [String: Any], nowMinutes: Int, dayOfWeekIso: Int) -> Preview? {
        guard let journeys = settings["journeys"] as? [[String: Any]] else { return nil }
        var best: Preview?
        var bestSort = Int.max

        for dayOffset in 0...7 {
            let day = ((dayOfWeekIso - 1 + dayOffset) % 7) + 1
            for journey in journeys {
                guard JourneySelector.isJourneyKind(journey) else { continue }
                let station = journey["station"] as? String ?? ""
                let direction = journey["direction"] as? String ?? ""
                guard !station.isEmpty, !direction.isEmpty, JourneySelector.hasWindow(journey),
                      PreferredTrainReminder.isRemindDay(journey, dayOfWeekIso: day) else {
                    continue
                }
                let from = PerthTime.parseClockMinutes(journey["defaultFrom"] as? String ?? "")
                let until = PerthTime.parseClockMinutes(journey["defaultUntil"] as? String ?? "")
                guard from >= 0, until >= 0 else { continue }

                if dayOffset == 0 {
                    if JourneySelector.matchesWindow(journey, minutes: nowMinutes) { continue }
                    if from <= nowMinutes {
                        if from < until && nowMinutes >= until { continue }
                        if from < until { continue }
                    }
                }

                let sortKey = dayOffset * 24 * 60 + from
                guard sortKey < bestSort else { continue }
                bestSort = sortKey
                best = Preview(
                    journey: journey,
                    dayOffset: dayOffset,
                    dayOfWeekIso: day,
                    fromMinutes: from,
                    untilMinutes: until,
                    preferredOrFromClock: formatTimeLine(journey, from: from, until: until)
                )
            }
        }
        return best
    }

    private static func findNextTargetOnly(settings: [String: Any], nowMinutes: Int, dayOfWeekIso: Int) -> Preview? {
        guard let journeys = settings["journeys"] as? [[String: Any]] else { return nil }
        var best: Preview?
        var bestSort = Int.max

        for dayOffset in 0...7 {
            let day = ((dayOfWeekIso - 1 + dayOffset) % 7) + 1
            for journey in journeys {
                guard JourneySelector.isJourneyKind(journey) else { continue }
                let station = journey["station"] as? String ?? ""
                let direction = journey["direction"] as? String ?? ""
                guard !station.isEmpty, !direction.isEmpty,
                      !JourneySelector.hasWindow(journey),
                      hasTargetTrainClock(journey),
                      PreferredTrainReminder.isRemindDay(journey, dayOfWeekIso: day) else {
                    continue
                }
                let targetMinutes = PerthTime.parseClockMinutes(journey["preferredTrainTime"] as? String ?? "")
                guard targetMinutes >= 0 else { continue }
                if dayOffset == 0 && targetMinutes <= nowMinutes { continue }

                let sortKey = dayOffset * 24 * 60 + targetMinutes
                guard sortKey < bestSort else { continue }
                bestSort = sortKey
                best = Preview(
                    journey: journey,
                    dayOffset: dayOffset,
                    dayOfWeekIso: day,
                    fromMinutes: targetMinutes,
                    untilMinutes: targetMinutes,
                    preferredOrFromClock: formatClock(targetMinutes)
                )
            }
        }
        return best
    }

    private static func formatTimeLine(_ journey: [String: Any], from: Int, until: Int) -> String {
        let preferred = journey["preferredTrainTime"] as? String ?? ""
        if !preferred.isEmpty {
            let preferredMinutes = PerthTime.parseClockMinutes(preferred)
            if preferredMinutes >= 0 { return formatClock(preferredMinutes) }
            return preferred
        }
        return "\(formatClock(from))–\(formatClock(until))"
    }

    private static func dayName(_ dayOfWeekIso: Int) -> String {
        switch dayOfWeekIso {
        case 1: return "Monday"
        case 2: return "Tuesday"
        case 3: return "Wednesday"
        case 4: return "Thursday"
        case 5: return "Friday"
        case 6: return "Saturday"
        case 7: return "Sunday"
        default: return ""
        }
    }
}

enum WidgetDataService {
    static func formatRoute(_ journey: [String: Any]?) -> String {
        guard let journey else { return "" }
        let station = formatDisplayName(journey["station"] as? String ?? "")
        let direction = formatDisplayName(journey["direction"] as? String ?? "")
        if station.isEmpty { return direction }
        if direction.isEmpty { return station }
        return "\(station) → \(direction)"
    }

    static func formatDisplayName(_ raw: String) -> String {
        guard !raw.isEmpty else { return "" }
        let withoutStn = raw.replacingOccurrences(of: #"(?i) Stn$"#, with: "", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        let lower = withoutStn.lowercased()
        if ["perth underground", "perth"].contains(lower) || raw.lowercased() == "perth stn" {
            return "Perth"
        }
        if lower == "cockburn central" || raw.lowercased() == "cockburn central stn" {
            return "Cockburn"
        }
        return withoutStn
    }
}
