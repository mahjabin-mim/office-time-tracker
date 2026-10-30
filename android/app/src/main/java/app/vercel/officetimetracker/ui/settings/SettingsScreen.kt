package app.vercel.officetimetracker.ui.settings

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.vercel.officetimetracker.BuildConfig
import app.vercel.officetimetracker.data.Schedule
import app.vercel.officetimetracker.data.User
import app.vercel.officetimetracker.ui.components.AppCard
import app.vercel.officetimetracker.ui.components.InlineError
import app.vercel.officetimetracker.ui.components.LoadableContent
import app.vercel.officetimetracker.ui.components.Note
import app.vercel.officetimetracker.ui.components.TimeField
import app.vercel.officetimetracker.ui.theme.AppTheme
import app.vercel.officetimetracker.util.Fmt
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import java.time.ZoneId
import kotlin.math.roundToInt

private val WEEKDAYS = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

@Composable
fun SettingsScreen(vm: SettingsViewModel, websiteUrl: String, contentPadding: PaddingValues, showMessage: (String) -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .padding(contentPadding)
    ) {
        LoadableContent(vm.state, onRetry = vm::refresh) { data ->
            val user = data.user
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item { Text("Settings", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold) }
                vm.state.error?.let { item { InlineError(it) } }
                item { ProfileSection(user, vm, showMessage) }
                item { ScheduleSection(data.schedule, user.uses24h, vm, showMessage) }
                item { LateEntrySection(data.schedule, user.uses24h, vm, showMessage) }
                item { PreferencesSection(user, vm, showMessage) }
                item { RemindersSection(user, vm, showMessage) }
                item { AccountSection(user, websiteUrl, vm, showMessage) }
                item { Footer(websiteUrl) }
            }
        }
    }
}

@Composable
private fun Section(title: String, description: String, icon: ImageVector, content: @Composable ColumnScope.() -> Unit) {
    AppCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                    Box(Modifier.size(32.dp), contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            content()
        }
    }
}

@Composable
private fun Field(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    error: String?,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        isError = error != null,
        supportingText = errorText(error),
        keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else keyboardType),
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        modifier = modifier.fillMaxWidth(),
    )
}

private fun errorText(error: String?): (@Composable () -> Unit)? = error?.let { { Text(it) } }

@Composable
private fun SaveButton(label: String, section: String, vm: SettingsViewModel, enabled: Boolean = true, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = enabled && vm.saving == null, modifier = Modifier.fillMaxWidth()) {
        if (vm.saving == section) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text(label)
    }
}

@Composable
private fun ProfileSection(user: User, vm: SettingsViewModel, showMessage: (String) -> Unit) {
    var name by rememberSaveable(user.name) { mutableStateOf(user.name) }
    var email by rememberSaveable(user.email) { mutableStateOf(user.email) }
    val errors = vm.errorsFor("profile")
    Section("Profile", "Your name and the email you log in with.", Icons.Filled.Person) {
        errors?.message?.let { InlineError(it) }
        Field(name, { name = it }, "Full name", errors?.fields?.get("name"))
        Field(email, { email = it }, "Email", errors?.fields?.get("email"), keyboardType = KeyboardType.Email)
        SaveButton("Save profile", "profile", vm, enabled = name.trim() != user.name || email.trim() != user.email) {
            vm.save(
                "profile",
                buildJsonObject {
                    putJsonObject("profile") {
                        put("name", name.trim())
                        put("email", email.trim())
                    }
                },
                "Profile updated",
                showMessage,
            )
        }
    }
}

