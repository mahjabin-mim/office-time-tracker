package app.vercel.officetimetracker

import app.vercel.officetimetracker.util.Fmt
import org.junit.Assert.assertEquals
import org.junit.Test

/** Same outputs as the website's src/lib/time.ts. */
class FmtTest {
    @Test
    fun clock() {
        assertEquals("09:05 AM", Fmt.clock(9 * 60 + 5, use24h = false))
        assertEquals("12:00 AM", Fmt.clock(0, use24h = false))
        assertEquals("12:30 PM", Fmt.clock(12 * 60 + 30, use24h = false))
        assertEquals("11:59 PM", Fmt.clock(1439, use24h = false))
        assertEquals("18:45", Fmt.clock(18 * 60 + 45, use24h = true))
        // Leave times can run past midnight.
        assertEquals("01:00", Fmt.clock(1440 + 60, use24h = true))
    }

    @Test
    fun durations() {
        assertEquals("8h 00m", Fmt.duration(480))
        assertEquals("45m", Fmt.duration(45))
        assertEquals("-1h 05m", Fmt.duration(-65))
        assertEquals("8h 31m", Fmt.duration(510.6))
        assertEquals("+1h 05m", Fmt.signedDuration(65))
        assertEquals("-20m", Fmt.signedDuration(-20))
        assertEquals("0m", Fmt.signedDuration(0))
    }

    @Test
    fun apiTimeAndHours() {
        assertEquals("09:05", Fmt.hhmm(9 * 60 + 5))
        assertEquals("8", Fmt.hours(480))
        assertEquals("8.5", Fmt.hours(510))
        assertEquals("4.25", Fmt.hours(255))
    }

    @Test
    fun dates() {
        assertEquals("Friday, October 30", Fmt.dayLabel("2026-10-30"))
        assertEquals("Oct 30", Fmt.shortDate("2026-10-30"))
        assertEquals("Fri", Fmt.weekday("2026-10-30"))
        assertEquals("October 2026", Fmt.monthLabel(2026, 9))
        assertEquals("Jan", Fmt.monthShort(0))
    }
}
