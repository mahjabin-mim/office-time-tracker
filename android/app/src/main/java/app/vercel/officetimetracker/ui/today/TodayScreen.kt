package app.vercel.officetimetracker.ui.today

import android.os.SystemClock
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.vercel.officetimetracker.data.DashboardResponse
import app.vercel.officetimetracker.data.DayRow
import app.vercel.officetimetracker.ui.components.AppCard
import app.vercel.officetimetracker.ui.components.DayRowItem
import app.vercel.officetimetracker.ui.components.InlineError
import app.vercel.officetimetracker.ui.components.LoadableContent
import app.vercel.officetimetracker.ui.components.Pill
import app.vercel.officetimetracker.ui.components.ProgressRing
import app.vercel.officetimetracker.ui.components.SectionTitle
import app.vercel.officetimetracker.ui.components.StatGrid
import app.vercel.officetimetracker.ui.components.StatTile
import app.vercel.officetimetracker.ui.components.StatusBadge
import app.vercel.officetimetracker.ui.theme.AppTheme
import app.vercel.officetimetracker.ui.theme.TabularNumbers
import app.vercel.officetimetracker.util.Fmt
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayScreen(
    vm: TodayViewModel,
    contentPadding: PaddingValues,
    onEditDay: (DayRow) -> Unit,
    onEditExtra: (DayRow) -> Unit,
    onOpenMonth: () -> Unit,
    showMessage: (String) -> Unit,
) {
    PullToRefreshBox(
        isRefreshing = vm.refreshing,
        onRefresh = { vm.refresh(pulled = true) },
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding),
    ) {
        LoadableContent(vm.state, onRetry = { vm.refresh() }) { data ->
            // Keep the running times moving between refreshes.
            val tick by produceState(SystemClock.elapsedRealtime()) {
                while (true) {
                    delay(15_000)
                    value = SystemClock.elapsedRealtime()
                }
            }
            val elapsed = ((tick - vm.loadedAt) / 60_000).toInt().coerceAtLeast(0)
            val nowMinutes = data.now.minutes + elapsed
            LaunchedEffect(nowMinutes >= 1440) {
                if (nowMinutes >= 1440) vm.refresh() // A new day started.
            }
            val today = data.today.advancedBy(elapsed)
            val use24h = data.user.uses24h

            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item { Greeting(data, nowMinutes) }
                vm.state.error?.let { item { InlineError(it) } }
                item { SectionTitle("Today's time", Modifier.padding(top = 8.dp)) }
                item {
                    TodayCard(
                        row = today,
                        use24h = use24h,
                        clocking = vm.clocking,
                        onClock = { vm.clock(extra = false, onMessage = showMessage) },
                        onEdit = { onEditDay(data.today) },
                    )
                }
                item {
                    ExtraHoursCard(
                        row = today,
                        use24h = use24h,
                        clocking = vm.clocking,
                        onClock = { vm.clock(extra = true, onMessage = showMessage) },
                        onEdit = { onEditExtra(data.today) },
                    )
                }
                item {
                    SectionTitle("This month", Modifier.padding(top = 8.dp)) {
                        TextButton(onClick = onOpenMonth) { Text("View details") }
                    }
                }
                item { MonthStats(data) }
                item { SectionTitle("Recent attendance", Modifier.padding(top = 8.dp)) }
                item { RecentList(data.recent, use24h, onEditDay) }
            }
        }
    }
}

