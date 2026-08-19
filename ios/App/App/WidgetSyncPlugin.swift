import Foundation
import Capacitor
import WidgetKit

@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetSyncPlugin"
    public let jsName = "WidgetSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPinWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLaunchDeepLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "peekLaunchDeepLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearLaunchDeepLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWidgetInstanceCount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isDebugBuild", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDebugState", returnType: CAPPluginReturnPromise),
    ]

    private static var pendingDeepLink: String?

    public static func setPendingDeepLink(_ uri: String?) {
        pendingDeepLink = uri
    }

    @objc func syncSettings(_ call: CAPPluginCall) {
        guard let settingsJson = call.getString("settingsJson"), !settingsJson.isEmpty else {
            call.reject("Missing settingsJson")
            return
        }

        WidgetSettingsStore.saveSettings(settingsJson)
        _ = CommuteSchedule.load(allowStaleFallback: true)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func requestPinWidget(_ call: CAPPluginCall) {
        // iOS has no pin API — web layer shows manual add instructions.
        call.resolve(["requested": false])
    }

    @objc func getLaunchDeepLink(_ call: CAPPluginCall) {
        let uri = WidgetSyncPlugin.pendingDeepLink
        WidgetSyncPlugin.pendingDeepLink = nil
        call.resolve(["uri": uri as Any])
    }

    @objc func peekLaunchDeepLink(_ call: CAPPluginCall) {
        call.resolve(["uri": WidgetSyncPlugin.pendingDeepLink as Any])
    }

    @objc func clearLaunchDeepLink(_ call: CAPPluginCall) {
        WidgetSyncPlugin.pendingDeepLink = nil
        call.resolve()
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc func getWidgetInstanceCount(_ call: CAPPluginCall) {
        guard #available(iOS 14.0, *) else {
            call.resolve(["count": 0])
            return
        }

        WidgetCenter.shared.getCurrentConfigurations { result in
            switch result {
            case .success(let configurations):
                call.resolve(["count": configurations.count])
            case .failure:
                call.resolve(["count": 0])
            }
        }
    }

    @objc func isDebugBuild(_ call: CAPPluginCall) {
        #if DEBUG
        call.resolve(["debug": true])
        #else
        call.resolve(["debug": false])
        #endif
    }

    @objc func getDebugState(_ call: CAPPluginCall) {
        let snapshot = WidgetSettingsStore.readSnapshot()
        let settingsJson = WidgetSettingsStore.readSettings()
        var configuredJourneyCount = 0
        if let settingsJson,
           let data = settingsJson.data(using: .utf8),
           let settings = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let journeys = settings["journeys"] as? [[String: Any]] {
            configuredJourneyCount = journeys.filter { journey in
                let station = journey["station"] as? String ?? ""
                let direction = journey["direction"] as? String ?? ""
                return !station.isEmpty && !direction.isEmpty
            }.count
        }

        var result: [String: Any] = [
            "lastRefreshMs": WidgetSettingsStore.readLastRefreshMs(),
            "hasSettings": settingsJson != nil && !(settingsJson?.isEmpty ?? true),
            "configuredJourneyCount": configuredJourneyCount,
        ]

        guard let snapshot else {
            result["hasSnapshot"] = false
            call.resolve(result)
            return
        }

        result["hasSnapshot"] = true
        result["primary"] = snapshot["primary"] as? String ?? ""
        result["secondary"] = snapshot["secondary"] as? String ?? ""
        result["label"] = snapshot["label"] as? String ?? ""
        result["empty"] = snapshot["empty"] as? Bool ?? false
        result["outsideHoursIdle"] = snapshot["outsideHoursIdle"] as? Bool ?? false
        result["nearbyFallback"] = snapshot["nearbyFallback"] as? Bool ?? false
        result["journeyId"] = snapshot["journeyId"] as? String ?? ""
        result["stale"] = snapshot["stale"] as? Bool ?? false
        result["refreshedAtMs"] = snapshot["refreshedAtMs"] as? Int64 ?? 0
        result["departureIso"] = snapshot["departureIso"] as? String ?? ""
        result["updatedLine"] = snapshot["updatedLine"] as? String ?? ""
        result["staleEmptyCache"] = CommuteSchedule.isStaleEmptySnapshot(snapshot)
        call.resolve(result)
    }
}

enum WidgetDeepLinkCapture {
    static func capture(_ url: URL?) {
        guard let url, url.scheme == "nexttrain" else { return }
        let host = url.host ?? ""
        if host == "test" || host == "journey" || host == "nearby" || host == "home" {
            WidgetSyncPlugin.setPendingDeepLink(url.absoluteString)
        }
    }
}
