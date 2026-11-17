package app.mindloop.automation

import android.app.AppOpsManager
import android.app.Notification
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.os.Process
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import app.mindloop.MindLoopApp
import app.mindloop.R
import app.mindloop.data.repository.MindLoopRepository
import app.mindloop.widget.BreatheOverlayActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar

/**
 * Monitors foreground social apps via Android's UsageStatsManager.
 * When Instagram/TikTok/Shorts/X opens outside the user's lunch window, gently overlays
 * a 4-7-8 breathing bubble with one-tap "Breathe 60s" or "Dismiss".
 */
class SocialGuardService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var overlayView: LinearLayout? = null
    private val dismissedUntilMs = mutableMapOf<String, Long>()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notif = buildQuietForegroundNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIF_ID, notif)
        }
        startUsageLoop()
        return START_STICKY
    }

    private fun startUsageLoop() {
        val repo = MindLoopRepository(applicationContext)
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

        scope.launch {
            while (isActive) {
                delay(2_500L)
                val prefs = repo.getPrefsOnce()
                if (!prefs.socialGuardEnabled || isInsideWindow(prefs.lunchStart, prefs.lunchEnd)) {
                    continue
                }
                val fgPkg = queryRecentForegroundPackage(usm) ?: continue
                if (fgPkg !in SOCIAL_PACKAGES) continue

                val snoozedUntil = dismissedUntilMs[fgPkg] ?: 0L
                if (System.currentTimeMillis() < snoozedUntil) continue

                withContext(Dispatchers.Main) {
                    show478BubbleOverlay(fgPkg)
                }
            }
        }
    }

    private fun queryRecentForegroundPackage(usm: UsageStatsManager): String? {
        val end = System.currentTimeMillis()
        val events = usm.queryEvents(end - 4_000L, end)
        val event = UsageEvents.Event()
        var latestPkg: String? = null
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            @Suppress("DEPRECATION")
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                latestPkg = event.packageName
            }
        }
        return latestPkg
    }

    private fun show478BubbleOverlay(pkg: String) {
        if (overlayView != null || !Settings.canDrawOverlays(this)) return
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(56, 48, 56, 48)
            background = GradientDrawable().apply {
                cornerRadius = 64f
                setColor(Color.parseColor("#F2111B24"))
                setStroke(3, Color.parseColor("#6BB9F5"))
            }
        }

        val title = TextView(this).apply {
            text = "Pause for one 4-7-8 breath?"
            textSize = 18f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        }

        val subtitle = TextView(this).apply {
            text = "Outside your lunch window · 60s resets the urge"
            textSize = 13f
            setTextColor(Color.parseColor("#B4C6D4"))
            gravity = Gravity.CENTER
            setPadding(0, 12, 0, 32)
        }

        val breatheBtn = Button(this).apply {
            text = "Breathe 4-7-8 (+1m Calm)"
            isAllCaps = false
            setTextColor(Color.parseColor("#061826"))
            background = GradientDrawable().apply {
                cornerRadius = 999f
                setColor(Color.parseColor("#7CC4FA"))
            }
            setOnClickListener {
                dismissedUntilMs[pkg] = System.currentTimeMillis() + 5 * 60_000L
                removeOverlay()
                startActivity(
                    Intent(this@SocialGuardService, BreatheOverlayActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                )
            }
        }

        val dismissBtn = Button(this).apply {
            text = "Dismiss for 5 min"
            isAllCaps = false
            setTextColor(Color.parseColor("#9DB2C2"))
            setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener {
                dismissedUntilMs[pkg] = System.currentTimeMillis() + 5 * 60_000L
                removeOverlay()
            }
        }

        container.addView(title)
        container.addView(subtitle)
        container.addView(breatheBtn)
        container.addView(dismissBtn)

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_DIM_BEHIND,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
            dimAmount = 0.55f
        }

        runCatching {
            wm.addView(container, params)
            overlayView = container
        }
    }

    private fun removeOverlay() {
        val view = overlayView ?: return
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        runCatching { wm.removeView(view) }
        overlayView = null
    }

    private fun isInsideWindow(start: String, end: String): Boolean {
        fun toMin(hhmm: String): Int {
            val parts = hhmm.split(":")
            val h = parts.getOrNull(0)?.toIntOrNull() ?: 12
            val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
            return h * 60 + m
        }
        val cal = Calendar.getInstance()
        val now = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        val s = toMin(start)
        val e = toMin(end)
        return if (s <= e) now in s..e else (now >= s || now <= e)
    }

    private fun buildQuietForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, MindLoopApp.CHANNEL_GUARD)
            .setSmallIcon(R.drawable.ic_qs_reset)
            .setContentTitle("MindLoop Social Shield")
            .setContentText("4-7-8 breathing nudge active outside lunch")
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    override fun onDestroy() {
        removeOverlay()
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val NOTIF_ID = 4780
        val SOCIAL_PACKAGES = setOf(
            "com.instagram.android",
            "com.zhiliaoapp.musically",
            "com.ss.android.ugc.trill",
            "com.twitter.android",
            "com.reddit.frontpage",
            "com.facebook.katana"
        )

        fun hasUsageAccess(context: Context): Boolean {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            @Suppress("DEPRECATION")
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            } else {
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            }
            return mode == AppOpsManager.MODE_ALLOWED
        }
    }
}
