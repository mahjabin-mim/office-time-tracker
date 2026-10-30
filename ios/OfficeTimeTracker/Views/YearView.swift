import Charts
import SwiftUI

struct YearView: View {
    private struct Point: Identifiable {
        let month: Int
        let balance: Double
        let cumulative: Double?
        var id: Int { month }
    }

    @Environment(AppModel.self) private var app

    @State private var year = Calendar.current.component(.year, from: Date())
    @State private var data: YearResponse?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    PeriodSwitcher(title: String(year), onPrevious: { year -= 1 }, onNext: { year += 1 })
                }

                if let error {
                    Section { Text(error).foregroundStyle(Color.less) }
                }

                if let data {
                    Section { stats(data.summary) }
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)

                    Section("Balance per month") {
                        chart(data)
                            .frame(height: 200)
                            .padding(.vertical, 8)
                    }

                    Section("Months") {
                        ForEach(data.months.filter(\.hasData)) { item in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(Fmt.monthLabel(year: data.year, month: item.month))
                                        .font(.subheadline.weight(.semibold))
                                    Text("\(Fmt.duration(item.summary.totalWorkedMinutes)) worked · \(item.summary.daysCompletedCount) days")
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(Fmt.signed(item.summary.balanceMinutes))
                                    .font(.subheadline.weight(.semibold).monospacedDigit())
                                    .foregroundStyle(item.summary.balanceMinutes >= 0 ? Color.extra : Color.less)
                            }
                        }
                        if !data.months.contains(where: \.hasData) {
                            Text("Nothing tracked in \(String(data.year)).").foregroundStyle(.secondary)
                        }
                    }
                } else if error == nil {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Yearly")
            .refreshable { await load() }
            .task(id: year) { await load() }
        }
    }

    private func stats(_ s: PeriodSummary) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            SummaryTile(label: "Yearly balance", value: Fmt.signed(s.balanceMinutes),
                        tone: s.balanceMinutes >= 0 ? .extra : .less)
            SummaryTile(label: "Total worked", value: Fmt.duration(s.totalWorkedMinutes),
                        hint: "of \(Fmt.duration(s.totalExpectedMinutes)) expected")
            SummaryTile(label: "Average / day", value: Fmt.duration(s.averageMinutesPerDay), tone: .brand)
            SummaryTile(label: "Days completed", value: "\(s.daysCompletedCount)",
                        hint: "\(s.leaveDaysCount) leave · \(s.lateEntriesCount) late")
        }
        .padding(.vertical, 4)
    }

    /// Bars for each month's balance, plus a running total across tracked months up to now.
    private func chart(_ data: YearResponse) -> some View {
        let now = Calendar.current.dateComponents([.year, .month], from: Date())
        let lastElapsed = data.year < (now.year ?? 0) ? 11 : data.year == now.year ? (now.month ?? 1) - 1 : -1
        let firstTracked = data.months.first(where: \.hasData)?.month ?? 12
        var running = 0
        let points = data.months.map { item -> Point in
            let elapsed = item.month >= firstTracked && item.month <= lastElapsed
            if elapsed { running += item.summary.balanceMinutes }
            return Point(month: item.month,
                         balance: Double(item.summary.balanceMinutes) / 60,
                         cumulative: elapsed ? Double(running) / 60 : nil)
        }

        return Chart {
            ForEach(points) { point in
                BarMark(x: .value("Month", Fmt.monthShort(point.month)),
                        y: .value("Balance", point.balance))
                    .foregroundStyle(point.balance >= 0 ? Color.extra : Color.less)
            }
            ForEach(points.filter { $0.cumulative != nil }) { point in
                LineMark(x: .value("Month", Fmt.monthShort(point.month)),
                         y: .value("Running total", point.cumulative ?? 0))
                    .foregroundStyle(Color.brand)
                    .symbol(.circle)
            }
        }
        .chartYAxisLabel("hours")
    }

    private func load() async {
        await runReportingError($error) {
            data = try await app.api.get("year", query: ["year": String(year)])
        }
    }
}
