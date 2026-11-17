package app.mindloop.automation

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import app.mindloop.MainActivity
import app.mindloop.MindLoopApp
import app.mindloop.R
import app.mindloop.data.repository.MindLoopRepository
import app.mindloop.widget.BreatheOverlayActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Zero-planning daily rhythm scheduler:
 * - Morning (wake-up time): 5-breath primer -> turns Grow ring green
 * - Work (every 90 min): subtle heads-up "RESET?" -> one tap opens 60s 4-7-8 breathing
 * - Evening (1h before bed): 1-tap body-scan audio (5/10/15 min) + night mode
 */
object DailyFlowScheduler {
    fun scheduleDailyRhythm(context: Context, wakeHHMM: String, bedHHMM: String) {
        val wm = WorkManager.getInstance(context)

        val morningReq = PeriodicWorkRequestBuilder<DailyCueWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(millisUntil(wakeHHMM, offsetMinutes = 0), TimeUnit.MILLISECONDS)
            .setInputData(workDataOf("cue" to "morning"))
            .build()

        val eveningReq = PeriodicWorkRequestBuilder<DailyCueWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(millisUntil(bedHHMM, offsetMinutes = -60), TimeUnit.MILLISECONDS)
            .setInputData(workDataOf("cue" to "evening"))
            .build()

        wm.enqueueUniquePeriodicWork("mindloop_morning", ExistingPeriodicWorkPolicy.UPDATE, morningReq)
        wm.enqueueUniquePeriodicWork("mindloop_evening", ExistingPeriodicWorkPolicy.UPDATE, eveningReq)
    }

    fun scheduleNinetyMinuteResetNudge(context: Context) {
        val req = OneTimeWorkRequestBuilder<DailyCueWorker>()
            .setInitialDelay(90, TimeUnit.MINUTES)
            .setInputData(workDataOf("cue" to "reset_90m"))
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("mindloop_reset_90m", ExistingWorkPolicy.REPLACE, req)
    }

    private fun millisUntil(hhmm: String, offsetMinutes: Int): Long {
        val parts = hhmm.split(":")
        val h = parts.getOrNull(0)?.toIntOrNull() ?: 7
        val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
        val now = Calendar.getInstance()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, h)
            set(Calendar.MINUTE, m)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            add(Calendar.MINUTE, offsetMinutes)
            if (before(now)) add(Calendar.DAY_OF_YEAR, 1)
        }
        return (target.timeInMillis - now.timeInMillis).coerceAtLeast(60_000L)
    }
}

class DailyCueWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return Result.success()
        }

        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val cue = inputData.getString("cue") ?: return Result.success()

        val notif = when (cue) {
            "morning" -> {
                val intent = Intent(applicationContext, MainActivity::class.java).apply {
                    action = MainActivity.ACTION_MORNING_PRIMER
                }
                NotificationCompat.Builder(applicationContext, MindLoopApp.CHANNEL_DAILY)
                    .setSmallIcon(R.drawable.ic_qs_reset)
                    .setContentTitle("Morning · 5-breath primer")
                    .setContentText("Prime your ring green in one calm minute.")
                    .setContentIntent(PendingIntent.getActivity(applicationContext, 101, intent, flags))
                    .setAutoCancel(true)
                    .build()
            }
            "reset_90m" -> {
                val intent = Intent(applicationContext, BreatheOverlayActivity::class.java)
                NotificationCompat.Builder(applicationContext, MindLoopApp.CHANNEL_RESET)
                    .setSmallIcon(R.drawable.ic_qs_reset)
                    .setContentTitle("RESET?")
                    .setContentText("90 min elapsed · tap for a 60-second 4-7-8 breath.")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(PendingIntent.getActivity(applicationContext, 102, intent, flags))
                    .setAutoCancel(true)
                    .build()
            }
            else -> {
                val intent = Intent(applicationContext, MainActivity::class.java).apply {
                    action = MainActivity.ACTION_BODY_SCAN
                }
                NotificationCompat.Builder(applicationContext, MindLoopApp.CHANNEL_DAILY)
                    .setSmallIcon(R.drawable.ic_qs_reset)
                    .setContentTitle("Evening · 1-tap Body-Scan")
                    .setContentText("5, 10, or 15 min audio · screen fades to black. Also check in your mood.")
                    .setContentIntent(PendingIntent.getActivity(applicationContext, 103, intent, flags))
                    .setAutoCancel(true)
                    .build()
            }
        }

        NotificationManagerCompat.from(applicationContext).notify(cue.hashCode(), notif)
        return Result.success()
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = MindLoopRepository(context).getPrefsOnce()
                if (prefs.onboarded && prefs.notificationsEnabled) {
                    DailyFlowScheduler.scheduleDailyRhythm(context, prefs.wakeTime, prefs.bedTime)
                }
            } finally {
                pending.finish()
            }
        }
    }
}
