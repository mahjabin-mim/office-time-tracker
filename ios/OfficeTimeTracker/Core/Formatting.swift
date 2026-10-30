import Foundation

/// Same formats as the website (src/lib/time.ts).
enum Fmt {
    static func clock(_ minutes: Int, _ timeFormat: String) -> String {
        let normalized = ((minutes % 1440) + 1440) % 1440
        let h = normalized / 60
        let m = normalized % 60
        if timeFormat == "24h" { return String(format: "%02d:%02d", h, m) }
        let period = h < 12 ? "AM" : "PM"
        let h12 = h % 12 == 0 ? 12 : h % 12
        return String(format: "%02d:%02d %@", h12, m, period)
    }

    /// "9h 05m", "45m", "-1h 30m"
    static func duration(_ minutes: Int) -> String {
        let sign = minutes < 0 ? "-" : ""
        return sign + magnitude(abs(minutes))
    }

    static func duration(_ minutes: Double) -> String {
        duration(Int(minutes.rounded()))
    }

    /// "+1h 30m", "-20m", "0m"
    static func signed(_ minutes: Int) -> String {
        let sign = minutes > 0 ? "+" : minutes < 0 ? "-" : ""
        return sign + magnitude(abs(minutes))
    }

    private static func magnitude(_ minutes: Int) -> String {
        let h = minutes / 60
        let m = minutes % 60
        return h == 0 ? "\(m)m" : "\(h)h \(String(format: "%02d", m))m"
    }

    /// "HH:mm", the time format the API expects.
    static func apiTime(_ minutes: Int) -> String {
        String(format: "%02d:%02d", minutes / 60, minutes % 60)
    }

    // MARK: Calendar days

    // Days are keyed "YYYY-MM-DD" and read in UTC, so a key is the same day on any device.
    private static let utc: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }()

    static func date(fromKey key: String) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return utc.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func dayNumber(_ key: String) -> Int {
        Int(key.suffix(2)) ?? 0
    }

    private static func format(_ date: Date?, _ template: String) -> String {
        guard let date else { return "" }
        let formatter = DateFormatter()
        formatter.timeZone = utc.timeZone
        formatter.setLocalizedDateFormatFromTemplate(template)
        return formatter.string(from: date)
    }

    /// "Thursday, October 30"
    static func dayLabel(_ key: String) -> String { format(date(fromKey: key), "EEEEMMMMd") }
    /// "Oct 30"
    static func shortDate(_ key: String) -> String { format(date(fromKey: key), "MMMd") }
    /// "Thu"
    static func weekdayShort(_ key: String) -> String { format(date(fromKey: key), "EEE") }

    /// month is 0-indexed. "October 2026"
    static func monthLabel(year: Int, month: Int) -> String {
        format(utc.date(from: DateComponents(year: year, month: month + 1, day: 1)), "MMMMyyyy")
    }

    /// month is 0-indexed. "Oct"
    static func monthShort(_ month: Int) -> String {
        format(utc.date(from: DateComponents(year: 2000, month: month + 1, day: 1)), "MMM")
    }

    // MARK: Time pickers

    /// A Date on today's date at the given minute of the day, for a time-only DatePicker.
    static func pickerDate(_ minutes: Int) -> Date {
        Calendar.current.date(
            bySettingHour: (minutes / 60) % 24, minute: minutes % 60, second: 0, of: Date()
        ) ?? Date()
    }

    static func minutesOfDay(_ date: Date) -> Int {
        let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
        return (parts.hour ?? 0) * 60 + (parts.minute ?? 0)
    }
}

let weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

func leaveLabel(_ leaveType: String?) -> String {
    switch leaveType {
    case "sick": return "Sick leave"
    case "holiday": return "Holiday"
    default: return "Leave"
    }
}
