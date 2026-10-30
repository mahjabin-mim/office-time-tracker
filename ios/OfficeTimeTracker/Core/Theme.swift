import SwiftUI

extension Color {
    static let brand = Color(red: 0x6A / 255, green: 0x2F / 255, blue: 0xF5 / 255)
    static let extra = Color(red: 0x23 / 255, green: 0x9F / 255, blue: 0x71 / 255)
    static let less = Color(red: 0xE6 / 255, green: 0x37 / 255, blue: 0x5A / 255)
}

extension DayStatus {
    var label: String {
        switch self {
        case .extra: return "Extra"
        case .less: return "Less"
        case .onTarget: return "On target"
        case .inProgress: return "In progress"
        case .missing: return "Missing"
        case .incomplete: return "Incomplete"
        case .nonWorking: return "Day off"
        case .future: return "Upcoming"
        case .leave: return "Leave"
        case .notTracked: return "Not tracked"
        case .unknown: return "—"
        }
    }

    var color: Color {
        switch self {
        case .extra: return .extra
        case .less, .missing: return .less
        case .inProgress: return .brand
        case .incomplete: return .orange
        case .leave: return .purple
        default: return .secondary
        }
    }

    var symbol: String {
        switch self {
        case .extra: return "arrow.up.right"
        case .less: return "arrow.down.right"
        case .onTarget: return "minus"
        case .inProgress: return "clock"
        case .missing: return "questionmark.circle"
        case .incomplete, .future: return "circle.dashed"
        case .nonWorking: return "calendar.badge.minus"
        case .leave: return "beach.umbrella"
        case .notTracked, .unknown: return "circle.slash"
        }
    }
}
