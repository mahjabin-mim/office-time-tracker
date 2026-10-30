import Foundation
import UserNotifications

/// Local notifications standing in for the website's push reminders, which need a paid Apple
/// developer account (APNs) to reach a native app. Same rules and timings as src/lib/reminders.ts,
/// rescheduled from fresh data every time the Today screen loads.
enum Reminders {
    static let clockInGraceMinutes = 60
    static let clockOutGraceMinutes = 120
    static let extraRunningMinutes = 180

    private static var center: UNUserNotificationCenter { .current() }

    @discardableResult
    static func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    static func isDenied() async -> Bool {
        await center.notificationSettings().authorizationStatus == .denied
    }

    static func cancelAll() {
        center.removeAllPendingNotificationRequests()
    }

    static func schedule(from data: DashboardResponse) {
        cancelAll()

        let user = data.user
        let schedule = data.schedule
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = user.timezone.flatMap(TimeZone.init(identifier:)) ?? .current

        func add(_ id: String, _ title: String, _ body: String, day: String, minutes: Int) {
            let parts = day.split(separator: "-").compactMap { Int($0) }
            guard parts.count == 3,
                  let midnight = calendar.date(
                      from: DateComponents(year: parts[0], month: parts[1], day: parts[2])
                  )
            else { return }
            // Minutes can run past midnight (a leave time after a late entry), so add seconds.
            let interval = midnight.addingTimeInterval(TimeInterval(minutes * 60)).timeIntervalSinceNow
            guard interval > 0 else { return }

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
            center.add(UNNotificationRequest(identifier: "\(id)-\(day)", content: content, trigger: trigger))
        }

        func addClockIn(for row: DayRow) {
            guard user.remindClockIn, row.isWorkingDay, row.leaveType == nil, row.entryMinutes == nil
            else { return }
            let at = schedule.workStartMinutes + clockInGraceMinutes
            guard at < schedule.workEndMinutes else { return }
            add("clock-in", "Forgot to clock in?", "You haven't recorded an entry time today.",
                day: row.dateKey, minutes: at)
        }

        let today = data.today

        if user.remindClockOut, today.extraInProgress, let start = today.extraEntryMinutes {
            add("extra-running", "Extra hours still running",
                "Your extra hours have been running for \(Fmt.duration(extraRunningMinutes)). End them when you're done, or they'll continue past midnight.",
                day: today.dateKey, minutes: start + extraRunningMinutes)
        }

        if today.isWorkingDay, today.leaveType == nil {
            addClockIn(for: today)
            if let leaveAt = today.leaveAtMinutes, today.outMinutes == nil {
                if user.remindLeave {
                    add("leave", "Time to head out 🎉",
                        "You've completed today's \(Fmt.duration(today.expectedMinutes)). Clock out when you leave.",
                        day: today.dateKey, minutes: leaveAt)
                }
                if user.remindClockOut {
                    add("clock-out", "Still at work?", "Don't forget to record your out time for today.",
                        day: today.dateKey, minutes: leaveAt + clockOutGraceMinutes)
                }
            }
        }

        // Clocking in from the website on a later day won't cancel these until the app is opened.
        data.upcoming.forEach(addClockIn)
    }
}
