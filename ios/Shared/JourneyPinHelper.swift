import Foundation

enum JourneyPinHelper {
    static func isOverrideActiveToday(_ journey: [String: Any]?) -> Bool {
        guard let journey else { return false }
        let overrideDate = journey["journeyPinOverrideDate"] as? String ?? ""
        let overrideIso = journey["journeyPinOverrideIso"] as? String ?? ""
        return !overrideDate.isEmpty
            && !overrideIso.isEmpty
            && overrideDate == PerthTime.localDateKey()
    }

    static func isPinDismissedToday(_ journey: [String: Any]?) -> Bool {
        guard let journey else { return false }
        let dismissedDate = journey["journeyPinDismissedDate"] as? String ?? ""
        return !dismissedDate.isEmpty && dismissedDate == PerthTime.localDateKey()
    }

    static func isJourneyPinnedToday(_ journey: [String: Any]?) -> Bool {
        guard let journey else { return false }
        if isOverrideActiveToday(journey) { return true }
        if isPinDismissedToday(journey) { return false }
        return preferredMinutesForLiveGlance(journey) >= 0
    }

    static func resolvePinnedTrip(_ payload: [String: Any]?, journey: [String: Any]) -> [String: Any]? {
        guard let payload else { return nil }
        let upcoming = collectUpcomingTrips(payload)
        guard let widgetDeparture = resolveJourneyWidgetFaceDeparture(upcoming, journey: journey) else {
            return nil
        }
        return findTripByDeparture(upcoming, departureIso: widgetDeparture)
    }

    private static func resolveJourneyWidgetFaceDeparture(
        _ upcoming: [[String: Any]],
        journey: [String: Any]
    ) -> String? {
        let nowMinutes = PerthTime.minutesSinceMidnight()
        let insideActiveWindow = JourneySelector.matchesWindow(journey, minutes: nowMinutes)

        if isOverrideActiveToday(journey) {
            let overrideIso = journey["journeyPinOverrideIso"] as? String ?? ""
            if let overrideTrip = findTripByDeparture(upcoming, departureIso: overrideIso),
               !hasDepartureMinutePassed(tripDepartureIso(overrideTrip)) {
                return tripDepartureIso(overrideTrip)
            }
            return nil
        }

        if JourneySelector.isRouteJourney(journey) {
            return nil
        }

        if !insideActiveWindow {
            if isOvernightActiveWindow(journey),
               let departedTrip = resolveDepartedJourneyTargetTripIgnoringDismiss(upcoming, journey: journey) {
                return tripDepartureIso(departedTrip)
            }
            return nil
        }

        if let pinTrip = resolveJourneyPinDepartureTrip(upcoming, journey: journey) {
            return tripDepartureIso(pinTrip)
        }

        if let departedTrip = resolveDepartedJourneyTargetTripIgnoringDismiss(upcoming, journey: journey) {
            return tripDepartureIso(departedTrip)
        }

        return nil
    }

    private static func resolveJourneyPinDepartureTrip(
        _ upcoming: [[String: Any]],
        journey: [String: Any]
    ) -> [String: Any]? {
        let preferredMinutes = preferredMinutesForLiveGlance(journey)
        guard preferredMinutes >= 0 else { return nil }

        let horizon = liveHorizonMinutes(journey)
        for trip in upcoming where !hasDepartureMinutePassed(tripDepartureIso(trip)) {
            if tripMatchesPreferredOrLater(trip, preferredMinutes: preferredMinutes, horizonMinutes: horizon) {
                return trip
            }
        }
        return nil
    }

    private static func resolveDepartedJourneyTargetTripIgnoringDismiss(
        _ upcoming: [[String: Any]],
        journey: [String: Any]
    ) -> [String: Any]? {
        let preferredMinutes = preferredMinutesForLiveGlance(journey)
        guard preferredMinutes >= 0 else { return nil }

        let horizon = liveHorizonMinutes(journey)
        for trip in upcoming {
            guard tripMatchesPreferredOrLater(trip, preferredMinutes: preferredMinutes, horizonMinutes: horizon) else {
                continue
            }
            if hasDepartureMinutePassed(tripDepartureIso(trip)) {
                return trip
            }
            return nil
        }
        return nil
    }

    private static func preferredMinutesForLiveGlance(_ journey: [String: Any]) -> Int {
        PerthTime.parseClockMinutes(journey["preferredTrainTime"] as? String ?? "")
    }

    private static func isOvernightActiveWindow(_ journey: [String: Any]) -> Bool {
        let from = PerthTime.parseClockMinutes(journey["defaultFrom"] as? String ?? "00:00")
        let until = PerthTime.parseClockMinutes(journey["defaultUntil"] as? String ?? "23:59")
        return from > until
    }

    private static func liveHorizonMinutes(_ journey: [String: Any]) -> Int {
        let until = PerthTime.parseClockMinutes(journey["defaultUntil"] as? String ?? "")
        return until >= 0 ? until : 24 * 60
    }

    private static func tripMatchesPreferredOrLater(
        _ trip: [String: Any],
        preferredMinutes: Int,
        horizonMinutes: Int
    ) -> Bool {
        let departureMinutes = PerthTime.minutesFromIso(tripDepartureIso(trip))
        guard departureMinutes >= preferredMinutes else { return false }
        if horizonMinutes < 24 * 60
            && preferredMinutes < horizonMinutes
            && departureMinutes >= horizonMinutes {
            return false
        }
        return true
    }

    private static func collectUpcomingTrips(_ payload: [String: Any]) -> [[String: Any]] {
        if let upcoming = payload["upcoming"] as? [[String: Any]], !upcoming.isEmpty {
            return upcoming
        }
        if let next = payload["next"] as? [String: Any] {
            return [next]
        }
        return []
    }

    private static func findTripByDeparture(_ upcoming: [[String: Any]], departureIso: String) -> [String: Any]? {
        upcoming.first { tripDepartureIso($0) == departureIso }
    }

    private static func tripDepartureIso(_ trip: [String: Any]) -> String {
        let departure = trip["departure"] as? String ?? ""
        if !departure.isEmpty { return departure }
        return trip["arrival"] as? String ?? ""
    }

    private static func hasDepartureMinutePassed(_ departureIso: String) -> Bool {
        let departureMs = PerthTime.epochMillisFromIso(departureIso)
        guard departureMs > 0 else { return false }
        return Int64(Date().timeIntervalSince1970 * 1000) >= departureMs
    }
}