@Composable
private fun Greeting(data: DashboardResponse, nowMinutes: Int) {
    val hour = nowMinutes / 60
    val greeting = if (hour < 12) "Good morning" else if (hour < 18) "Good afternoon" else "Good evening"
    Column {
        Text(
            "$greeting, ${data.user.name.substringBefore(' ')} 👋",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Text(Fmt.dayLabel(data.now.dateKey), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun TodayCard(
    row: DayRow,
    use24h: Boolean,
    clocking: String?,
    onClock: () -> Unit,
    onEdit: () -> Unit,
) {
    val leaveType = row.leaveType
    AppCard {
        when {
            leaveType != null -> EmptyDay(
                title = "${Fmt.leaveLabel(leaveType)} today",
                body = "Enjoy it. Nothing is expected from you today.",
            ) {
                OutlinedButton(onClick = onEdit) {
                    ButtonIcon(Icons.Filled.Edit)
                    Text("Edit day")
                }
            }

            !row.hasTimes -> {
                val dayOff = !row.isWorkingDay
                EmptyDay(
                    title = if (dayOff) "It's your day off" else "Ready to start your day?",
                    body = if (dayOff) {
                        "Nothing is expected today. If you do work, all of it counts as extra time."
                    } else {
                        "Clock in with one tap, or add your times manually."
                    },
                ) {
                    ClockButton(
                        label = if (dayOff) "Clock in anyway" else "Clock in",
                        icon = Icons.Filled.PlayArrow,
                        busy = clocking == "day",
                        tonal = dayOff,
                        onClick = onClock,
                        modifier = if (dayOff) Modifier else Modifier.fillMaxWidth().height(52.dp),
                    )
                    TextButton(onClick = onEdit) {
                        Text(if (dayOff) "Add manually" else "Add manually or mark leave")
                    }
                }
            }

            else -> DayInProgress(row, use24h, clocking, onClock, onEdit)
        }
    }
}

@Composable
private fun EmptyDay(title: String, body: String, actions: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(4.dp))
        Text(body, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(16.dp))
        actions()
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DayInProgress(row: DayRow, use24h: Boolean, clocking: String?, onClock: () -> Unit, onEdit: () -> Unit) {
    val status = AppTheme.status
    val inProgress = row.inProgress
    val worked = row.workedMinutes ?: 0
    val leaveAt = if (row.expectedMinutes > 0) row.leaveAtMinutes else null
    val ringColor = when {
        inProgress -> MaterialTheme.colorScheme.primary
        (row.differenceMinutes ?: 0) < 0 -> status.less
        else -> status.extra
    }

    Column(Modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Today — ${Fmt.shortDate(row.dateKey)}",
                Modifier.weight(1f),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            StatusBadge(row.status)
        }
        if ((row.isHalfDay && row.isWorkingDay) || !row.isWorkingDay) {
            Spacer(Modifier.height(6.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (row.isHalfDay && row.isWorkingDay) Pill("Half day", status.halfDay)
                if (!row.isWorkingDay) Pill("Day off: all extra", status.warning)
            }
        }
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProgressRing(
                progress = if (row.expectedMinutes > 0) worked / row.expectedMinutes.toFloat() else 1f,
                color = ringColor,
                modifier = Modifier.size(132.dp),
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        Fmt.duration(worked),
                        style = MaterialTheme.typography.titleLarge.merge(TabularNumbers),
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        if (row.expectedMinutes > 0) "of ${Fmt.duration(row.expectedMinutes)}" else "all extra",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.width(20.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Stat("Entry", row.entryMinutes?.let { Fmt.clock(it, use24h) } ?: "—")
                Stat("Out", row.outMinutes?.let { Fmt.clock(it, use24h) } ?: "—")
                if (inProgress && leaveAt != null) {
                    Stat("Leave at", Fmt.clock(leaveAt, use24h), MaterialTheme.colorScheme.primary)
                }
                val diff = row.differenceMinutes
                val remaining = (row.expectedMinutes - worked).coerceAtLeast(0)
                when {
                    inProgress && remaining > 0 -> Stat("Remaining", Fmt.duration(remaining))
                    inProgress -> Stat("Extra so far", Fmt.signedDuration(worked - row.expectedMinutes), status.extra)
                    diff != null -> Stat("Balance", Fmt.signedDuration(diff), if (diff < 0) status.less else status.extra)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
            if (inProgress) {
                TextButton(onClick = onEdit) { Text("Edit") }
                Spacer(Modifier.width(8.dp))
                ClockButton("Clock out", Icons.AutoMirrored.Filled.ExitToApp, busy = clocking == "day", onClick = onClock)
            } else {
                OutlinedButton(onClick = onEdit) {
                    ButtonIcon(Icons.Filled.Edit)
                    Text("Edit")
                }
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: String, color: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface) {
    Column {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium.merge(TabularNumbers), fontWeight = FontWeight.SemiBold, color = color)
    }
}

@Composable
private fun ExtraHoursCard(row: DayRow, use24h: Boolean, clocking: String?, onClock: () -> Unit, onEdit: () -> Unit) {
    val extraColor = AppTheme.status.extra
    val start = row.extraEntryMinutes
    val end = row.extraOutMinutes
    AppCard {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(12.dp), color = extraColor.copy(alpha = 0.15f)) {
                    Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Add, contentDescription = null, tint = extraColor, modifier = Modifier.size(18.dp))
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Extra hours", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Text(
                        if (start == null) {
                            "Working extra today? Start a session. Every minute counts as extra."
                        } else {
                            val endLabel = end?.let { Fmt.clock(it, use24h) } ?: "running"
                            "${Fmt.clock(start, use24h)} → $endLabel" + (row.extraMinutes?.let { " · ${Fmt.duration(it)}" } ?: "")
                        },
                        style = MaterialTheme.typography.bodySmall.merge(TabularNumbers),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onEdit) { Text(if (start == null) "Add manually" else "Edit") }
                when {
                    start == null -> {
                        Spacer(Modifier.width(8.dp))
                        ClockButton("Start extra hours", Icons.Filled.PlayArrow, busy = clocking == "extra", tonal = true, onClick = onClock)
                    }
                    end == null -> {
                        Spacer(Modifier.width(8.dp))
                        ClockButton("End extra hours", Icons.Filled.Check, busy = clocking == "extra", onClick = onClock)
                    }
                }
            }
        }
    }
}

@Composable
private fun MonthStats(data: DashboardResponse) {
    val summary = data.monthSummary
    val status = AppTheme.status
    val late = data.schedule.lateAfterMinutes
    StatGrid(
        listOf(
            {
                StatTile(
                    "Monthly balance",
                    Fmt.signedDuration(summary.balanceMinutes),
                    it,
                    hint = if (summary.balanceMinutes >= 0) "Extra time this month" else "Less time this month",
                    valueColor = if (summary.balanceMinutes >= 0) status.extra else status.less,
                )
            },
            {
                StatTile(
                    "Total worked",
                    Fmt.duration(summary.totalWorkedMinutes),
                    it,
                    hint = "${summary.daysCompletedCount + summary.daysOffWorkedCount} days completed",
                )
            },
            {
                StatTile("Expected", Fmt.duration(summary.totalExpectedMinutes), it, hint = "${summary.workingDaysCount} working days")
            },
            {
                StatTile(
                    "Average / day",
                    Fmt.duration(summary.averageMinutesPerDay),
                    it,
                    hint = "Across completed days",
                    valueColor = MaterialTheme.colorScheme.primary,
                )
            },
            {
                StatTile(
                    "Late entries",
                    summary.lateEntriesCount.toString(),
                    it,
                    hint = if (late != null) "After ${Fmt.clock(late, data.user.uses24h)}" else "Set a late time in Settings",
                    valueColor = if (summary.lateEntriesCount > 0) status.less else MaterialTheme.colorScheme.onSurface,
                )
            },
        )
    )
}

@Composable
private fun RecentList(rows: List<DayRow>, use24h: Boolean, onEditDay: (DayRow) -> Unit) {
    AppCard {
        if (rows.isEmpty()) {
            Text(
                "No attendance yet. Clock in to get started.",
                Modifier.padding(20.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        rows.forEachIndexed { index, row ->
            if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            DayRowItem(row, use24h, onClick = { onEditDay(row) })
        }
    }
}

@Composable
private fun ButtonIcon(icon: ImageVector) {
    Icon(icon, contentDescription = null, Modifier.size(ButtonDefaults.IconSize))
    Spacer(Modifier.width(ButtonDefaults.IconSpacing))
}

@Composable
private fun ClockButton(
    label: String,
    icon: ImageVector,
    busy: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tonal: Boolean = false,
) {
    val content: @Composable () -> Unit = {
        if (busy) {
            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
        } else {
            ButtonIcon(icon)
            Text(label)
        }
    }
    if (tonal) {
        FilledTonalButton(onClick = onClick, enabled = !busy, modifier = modifier) { content() }
    } else {
        Button(onClick = onClick, enabled = !busy, modifier = modifier) { content() }
    }
}
