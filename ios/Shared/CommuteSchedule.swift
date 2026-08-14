import Foundation

enum CommuteSchedule {
    static let staleThresholdMs: Int64 = 120 * 60 * 1000

    struct Result {
        var settings: [String: Any]?
        var journey: [String: Any]?
        var payload: [String: Any]?
        var next: [String: Any]?
        var departMode = false
        var stale = false
        var empty = false
        var nearbyFallback = false
        var refreshedAtMs: Int64 = 0
        var journeyId = ""
        var route = ""
        var leaveByIso = ""
        var departureIso = ""
        var displayTime = ""
        var status = ""
        var leavePhase = ""
        var minutesUntilLeave = 0
    }

    static func load(allowStaleFallback: Bool) -> [String: Any] {
        var result = Result()
        result.refreshedAtMs = WidgetSettingsStore.readLastRefreshMs()

        guard let settingsJson = WidgetSettingsStore.readSettings(),
              let data = settingsJson.data(using: .utf8),
              let settings = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return emptyState()
        }

        result.settings = settings

        do {
            if let pinned = try WidgetPinResolver.loadBestPinnedResult(settings: settings) {
                var pinnedResult = pinned
                pinnedResult.refreshedAtMs = Int64(Date().timeIntervalSince1970 * 1000)
                WidgetSettingsStore.saveLastRefreshMs(pinnedResult.refreshedAtMs)
                pinnedResult.stale = false
                let snapshot = buildLiveSnapshot(pinnedResult)
                WidgetSettingsStore.saveSnapshot(snapshot)
                return snapshot
            }

            result.journey = JourneySelector.selectJourney(settings)

            if result.journey == nil {
                if JourneySelector.hasConfiguredJourneys(settings) {
                    return outsideHoursSnapshot(settings)
                }
                return emptyState()
            }

            guard let journey = result.journey else { return emptyState() }
        result.journeyId = journey["id"] as? String ?? ""
        result.route = WidgetDataService.formatRoute(journey)
        result.departMode = !(journey["useLeaveBefore"] as? Bool ?? true)
        let leaveBefore = result.departMode ? 0 : (journey["leaveBeforeMinutes"] as? Int ?? 10)

        do {
            result.payload = try NextTrainApiClient.fetchNextTrain(
                station: journey["station"] as? String ?? "",
                direction: journey["direction"] as? String ?? "",
                leaveBeforeMinutes: leaveBefore
            )
            result.refreshedAtMs = Int64(Date().timeIntervalSince1970 * 1000)
            WidgetSettingsStore.saveLastRefreshMs(result.refreshedAtMs)
            result.stale = false
            result.next = resolveActiveNextTrip(result.payload, journey: journey)
            fillTripFields(&result)
            let snapshot = buildLiveSnapshot(result)
            WidgetSettingsStore.saveSnapshot(snapshot)
            return snapshot
        } catch {
            if allowStaleFallback, let cached = WidgetSettingsStore.readSnapshot() {
                var snapshot = cached
                let age = Int64(Date().timeIntervalSince1970 * 1000) - result.refreshedAtMs
                if result.refreshedAtMs > 0 && age > staleThresholdMs {
                    snapshot["stale"] = true
                    snapshot["updatedLine"] = "Times may be out of date"
                }
                return repaintSnapshot(snapshot) ?? snapshot
            }
            return loadingState(journey)
        }
    }

    static func repaintSnapshot(_ cached: [String: Any]?) -> [String: Any]? {
        guard var snapshot = cached else { return nil }
        if snapshot["empty"] as? Bool == true ||
            snapshot["nearbyFallback"] as? Bool == true ||
            snapshot["outsideHoursIdle"] as? Bool == true {
            return snapshot
        }

        let departureIso = snapshot["departureIso"] as? String ?? ""
        guard !departureIso.isEmpty else { return snapshot }

        let nowMs = Int64(Date().timeIntervalSince1970 * 1000)
        if hasDepartureMinutePassed(departureIso) {
            return snapshot
        }
        return repaintActiveSnapshot(&snapshot, nowMs: nowMs)
    }

    static func snapshotForDisplay() -> [String: Any] {
        if let cached = WidgetSettingsStore.readSnapshot(),
           let repainted = repaintSnapshot(cached) {
            return repainted
        }
        return load(allowStaleFallback: true)
    }

