package app.mindloop

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import app.mindloop.ui.ActiveDestination
import app.mindloop.ui.BodyScanScreen
import app.mindloop.ui.FocusSessionScreen
import app.mindloop.ui.HomeScreen
import app.mindloop.ui.MindLoopViewModel
import app.mindloop.ui.MoodBottomSheet
import app.mindloop.ui.OnboardingScreen
import app.mindloop.ui.ResetBreathingScreen
import app.mindloop.ui.SettingsScreen
import app.mindloop.ui.theme.MindLoopTheme

class MainActivity : ComponentActivity() {
    private val viewModel: MindLoopViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        handleDeepLink(intent)

        setContent {
            val state by viewModel.uiState.collectAsState()

            MindLoopTheme(
                themeMode = state.prefs.themeMode,
                nightModeActive = state.prefs.nightModeActive
            ) {
                if (!state.prefs.onboarded) {
                    OnboardingScreen(
                        packs = state.allPacks,
                        prefs = state.prefs,
                        onPreviewSound = viewModel::previewSound,
                        onStopSound = viewModel::stopSound,
                        onRequestDndSettings = viewModel::openDndSettings,
                        onComplete = viewModel::completeOnboarding
                    )
                } else {
                    when (val dest = state.destination) {
                        ActiveDestination.Home, ActiveDestination.Mood -> {
                            HomeScreen(
                                state = state,
                                onStartFocus = { min, catchUp ->
                                    viewModel.openFocus(min, catchUp)
                                },
                                onStartReset = { primer ->
                                    viewModel.openReset(primer)
                                },
                                onOpenBodyScan = viewModel::openBodyScan,
                                onTapWater = viewModel::tapWater,
                                onOpenMood = viewModel::openMood,
                                onOpenSettings = viewModel::openSettings
                            )
                            if (dest == ActiveDestination.Mood) {
                                MoodBottomSheet(
                                    currentMood = state.daily.mood,
                                    currentNote = state.daily.moodNote,
                                    onSave = viewModel::saveMood,
                                    onDismiss = viewModel::closeOverlay
                                )
                            }
                        }

                        is ActiveDestination.Focus -> {
                            FocusSessionScreen(
                                durationMin = dest.durationMin,
                                isCatchUp = dest.isCatchUp,
                                pack = state.activePack,
                                mastery = state.mastery,
                                soundTheme = state.prefs.soundTheme,
                                onRateCard = viewModel::rateCard,
                                onToggleSound = viewModel::toggleFocusSound,
                                onComplete = viewModel::completeFocus,
                                onDismiss = viewModel::closeOverlay
                            )
                        }

                        is ActiveDestination.Reset -> {
                            ResetBreathingScreen(
                                isMorningPrimer = dest.isMorningPrimer,
                                haptics = viewModel.haptics,
                                onComplete = { min ->
                                    viewModel.completeReset(min, dest.isMorningPrimer)
                                },
                                onDismiss = viewModel::closeOverlay
                            )
                        }

                        ActiveDestination.BodyScan -> {
                            BodyScanScreen(
                                activity = this@MainActivity,
                                onStartAudio = viewModel::startBodyScanAudio,
                                onStopAudio = viewModel::stopSound,
                                onComplete = viewModel::completeBodyScan,
                                onDismiss = viewModel::closeOverlay
                            )
                        }

                        ActiveDestination.Settings -> {
                            SettingsScreen(
                                state = state,
                                onUpdatePrefs = viewModel::updatePrefs,
                                onImportCsv = viewModel::importCsvUri,
                                onExportSqlite = {
                                    viewModel.exportSqlite { shareIntent ->
                                        startActivity(
                                            Intent.createChooser(shareIntent, "Export MindLoop SQLite")
                                        )
                                    }
                                },
                                onToggleSocialGuardService = viewModel::toggleSocialGuard,
                                onGdprDelete = viewModel::gdprDeleteAll,
                                onClose = viewModel::closeOverlay
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        when (intent?.action) {
            ACTION_MORNING_PRIMER -> viewModel.openReset(isMorningPrimer = true)
            ACTION_FOCUS -> viewModel.openFocus(durationMin = 25, isCatchUp = false)
            ACTION_BODY_SCAN -> viewModel.openBodyScan()
        }
    }

    companion object {
        const val ACTION_MORNING_PRIMER = "app.mindloop.ACTION_MORNING_PRIMER"
        const val ACTION_FOCUS = "app.mindloop.ACTION_FOCUS"
        const val ACTION_BODY_SCAN = "app.mindloop.ACTION_BODY_SCAN"
    }
}
