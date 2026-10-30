package app.vercel.officetimetracker.util

import java.time.DateTimeException
import java.time.YearMonth
import java.time.ZoneId
import java.time.ZonedDateTime

// The server keeps every day in the user's own time zone (from their profile), not the phone's.

/** The user's time zone, or the phone's when it's missing or unknown. */
fun userZone(timezone: String?): ZoneId =
    timezone?.let {
        try {
            ZoneId.of(it)
        } catch (e: DateTimeException) {
            null
        }
    } ?: ZoneId.systemDefault()

/** Minutes since midnight right now, in the user's time zone. */
fun nowMinutesIn(timezone: String?): Int = ZonedDateTime.now(userZone(timezone)).let { it.hour * 60 + it.minute }

fun currentMonthIn(timezone: String?): YearMonth = YearMonth.now(userZone(timezone))
