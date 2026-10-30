package app.vercel.officetimetracker.reminders

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import app.vercel.officetimetracker.MainActivity
import app.vercel.officetimetracker.OfficeTimeTrackerApp
import app.vercel.officetimetracker.R
import app.vercel.officetimetracker.data.ApiJson
import app.vercel.officetimetracker.data.DashboardResponse
import kotlinx.serialization.builtins.ListSerializer

/**
 * Schedules the planned reminders as alarms. The plan is saved so it can be re-armed after a
 * reboot, which clears every alarm. Alarms are inexact (a few minutes late at most while the phone
 * dozes), which avoids the special exact-alarm permission.
 */
class Reminders(context: Context) {
    private val context = context.applicationContext
    private val prefs = this.context.getSharedPreferences("reminders", Context.MODE_PRIVATE)
    private val alarms = this.context.getSystemService(AlarmManager::class.java)

    /** Replaces every scheduled reminder with the ones due from fresh Today data. */
    fun schedule(data: DashboardResponse) = replace(ReminderPlanner.plan(data, System.currentTimeMillis()))

    fun cancelAll() = replace(emptyList())

    /** Re-arms the saved plan's future reminders. */
    fun rearm() {
        val now = System.currentTimeMillis()
        saved().filter { it.atMillis > now }.forEach(::arm)
    }

    private fun replace(plan: List<PlannedReminder>) {
        saved().forEach { alarms.cancel(pendingIntent(it)) }
        plan.forEach(::arm)
        prefs.edit { putString(KEY_PLAN, ApiJson.encodeToString(ListSerializer(PlannedReminder.serializer()), plan)) }
    }

    private fun saved(): List<PlannedReminder> =
        prefs.getString(KEY_PLAN, null)?.let {
            runCatching { ApiJson.decodeFromString(ListSerializer(PlannedReminder.serializer()), it) }.getOrNull()
        }.orEmpty()

    private fun arm(reminder: PlannedReminder) {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminder.atMillis, pendingIntent(reminder))
    }

    private fun pendingIntent(reminder: PlannedReminder): PendingIntent {
        // A distinct action per reminder keeps each alarm's PendingIntent separate.
        val intent = Intent(context, ReminderReceiver::class.java)
            .setAction("$ACTION_PREFIX${reminder.id}")
            .putExtra(EXTRA_ID, reminder.id)
            .putExtra(EXTRA_TITLE, reminder.title)
            .putExtra(EXTRA_BODY, reminder.body)
        return PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        private const val KEY_PLAN = "plan"
        private const val ACTION_PREFIX = "app.vercel.officetimetracker.REMINDER:"
        internal const val EXTRA_ID = "id"
        internal const val EXTRA_TITLE = "title"
        internal const val EXTRA_BODY = "body"
        private const val CHANNEL_ID = "reminders"

        fun ensureChannel(context: Context) {
            NotificationManagerCompat.from(context).createNotificationChannel(
                NotificationChannelCompat.Builder(CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_DEFAULT)
                    .setName(context.getString(R.string.reminder_channel_name))
                    .setDescription(context.getString(R.string.reminder_channel_description))
                    .build()
            )
        }

        @SuppressLint("MissingPermission") // Checked with areNotificationsEnabled().
        internal fun show(context: Context, id: String, title: String, body: String) {
            val manager = NotificationManagerCompat.from(context)
            if (!manager.areNotificationsEnabled()) return
            ensureChannel(context)
            val open = PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_IMMUTABLE,
            )
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setColor(ContextCompat.getColor(context, R.color.notification_accent))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
            try {
                manager.notify(id.hashCode(), notification)
            } catch (e: SecurityException) {
                // Permission revoked between the check and the post.
            }
        }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(Reminders.EXTRA_ID) ?: return
        Reminders.show(
            context,
            id,
            intent.getStringExtra(Reminders.EXTRA_TITLE).orEmpty(),
            intent.getStringExtra(Reminders.EXTRA_BODY).orEmpty(),
        )
    }
}

/** Alarms don't survive a reboot or an app update, so put the saved ones back. */
class RescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        (context.applicationContext as OfficeTimeTrackerApp).container.reminders.rearm()
    }
}
