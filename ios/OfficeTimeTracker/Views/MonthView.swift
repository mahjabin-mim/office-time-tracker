import Charts
import SwiftUI

struct MonthView: View {
    private enum Filter: String, CaseIterable, Identifiable {
        case all = "All days"
        case extra = "Extra"
        case less = "Less"
        case missing = "Missing"
        case leave = "Leave"
        case late = "Late"
        case halfDay = "Half days"

        var id: String { rawValue }

        func matches(_ row: DayRow) -> Bool {
            switch self {
            case .all: return true
            case .extra: return row.status == .extra
            case .less: return row.status == .less
            case .missing: return row.status == .missing || row.status == .incomplete
            case .leave: return row.status == .leave
            case .late: return row.isLate
            case .halfDay: return row.isHalfDay
            }
        }
    }

    @Environment(AppModel.self) private var app

    @State private var year: Int
    /// 0-indexed
    @State private var month: Int
    @State private var data: MonthResponse?
    @State private var error: String?
    @State private var filter = Filter.all
    @State private var editingDay: DayRow?
    @State private var editingExtra: DayRow?

    init() {
        let now = Calendar.current.dateComponents([.year, .month], from: Date())
        _year = State(initialValue: now.year ?? 2026)
        _month = State(initialValue: (now.month ?? 1) - 1)
    }

    private var timeFormat: String { app.user?.timeFormat ?? "12h" }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    PeriodSwitcher(
                        title: Fmt.monthLabel(year: year, month: month),
                        onPrevious: { shift(-1) },
                        onNext: { shift(1) }
                    )
                }

                if let error {
                    Section { Text(error).foregroundStyle(Color.less) }
                }

                if let data {
                    Section { stats(data.summary) }
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)

                    let chartRows = data.rows.filter { $0.differenceMinutes != nil && $0.status != .inProgress }
                    if !chartRows.isEmpty {
                        Section("Daily difference") {
                            Chart(chartRows) { row in
                                BarMark(
                                    x: .value("Day", Fmt.dayNumber(row.dateKey)),
                                    y: .value("Hours", Double(row.differenceMinutes ?? 0) / 60)
                                )
                                .foregroundStyle((row.differenceMinutes ?? 0) >= 0 ? Color.extra : Color.less)
                            }
                            .chartYAxisLabel("hours")
                            .frame(height: 180)
                            .padding(.vertical, 8)
                        }
                    }

                    Section {
                        let rows = data.rows.filter(filter.matches)
                        if rows.isEmpty {
                            Text("No days match this filter.").foregroundStyle(.secondary)
                        }
                        ForEach(rows) { row in
                            Button { editingDay = row } label: {
                                DayListRow(row: row, timeFormat: timeFormat)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button("Edit day", systemImage: "pencil") { editingDay = row }
                                if !row.isFuture {
                                    Button(row.extraEntryMinutes == nil ? "Add extra hours" : "Edit extra hours",
                                           systemImage: "moon.stars") { editingExtra = row }
                                }
                            }
                        }
                    } header: {
                        HStack {
                            Text("Attendance")
                            Spacer()
                            Picker("Filter", selection: $filter) {
                                ForEach(Filter.allCases) { Text($0.rawValue).tag($0) }
                            }
                            .pickerStyle(.menu)
                            .textCase(nil)
                        }
                    } footer: {
                        Text("Tap a day to edit it. Touch and hold for extra hours.")
                    }
                } else if error == nil {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Monthly")
            .refreshable { await load() }
            .task(id: "\(year)-\(month)") { await load() }
            .sheet(item: $editingDay) { row in
                if let data {
                    DayEditorView(row: row, schedule: data.schedule) { Task { await load() } }
                }
            }
            .sheet(item: $editingExtra) { row in
                ExtraHoursEditorView(row: row) { Task { await load() } }
            }
        }
    }

    private func stats(_ s: PeriodSummary) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            SummaryTile(label: "Balance", value: Fmt.signed(s.balanceMinutes),
                        hint: "+\(Fmt.duration(s.totalExtraMinutes)) / -\(Fmt.duration(s.totalLessMinutes))",
                        tone: s.balanceMinutes >= 0 ? .extra : .less)
            SummaryTile(label: "Total worked", value: Fmt.duration(s.totalWorkedMinutes),
                        hint: "of \(Fmt.duration(s.totalExpectedMinutes)) expected")
            SummaryTile(label: "Days completed", value: "\(s.daysCompletedCount)",
                        hint: "\(s.workingDaysCount) working days so far")
            SummaryTile(label: "Average / day", value: Fmt.duration(s.averageMinutesPerDay), tone: .brand)
            SummaryTile(label: "Missing", value: "\(s.daysMissingCount)",
                        tone: s.daysMissingCount > 0 ? .less : .primary)
            SummaryTile(label: "Leave", value: "\(s.leaveDaysCount)",
                        hint: s.halfDaysCount > 0 ? "\(s.halfDaysCount) half days" : nil)
            SummaryTile(label: "Late entries", value: "\(s.lateEntriesCount)",
                        tone: s.lateEntriesCount > 0 ? .less : .primary)
            SummaryTile(label: "Extra hours", value: Fmt.duration(s.totalExtraHourMinutes),
                        hint: s.daysOffWorkedCount > 0 ? "\(s.daysOffWorkedCount) days off worked" : nil,
                        tone: .extra)
        }
        .padding(.vertical, 4)
    }

    private func shift(_ months: Int) {
        let total = year * 12 + month + months
        year = total / 12
        month = total % 12
    }

    private func load() async {
        await runReportingError($error) {
            data = try await app.api.get("month", query: ["year": "\(year)", "month": "\(month)"])
        }
    }
}
