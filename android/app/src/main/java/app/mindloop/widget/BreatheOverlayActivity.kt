package app.mindloop.widget

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import app.mindloop.audio.HapticGuide
import app.mindloop.data.repository.MindLoopRepository
import app.mindloop.ui.ResetBreathingScreen
import app.mindloop.ui.theme.MindLoopTheme
import kotlinx.coroutines.launch

/**
 * Lightweight 60-second 4-7-8 breathing overlay launched from the 1×1 Breathe widget,
 * Quick-Settings tile, 90-min heads-up notification, or Usage-Access social app bubble.
 */
class BreatheOverlayActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = MindLoopRepository(applicationContext)
        val haptics = HapticGuide(applicationContext)

        setContent {
            MindLoopTheme(themeMode = "amoled", nightModeActive = true) {
                ResetBreathingScreen(
                    isMorningPrimer = false,
                    haptics = haptics,
                    onComplete = { minutes ->
                        lifecycleScope.launch {
                            repo.recordCalmSession(minutes, "reset", "Quick 4-7-8 overlay")
                            finish()
                        }
                    },
                    onDismiss = { finish() }
                )
            }
        }
    }
}