/** "8", "8.5" or "8,5" hours to minutes. */
private fun parseHours(text: String): Int? =
    text.trim().replace(',', '.').toDoubleOrNull()?.takeIf { it > 0 }?.let { (it * 60).roundToInt() }

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ScheduleSection(schedule: Schedule, use24h: Boolean, vm: SettingsViewModel, showMessage: (String) -> Unit) {
    var expected by rememberSaveable(schedule.expectedDailyMinutes) { mutableStateOf(Fmt.hours(schedule.expectedDailyMinutes)) }
    var halfDay by rememberSaveable(schedule.halfDayMinutes) { mutableStateOf(Fmt.hours(schedule.halfDayMinutes)) }
    var start by rememberSaveable(schedule.workStartMinutes) { mutableIntStateOf(schedule.workStartMinutes) }
    var end by rememberSaveable(schedule.workEndMinutes) { mutableIntStateOf(schedule.workEndMinutes) }
    var days by rememberSaveable(schedule.workingDays) { mutableStateOf(schedule.workingDays.joinToString(",")) }
    val selectedDays = days.split(',').mapNotNull { it.toIntOrNull() }.toSet()
    val errors = vm.errorsFor("schedule")?.fields.orEmpty()

    Section("Working schedule", "Used to calculate your expected hours and daily balance.", Icons.Filled.DateRange) {
        vm.errorsFor("schedule")?.message?.let { InlineError(it) }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Field(expected, { expected = it }, "Daily hours", errors["expectedDailyMinutes"], Modifier.weight(1f), KeyboardType.Decimal)
            Field(halfDay, { halfDay = it }, "Half-day hours", errors["halfDayMinutes"], Modifier.weight(1f), KeyboardType.Decimal)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TimeField("Work starts", start, { it?.let { start = it } }, use24h, Modifier.weight(1f), error = errors["workStartMinutes"], clearable = false)
            TimeField("Work ends", end, { it?.let { end = it } }, use24h, Modifier.weight(1f), error = errors["workEndMinutes"], clearable = false)
        }
        Text("Working days", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            WEEKDAYS.forEachIndexed { day, label ->
                FilterChip(
                    selected = day in selectedDays,
                    onClick = {
                        val next = if (day in selectedDays) selectedDays - day else selectedDays + day
                        days = next.sorted().joinToString(",")
                    },
                    label = { Text(label) },
                )
            }
        }
        errors["workingDays"]?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
        SaveButton("Save schedule", "schedule", vm) {
            val expectedMinutes = parseHours(expected)
            val halfDayMinutes = parseHours(halfDay)
            if (expectedMinutes == null || halfDayMinutes == null) {
                vm.showError(
                    "schedule",
                    buildMap {
                        if (expectedMinutes == null) put("expectedDailyMinutes", "Enter the hours, like 8 or 8.5")
                        if (halfDayMinutes == null) put("halfDayMinutes", "Enter the hours, like 4.5")
                    },
                )
            } else {
                vm.save(
                    "schedule",
                    buildJsonObject {
                        putJsonObject("schedule") {
                            put("expectedDailyMinutes", expectedMinutes)
                            put("halfDayMinutes", halfDayMinutes)
                            put("workStartMinutes", start)
                            put("workEndMinutes", end)
                            putJsonArray("workingDays") { selectedDays.sorted().forEach { add(it) } }
                        }
                    },
                    "Working schedule saved",
                    showMessage,
                )
            }
        }
    }
}

