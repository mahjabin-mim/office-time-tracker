package app.vercel.officetimetracker

import app.vercel.officetimetracker.data.ApiJson
import app.vercel.officetimetracker.data.DashboardResponse
import app.vercel.officetimetracker.reminders.ReminderPlanner
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

class ReminderPlannerTest {
    private val zone = ZoneId.of("Asia/Dhaka")

    private fun at(dateKey: String, minutes: Int): Long =
        LocalDateTime.parse("${dateKey}T00:00").plusMinutes(minutes.toLong()).atZone(zone).toInstant().toEpochMilli()

    /** A dashboard response shaped like the server's: a DayRow is the server's minus `date`. */
    private fun dashboard(today: String, upcoming: String = "[]", reminders: String = """true, "remindLeave": true, "remindClockOut": true"""): DashboardResponse =
        ApiJson.decodeFromString(
            DashboardResponse.serializer(),
            """
            {
              "user": {"id": "u1", "name": "Sam Lee", "email": "sam@example.com", "timeFormat": "12h",
                       "timezone": "Asia/Dhaka", "hasPassword": true, "remindClockIn": $reminders,
                       "createdAt": "2026-01-01T00:00:00.000Z"},
              "schedule": {"expectedDailyMinutes": 480, "halfDayMinutes": 270, "workStartMinutes": 540,
                           "workEndMinutes": 1080, "workingDays": [0, 1, 2, 3, 4], "lateAfterMinutes": null},
              "now": {"dateKey": "2026-10-29", "year": 2026, "month": 9, "minutes": 600},
              "today": $today,
              "monthSummary": {"balanceMinutes": -30, "totalWorkedMinutes": 9600, "totalExpectedMinutes": 9630,
                               "totalExtraMinutes": 40, "totalLessMinutes": 70, "totalExtraHourMinutes": 0,
                               "workingDaysCount": 21, "daysCompletedCount": 20, "daysMissingCount": 0,
                               "daysOffWorkedCount": 0, "halfDaysCount": 1, "leaveDaysCount": 0,
                               "lateEntriesCount": 2, "averageMinutesPerDay": 480.5},
              "recent": [],
              "upcoming": $upcoming
            }
            """,
        )

    private fun row(dateKey: String, extra: String = "") = """
        {"dateKey": "$dateKey", "entryMinutes": null, "outMinutes": null, "isHalfDay": false, "leaveType": null,
         "extraEntryMinutes": null, "extraOutMinutes": null, "extraMinutes": null, "extraInProgress": false,
         "isLate": false, "isToday": true, "isFuture": false, "isWorkingDay": true, "status": "missing",
         "workedMinutes": null, "expectedMinutes": 480, "differenceMinutes": null $extra}
    """

    @Test
    fun parsesTheServerShape() {
        val data = dashboard(row("2026-10-29"))
        assertEquals("Sam Lee", data.user.name)
        assertEquals(listOf(0, 1, 2, 3, 4), data.schedule.workingDays)
        assertEquals(null, data.schedule.lateAfterMinutes)
        assertEquals(480.5, data.monthSummary.averageMinutesPerDay, 0.0)
        assertEquals("missing", data.today.status)
    }

    @Test
    fun noEntryYetSchedulesClockInAnHourAfterStart() {
        val data = dashboard(row("2026-10-29"))
        val plan = ReminderPlanner.plan(data, nowMillis = at("2026-10-29", 0))
        assertEquals(listOf("clock-in-2026-10-29"), plan.map { it.id })
        assertEquals(at("2026-10-29", 540 + 60), plan.single().atMillis)
    }

    @Test
    fun openDaySchedulesLeaveAndClockOut() {
        val today = row("2026-10-29").replace("\"entryMinutes\": null", "\"entryMinutes\": 570")
            .replace("\"status\": \"missing\"", "\"status\": \"in-progress\"")
        val plan = ReminderPlanner.plan(dashboard(today), nowMillis = at("2026-10-29", 600))
        assertEquals(listOf("leave-2026-10-29", "clock-out-2026-10-29"), plan.map { it.id })
        assertEquals(at("2026-10-29", 570 + 480), plan[0].atMillis)
        assertEquals("You've completed today's 8h 00m. Clock out when you leave.", plan[0].body)
        assertEquals(at("2026-10-29", 570 + 480 + 120), plan[1].atMillis)
    }

    @Test
    fun runningExtraHoursGetsAReminderAfterThreeHours() {
        val today = row("2026-10-29").replace("\"extraEntryMinutes\": null", "\"extraEntryMinutes\": 1100")
            .replace("\"extraInProgress\": false", "\"extraInProgress\": true")
            .replace("\"isWorkingDay\": true", "\"isWorkingDay\": false")
        val plan = ReminderPlanner.plan(dashboard(today), nowMillis = at("2026-10-29", 1110))
        assertEquals(listOf("extra-running-2026-10-29"), plan.map { it.id })
        assertEquals(at("2026-10-29", 1100 + 180), plan.single().atMillis)
    }

    @Test
    fun skipsPastTimesDisabledRemindersAndPlannedLeave() {
        val upcoming = "[${row("2026-10-30")}, ${row("2026-11-01").replace("\"leaveType\": null", "\"leaveType\": \"leave\"")}]"
        val data = dashboard(row("2026-10-29"), upcoming)

        // Today's clock-in time (10:00) has passed; tomorrow's is still ahead; leave is skipped.
        val plan = ReminderPlanner.plan(data, nowMillis = at("2026-10-29", 700))
        assertEquals(listOf("clock-in-2026-10-30"), plan.map { it.id })

        val off = dashboard(row("2026-10-29"), upcoming, reminders = """false, "remindLeave": false, "remindClockOut": false""")
        assertTrue(ReminderPlanner.plan(off, nowMillis = at("2026-10-29", 0)).isEmpty())
    }
}
