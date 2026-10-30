package app.vercel.officetimetracker.ui.year

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.vercel.officetimetracker.data.ApiException
import app.vercel.officetimetracker.data.AppContainer
import app.vercel.officetimetracker.data.YearResponse
import app.vercel.officetimetracker.ui.components.Loadable
import app.vercel.officetimetracker.util.currentMonthIn
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.time.YearMonth

class YearViewModel(private val app: AppContainer) : ViewModel() {
    var year by mutableIntStateOf(current().year)
        private set

    var state by mutableStateOf(Loadable<YearResponse>())
        private set

    var refreshing by mutableStateOf(false)
        private set

    private var job: Job? = null

    val canGoNext: Boolean get() = year < current().year

    fun previous() = show(year - 1)

    fun next() = show(year + 1)

    private fun show(year: Int) {
        this.year = year
        state = Loadable()
        refresh()
    }

    fun refresh(pulled: Boolean = false) {
        job?.cancel()
        job = viewModelScope.launch {
            state = state.copy(loading = true, error = null)
            refreshing = pulled
            try {
                state = Loadable(app.api.year(year))
            } catch (e: ApiException) {
                state = state.copy(loading = false, error = e.message)
            } finally {
                refreshing = false
            }
        }
    }

    fun current(): YearMonth = currentMonthIn(app.user.value?.timezone)
}
