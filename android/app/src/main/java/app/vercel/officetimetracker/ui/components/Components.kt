package app.vercel.officetimetracker.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.vercel.officetimetracker.data.DayRow
import app.vercel.officetimetracker.ui.theme.AppTheme
import app.vercel.officetimetracker.ui.theme.TabularNumbers
import app.vercel.officetimetracker.util.Fmt

/** A screen's data, kept on screen while a refresh runs. */
data class Loadable<T>(
    val data: T? = null,
    val loading: Boolean = false,
    val error: String? = null,
)

@Composable
fun <T> LoadableContent(state: Loadable<T>, onRetry: () -> Unit, content: @Composable (T) -> Unit) {
    val data = state.data
    when {
        data != null -> content(data)
        state.error != null -> ErrorState(state.error, onRetry)
        else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    }
}

@Composable
fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Filled.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(12.dp))
        Text(message, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) { Text("Try again") }
    }
}

@Composable
fun InlineError(message: String, modifier: Modifier = Modifier) {
    val color = AppTheme.status.less
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = color.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.3f)),
    ) {
        Text(message, Modifier.padding(horizontal = 14.dp, vertical = 10.dp), color = color, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun Note(text: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = color.copy(alpha = 0.1f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.3f)),
    ) {
        Text(text, Modifier.padding(horizontal = 14.dp, vertical = 10.dp), color = color, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun AppCard(modifier: Modifier = Modifier, onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    val color = MaterialTheme.colorScheme.surfaceContainerLow
    val border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    if (onClick != null) {
        Surface(onClick = onClick, modifier = modifier.fillMaxWidth(), shape = shape, color = color, border = border) {
            Column(content = content)
        }
    } else {
        Surface(modifier = modifier.fillMaxWidth(), shape = shape, color = color, border = border) {
            Column(content = content)
        }
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text.uppercase(),
            Modifier.weight(1f),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        action?.invoke()
    }
}

@Composable
fun statusColor(status: String): Color {
    val s = AppTheme.status
    return when (status) {
        "extra" -> s.extra
        "less", "missing" -> s.less
        "in-progress" -> MaterialTheme.colorScheme.primary
        "incomplete" -> s.warning
        "leave" -> s.leave
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
}

@Composable
fun Pill(text: String, color: Color, modifier: Modifier = Modifier) {
    Surface(modifier, shape = RoundedCornerShape(50), color = color.copy(alpha = 0.14f)) {
        Text(
            text,
            Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            color = color,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
        )
    }
}

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) = Pill(Fmt.statusLabel(status), statusColor(status), modifier)

@Composable
fun StatTile(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    hint: String? = null,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    AppCard(modifier) {
        Column(Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            Spacer(Modifier.height(6.dp))
            Text(
                value,
                style = MaterialTheme.typography.titleLarge.merge(TabularNumbers),
                fontWeight = FontWeight.SemiBold,
                color = valueColor,
                maxLines = 1,
            )
            if (hint != null) {
                Spacer(Modifier.height(2.dp))
                Text(
                    hint,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/** Two tiles per row. */
@Composable
fun StatGrid(tiles: List<@Composable (Modifier) -> Unit>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        tiles.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { it(Modifier.weight(1f)) }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun ProgressRing(
    progress: Float,
    color: Color,
    modifier: Modifier = Modifier,
    strokeWidth: Dp = 10.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    val track = MaterialTheme.colorScheme.surfaceContainerHighest
    val animated by animateFloatAsState(progress.coerceIn(0f, 1f), label = "progress")
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            val stroke = Stroke(strokeWidth.toPx(), cap = StrokeCap.Round)
            val diameter = size.minDimension - stroke.width
            val arcSize = Size(diameter, diameter)
            val topLeft = Offset((size.width - diameter) / 2, (size.height - diameter) / 2)
            drawArc(track, 0f, 360f, false, topLeft, arcSize, style = stroke)
            if (animated > 0f) drawArc(color, -90f, 360f * animated, false, topLeft, arcSize, style = stroke)
        }
        content()
    }
}

@Composable
fun PeriodSelector(label: String, onPrevious: () -> Unit, onNext: (() -> Unit)?, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = onPrevious) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Previous")
        }
        Text(label, Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        IconButton(onClick = { onNext?.invoke() }, enabled = onNext != null) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Next")
        }
    }
}

/** One day in a list: date, times, tags, status and difference. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DayRowItem(row: DayRow, use24h: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val status = AppTheme.status
    Row(
        modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.width(44.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                Fmt.dayOfMonth(row.dateKey),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (row.isToday) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            )
            Text(Fmt.weekday(row.dateKey), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            val main = when {
                row.leaveType != null -> Fmt.leaveLabel(row.leaveType)
                row.hasTimes -> {
                    val entry = row.entryMinutes?.let { Fmt.clock(it, use24h) } ?: "—"
                    val out = row.outMinutes?.let { Fmt.clock(it, use24h) } ?: if (row.inProgress) "now" else "—"
                    "$entry → $out"
                }
                row.status == "non-working" -> "Day off"
                row.isFuture -> "Upcoming"
                row.status == "not-tracked" -> "Not tracked"
                else -> "No times recorded"
            }
            Text(main, style = MaterialTheme.typography.bodyMedium.merge(TabularNumbers), fontWeight = FontWeight.Medium, maxLines = 1)
            val details = buildList {
                row.workedMinutes?.let { add("${Fmt.duration(it)} worked") }
            }
            val hasTags = row.isHalfDay || row.isLate || row.extraMinutes != null || details.isNotEmpty()
            if (hasTags) {
                Spacer(Modifier.height(4.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    itemVerticalAlignment = Alignment.CenterVertically,
                ) {
                    details.forEach {
                        Text(it, style = MaterialTheme.typography.bodySmall.merge(TabularNumbers), color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    }
                    if (row.isHalfDay) Pill("Half day", status.halfDay)
                    if (row.isLate) Pill("Late", status.warning)
                    row.extraMinutes?.let { Pill("+${Fmt.duration(it)} extra hrs", status.extra) }
                }
            }
        }
        Spacer(Modifier.width(8.dp))
        Column(horizontalAlignment = Alignment.End) {
            StatusBadge(row.status)
            row.differenceMinutes?.takeIf { row.status != "in-progress" }?.let {
                Spacer(Modifier.height(4.dp))
                Text(
                    Fmt.signedDuration(it),
                    style = MaterialTheme.typography.bodySmall.merge(TabularNumbers),
                    fontWeight = FontWeight.SemiBold,
                    color = if (it < 0) status.less else if (it > 0) status.extra else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

/** A tappable time value that opens a clock picker; "Now" fills in the current time. */
@Composable
fun TimeField(
    label: String,
    minutes: Int?,
    onChange: (Int?) -> Unit,
    use24h: Boolean,
    modifier: Modifier = Modifier,
    nowMinutes: (() -> Int)? = null,
    error: String? = null,
    defaultMinutes: Int = 9 * 60,
    clearable: Boolean = true,
) {
    var picking by remember { mutableStateOf(false) }
    val borderColor = if (error != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(6.dp))
        Surface(
            onClick = { picking = true },
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLowest,
            border = BorderStroke(1.dp, borderColor),
        ) {
            Row(Modifier.padding(start = 14.dp, end = 4.dp).height(48.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    minutes?.let { Fmt.clock(it, use24h) } ?: "Set time",
                    Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyLarge.merge(TabularNumbers),
                    color = if (minutes == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                )
                if (minutes != null && clearable) {
                    IconButton(onClick = { onChange(null) }, modifier = Modifier.size(40.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Clear $label", Modifier.size(18.dp))
                    }
                }
            }
        }
        if (nowMinutes != null) {
            TextButton(onClick = { onChange(nowMinutes()) }) { Text("Now") }
        }
        if (error != null) {
            Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
    if (picking) {
        TimePickerDialog(
            initial = minutes ?: defaultMinutes,
            use24h = use24h,
            onDismiss = { picking = false },
            onConfirm = {
                picking = false
                onChange(it)
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimePickerDialog(initial: Int, use24h: Boolean, onDismiss: () -> Unit, onConfirm: (Int) -> Unit) {
    val state = rememberTimePickerState(initialHour = initial / 60, initialMinute = initial % 60, is24Hour = use24h)
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            Modifier.padding(24.dp),
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
        ) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Select time", Modifier.fillMaxWidth(), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(20.dp))
                TimePicker(state)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    TextButton(onClick = { onConfirm(state.hour * 60 + state.minute) }) { Text("OK") }
                }
            }
        }
    }
}
