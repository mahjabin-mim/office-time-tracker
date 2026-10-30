package app.vercel.officetimetracker.ui.year

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import app.vercel.officetimetracker.data.MonthBreakdown
import app.vercel.officetimetracker.data.YearResponse
import app.vercel.officetimetracker.ui.components.AppCard
import app.vercel.officetimetracker.ui.components.InlineError
import app.vercel.officetimetracker.ui.components.LoadableContent
import app.vercel.officetimetracker.ui.components.PeriodSelector
import app.vercel.officetimetracker.ui.components.SectionTitle
import app.vercel.officetimetracker.ui.components.StatGrid
import app.vercel.officetimetracker.ui.components.StatTile
import app.vercel.officetimetracker.ui.month.BalanceHero
import app.vercel.officetimetracker.ui.theme.AppTheme
import app.vercel.officetimetracker.ui.theme.TabularNumbers
import app.vercel.officetimetracker.util.Fmt
import kotlin.math.abs
import kotlin.math.max

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun YearScreen(vm: YearViewModel, contentPadding: PaddingValues, onOpenMonth: (year: Int, month: Int) -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(contentPadding)
    ) {
        Text(
            "Yearly overview",
            Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        PeriodSelector(
            label = vm.year.toString(),
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
                val current = vm.current()
                // The website's running total spans only tracked months: from the first one with
                // data through the current month (src/app/dashboard/yearly/page.tsx).
                val lastElapsedMonth = when {
                    data.year < current.year -> 11
                    data.year == current.year -> current.monthValue - 1
                    else -> -1
                }
                val firstTrackedMonth = data.months.firstOrNull { it.hasData }?.month ?: 12
                var running = 0
                val cumulative = data.months.map { m ->
                    if (m.month in firstTrackedMonth..lastElapsedMonth) {
                        running += m.summary.balanceMinutes
                        running
                    } else {
                        null
                    }
                }

                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    vm.state.error?.let { item { InlineError(it) } }
                    item { BalanceHero(data.summary, "Yearly balance") }
                    item { YearStats(data) }
                    item { SectionTitle("Balance by month", Modifier.padding(top = 8.dp)) }
                    item {
                        AppCard {
                            Column(Modifier.padding(16.dp)) {
                                BalanceChart(data.months, cumulative)
                                Spacer(Modifier.height(12.dp))
                                Legend()
                            }
                        }
                    }
                    item { SectionTitle("Months", Modifier.padding(top = 8.dp)) }
                    item {
                        AppCard {
                            data.months.filter { it.month <= lastElapsedMonth || it.hasData }.reversed().forEachIndexed { index, m ->
                                if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                MonthRow(data.year, m, onClick = { onOpenMonth(data.year, m.month) })
                            }
                            if (lastElapsedMonth < 0 && data.months.none { it.hasData }) {
                                Text("Nothing recorded for this year.", Modifier.padding(20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun YearStats(data: YearResponse) {
    val summary = data.summary
    val best = data.months.filter { it.hasData }.maxByOrNull { it.summary.balanceMinutes }
    StatGrid(
        listOf(
            { StatTile("Total worked", Fmt.duration(summary.totalWorkedMinutes), it) },
            { StatTile("Expected", Fmt.duration(summary.totalExpectedMinutes), it) },
            { StatTile("Average / day", Fmt.duration(summary.averageMinutesPerDay), it, valueColor = MaterialTheme.colorScheme.primary) },
            {
                StatTile(
                    "Days completed",
                    "${summary.daysCompletedCount}",
                    it,
                    hint = best?.let { b -> "Best month: ${Fmt.monthShort(b.month)}" },
                )
            },
            { StatTile("Half days", "${summary.halfDaysCount}", it) },
            { StatTile("Leave & holidays", "${summary.leaveDaysCount}", it) },
        )
    )
}

@Composable
private fun MonthRow(year: Int, m: MonthBreakdown, onClick: () -> Unit) {
    val status = AppTheme.status
    val balance = m.summary.balanceMinutes
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(Fmt.monthLabel(year, m.month).substringBefore(' '), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
            Text(
                "${Fmt.duration(m.summary.totalWorkedMinutes)} worked · ${m.summary.daysCompletedCount + m.summary.daysOffWorkedCount} days",
                style = MaterialTheme.typography.bodySmall.merge(TabularNumbers),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            if (m.hasData) Fmt.signedDuration(balance) else "—",
            style = MaterialTheme.typography.titleSmall.merge(TabularNumbers),
            fontWeight = FontWeight.SemiBold,
            color = when {
                !m.hasData || balance == 0 -> MaterialTheme.colorScheme.onSurfaceVariant
                balance > 0 -> status.extra
                else -> status.less
            },
        )
    }
}

/** Monthly balance bars around a zero line, with the running total drawn over them. */
@Composable
private fun BalanceChart(months: List<MonthBreakdown>, cumulative: List<Int?>) {
    val extra = AppTheme.status.extra
    val less = AppTheme.status.less
    val line = MaterialTheme.colorScheme.primary
    val axis = MaterialTheme.colorScheme.outlineVariant
    val labelStyle = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)
    val measurer = rememberTextMeasurer()

    Canvas(
        Modifier
            .fillMaxWidth()
            .height(190.dp)
    ) {
        val labelHeight = 20.dp.toPx()
        val chartHeight = size.height - labelHeight
        val zeroY = chartHeight / 2
        val largest = (months.map { abs(it.summary.balanceMinutes) } + cumulative.filterNotNull().map { abs(it) }).maxOrNull() ?: 0
        val scale = (chartHeight / 2 - 6.dp.toPx()) / max(largest, 60)
        val slot = size.width / 12
        val barWidth = slot * 0.55f

        drawLine(axis, Offset(0f, zeroY), Offset(size.width, zeroY), strokeWidth = 1.dp.toPx())
        months.forEachIndexed { i, m ->
            val center = slot * i + slot / 2
            val value = m.summary.balanceMinutes
            if (value != 0) {
                val height = abs(value) * scale
                drawRoundRect(
                    color = (if (value > 0) extra else less).copy(alpha = if (m.hasData) 0.85f else 0.35f),
                    topLeft = Offset(center - barWidth / 2, if (value > 0) zeroY - height else zeroY),
                    size = Size(barWidth, height),
                    cornerRadius = CornerRadius(3.dp.toPx()),
                )
            }
            val label = measurer.measure(Fmt.monthShort(i).take(1), labelStyle)
            drawText(label, topLeft = Offset(center - label.size.width / 2f, chartHeight + (labelHeight - label.size.height) / 2f))
        }

        val points = cumulative.mapIndexedNotNull { i, v -> v?.let { Offset(slot * i + slot / 2, zeroY - it * scale) } }
        if (points.size > 1) {
            val path = Path().apply {
                moveTo(points.first().x, points.first().y)
                points.drop(1).forEach { lineTo(it.x, it.y) }
            }
            drawPath(path, line, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
        points.forEach { drawCircle(line, 3.dp.toPx(), it) }
    }
}

@Composable
private fun Legend() {
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
        LegendItem(AppTheme.status.extra, "Month balance", RoundedCornerShape(2.dp))
        LegendItem(MaterialTheme.colorScheme.primary, "Running total", CircleShape)
    }
}

@Composable
private fun LegendItem(color: Color, label: String, shape: androidx.compose.ui.graphics.Shape) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = shape, color = color) { Box(Modifier.size(10.dp)) }
        Spacer(Modifier.width(6.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
