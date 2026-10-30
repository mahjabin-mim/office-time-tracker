package app.vercel.officetimetracker.util

import java.time.LocalDate
import java.time.Month
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/** Formatting that matches the website (src/lib/time.ts), always in US English like the site. */
object Fmt {
    private val dayLabel = DateTimeFormatter.ofPattern("EEEE, MMMM d", Locale.US)
    private val shortDate = DateTimeFormatter.ofPattern("MMM d", Locale.US)
    private val weekday = DateTimeFormatter.ofPattern("EEE", Locale.US)
    private val monthLabel = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.US)

    /** "09:05 AM" or "09:05"; minutes past midnight wrap onto the clock face. */
    fun clock(minutes: Int, use24h: Boolean): String {
        val normalized = ((minutes % 1440) + 1440) % 1440
        val h = normalized / 60
        val m = normalized % 60
        if (use24h) return "${pad(h)}:${pad(m)}"
        val period = if (h < 12) "AM" else "PM"
        val h12 = if (h % 12 == 0) 12 else h % 12
        return "${pad(h12)}:${pad(m)} $period"
    }

    /** "HH:mm", the format the API takes for times. */
    fun hhmm(minutes: Int): String = "${pad(minutes / 60)}:${pad(minutes % 60)}"

    /** "8h 05m", "45m" or "-1h 10m". */
    fun duration(minutes: Int): String {
        val sign = if (minutes < 0) "-" else ""
        return sign + unsigned(abs(minutes))
    }

    fun duration(minutes: Double): String = duration(minutes.roundToInt())

    /** "+1h 05m", "-20m" or "0m". */
    fun signedDuration(minutes: Int): String {
        val sign = if (minutes > 0) "+" else if (minutes < 0) "-" else ""
        return sign + unsigned(abs(minutes))
    }

    /** "Friday, October 30". */
    fun dayLabel(dateKey: String): String = LocalDate.parse(dateKey).format(dayLabel)

    /** "Oct 30". */
    fun shortDate(dateKey: String): String = LocalDate.parse(dateKey).format(shortDate)

    /** "Fri". */
    fun weekday(dateKey: String): String = LocalDate.parse(dateKey).format(weekday)

    fun dayOfMonth(dateKey: String): String = LocalDate.parse(dateKey).dayOfMonth.toString()

    /** "October 2026" for a 0-indexed month. */
    fun monthLabel(year: Int, month: Int): String = YearMonth.of(year, month + 1).format(monthLabel)

    /** "Oct" for a 0-indexed month. */
    fun monthShort(month: Int): String = Month.of(month + 1).getDisplayName(TextStyle.SHORT, Locale.US)

    /** "8" or "8.5" hours, for the schedule fields (the website uses 0.25-hour steps). */
    fun hours(minutes: Int): String =
        String.format(Locale.US, "%.2f", minutes / 60.0).trimEnd('0').trimEnd('.')

    fun statusLabel(status: String): String = when (status) {
        "extra" -> "Extra"
        "less" -> "Less"
        "on-target" -> "On target"
        "in-progress" -> "In progress"
        "missing" -> "Missing"
        "incomplete" -> "Incomplete"
        "non-working" -> "Day off"
        "future" -> "Upcoming"
        "leave" -> "Leave"
        "not-tracked" -> "Not tracked"
        else -> status
    }

    fun leaveLabel(leaveType: String): String = when (leaveType) {
        "sick" -> "Sick leave"
        "holiday" -> "Holiday"
        else -> "Leave"
    }

    private fun unsigned(minutes: Int): String {
        val h = minutes / 60
        val m = minutes % 60
        return if (h == 0) "${m}m" else "${h}h ${pad(m)}m"
    }

    private fun pad(value: Int): String = value.toString().padStart(2, '0')
}
