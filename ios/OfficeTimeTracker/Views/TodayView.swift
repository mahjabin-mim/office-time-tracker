import SwiftUI

struct TodayView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.scenePhase) private var scenePhase

    @State private var data: DashboardResponse?
    /// When `data` was fetched, so running times can tick forward without refetching.
    @State private var fetchedAt = Date()
    @State private var error: String?
    @State private var busy = false
    @State private var clockFeedback = 0
    @State private var editingDay: DayRow?
    @State private var editingExtra: DayRow?

    var body: some View {
        NavigationStack {
            ScrollView {
                if let data {
                    content(data)
                        .padding()
                } else if let error {
                    ContentUnavailableView {
                        Label("Couldn't load your day", systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Try again") { Task { await load() } }
                    }
                    .padding(.top, 80)
                } else {
                    ProgressView().padding(.top, 120)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Today")
            .refreshable { await load() }
            .task { await load() }
            .onChange(of: scenePhase) {
                if scenePhase == .active { Task { await load() } }
            }
            .sensoryFeedback(.success, trigger: clockFeedback)
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

    @ViewBuilder
    private func content(_ data: DashboardResponse) -> some View {
        let format = data.user.timeFormat
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(greeting(data.now.minutes)), \(data.user.name) 👋")
                    .font(.title3.weight(.semibold))
                Text(Fmt.dayLabel(data.today.dateKey))
                    .foregroundStyle(.secondary)
            }

            if let error {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.footnote)
                    .foregroundStyle(Color.less)
            }

            TimelineView(.periodic(from: .now, by: 30)) { context in
                let elapsed = max(0, Int(context.date.timeIntervalSince(fetchedAt) / 60))
                VStack(spacing: 12) {
                    todayCard(data.today, schedule: data.schedule, format: format, elapsed: elapsed)
                    extraCard(data.today, format: format, elapsed: elapsed)
                }
            }

            section("This month") {
                monthTiles(data)
            }

            section("Recent attendance") {
                VStack(spacing: 0) {
                    ForEach(data.recent) { row in
                        Button { editingDay = row } label: {
                            DayListRow(row: row, timeFormat: format)
                                .padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)
                        if row.id != data.recent.last?.id { Divider() }
                    }
                }
                .card()
            }
        }
    }

    // MARK: Today

    @ViewBuilder
    private func todayCard(_ row: DayRow, schedule: Schedule, format: String, elapsed: Int) -> some View {
        if row.leaveType != nil {
            VStack(spacing: 12) {
                Image(systemName: "beach.umbrella").font(.largeTitle).foregroundStyle(.purple)
                Text("\(leaveLabel(row.leaveType)) today").font(.headline)
                Text("Enjoy it. Nothing is expected from you today.")
                    .font(.subheadline).foregroundStyle(.secondary)
                Button("Edit day") { editingDay = row }.buttonStyle(.bordered)
            }
            .frame(maxWidth: .infinity)
            .card()
        } else if !row.hasTimes {
            VStack(spacing: 12) {
                Image(systemName: row.isWorkingDay ? "calendar.badge.clock" : "cup.and.saucer")
                    .font(.largeTitle)
                    .foregroundStyle(Color.brand)
                Text(row.isWorkingDay ? "Ready to start your day?" : "It's your day off")
                    .font(.headline)
                Text(row.isWorkingDay
                     ? "Clock in with one tap, or add your times manually."
                     : "Nothing is expected today. If you do work, all of it counts as extra time.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                HStack {
                    clockButton(row.isWorkingDay ? "Clock in" : "Clock in anyway", path: "clock",
                                prominent: row.isWorkingDay)
                    Button("Add manually") { editingDay = row }.buttonStyle(.bordered)
                }
            }
            .frame(maxWidth: .infinity)
            .card()
        } else {
            let running = row.status == .inProgress
            let worked = (row.workedMinutes ?? 0) + (running ? elapsed : 0)
            let progress = row.expectedMinutes > 0 ? Double(worked) / Double(row.expectedMinutes) : 1
            let difference = worked - row.expectedMinutes

            VStack(spacing: 16) {
                HStack(spacing: 20) {
                    ZStack {
                        ProgressRing(progress: progress, color: progress >= 1 ? .extra : .brand)
                        VStack(spacing: 0) {
                            Text(Fmt.duration(worked)).font(.headline.monospacedDigit())
                            Text("worked").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    .frame(width: 110, height: 110)

                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            StatusBadge(row: row)
                            if row.isHalfDay { Tag(text: "Half day", color: .orange) }
                            if row.isLate { Tag(text: "Late", color: .less) }
                        }
                        detail("Entry", row.entryMinutes.map { Fmt.clock($0, format) } ?? "—")
                        detail("Out", row.outMinutes.map { Fmt.clock($0, format) } ?? "—")
                        if running, let leaveAt = row.leaveAtMinutes, row.expectedMinutes > 0 {
                            detail(difference >= 0 ? "Done at" : "Leave at", Fmt.clock(leaveAt, format))
                            detail(difference >= 0 ? "Extra" : "Time left",
                                   Fmt.duration(abs(difference)))
                        } else if row.status != .incomplete {
                            detail("Difference", Fmt.signed(difference))
                        }
                    }
                    Spacer(minLength: 0)
                }

                HStack {
                    if row.entryMinutes != nil && row.outMinutes == nil {
                        clockButton("Clock out", path: "clock", prominent: true)
                    }
                    Button("Edit") { editingDay = row }.buttonStyle(.bordered)
                    Spacer()
                }
            }
            .card()
        }
    }

    @ViewBuilder
    private func extraCard(_ row: DayRow, format: String, elapsed: Int) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "moon.stars")
                .font(.title2)
                .foregroundStyle(Color.extra)
            VStack(alignment: .leading, spacing: 2) {
                Text("Extra hours").font(.subheadline.weight(.semibold))
                if row.extraInProgress, let start = row.extraEntryMinutes {
                    Text("Running since \(Fmt.clock(start, format)) · \(Fmt.duration((row.extraMinutes ?? 0) + elapsed))")
                        .font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
                } else if let extra = row.extraMinutes, let start = row.extraEntryMinutes,
                          let end = row.extraOutMinutes {
                    Text("\(Fmt.clock(start, format)) – \(Fmt.clock(end, format)) · \(Fmt.duration(extra))")
                        .font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
                } else {
                    Text("Every minute counts as extra time.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
            if row.extraInProgress {
                clockButton("End", path: "extra/clock", prominent: true)
            } else if row.extraEntryMinutes == nil {
                clockButton("Start", path: "extra/clock", prominent: false)
            }
            if row.extraEntryMinutes != nil {
                Button { editingExtra = row } label: { Image(systemName: "pencil") }
                    .buttonStyle(.bordered)
                    .accessibilityLabel("Edit extra hours")
            }
        }
        .card()
    }

    private func clockButton(_ title: String, path: String, prominent: Bool) -> some View {
        Button {
            Task { await clock(path) }
        } label: {
            Text(title).frame(minWidth: 64)
        }
        .buttonStyle(ProminenceButtonStyle(prominent: prominent))
        .disabled(busy)
    }

    private func detail(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(.secondary)
            Spacer()
            Text(value).monospacedDigit()
        }
        .font(.subheadline)
    }

    // MARK: Month

    private func monthTiles(_ data: DashboardResponse) -> some View {
        let s = data.monthSummary
        let format = data.user.timeFormat
        return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            SummaryTile(label: "Monthly balance", value: Fmt.signed(s.balanceMinutes),
                        hint: s.balanceMinutes >= 0 ? "Extra time this month" : "Less time this month",
                        tone: s.balanceMinutes >= 0 ? .extra : .less)
            SummaryTile(label: "Total worked", value: Fmt.duration(s.totalWorkedMinutes),
                        hint: "\(s.daysCompletedCount + s.daysOffWorkedCount) days completed")
            SummaryTile(label: "Expected hours", value: Fmt.duration(s.totalExpectedMinutes),
                        hint: "\(s.workingDaysCount) working days")
            SummaryTile(label: "Average / day", value: Fmt.duration(s.averageMinutesPerDay),
                        hint: "Across completed days", tone: .brand)
            SummaryTile(label: "Late entries", value: "\(s.lateEntriesCount)",
                        hint: data.schedule.lateAfterMinutes.map { "After \(Fmt.clock($0, format))" }
                            ?? "Set a late time in Settings",
                        tone: s.lateEntriesCount > 0 ? .less : .primary)
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
            content()
        }
    }

    private func greeting(_ minutes: Int) -> String {
        minutes < 12 * 60 ? "Good morning" : minutes < 18 * 60 ? "Good afternoon" : "Good evening"
    }

    // MARK: Data

    private func load() async {
        await runReportingError($error) {
            let response: DashboardResponse = try await app.api.get("dashboard")
            app.user = response.user
            if await app.syncTimeZone(with: response.user) {
                // "Today" may be a different day in the new zone.
                data = try await app.api.get("dashboard")
            } else {
                data = response
            }
            fetchedAt = Date()
            if let data { Reminders.schedule(from: data) }
        }
    }

    private func clock(_ path: String) async {
        busy = true
        defer { busy = false }
        do {
            let _: SuccessResponse = try await app.api.send("POST", path)
            clockFeedback += 1
            await load()
        } catch is CancellationError {
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// Filled for the main action on a card, outlined for the rest.
struct ProminenceButtonStyle: PrimitiveButtonStyle {
    let prominent: Bool

    func makeBody(configuration: Configuration) -> some View {
        if prominent {
            Button(role: configuration.role, action: configuration.trigger) { configuration.label }
                .buttonStyle(.borderedProminent)
        } else {
            Button(role: configuration.role, action: configuration.trigger) { configuration.label }
                .buttonStyle(.bordered)
        }
    }
}
