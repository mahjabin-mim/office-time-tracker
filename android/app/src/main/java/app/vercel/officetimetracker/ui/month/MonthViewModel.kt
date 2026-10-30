package app.vercel.officetimetracker.ui.month

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.vercel.officetimetracker.data.ApiException
import app.vercel.officetimetracker.data.AppContainer
import app.vercel.officetimetracker.data.DayRow
import app.vercel.officetimetracker.data.MonthResponse
import app.vercel.officetimetracker.ui.components.Loadable
import app.vercel.officetimetracker.util.currentMonthIn
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.time.YearMonth

/** The website's monthly table filters (src/components/dashboard/MonthlyAttendance.tsx). */
enum class DayFilter(val label: String, val matches: (DayRow) -> Boolean) {
    All("All", { true }),
    Extra("Extra", { it.status == "extra" }),
    Less("Less", { it.status == "less" }),
    OnTarget("On target", { it.status == "on-target" }),
    Missing("Missing", { it.status == "missing" || it.status == "incomplete" }),
    Leave("Leave", { it.status == "leave" }),
    DayOff("Day off", { it.status == "non-working" }),
    Late("Late", { it.isLate }),
    ExtraHours("Extra hours", { it.extraMinutes != null }),
}

class MonthViewModel(private val app: AppContainer) : ViewModel() {
    var year by mutableIntStateOf(0)
        private set

    /** 0-indexed. */
    var month by mutableIntStateOf(0)
        private set

    var state by mutableStateOf(Loadable<MonthResponse>())
        private set

    var refreshing by mutableStateOf(false)
        private set

    var filter by mutableStateOf(DayFilter.All)

    private var job: Job? = null

    init {
        val current = current()
        year = current.year
        month = current.monthValue - 1
    }

    /** The website doesn't page past the current month, so neither does the app. */
    val canGoNext: Boolean get() = YearMonth.of(year, month + 1) < current()

    fun show(year: Int, month: Int) {
        if (year == this.year && month == this.month && state.data != null) return refresh()
        this.year = year
        this.month = month
        filter = DayFilter.All
        state = Loadable()
        refresh()
    }

    fun showCurrent() = current().let { show(it.year, it.monthValue - 1) }

    fun previous() = YearMonth.of(year, month + 1).minusMonths(1).let { show(it.year, it.monthValue - 1) }

    fun next() = YearMonth.of(year, month + 1).plusMonths(1).let { show(it.year, it.monthValue - 1) }

    fun refresh(pulled: Boolean = false) {
        job?.cancel()
        job = viewModelScope.launch {
            state = state.copy(loading = true, error = null)
            refreshing = pulled
            try {
                val data = app.api.month(year, month)
                data.schedule?.let { app.schedule.value = it }
                state = Loadable(data)
            } catch (e: ApiException) {
                state = state.copy(loading = false, error = e.message)
            } finally {
                refreshing = false
            }
        }
    }

    private fun current(): YearMonth = currentMonthIn(app.user.value?.timezone)
}
