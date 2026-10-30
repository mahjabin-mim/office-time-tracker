package app.vercel.officetimetracker.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// Shapes returned by /api/mobile/* (src/lib/mobile-api.ts on the server).

val ApiJson = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    coerceInputValues = true
}

@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String,
    val timeFormat: String = "12h",
    val timezone: String? = null,
    val hasPassword: Boolean = true,
    val remindClockIn: Boolean = false,
    val remindLeave: Boolean = false,
    val remindClockOut: Boolean = false,
) {
    val uses24h: Boolean get() = timeFormat == "24h"
}

@Serializable
data class Schedule(
    val expectedDailyMinutes: Int,
    val halfDayMinutes: Int,
    val workStartMinutes: Int,
    val workEndMinutes: Int,
    /** 0 = Sunday … 6 = Saturday. */
    val workingDays: List<Int>,
    val lateAfterMinutes: Int? = null,
)

/** One calendar day, computed by the server against the user's schedule. */
@Serializable
data class DayRow(
    val dateKey: String,
    val entryMinutes: Int? = null,
    val outMinutes: Int? = null,
    val isHalfDay: Boolean = false,
    val leaveType: String? = null,
    val extraEntryMinutes: Int? = null,
    val extraOutMinutes: Int? = null,
    /** Completed extra-hours time, or the running total while a session is open today. */
    val extraMinutes: Int? = null,
    val extraInProgress: Boolean = false,
    val isLate: Boolean = false,
    val isToday: Boolean = false,
    val isFuture: Boolean = false,
    val isWorkingDay: Boolean = true,
    val status: String,
    val workedMinutes: Int? = null,
    val expectedMinutes: Int = 0,
    val differenceMinutes: Int? = null,
) {
    val hasTimes: Boolean get() = entryMinutes != null || outMinutes != null
    val hasRecord: Boolean get() = hasTimes || leaveType != null
    val inProgress: Boolean get() = status == "in-progress"

    /** Wall-clock minute at which the expected time is reached (src/lib/calendar.ts). */
    val leaveAtMinutes: Int? get() = entryMinutes?.let { it + expectedMinutes }

    /**
     * The same day [minutes] later, for screens that keep counting between refreshes. Only the
     * running parts move: the open regular day and an open extra-hours session.
     */
    fun advancedBy(minutes: Int): DayRow {
        if (minutes <= 0) return this
        return copy(
            workedMinutes = if (inProgress) workedMinutes?.plus(minutes) else workedMinutes,
            differenceMinutes = if (inProgress) differenceMinutes?.plus(minutes) else differenceMinutes,
            extraMinutes = if (extraInProgress) extraMinutes?.plus(minutes) else extraMinutes,
        )
    }
}

@Serializable
data class PeriodSummary(
    val balanceMinutes: Int = 0,
    val totalWorkedMinutes: Int = 0,
    val totalExpectedMinutes: Int = 0,
    val totalExtraMinutes: Int = 0,
    val totalLessMinutes: Int = 0,
    val totalExtraHourMinutes: Int = 0,
    val workingDaysCount: Int = 0,
    val daysCompletedCount: Int = 0,
    val daysMissingCount: Int = 0,
    val daysOffWorkedCount: Int = 0,
    val halfDaysCount: Int = 0,
    val leaveDaysCount: Int = 0,
    val lateEntriesCount: Int = 0,
    val averageMinutesPerDay: Double = 0.0,
)

@Serializable
data class MonthBreakdown(
    /** 0-indexed. */
    val month: Int,
    val summary: PeriodSummary,
    val hasData: Boolean = false,
)

@Serializable
data class ServerNow(
    val dateKey: String,
    val year: Int,
    /** 0-indexed. */
    val month: Int,
    val minutes: Int,
)

@Serializable
data class AuthResponse(val token: String, val user: User)

@Serializable
data class DashboardResponse(
    val user: User,
    val schedule: Schedule,
    val now: ServerNow,
    val today: DayRow,
    val monthSummary: PeriodSummary,
    /** Newest first. */
    val recent: List<DayRow> = emptyList(),
    /** The seven days after today, for clock-in reminders that skip planned leave. */
    val upcoming: List<DayRow> = emptyList(),
)

@Serializable
data class MonthResponse(
    val year: Int,
    val month: Int,
    val summary: PeriodSummary,
    val rows: List<DayRow>,
    val schedule: Schedule? = null,
)

@Serializable
data class YearResponse(
    val year: Int,
    val summary: PeriodSummary,
    val months: List<MonthBreakdown>,
)

@Serializable
data class SettingsResponse(val user: User, val schedule: Schedule)

@Serializable
internal data class ErrorBody(
    val error: String? = null,
    val fieldErrors: Map<String, String>? = null,
)

@Serializable
internal data class SuccessBody(val success: Boolean = false)
