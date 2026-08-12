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

struct NextTrainWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let snapshot: [String: Any]

    private var accentColor: Color { Color(red: 0.0, green: 0.55, blue: 0.52) }
    private var urgentColor: Color { Color(red: 0.85, green: 0.45, blue: 0.0) }
    private var lateColor: Color { Color.red }

    var body: some View {
        let label = snapshot["label"] as? String ?? "NEXT TRAIN"
        let primary = snapshot["primary"] as? String ?? "—"
        let trainClock = snapshot["trainClock"] as? String ?? ""
        let secondary = snapshot["secondary"] as? String ?? ""
        let route = (snapshot["route"] as? String ?? snapshot["stationLabel"] as? String) ?? ""
        let updatedLine = snapshot["updatedLine"] as? String ?? ""
        let urgent = snapshot["urgent"] as? Bool ?? false
        let late = snapshot["late"] as? Bool ?? false
        let outsideHours = snapshot["outsideHoursIdle"] as? Bool ?? false
        let leaveColor = late ? lateColor : (urgent ? urgentColor : Color.primary)

        Link(destination: widgetURL()) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(label.uppercased())
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(primary)
                            .font(.system(size: family == .systemSmall ? 28 : 34, weight: .bold))
                            .foregroundStyle(accentColor)
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                        if !trainClock.isEmpty {
                            Text(trainClock)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer(minLength: 8)
                    if !secondary.isEmpty && !outsideHours {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("LEAVE")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text(secondary)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(leaveColor)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }

                if !route.isEmpty {
                    Text(route)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if family == .systemMedium, !updatedLine.isEmpty {
                    Text(updatedLine)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
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