    private static func fillTripFields(_ result: inout Result) {
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

    private static func resolveActiveNextTrip(_ payload: [String: Any]?, journey: [String: Any]?) -> [String: Any]? {
        guard let payload else { return nil }
        let upcoming = payload["upcoming"] as? [[String: Any]] ?? []
        if !upcoming.isEmpty {
            for trip in upcoming where !hasDepartureMinutePassed(tripDepartureIso(trip)) {
                return trip
            }
            return nil
        }
        if let next = payload["next"] as? [String: Any], !hasDepartureMinutePassed(tripDepartureIso(next)) {
            return next
        }
        if let following = payload["following"] as? [String: Any],
           !hasDepartureMinutePassed(tripDepartureIso(following)) {
            return following
        }
        return nil
    }

    private static func buildLiveSnapshot(_ result: Result) -> [String: Any] {
        guard let journey = result.journey else { return emptyState() }

        if result.next == nil && result.payload == nil {
            return loadingState(journey)
        }

        if result.next == nil {
            return [
                "empty": false,
                "journeyId": result.journeyId,
                "route": result.route,
                "stationLabel": result.route,
                "label": "NEXT TRAIN",
                "primary": "No trains",
                "trainClock": "",
                "secondary": "",
                "updatedLine": PerthTime.formatUpdatedAgo(result.refreshedAtMs),
                "statusCrumb": "",
                "urgent": false,
                "late": false,
                "stale": result.stale,
            ]
        }

        guard let next = result.next else { return emptyState() }
        let minutesUntilDeparture = next["minutesUntilDeparture"] as? Int ?? 0
        let leavePhase = result.leavePhase
        let minutesUntilLeave = result.minutesUntilLeave
        let departMode = result.departMode
        let leaveArmed = departMode ? false : leaveByArmedForTrip(next, journey: journey)

        var leaveUrgent = ["now", "urgent", "soon"].contains(leavePhase)
        var secondary = ""
        if !departMode && leaveArmed {
            secondary = formatLeaveSecondary(leavePhase: leavePhase, minutesUntilLeave: minutesUntilLeave)
            if secondary == "Leave now" && minutesUntilLeave <= 0 { leaveUrgent = true }
        }

        return [
            "empty": false,
            "journeyId": result.journeyId,
            "route": result.route,
            "stationLabel": result.route,
            "journeyName": journey["name"] as? String ?? "Journey",
            "stale": result.stale,
            "label": liveWidgetLabel(journey: journey, trip: next),
            "primary": formatMinutesPrimary(minutesUntilDeparture),
            "trainClock": result.displayTime,
            "secondary": secondary,
            "urgent": leaveUrgent && !secondary.isEmpty,
            "late": false,
            "leaveByArmed": leaveArmed,
            "preferredHint": leaveArmed ? "" : preferredHintForJourney(journey),
            "statusCrumb": formatStatusCrumb(result.status),
            "departureIso": result.departureIso,
            "leaveByIso": result.leaveByIso,
            "departMode": departMode,
            "refreshedAtMs": result.refreshedAtMs,
            "status": result.status,
            "updatedLine": result.stale ? "Times may be out of date" : PerthTime.formatUpdatedAgo(result.refreshedAtMs),
            "leaveBeforeMinutes": journey["leaveBeforeMinutes"] as? Int ?? 10,
        ]
    }

    private static func repaintActiveSnapshot(_ snapshot: inout [String: Any], nowMs: Int64) -> [String: Any] {
        let departureIso = snapshot["departureIso"] as? String ?? ""
        let leaveByIso = snapshot["leaveByIso"] as? String ?? ""
        let minutesUntilDeparture = PerthTime.minutesUntilWallClock(departureIso, nowMs: nowMs)
        let minutesUntilLeave = leaveByIso.isEmpty
            ? minutesUntilDeparture
            : PerthTime.minutesUntilWallClock(leaveByIso, nowMs: nowMs)
        let leavePhase = getLeavePhase(minutesUntilLeave: minutesUntilLeave, minutesUntilDeparture: minutesUntilDeparture)
        let departMode = snapshot["departMode"] as? Bool ?? false
        let leaveArmed = snapshot["leaveByArmed"] as? Bool ?? true

        snapshot["label"] = "NEXT TRAIN"
        snapshot["primary"] = formatMinutesPrimary(minutesUntilDeparture)

        if departMode || !leaveArmed {
            snapshot["secondary"] = ""
            snapshot["urgent"] = false
            snapshot["late"] = false
        } else {
            let secondary = formatLeaveSecondary(leavePhase: leavePhase, minutesUntilLeave: minutesUntilLeave)
            snapshot["secondary"] = secondary
            snapshot["urgent"] = (["now", "urgent", "soon"].contains(leavePhase) || secondary == "Leave now") && !secondary.isEmpty
            snapshot["late"] = false
        }

        if let refreshedAtMs = snapshot["refreshedAtMs"] as? Int64 {
            let stale = snapshot["stale"] as? Bool ?? false
            snapshot["updatedLine"] = stale ? "Times may be out of date" : PerthTime.formatUpdatedAgo(refreshedAtMs)
        }
        return snapshot
    }

    private static func outsideHoursSnapshot(_ settings: [String: Any]) -> [String: Any] {
        let nowMinutes = PerthTime.minutesSinceMidnight()
        let day = PerthTime.dayOfWeekIso()
        guard let preview = NextCommutePreview.findNext(settings: settings, nowMinutes: nowMinutes, dayOfWeekIso: day) else {
            return nearbyFallbackState()
        }
        let route = WidgetDataService.formatRoute(preview.journey)
        return [
            "empty": false,
            "outsideHoursIdle": true,
            "openNearbyOnTap": true,
            "nearbyFallback": false,
            "journeyId": preview.journey["id"] as? String ?? "nearby",
            "route": route,
            "stationLabel": route,
            "journeyName": preview.journey["name"] as? String ?? "",
            "label": NextCommutePreview.idleWidgetLabel(preview.journey),
            "primary": preview.preferredOrFromClock,
            "trainClock": NextCommutePreview.formatDayWord(preview),
            "secondary": "",
            "preferredHint": "",
            "leaveByArmed": false,
            "updatedLine": "",
            "statusCrumb": "",
            "departureIso": "",
            "leaveByIso": "",
            "stale": false,
            "urgent": false,
            "late": false,
        ]
    }

    private static func nearbyFallbackState() -> [String: Any] {
        [
            "nearbyFallback": true,
            "empty": false,
            "journeyId": "nearby",
            "label": "NEAR ME",
            "primary": "Near me",
            "trainClock": "See trains near you",
            "secondary": "",
            "updatedLine": "",
            "stale": false,
            "urgent": false,
            "late": false,
        ]
    }

    private static func emptyState() -> [String: Any] {
        [
            "empty": true,
            "journeyId": "new",
            "label": "NEXT TRAIN",
            "primary": "Add a journey",
            "trainClock": "Tap to set up",
            "secondary": "",
            "updatedLine": "",
            "stale": false,
            "urgent": false,
            "late": false,
        ]
    }

    private static func loadingState(_ journey: [String: Any]) -> [String: Any] {
        [
            "empty": false,
            "journeyId": journey["id"] as? String ?? "",
            "route": WidgetDataService.formatRoute(journey),
            "stationLabel": WidgetDataService.formatRoute(journey),
            "label": "NEXT TRAIN",
            "primary": "…",
            "trainClock": "",
            "secondary": "",
            "updatedLine": "",
            "stale": false,
            "urgent": false,
            "late": false,
        ]
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

    private static func hasDepartureMinutePassed(_ trip: [String: Any]) -> Bool {
        hasDepartureMinutePassed(tripDepartureIso(trip))
    }

    private static func leaveByArmedForTrip(_ trip: [String: Any], journey: [String: Any]) -> Bool {
        if JourneyPinHelper.isOverrideActiveToday(journey) { return true }
        let preferredMinutes = PerthTime.parseClockMinutes(journey["preferredTrainTime"] as? String ?? "")
        if preferredMinutes < 0 { return true }
        let departureMinutes = PerthTime.minutesFromIso(tripDepartureIso(trip))
        return departureMinutes >= preferredMinutes
    }

    private static func liveWidgetLabel(journey: [String: Any]?, trip: [String: Any]?) -> String {
        guard trip != nil else { return "NEXT TRAIN" }
        if let journey, (journey["id"] as? String) == NearbyPinHelper.journeyId {
            return "Pinned Train"
        }
        if JourneyPinHelper.isOverrideActiveToday(journey) {
            return "Target Train"
        }
        let preferredMinutes = PerthTime.parseClockMinutes(journey?["preferredTrainTime"] as? String ?? "")
        if preferredMinutes < 0 { return "NEXT TRAIN" }
        let departureMinutes = PerthTime.minutesFromIso(tripDepartureIso(trip!))
        return departureMinutes >= preferredMinutes ? "Target Train" : "NEXT TRAIN"
    }

    private static func preferredHintForJourney(_ journey: [String: Any]) -> String {
        let preferredMinutes = PerthTime.parseClockMinutes(journey["preferredTrainTime"] as? String ?? "")
        guard preferredMinutes >= 0 else { return "" }
        return "Target \(NextCommutePreview.formatClock(preferredMinutes))"
    }

    private static func getLeavePhase(minutesUntilLeave: Int, minutesUntilDeparture: Int) -> String {
        if minutesUntilLeave < 0 { return "late" }
        if minutesUntilLeave <= 0 { return "now" }
        if minutesUntilLeave <= 2 { return "urgent" }
        if minutesUntilLeave <= 5 { return "soon" }
        return "calm"
    }

    private static func formatMinutesPrimary(_ minutes: Int) -> String {
        if minutes <= 0 { return "NOW" }
        if minutes == 1 { return "1 min" }
        return "\(minutes) min"
    }

    private static func formatLeaveSecondary(leavePhase: String, minutesUntilLeave: Int) -> String {
        if leavePhase == "late" || leavePhase == "missed" {
            let minutesLate = minutesUntilLeave < 0 ? abs(minutesUntilLeave) : 0
            return minutesLate <= 1 ? "Leave now" : ""
        }
        if leavePhase == "now" || minutesUntilLeave <= 0 { return "Leave now" }
        if minutesUntilLeave == 1 { return "Leave in 1 min" }
        return "Leave in \(minutesUntilLeave) min"
    }

    private static func formatStatusCrumb(_ status: String) -> String {
        if status.isEmpty || status.caseInsensitiveCompare("On Time") == .orderedSame { return "" }
        return status
    }
}
