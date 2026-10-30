import Foundation

// Mirrors the JSON returned by the web app's /api/mobile routes (src/lib/mobile-api.ts).

struct User: Decodable, Equatable {
    let id: String
    let name: String
    let email: String
    let timeFormat: String
    let timezone: String?
    let hasPassword: Bool
    let remindClockIn: Bool
    let remindLeave: Bool
    let remindClockOut: Bool
    let createdAt: String
}

struct Schedule: Decodable, Equatable {
    let expectedDailyMinutes: Int
    let halfDayMinutes: Int
    let workStartMinutes: Int
    let workEndMinutes: Int
    /// 0 = Sunday ... 6 = Saturday
    let workingDays: [Int]
    let lateAfterMinutes: Int?
}

enum DayStatus: String, Decodable, CaseIterable {
    case extra
    case less
    case onTarget = "on-target"
    case inProgress = "in-progress"
    case missing
    case incomplete
    case nonWorking = "non-working"
    case future
    case leave
    case notTracked = "not-tracked"
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = DayStatus(rawValue: raw) ?? .unknown
    }
}

struct DayRow: Decodable, Identifiable, Equatable {
    let dateKey: String
    let entryMinutes: Int?
    let outMinutes: Int?
    let isHalfDay: Bool
    /// "leave" | "holiday" (legacy "sick" is still read)
    let leaveType: String?
    let extraEntryMinutes: Int?
    let extraOutMinutes: Int?
    /// Completed extra time, or the running total while a session is open today.
    let extraMinutes: Int?
    let extraInProgress: Bool
    let isLate: Bool
    let isToday: Bool
    let isFuture: Bool
    let isWorkingDay: Bool
    let status: DayStatus
    let workedMinutes: Int?
    let expectedMinutes: Int
    let differenceMinutes: Int?

    var id: String { dateKey }

    var hasTimes: Bool { entryMinutes != nil || outMinutes != nil }

    /// Whether anything is saved for the day's regular attendance (extra hours aside).
    var hasRecord: Bool { hasTimes || leaveType != nil || isHalfDay }

    /// Wall-clock minute at which the expected time is reached.
    var leaveAtMinutes: Int? { entryMinutes.map { $0 + expectedMinutes } }
}

struct PeriodSummary: Decodable, Equatable {
    let balanceMinutes: Int
    let totalWorkedMinutes: Int
    let totalExpectedMinutes: Int
    let totalExtraMinutes: Int
    let totalLessMinutes: Int
    let totalExtraHourMinutes: Int
    let workingDaysCount: Int
    let daysCompletedCount: Int
    let daysMissingCount: Int
    let daysOffWorkedCount: Int
    let halfDaysCount: Int
    let leaveDaysCount: Int
    let lateEntriesCount: Int
    let averageMinutesPerDay: Double
}

struct MonthBreakdown: Decodable, Identifiable {
    /// 0-indexed
    let month: Int
    let summary: PeriodSummary
    let hasData: Bool

    var id: Int { month }
}

struct ZonedNow: Decodable {
    let dateKey: String
    let year: Int
    /// 0-indexed
    let month: Int
    let minutes: Int
}

// MARK: - Responses

struct AuthResponse: Decodable {
    let token: String
    let user: User
}

struct DashboardResponse: Decodable {
    let user: User
    let schedule: Schedule
    let now: ZonedNow
    let today: DayRow
    let monthSummary: PeriodSummary
    /// Newest first.
    let recent: [DayRow]
    /// The seven days after today.
    let upcoming: [DayRow]
}

struct MonthResponse: Decodable {
    let year: Int
    let month: Int
    let schedule: Schedule
    let summary: PeriodSummary
    let rows: [DayRow]
}

struct YearResponse: Decodable {
    let year: Int
    let summary: PeriodSummary
    let months: [MonthBreakdown]
}

struct SettingsResponse: Decodable {
    let user: User
    let schedule: Schedule
}

struct SuccessResponse: Decodable {
    let success: Bool
}
