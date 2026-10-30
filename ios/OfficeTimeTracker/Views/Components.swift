import SwiftUI

struct StatusBadge: View {
    let row: DayRow

    var body: some View {
        let label = row.status == .leave ? leaveLabel(row.leaveType) : row.status.label
        Label(label, systemImage: row.status.symbol)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(row.status.color)
            .background(row.status.color.opacity(0.14), in: Capsule())
            .labelStyle(.titleAndIcon)
    }
}

struct SummaryTile: View {
    let label: String
    let value: String
    var hint: String? = nil
    var tone: Color = .primary

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title3.weight(.semibold).monospacedDigit())
                .foregroundStyle(tone)
                .contentTransition(.numericText())
            if let hint {
                Text(hint)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14))
    }
}

struct ProgressRing: View {
    /// 0...1, can exceed 1 when there's extra time.
    let progress: Double
    var color: Color = .brand
    var lineWidth: CGFloat = 12

    var body: some View {
        ZStack {
            Circle().stroke(color.opacity(0.15), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(max(progress, 0), 1))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.6), value: progress)
        }
    }
}

/// Month/year switcher shown at the top of the Monthly and Yearly screens.
struct PeriodSwitcher: View {
    let title: String
    let onPrevious: () -> Void
    let onNext: () -> Void

    var body: some View {
        HStack {
            Button(action: onPrevious) { Image(systemName: "chevron.left") }
                .accessibilityLabel("Previous")
            Spacer()
            Text(title).font(.headline)
            Spacer()
            Button(action: onNext) { Image(systemName: "chevron.right") }
                .accessibilityLabel("Next")
        }
        .buttonStyle(.borderless)
        .font(.body.weight(.semibold))
    }
}

/// One day in a list: date, times, status and difference.
struct DayListRow: View {
    let row: DayRow
    let timeFormat: String

    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 0) {
                Text(Fmt.weekdayShort(row.dateKey).uppercased())
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text("\(Fmt.dayNumber(row.dateKey))")
                    .font(.title3.weight(.semibold).monospacedDigit())
            }
            .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    StatusBadge(row: row)
                    if row.isHalfDay { Tag(text: "Half day", color: .orange) }
                    if row.isLate { Tag(text: "Late", color: .less) }
                }
                Text(timesText)
                    .font(.footnote.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)

            if let diff = row.differenceMinutes, row.status != .inProgress {
                Text(Fmt.signed(diff))
                    .font(.subheadline.weight(.semibold).monospacedDigit())
                    .foregroundStyle(diff > 0 ? Color.extra : diff < 0 ? Color.less : .secondary)
            }
        }
        .contentShape(Rectangle())
    }

    private var timesText: String {
        var parts: [String] = []
        if row.hasTimes {
            let entry = row.entryMinutes.map { Fmt.clock($0, timeFormat) } ?? "—"
            let out = row.outMinutes.map { Fmt.clock($0, timeFormat) } ?? "—"
            parts.append("\(entry) – \(out)")
        }
        if let extra = row.extraMinutes {
            parts.append("Extra \(Fmt.duration(extra))\(row.extraInProgress ? " so far" : "")")
        }
        return parts.isEmpty ? (row.isWorkingDay ? "No times recorded" : " ") : parts.joined(separator: " · ")
    }
}

struct Tag: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .foregroundStyle(color)
            .background(color.opacity(0.14), in: Capsule())
    }
}

/// Inline error shown under a form field.
struct FieldError: View {
    let message: String?

    var body: some View {
        if let message {
            Text(message)
                .font(.footnote)
                .foregroundStyle(Color.less)
        }
    }
}

extension View {
    /// The rounded card look used on the Today screen.
    func card() -> some View {
        padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.background.secondary, in: RoundedRectangle(cornerRadius: 20))
    }
}

/// Runs an async action and keeps its error for display. Cancellation (leaving the screen or
/// pulling to refresh twice) isn't an error worth showing.
@MainActor
func runReportingError(_ message: Binding<String?>, _ action: () async throws -> Void) async {
    do {
        try await action()
        message.wrappedValue = nil
    } catch is CancellationError {
    } catch {
        message.wrappedValue = error.localizedDescription
    }
}
