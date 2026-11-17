package app.mindloop.automation

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings

/**
 * Toggles Android Priority Do-Not-Disturb during FOCUS Pomodoros and Evening Night Mode.
 */
class DndController(private val context: Context) {
    private val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    val hasPermission: Boolean
        get() = nm.isNotificationPolicyAccessGranted

    fun openPolicySettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        runCatching { context.startActivity(intent) }
    }

    fun setFocusSilence(enabled: Boolean) {
        if (!hasPermission) return
        runCatching {
            nm.setInterruptionFilter(
                if (enabled) {
                    NotificationManager.INTERRUPTION_FILTER_PRIORITY
                } else {
                    NotificationManager.INTERRUPTION_FILTER_ALL
                }
            )
        }
    }
}
