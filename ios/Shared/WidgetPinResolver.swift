import Foundation

enum WidgetPinResolver {
    static func loadBestPinnedResult(settings: [String: Any]) throws -> CommuteSchedule.Result? {
        var candidates: [CommuteSchedule.Result] = []

        if let nearbyPin = settings["nearbyPin"] as? [String: Any], NearbyPinHelper.isHolding(nearbyPin) {
            if let nearby = try loadNearbyPinResult(settings: settings, pin: nearbyPin) {
                candidates.append(nearby)
            }
        }

        if let journeys = settings["journeys"] as? [[String: Any]] {
            for journey in journeys where isConfiguredJourney(journey) && JourneyPinHelper.isJourneyPinnedToday(journey) {
                if let journeyResult = try loadJourneyPinResult(settings: settings, journey: journey) {
                    candidates.append(journeyResult)
                }
            }
        }

        return pickSoonestPinned(settings: settings, candidates: candidates)
    }

    private static func loadNearbyPinResult(settings: [String: Any], pin: [String: Any]) throws -> CommuteSchedule.Result? {
        let leaveBefore = settings["nearbyLeaveBeforeMinutes"] as? Int ?? 10
        let payload = try NextTrainApiClient.fetchNextTrain(
            station: pin["station"] as? String ?? "",
            direction: pin["direction"] as? String ?? "",
            leaveBeforeMinutes: leaveBefore
        )
        let departureIso = pin["departureIso"] as? String ?? ""
        var trip = NearbyPinHelper.findTripByDeparture(payload, departureIso: departureIso)
        if trip == nil {
            trip = NearbyPinHelper.buildSyntheticTrip(pin: pin, leaveBeforeMinutes: leaveBefore)
        }
        guard let trip else { return nil }

        var result = CommuteSchedule.Result()
        result.settings = settings
        result.journey = buildNearbyJourney(settings: settings, pin: pin)
        result.journeyId = NearbyPinHelper.journeyId
        result.route = NearbyPinHelper.formatRoute(pin)
        result.departMode = false
        result.payload = payload
        result.next = trip
        fillTripFields(&result)
        return result
    }

    private static func loadJourneyPinResult(settings: [String: Any], journey: [String: Any]) throws -> CommuteSchedule.Result? {
        let departMode = !(journey["useLeaveBefore"] as? Bool ?? true)
        let leaveBefore = departMode ? 0 : (journey["leaveBeforeMinutes"] as? Int ?? 10)
        let payload = try NextTrainApiClient.fetchNextTrain(
            station: journey["station"] as? String ?? "",
            direction: journey["direction"] as? String ?? "",
            leaveBeforeMinutes: leaveBefore
        )
        guard let trip = JourneyPinHelper.resolvePinnedTrip(payload, journey: journey) else { return nil }

        var result = CommuteSchedule.Result()
        result.settings = settings
        result.journey = journey
        result.journeyId = journey["id"] as? String ?? ""
        result.route = WidgetDataService.formatRoute(journey)
        result.departMode = departMode
        result.payload = payload
        result.next = trip
        fillTripFields(&result)
        return result
    }

    static func pickSoonestPinned(settings: [String: Any], candidates: [CommuteSchedule.Result]) -> CommuteSchedule.Result? {
        var best: CommuteSchedule.Result?
        var bestDepartureMs = Int64.max

        for candidate in candidates {
            guard isEligiblePinnedCandidate(settings: settings, candidate: candidate) else { continue }
            let departureMs = PerthTime.epochMillisFromIso(candidate.departureIso)
            guard departureMs > 0, departureMs < bestDepartureMs else { continue }
            bestDepartureMs = departureMs
            best = candidate
        }

        return best
    }

    private static func isEligiblePinnedCandidate(settings: [String: Any], candidate: CommuteSchedule.Result) -> Bool {
        guard candidate.next != nil else { return false }
        if candidate.journeyId == NearbyPinHelper.journeyId {
            return NearbyPinHelper.isHolding(settings["nearbyPin"] as? [String: Any])
        }
        let departureMs = PerthTime.epochMillisFromIso(candidate.departureIso)
        guard departureMs > 0 else { return false }
        return Int64(Date().timeIntervalSince1970 * 1000) < departureMs
    }

    private static func isConfiguredJourney(_ journey: [String: Any]) -> Bool {
        let station = journey["station"] as? String ?? ""
        let direction = journey["direction"] as? String ?? ""
        return !station.isEmpty && !direction.isEmpty
    }

    private static func buildNearbyJourney(settings: [String: Any], pin: [String: Any]) -> [String: Any] {
        [
            "id": NearbyPinHelper.journeyId,
            "name": "Near me",
            "station": pin["station"] as? String ?? "",
            "direction": pin["direction"] as? String ?? "",
            "useLeaveBefore": true,
            "leaveBeforeMinutes": settings["nearbyLeaveBeforeMinutes"] as? Int ?? 10,
        ]
    }

    private static func fillTripFields(_ result: inout CommuteSchedule.Result) {
        guard let next = result.next else { return }
        result.leaveByIso = next["leaveBy"] as? String ?? ""
        result.departureIso = next["departure"] as? String ?? ""
        if result.departureIso.isEmpty {
            result.departureIso = next["arrival"] as? String ?? ""
        }
        result.displayTime = next["displayTime"] as? String ?? "—"
        result.status = next["status"] as? String ?? "On Time"
        result.leavePhase = next["leavePhase"] as? String ?? "calm"
        result.minutesUntilLeave = next["minutesUntilLeave"] as? Int ?? 0
    }
}