@Composable
private fun LateEntrySection(schedule: Schedule, use24h: Boolean, vm: SettingsViewModel, showMessage: (String) -> Unit) {
    var enabled by rememberSaveable(schedule.lateAfterMinutes) { mutableStateOf(schedule.lateAfterMinutes != null) }
    var time by rememberSaveable(schedule.lateAfterMinutes) {
        mutableIntStateOf(schedule.lateAfterMinutes ?: (schedule.workStartMinutes + 15))
    }
    val errors = vm.errorsFor("late")
    val changed = if (enabled) schedule.lateAfterMinutes != time else schedule.lateAfterMinutes != null

    Section("Late entry", "Set the time after which an entry is marked late.", Icons.Filled.Warning) {
        errors?.message?.let { InlineError(it) }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Track late entries", Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
            Switch(checked = enabled, onCheckedChange = { enabled = it })
        }
        if (enabled) {
            TimeField("Late after", time, { it?.let { time = it } }, use24h, error = errors?.fields?.get("lateAfter"), clearable = false)
        }
        SaveButton("Save late entry", "late", vm, enabled = changed) {
            vm.save(
                "late",
                buildJsonObject { if (enabled) put("lateAfterMinutes", time) else put("lateAfterMinutes", JsonNull) },
                if (enabled) "Late entry time saved" else "Late entry tracking turned off",
                showMessage,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PreferencesSection(user: User, vm: SettingsViewModel, showMessage: (String) -> Unit) {
    val deviceZone = ZoneId.systemDefault().id
    Section("Preferences", "How times are shown, and the time zone your days follow.", Icons.Filled.Settings) {
        vm.errorsFor("preferences")?.message?.let { InlineError(it) }
        vm.errorsFor("timezone")?.message?.let { InlineError(it) }
        Text("Time format", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        val formats = listOf("12h" to "12-hour", "24h" to "24-hour")
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            formats.forEachIndexed { index, (value, label) ->
                SegmentedButton(
                    selected = user.timeFormat == value,
                    onClick = {
                        if (user.timeFormat != value) {
                            vm.save(
                                "preferences",
                                buildJsonObject { putJsonObject("preferences") { put("timeFormat", value) } },
                                "Time format updated",
                                showMessage,
                            )
                        }
                    },
                    shape = SegmentedButtonDefaults.itemShape(index, formats.size),
                    enabled = vm.saving == null,
                ) { Text(label) }
            }
        }
        Column {
            Text("Time zone", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(user.timezone ?: "Not set", style = MaterialTheme.typography.bodyLarge)
        }
        if (user.timezone != deviceZone) {
            OutlinedButton(
                onClick = {
                    vm.save("timezone", buildJsonObject { put("timezone", deviceZone) }, "Time zone set to $deviceZone", showMessage)
                },
                enabled = vm.saving == null,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Use this phone's time zone ($deviceZone)") }
        }
    }
}

private fun notificationsAllowed(context: Context) = NotificationManagerCompat.from(context).areNotificationsEnabled()

private fun openNotificationSettings(context: Context) {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
    }
    context.startActivity(intent)
}

@Composable
private fun RemindersSection(user: User, vm: SettingsViewModel, showMessage: (String) -> Unit) {
    val context = LocalContext.current
    var allowed by remember { mutableStateOf(notificationsAllowed(context)) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { allowed = notificationsAllowed(context) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        allowed = notificationsAllowed(context)
    }

    fun update(clockIn: Boolean = user.remindClockIn, leave: Boolean = user.remindLeave, clockOut: Boolean = user.remindClockOut) {
        val turningOn = (clockIn && !user.remindClockIn) || (leave && !user.remindLeave) || (clockOut && !user.remindClockOut)
        if (turningOn && !allowed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        vm.save(
            "reminders",
            buildJsonObject {
                putJsonObject("reminders") {
                    put("remindClockIn", clockIn)
                    put("remindLeave", leave)
                    put("remindClockOut", clockOut)
                }
            },
            "Reminders updated",
            showMessage,
        )
    }

    Section("Reminders", "Notifications on this phone when something's forgotten.", Icons.Filled.Notifications) {
        vm.errorsFor("reminders")?.message?.let { InlineError(it) }
        ReminderSwitch("Forgot to clock in", "An hour after your work start time, if there's no entry yet.", user.remindClockIn, vm) { update(clockIn = it) }
        ReminderSwitch("Time to leave", "When today's expected time is complete.", user.remindLeave, vm) { update(leave = it) }
        ReminderSwitch(
            "Forgot to clock out",
            "Two hours after your leave time, and when extra hours have run for 3 hours.",
            user.remindClockOut,
            vm,
        ) { update(clockOut = it) }
        if ((user.remindClockIn || user.remindLeave || user.remindClockOut) && !allowed) {
            Note("Notifications are turned off for this app, so reminders can't appear.", AppTheme.status.warning)
            OutlinedButton(onClick = { openNotificationSettings(context) }, modifier = Modifier.fillMaxWidth()) {
                Text("Turn on notifications")
            }
        }
        Text(
            "Reminders are set on this phone each time you open the app.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ReminderSwitch(title: String, description: String, checked: Boolean, vm: SettingsViewModel, onChange: (Boolean) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Switch(checked = checked, onCheckedChange = onChange, enabled = vm.saving == null)
    }
}

@Composable
private fun AccountSection(user: User, websiteUrl: String, vm: SettingsViewModel, showMessage: (String) -> Unit) {
    val uri = LocalUriHandler.current
    var confirmLogOutAll by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }

    Section("Account", user.email, Icons.Filled.Lock) {
        OutlinedButton(onClick = { uri.openUri("$websiteUrl/dashboard/settings") }, modifier = Modifier.fillMaxWidth()) {
            Text(if (user.hasPassword) "Change password on the website" else "Add a password on the website")
        }
        OutlinedButton(onClick = vm::logOut, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, Modifier.size(ButtonDefaults.IconSize))
            Spacer(Modifier.width(ButtonDefaults.IconSpacing))
            Text("Log out")
        }
        Row {
            TextButton(onClick = { confirmLogOutAll = true }) { Text("Log out of all devices") }
            Spacer(Modifier.weight(1f))
            TextButton(
                onClick = { deleting = true },
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
            ) { Text("Delete account") }
        }
    }

    if (confirmLogOutAll) {
        AlertDialog(
            onDismissRequest = { confirmLogOutAll = false },
            title = { Text("Log out of all devices?") },
            text = { Text("This signs you out everywhere: this phone, the website and any other device.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmLogOutAll = false
                    vm.logOutEverywhere(showMessage)
                }) { Text("Log out everywhere") }
            },
            dismissButton = { TextButton(onClick = { confirmLogOutAll = false }) { Text("Cancel") } },
        )
    }

    if (deleting) DeleteAccountDialog(user.hasPassword, vm, onDismiss = { deleting = false })
}

@Composable
private fun DeleteAccountDialog(hasPassword: Boolean, vm: SettingsViewModel, onDismiss: () -> Unit) {
    var confirmation by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errors by remember { mutableStateOf<SectionErrors?>(null) }
    var busy by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Delete account?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("This permanently deletes your account, schedule and all attendance. It can't be undone.")
                errors?.message?.let { InlineError(it) }
                Field(confirmation, { confirmation = it }, "Type DELETE to confirm", errors?.fields?.get("confirmation"))
                if (hasPassword) Field(password, { password = it }, "Password", errors?.fields?.get("password"), password = true)
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    busy = true
                    vm.deleteAccount(confirmation.trim(), password) {
                        busy = false
                        errors = it
                    }
                },
                enabled = confirmation.trim() == "DELETE" && !busy,
                colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
            ) { Text("Delete forever") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun Footer(websiteUrl: String) {
    val uri = LocalUriHandler.current
    Column(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "Office Time Tracker ${BuildConfig.VERSION_NAME}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        TextButton(onClick = { uri.openUri(websiteUrl) }) { Text("Open the website") }
    }
}
