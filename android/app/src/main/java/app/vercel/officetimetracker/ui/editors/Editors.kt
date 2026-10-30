package app.vercel.officetimetracker.ui.editors

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.vercel.officetimetracker.data.ApiException
import app.vercel.officetimetracker.data.AppContainer
import app.vercel.officetimetracker.data.DayRow
import app.vercel.officetimetracker.ui.components.InlineError
import app.vercel.officetimetracker.ui.components.Note
import app.vercel.officetimetracker.ui.components.TimeField
import app.vercel.officetimetracker.ui.theme.AppTheme
import app.vercel.officetimetracker.ui.theme.TabularNumbers
import app.vercel.officetimetracker.util.Fmt
import app.vercel.officetimetracker.util.nowMinutesIn
import kotlinx.coroutines.launch

/** State and plumbing shared by both editors: one request at a time, errors, and closing on success. */
private class EditorState {
    var busy by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var fieldErrors by mutableStateOf<Map<String, String>>(emptyMap())
    var confirmingDelete by mutableStateOf(false)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditorSheet(
    title: String,
    row: DayRow,
    onDismiss: () -> Unit,
    content: @Composable ColumnScope.(run: (suspend () -> Unit, String) -> Unit, state: EditorState) -> Unit,
    app: AppContainer,
    onDone: (String) -> Unit,
) {
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val state = remember { EditorState() }

    // Runs a change, then refreshes every screen and closes with [message].
    val run: (suspend () -> Unit, String) -> Unit = { action, message ->
        state.busy = true
        state.error = null
        state.fieldErrors = emptyMap()
        scope.launch {
            try {
                action()
                app.changed()
                sheet.hide()
                onDone(message)
            } catch (e: ApiException) {
                state.fieldErrors = e.fieldErrors
                state.error = e.message.takeIf { e.fieldErrors.isEmpty() }
                state.busy = false
            }
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet) {
        Column(
            Modifier
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Column {
                Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text(Fmt.dayLabel(row.dateKey), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            state.error?.let { InlineError(it) }
            content(run, state)
        }
    }
}

@Composable
private fun PrimaryButton(label: String, busy: Boolean, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = !busy, modifier = Modifier
        .fillMaxWidth()
        .height(48.dp)) {
        if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text(label)
    }
}

/** "Clear day" with an inline confirmation, like the website's dialog. */
@Composable
private fun DeleteRow(label: String, question: String, confirmLabel: String, state: EditorState, onConfirm: () -> Unit) {
    val danger = MaterialTheme.colorScheme.error
    if (state.confirmingDelete) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(question, Modifier.weight(1f), color = danger, style = MaterialTheme.typography.bodyMedium)
            TextButton(onClick = { state.confirmingDelete = false }, enabled = !state.busy) { Text("Cancel") }
            TextButton(
                onClick = onConfirm,
                enabled = !state.busy,
                colors = ButtonDefaults.textButtonColors(contentColor = danger),
            ) { Text(confirmLabel) }
        }
    } else {
        TextButton(
            onClick = { state.confirmingDelete = true },
            enabled = !state.busy,
            colors = ButtonDefaults.textButtonColors(contentColor = danger),
        ) { Text(label) }
    }
}

/** Edits a day's entry and out times, or marks it as leave or a holiday. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DayEditorSheet(
    app: AppContainer,
    row: DayRow,
    use24h: Boolean,
    onDismiss: () -> Unit,
    onDone: (String) -> Unit,
    onEditExtra: () -> Unit,
) {
    val schedule by app.schedule.collectAsStateWithLifecycle()
    val user by app.user.collectAsStateWithLifecycle()
    // Future days can only be planned as leave. Legacy "sick" days open as plain leave.
    val types = if (row.isFuture) listOf("leave", "holiday") else listOf("work", "leave", "holiday")
    var dayType by rememberSaveable {
        mutableStateOf(row.leaveType?.let { if (it == "sick") "leave" else it } ?: if (row.isFuture) "leave" else "work")
    }
    var entry by rememberSaveable { mutableStateOf(row.entryMinutes) }
    var out by rememberSaveable { mutableStateOf(row.outMinutes) }
    var halfDay by rememberSaveable { mutableStateOf(row.isHalfDay) }
    val now: (() -> Int)? = if (row.isToday) ({ nowMinutesIn(user?.timezone) }) else null

    EditorSheet(
        title = if (row.hasRecord) "Edit day" else "Add day",
        row = row,
        onDismiss = onDismiss,
        app = app,
        onDone = onDone,
        content = { run, state ->
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                types.forEachIndexed { index, type ->
                    SegmentedButton(
                        selected = dayType == type,
                        onClick = { dayType = type },
                        shape = SegmentedButtonDefaults.itemShape(index, types.size),
                    ) { Text(if (type == "work") "Worked" else Fmt.leaveLabel(type)) }
                }
            }

            if (dayType == "work") {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TimeField(
                        "Entry time", entry, { entry = it }, use24h, Modifier.weight(1f),
                        nowMinutes = now,
                        error = state.fieldErrors["entryTime"],
                        defaultMinutes = schedule?.workStartMinutes ?: (9 * 60),
                    )
                    TimeField(
                        "Out time", out, { out = it }, use24h, Modifier.weight(1f),
                        nowMinutes = now,
                        error = state.fieldErrors["outTime"],
                        defaultMinutes = schedule?.workEndMinutes ?: (18 * 60),
                    )
                }
                if (row.isWorkingDay) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { halfDay = !halfDay },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(checked = halfDay, onCheckedChange = { halfDay = it })
                        Column {
                            Text("Half day", style = MaterialTheme.typography.bodyLarge)
                            Text(
                                "Expected working time is ${Fmt.duration(schedule?.halfDayMinutes ?: 270)}.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                } else {
                    Note("This is one of your days off, so every minute you work counts as extra time.", AppTheme.status.warning)
                }
            } else {
                Note("This day won't count as missing or as less time. Nothing is expected from you.", AppTheme.status.leave)
            }

            PrimaryButton("Save", state.busy) {
                if (dayType == "work" && entry == null && out == null) {
                    state.fieldErrors = mapOf("entryTime" to "Enter at least an entry time or an out time")
                } else {
                    val isWork = dayType == "work"
                    run(
                        {
                            app.api.saveDay(
                                date = row.dateKey,
                                dayType = dayType,
                                entryTime = if (isWork) entry?.let(Fmt::hhmm).orEmpty() else "",
                                outTime = if (isWork) out?.let(Fmt::hhmm).orEmpty() else "",
                                isHalfDay = isWork && row.isWorkingDay && halfDay,
                            )
                        },
                        if (isWork) "Time saved" else "Marked as ${Fmt.leaveLabel(dayType).lowercase()}",
                    )
                }
            }

            if (row.hasRecord) {
                DeleteRow("Clear day", "Remove this day's record?", "Remove", state) {
                    run({ app.api.clearDay(row.dateKey) }, "Day cleared")
                }
            }

            if (!row.isFuture) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Extra hours", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(
                            extraSummary(row, use24h) ?: "None recorded",
                            style = MaterialTheme.typography.bodySmall.merge(TabularNumbers),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    TextButton(onClick = onEditExtra, enabled = !state.busy) {
                        Text(if (row.extraEntryMinutes != null) "Edit" else "Add")
                    }
                }
            }
        },
    )
}

private fun extraSummary(row: DayRow, use24h: Boolean): String? {
    val start = row.extraEntryMinutes ?: return null
    val end = row.extraOutMinutes?.let { Fmt.clock(it, use24h) } ?: "running"
    return "${Fmt.clock(start, use24h)} → $end" + (row.extraMinutes?.let { " · ${Fmt.duration(it)}" } ?: "")
}

/** Edits a day's extra-hours session, which is saved apart from the regular day. */
@Composable
fun ExtraHoursEditorSheet(
    app: AppContainer,
    row: DayRow,
    use24h: Boolean,
    onDismiss: () -> Unit,
    onDone: (String) -> Unit,
) {
    val user by app.user.collectAsStateWithLifecycle()
    var entry by rememberSaveable { mutableStateOf(row.extraEntryMinutes) }
    var out by rememberSaveable { mutableStateOf(row.extraOutMinutes) }
    val now: (() -> Int)? = if (row.isToday) ({ nowMinutesIn(user?.timezone) }) else null

    EditorSheet(
        title = "Extra hours",
        row = row,
        onDismiss = onDismiss,
        app = app,
        onDone = onDone,
        content = { run, state ->
            Text(
                "Every minute counts as extra time, on any day. Sessions running past midnight continue on the next day.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TimeField(
                    "Entry time", entry, { entry = it }, use24h, Modifier.weight(1f),
                    nowMinutes = now,
                    error = state.fieldErrors["extraEntryTime"],
                    defaultMinutes = 18 * 60,
                )
                TimeField(
                    "Out time", out, { out = it }, use24h, Modifier.weight(1f),
                    nowMinutes = now,
                    error = state.fieldErrors["extraOutTime"],
                    defaultMinutes = 20 * 60,
                )
            }
            PrimaryButton("Save", state.busy) {
                val start = entry
                val end = out
                when {
                    start == null -> state.fieldErrors = mapOf("extraEntryTime" to "Enter the entry time")
                    end != null && end <= start -> state.fieldErrors = mapOf(
                        "extraOutTime" to "Must be after the entry time. Sessions running past midnight continue on the next day.",
                    )
                    else -> run(
                        { app.api.saveExtra(row.dateKey, Fmt.hhmm(start), end?.let(Fmt::hhmm).orEmpty()) },
                        "Extra hours saved",
                    )
                }
            }
            if (row.extraEntryMinutes != null) {
                DeleteRow("Delete extra hours", "Delete these extra hours?", "Delete", state) {
                    run({ app.api.clearExtra(row.dateKey) }, "Extra hours deleted")
                }
            }
        },
    )
}
