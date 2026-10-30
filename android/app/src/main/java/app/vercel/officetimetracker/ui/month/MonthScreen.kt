package app.vercel.officetimetracker.ui.month

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.vercel.officetimetracker.data.DayRow
import app.vercel.officetimetracker.data.PeriodSummary
import app.vercel.officetimetracker.ui.components.AppCard
import app.vercel.officetimetracker.ui.components.DayRowItem
import app.vercel.officetimetracker.ui.components.InlineError
import app.vercel.officetimetracker.ui.components.LoadableContent
import app.vercel.officetimetracker.ui.components.PeriodSelector
import app.vercel.officetimetracker.ui.components.SectionTitle
import app.vercel.officetimetracker.ui.components.StatGrid
import app.vercel.officetimetracker.ui.components.StatTile
import app.vercel.officetimetracker.ui.theme.AppTheme
import app.vercel.officetimetracker.ui.theme.TabularNumbers
import app.vercel.officetimetracker.util.Fmt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MonthScreen(vm: MonthViewModel, contentPadding: PaddingValues, use24h: Boolean, onEditDay: (DayRow) -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(contentPadding)
    ) {
        Text(
            "Monthly",
            Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        PeriodSelector(
            label = Fmt.monthLabel(vm.year, vm.month),
            onPrevious = vm::previous,
            onNext = if (vm.canGoNext) vm::next else null,
            modifier = Modifier.padding(horizontal = 4.dp),
        )
        PullToRefreshBox(
            isRefreshing = vm.refreshing,
            onRefresh = { vm.refresh(pulled = true) },
            modifier = Modifier.weight(1f),
        ) {
            LoadableContent(vm.state, onRetry = { vm.refresh() }) { data ->
                val counts = DayFilter.entries.associateWith { f -> data.rows.count(f.matches) }
                // Chips with no matching days are hidden, like on the website.
                val filters = DayFilter.entries.filter { it == DayFilter.All || counts.getValue(it) > 0 }
                val filter = vm.filter.takeIf { it in filters } ?: DayFilter.All
                val rows = data.rows.filter(filter.matches)

                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    vm.state.error?.let { item { InlineError(it) } }
                    item { BalanceHero(data.summary, "Monthly balance") }
                    item { MonthStatGrid(data.summary) }
                    item { SectionTitle("Days", Modifier.padding(top = 8.dp)) }
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(filters) { f ->
                                FilterChip(
                                    selected = f == filter,
                                    onClick = { vm.filter = f },
                                    label = { Text(if (f == DayFilter.All) f.label else "${f.label} · ${counts.getValue(f)}") },
                                )
                            }
                        }
                    }
                    item {
                        AppCard {
                            if (rows.isEmpty()) {
                                Text("No days match this filter.", Modifier.padding(20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            rows.forEachIndexed { index, row ->
                                if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                DayRowItem(row, use24h, onClick = { onEditDay(row) })
                            }
                        }
                    }
                }
            }
        }
    }
}

/** The period's balance, large, with worked against expected underneath. */
@Composable
fun BalanceHero(summary: PeriodSummary, label: String) {
    val status = AppTheme.status
    val balance = summary.balanceMinutes
    AppCard {
        Column(Modifier.padding(20.dp)) {
            Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(6.dp))
            Text(
                Fmt.signedDuration(balance),
                style = MaterialTheme.typography.displaySmall.merge(TabularNumbers),
                fontWeight = FontWeight.SemiBold,
                color = if (balance >= 0) status.extra else status.less,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Worked ${Fmt.duration(summary.totalWorkedMinutes)} of ${Fmt.duration(summary.totalExpectedMinutes)} expected",
                style = MaterialTheme.typography.bodyMedium.merge(TabularNumbers),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MonthStatGrid(summary: PeriodSummary) {
    val status = AppTheme.status
    StatGrid(
        listOf(
            {
                StatTile(
                    "Days completed",
                    "${summary.daysCompletedCount + summary.daysOffWorkedCount}",
                    it,
                    hint = "${summary.workingDaysCount} working days",
                )
            },
            {
                StatTile(
                    "Missing",
                    "${summary.daysMissingCount}",
                    it,
                    valueColor = if (summary.daysMissingCount > 0) status.less else MaterialTheme.colorScheme.onSurface,
                )
            },
            { StatTile("Average / day", Fmt.duration(summary.averageMinutesPerDay), it, valueColor = MaterialTheme.colorScheme.primary) },
            { StatTile("Extra hours", Fmt.duration(summary.totalExtraHourMinutes), it, valueColor = status.extra) },
            { StatTile("Half days", "${summary.halfDaysCount}", it) },
            { StatTile("Leave & holidays", "${summary.leaveDaysCount}", it) },
            {
                StatTile(
                    "Late entries",
                    "${summary.lateEntriesCount}",
                    it,
                    valueColor = if (summary.lateEntriesCount > 0) status.less else MaterialTheme.colorScheme.onSurface,
                )
            },
        )
    )
}
