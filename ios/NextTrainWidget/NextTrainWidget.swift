import WidgetKit
import SwiftUI

@main
struct NextTrainWidgetBundle: WidgetBundle {
    var body: some Widget {
        NextTrainWidget()
    }
}

struct NextTrainWidget: Widget {
    let kind = "NextTrainWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextTrainTimelineProvider()) { entry in
            NextTrainWidgetView(snapshot: entry.snapshot)
                .containerBackground(for: .widget) {
                    WidgetCardBackground()
                }
        }
        .configurationDisplayName("Next Train")
        .description("See your next train and when to leave.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct NextTrainTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextTrainEntry {
        NextTrainEntry(date: Date(), snapshot: CommuteSchedule.emptyStateForPlaceholder())
    }

    func getSnapshot(in context: Context, completion: @escaping (NextTrainEntry) -> Void) {
        let snapshot = CommuteSchedule.snapshotForDisplay()
        completion(NextTrainEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextTrainEntry>) -> Void) {
        let snapshot = CommuteSchedule.load(allowStaleFallback: true)
        let now = Date()
        var entries: [NextTrainEntry] = []
        for offset in 0..<16 {
            let date = Calendar.current.date(byAdding: .minute, value: offset, to: now) ?? now
            let repainted = CommuteSchedule.repaintSnapshot(snapshot) ?? snapshot
            entries.append(NextTrainEntry(date: date, snapshot: repainted))
        }
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
        completion(Timeline(entries: entries, policy: .after(refresh)))
    }
}

struct NextTrainEntry: TimelineEntry {
    let date: Date
    let snapshot: [String: Any]
}

/// Card background: system base plus the user's appearance tint. In the
/// accented/vibrant rendering modes (iOS 18 tinted home screen, StandBy)
/// the system supplies the surface, so no custom paint is added.
struct WidgetCardBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.widgetRenderingMode) private var renderingMode

    var body: some View {
        if renderingMode == .fullColor {
            ZStack {
                Color(.systemBackground)
                WidgetAppearance.resolve(colorScheme: colorScheme).cardTint
            }
        } else {
            Color(.systemBackground)
        }
    }
}

struct NextTrainWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.widgetRenderingMode) private var renderingMode
    let snapshot: [String: Any]

    private var isFullColor: Bool { renderingMode == .fullColor }

    var body: some View {
        let appearance = WidgetAppearance.resolve(colorScheme: colorScheme)
        let label = snapshot["label"] as? String ?? "NEXT TRAIN"
        let primary = snapshot["primary"] as? String ?? "—"
        let trainClock = snapshot["trainClock"] as? String ?? ""
        let secondary = snapshot["secondary"] as? String ?? ""
        let route = (snapshot["route"] as? String ?? snapshot["stationLabel"] as? String) ?? ""
        let updatedLine = snapshot["updatedLine"] as? String ?? ""
        let urgent = snapshot["urgent"] as? Bool ?? false
        let late = snapshot["late"] as? Bool ?? false
        let outsideHours = snapshot["outsideHoursIdle"] as? Bool ?? false

        // Parity with WidgetUiBuilder: calm leave text uses the muted palette
        // colour; urgent/late use the shared semantic colours.
        let mutedStyle = isFullColor ? AnyShapeStyle(appearance.muted) : AnyShapeStyle(.secondary)
        let textStyle = isFullColor ? AnyShapeStyle(appearance.text) : AnyShapeStyle(.primary)
        let accentStyle = isFullColor ? AnyShapeStyle(appearance.accent) : AnyShapeStyle(.primary)
        let leaveStyle: AnyShapeStyle
        if !isFullColor {
            leaveStyle = AnyShapeStyle(.primary)
        } else if late {
            leaveStyle = AnyShapeStyle(appearance.late)
        } else if urgent {
            leaveStyle = AnyShapeStyle(appearance.leaveUrgent)
        } else {
            leaveStyle = AnyShapeStyle(appearance.muted)
        }

        Link(destination: widgetURL()) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(label.uppercased())
                            .font(.caption2)
                            .foregroundStyle(mutedStyle)
                        Text(primary)
                            .font(.system(size: family == .systemSmall ? 28 : 34, weight: .bold))
                            .foregroundStyle(accentStyle)
                            .widgetAccentable()
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                        if !trainClock.isEmpty {
                            Text(trainClock)
                                .font(.caption)
                                .foregroundStyle(textStyle)
                        }
                    }
                    Spacer(minLength: 8)
                    if !secondary.isEmpty && !outsideHours {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("LEAVE")
                                .font(.caption2)
                                .foregroundStyle(mutedStyle)
                            Text(secondary)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(leaveStyle)
                                .widgetAccentable()
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }

                if !route.isEmpty && primary != "Pin a train" {
                    Text(route)
                        .font(.caption)
                        .foregroundStyle(mutedStyle)
                        .lineLimit(1)
                }

                if family == .systemMedium, !updatedLine.isEmpty {
                    Text(updatedLine)
                        .font(.caption2)
                        .foregroundStyle(mutedStyle)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(12)
        }
    }

    private func widgetURL() -> URL {
        if snapshot["empty"] as? Bool == true {
            return URL(string: "nexttrain://journey/new")!
        }
        if snapshot["nearbyFallback"] as? Bool == true || snapshot["openNearbyOnTap"] as? Bool == true {
            return URL(string: "nexttrain://nearby")!
        }
        let journeyId = snapshot["journeyId"] as? String ?? "home"
        return URL(string: "nexttrain://journey/\(journeyId)")!
    }
}

private extension CommuteSchedule {
    static func emptyStateForPlaceholder() -> [String: Any] {
        [
            "label": "NEXT TRAIN",
            "primary": "12 min",
            "trainClock": "3:52 PM",
            "secondary": "Leave in 8 min",
            "route": "Perth → Mandurah",
            "updatedLine": "Updated just now",
            "urgent": false,
            "late": false,
        ]
    }
}
