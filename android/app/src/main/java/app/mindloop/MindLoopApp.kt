package app.mindloop

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class MindLoopApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return

        val daily = NotificationChannel(
            CHANNEL_DAILY,
            "Morning & Evening Rituals",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Wake-up 5-breath primer and 1h-before-bed body-scan reminder"
        }

        val reset = NotificationChannel(
            CHANNEL_RESET,
            "90-Min RESET? Heads-Up",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Subtle 90-minute work check-in for a 60-second 4-7-8 breath"
            enableVibration(true)
        }

        val guard = NotificationChannel(
            CHANNEL_GUARD,
            "Social-App 4-7-8 Shield",
            NotificationManager.IMPORTANCE_MIN
        ).apply {
            description = "Quiet Usage-Access overlay when opening social apps outside lunch"
            setShowBadge(false)
        }

        nm.createNotificationChannels(listOf(daily, reset, guard))
    }

    companion object {
        const val CHANNEL_DAILY = "mindloop_daily"
        const val CHANNEL_RESET = "mindloop_reset_90m"
        const val CHANNEL_GUARD = "mindloop_social_guard"
    }
}
