import Foundation

enum NearbyPinHelper {
    static let journeyId = "nearby-pin"
    static let holdMs: Int64 = 60_000

    static func isHolding(_ pin: [String: Any]?) -> Bool {
        guard let pin else { return false }
        let departureIso = pin["departureIso"] as? String ?? ""
        let departureMs = PerthTime.epochMillisFromIso(departureIso)
        guard departureMs > 0 else { return false }
        let holdUntilMs = (pin["holdingUntilMs"] as? Int64) ?? (departureMs + holdMs)
        return Int64(Date().timeIntervalSince1970 * 1000) < holdUntilMs
    }

    static func formatRoute(_ pin: [String: Any]) -> String {
        let route: [String: Any] = [
            "station": pin["station"] as? String ?? "",
            "direction": pin["direction"] as? String ?? "",
        ]
        return WidgetDataService.formatRoute(route)
    }

    static func findTripByDeparture(_ payload: [String: Any]?, departureIso: String) -> [String: Any]? {
        guard let payload, !departureIso.isEmpty else { return nil }
        let upcoming = payload["upcoming"] as? [[String: Any]] ?? []
        let trips = upcoming.isEmpty
            ? (payload["next"] as? [String: Any]).map { [$0] } ?? []
            : upcoming
        for trip in trips {
            let departure = tripDepartureIso(trip)
            if departure == departureIso { return trip }
        }
        return nil
    }

    static func buildSyntheticTrip(pin: [String: Any], leaveBeforeMinutes: Int) -> [String: Any]? {
        let departureIso = pin["departureIso"] as? String ?? ""
        let departureMs = PerthTime.epochMillisFromIso(departureIso)
        guard departureMs > 0 else { return nil }
        let leaveByMs = departureMs - Int64(leaveBeforeMinutes) * 60_000
        let displayTime = pin["displayTime"] as? String ?? PerthTime.formatClockFromEpochMs(departureMs)
        return [
            "departure": departureIso,
            "arrival": departureIso,
            "leaveBy": PerthTime.formatIsoFromEpochMs(leaveByMs),
            "displayTime": displayTime,
            "platform": pin["platform"] as? String ?? "—",
            "status": pin["status"] as? String ?? "Departed",
        ]
    }

    private static func tripDepartureIso(_ trip: [String: Any]) -> String {
        let departure = trip["departure"] as? String ?? ""
        if !departure.isEmpty { return departure }
        return trip["arrival"] as? String ?? ""
    }
}
