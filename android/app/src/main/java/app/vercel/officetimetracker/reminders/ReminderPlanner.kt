package app.vercel.officetimetracker.reminders

import app.vercel.officetimetracker.data.DashboardResponse
import app.vercel.officetimetracker.data.DayRow
import app.vercel.officetimetracker.util.Fmt
import app.vercel.officetimetracker.util.userZone
import kotlinx.serialization.Serializable
import java.time.LocalDate

@Serializable
data class PlannedReminder(
    /** Kind and day, e.g. "leave-2026-10-30". */
    val id: String,
    val atMillis: Long,
    val title: String,
    val body: String,
)

/**
 * Turns the Today data into local notifications, standing in for the website's web-push
 * reminders. Same rules, timings and wording as src/lib/reminders.ts.
 */
object ReminderPlanner {
    const val CLOCK_IN_GRACE_MINUTES = 60
    const val CLOCK_OUT_GRACE_MINUTES = 120
    const val EXTRA_RUNNING_MINUTES = 180

    fun plan(data: DashboardResponse, nowMillis: Long): List<PlannedReminder> {
        val user = data.user
        val schedule = data.schedule
        val zone = userZone(user.timezone)
        val planned = mutableListOf<PlannedReminder>()

        fun add(kind: String, title: String, body: String, dateKey: String, minutes: Int) {
            // Server minutes are wall-clock minutes in the user's time zone, and can run past
            // midnight (a leave time after a late entry).
            val at = LocalDate.parse(dateKey).atStartOfDay()
                .plusMinutes(minutes.toLong())
                .atZone(zone)
                .toInstant()
                .toEpochMilli()
            if (at > nowMillis) planned += PlannedReminder("$kind-$dateKey", at, title, body)
        }

        fun addClockIn(row: DayRow) {
            if (!user.remindClockIn || !row.isWorkingDay || row.leaveType != null || row.entryMinutes != null) return
            val at = schedule.workStartMinutes + CLOCK_IN_GRACE_MINUTES
            if (at >= schedule.workEndMinutes) return
            add("clock-in", "Forgot to clock in?", "You haven't recorded an entry time today.", row.dateKey, at)
        }

        val today = data.today
        val extraStart = today.extraEntryMinutes
        if (user.remindClockOut && today.extraInProgress && extraStart != null) {
            add(
                "extra-running",
                "Extra hours still running",
                "Your extra hours have been running for ${Fmt.duration(EXTRA_RUNNING_MINUTES)}. " +
                    "End them when you're done, or they'll continue past midnight.",
                today.dateKey,
                extraStart + EXTRA_RUNNING_MINUTES,
            )
        }

        if (today.isWorkingDay && today.leaveType == null) {
            addClockIn(today)
            val leaveAt = today.leaveAtMinutes
            if (leaveAt != null && today.outMinutes == null) {
                if (user.remindLeave) {
                    add(
                        "leave",
                        "Time to head out 🎉",
                        "You've completed today's ${Fmt.duration(today.expectedMinutes)}. Clock out when you leave.",
                        today.dateKey,
                        leaveAt,
                    )
                }
                if (user.remindClockOut) {
                    add(
                        "clock-out",
                        "Still at work?",
                        "Don't forget to record your out time for today.",
                        today.dateKey,
                        leaveAt + CLOCK_OUT_GRACE_MINUTES,
                    )
                }
            }
        }

        // Clocking in from the website on a later day won't cancel these until the app is opened.
        data.upcoming.forEach(::addClockIn)
        return planned
    }
}
