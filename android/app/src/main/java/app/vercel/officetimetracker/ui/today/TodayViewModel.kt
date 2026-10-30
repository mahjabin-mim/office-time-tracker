package app.vercel.officetimetracker.ui.today

import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.vercel.officetimetracker.data.ApiException
import app.vercel.officetimetracker.data.AppContainer
import app.vercel.officetimetracker.data.DashboardResponse
import app.vercel.officetimetracker.ui.components.Loadable
import app.vercel.officetimetracker.util.Fmt
import app.vercel.officetimetracker.util.nowMinutesIn
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class TodayViewModel(private val app: AppContainer) : ViewModel() {
    var state by mutableStateOf(Loadable<DashboardResponse>())
        private set

    /** True only for a pull-to-refresh, so background reloads don't flash the indicator. */
    var refreshing by mutableStateOf(false)
        private set

    /** "day" or "extra" while that clock request runs. */
    var clocking by mutableStateOf<String?>(null)
        private set

    /** When the data arrived, on the elapsed-time clock; the screen keeps counting from here. */
    var loadedAt by mutableLongStateOf(0L)
        private set

    private var job: Job? = null

    fun refresh(pulled: Boolean = false) {
        job?.cancel()
        job = viewModelScope.launch {
            state = state.copy(loading = true, error = null)
            refreshing = pulled
            try {
                val data = app.api.dashboard()
                app.setUser(data.user)
                app.schedule.value = data.schedule
                app.reminders.schedule(data)
                loadedAt = SystemClock.elapsedRealtime()
                state = Loadable(data)
            } catch (e: ApiException) {
                state = state.copy(loading = false, error = e.message)
            } finally {
                refreshing = false
            }
        }
    }

    /** Clocks the regular day (or the extra-hours session) in or out, and says what happened. */
    fun clock(extra: Boolean, onMessage: (String) -> Unit) {
        val data = state.data ?: return
        if (clocking != null) return
        val starting = if (extra) data.today.extraEntryMinutes == null else data.today.entryMinutes == null
        clocking = if (extra) "extra" else "day"
        viewModelScope.launch {
            try {
                if (extra) app.api.clockExtra() else app.api.clock()
                val time = Fmt.clock(nowMinutesIn(data.user.timezone), data.user.uses24h)
                onMessage(
                    when {
                        extra && starting -> "Extra hours started at $time"
                        extra -> "Extra hours ended at $time"
                        starting -> "Clocked in at $time. Have a great day!"
                        else -> "Clocked out at $time"
                    }
                )
                app.changed()
            } catch (e: ApiException) {
                onMessage(e.message.orEmpty())
            } finally {
                clocking = null
            }
        }
    }
}
