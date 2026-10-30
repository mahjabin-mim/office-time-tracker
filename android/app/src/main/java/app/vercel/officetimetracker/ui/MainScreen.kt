package app.vercel.officetimetracker.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import app.vercel.officetimetracker.data.AppContainer
import app.vercel.officetimetracker.data.DayRow
import app.vercel.officetimetracker.ui.editors.DayEditorSheet
import app.vercel.officetimetracker.ui.editors.ExtraHoursEditorSheet
import app.vercel.officetimetracker.ui.month.MonthScreen
import app.vercel.officetimetracker.ui.month.MonthViewModel
import app.vercel.officetimetracker.ui.settings.SettingsScreen
import app.vercel.officetimetracker.ui.settings.SettingsViewModel
import app.vercel.officetimetracker.ui.today.TodayScreen
import app.vercel.officetimetracker.ui.today.TodayViewModel
import app.vercel.officetimetracker.ui.year.YearScreen
import app.vercel.officetimetracker.ui.year.YearViewModel
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch

private enum class Tab(val label: String, val icon: ImageVector) {
    Today("Today", Icons.Filled.Home),
    Month("Month", Icons.Filled.DateRange),
    Year("Year", Icons.AutoMirrored.Filled.List),
    Settings("Settings", Icons.Filled.Settings),
}

private sealed interface Editor {
    data class Day(val row: DayRow) : Editor
    data class Extra(val row: DayRow) : Editor
}

/** The signed-in app: four tabs, plus the day and extra-hours editors as bottom sheets. */
@Composable
fun MainScreen(app: AppContainer, session: Int) {
    // Keyed by session, so a different account never sees the previous one's data.
    val today = viewModel(key = "today-$session") { TodayViewModel(app) }
    val month = viewModel(key = "month-$session") { MonthViewModel(app) }
    val year = viewModel(key = "year-$session") { YearViewModel(app) }
    val settings = viewModel(key = "settings-$session") { SettingsViewModel(app) }

    var tab by rememberSaveable { mutableStateOf(Tab.Today) }
    var editor by remember { mutableStateOf<Editor?>(null) }
    val user by app.user.collectAsStateWithLifecycle()
    val use24h = user?.uses24h == true

    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val showMessage: (String) -> Unit = { message ->
        scope.launch {
            snackbar.currentSnackbarData?.dismiss()
            snackbar.showSnackbar(message)
        }
    }

    fun refreshVisible() = when (tab) {
        Tab.Today -> today.refresh()
        Tab.Month -> month.refresh()
        Tab.Year -> year.refresh()
        Tab.Settings -> settings.refresh()
    }

    LaunchedEffect(tab) { refreshVisible() }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { refreshVisible() }
    LaunchedEffect(Unit) {
        // After any change: the visible tab reloads, and Today always does, since it also
        // reschedules the reminders. Hidden tabs reload when they're opened.
        app.dataVersion.drop(1).collect {
            today.refresh()
            if (tab != Tab.Today) refreshVisible()
        }
    }

    // Reminders turned on earlier (on the website, or before Android 13's permission prompt)
    // need notification permission on this phone too.
    val context = LocalContext.current
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(user?.remindClockIn, user?.remindLeave, user?.remindClockOut) {
        val u = user ?: return@LaunchedEffect
        val wanted = u.remindClockIn || u.remindLeave || u.remindClockOut
        if (wanted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !NotificationManagerCompat.from(context).areNotificationsEnabled()
        ) {
            permission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = { tab = t },
                        icon = { Icon(t.icon, contentDescription = null) },
                        label = { Text(t.label) },
                    )
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        when (tab) {
            Tab.Today -> TodayScreen(
                vm = today,
                contentPadding = padding,
                onEditDay = { editor = Editor.Day(it) },
                onEditExtra = { editor = Editor.Extra(it) },
                onOpenMonth = {
                    month.showCurrent()
                    tab = Tab.Month
                },
                showMessage = showMessage,
            )
            Tab.Month -> MonthScreen(month, padding, use24h, onEditDay = { editor = Editor.Day(it) })
            Tab.Year -> YearScreen(year, padding, onOpenMonth = { y, m ->
                month.show(y, m)
                tab = Tab.Month
            })
            Tab.Settings -> SettingsScreen(settings, app.websiteUrl, padding, showMessage)
        }
    }

    val onDone: (String) -> Unit = { message ->
        editor = null
        showMessage(message)
    }
    when (val e = editor) {
        is Editor.Day -> DayEditorSheet(
            app = app,
            row = e.row,
            use24h = use24h,
            onDismiss = { editor = null },
            onDone = onDone,
            onEditExtra = { editor = Editor.Extra(e.row) },
        )
        is Editor.Extra -> ExtraHoursEditorSheet(app, e.row, use24h, onDismiss = { editor = null }, onDone = onDone)
        null -> Unit
    }
}
