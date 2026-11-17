package app.mindloop.ui

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.mindloop.audio.HapticGuide
import app.mindloop.audio.SoundscapePlayer
import app.mindloop.automation.DailyFlowScheduler
import app.mindloop.automation.DndController
import app.mindloop.automation.SocialGuardService
import app.mindloop.automation.StepCounterManager
import app.mindloop.billing.LessonPackBillingManager
import app.mindloop.data.local.CardMasteryEntity
import app.mindloop.data.local.DailyProgressEntity
import app.mindloop.data.local.LessonPack
import app.mindloop.data.local.UserPrefsEntity
import app.mindloop.data.repository.MindLoopRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface ActiveDestination {
    data object Home : ActiveDestination
    data class Focus(val durationMin: Int, val isCatchUp: Boolean) : ActiveDestination
    data class Reset(val isMorningPrimer: Boolean) : ActiveDestination
    data object BodyScan : ActiveDestination
    data object Mood : ActiveDestination
    data object Settings : ActiveDestination
}

data class MindLoopUiState(
    val prefs: UserPrefsEntity = UserPrefsEntity(),
    val daily: DailyProgressEntity = DailyProgressEntity(date = MindLoopRepository.todayKey()),
    val allPacks: List<LessonPack> = emptyList(),
    val mastery: Map<String, CardMasteryEntity> = emptyMap(),
    val missedYesterday: Boolean = false,
    val destination: ActiveDestination = ActiveDestination.Home
) {
    val activePack: LessonPack
        get() = allPacks.firstOrNull { it.id == prefs.selectedSkillId }
            ?: allPacks.firstOrNull()
            ?: LessonPack("spanish", "Spanish 4-Week", "", "4.2 MB", false, emptyList())
}

class MindLoopViewModel(app: Application) : AndroidViewModel(app) {
    private val repo = MindLoopRepository(app)
    private val audio = SoundscapePlayer(app)
    private val dnd = DndController(app)
    private val stepManager = StepCounterManager(app)
    val billing = LessonPackBillingManager(app)
    val haptics = HapticGuide(app)

    private val destination = MutableStateFlow<ActiveDestination>(ActiveDestination.Home)
    private val missedYesterday = MutableStateFlow(false)
    private var stepJob: Job? = null

    val uiState: StateFlow<MindLoopUiState> = combine(
        repo.prefsFlow,
        repo.dailyFlow(),
        repo.customPacksFlow,
        repo.masteryFlow,
        combine(missedYesterday, destination) { m, d -> m to d }
    ) { prefs, daily, customPacks, mastery, (missed, dest) ->
        ensureStepObserver(prefs.onboarded && prefs.stepCounterEnabled)
        MindLoopUiState(
            prefs = prefs,
            daily = daily,
            allPacks = repo.bundledPacks + customPacks,
            mastery = mastery,
            missedYesterday = missed,
            destination = dest
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MindLoopUiState())

    init {
        viewModelScope.launch {
            missedYesterday.value = repo.checkMissedYesterday()
        }
    }

    private fun ensureStepObserver(enabled: Boolean) {
        if (!enabled) {
            stepJob?.cancel()
            stepJob = null
            return
        }
        if (stepJob?.isActive == true) return
        stepJob = viewModelScope.launch {
            stepManager.observeSteps().collect { rawSteps ->
                repo.onHardwareStepCount(rawSteps)
            }
        }
    }

    fun previewSound(theme: String) {
        audio.startTheme(theme, uiState.value.prefs.soundVolume)
    }

    fun stopSound() = audio.stop()

    fun openDndSettings() = dnd.openPolicySettings()

    fun completeOnboarding(updated: UserPrefsEntity) {
        stopSound()
        viewModelScope.launch {
            val saved = updated.copy(
                onboarded = true,
                onboardedAt = MindLoopRepository.todayKey()
            )
            repo.savePrefs(saved)
            if (saved.notificationsEnabled) {
                DailyFlowScheduler.scheduleDailyRhythm(
                    getApplication(),
                    saved.wakeTime,
                    saved.bedTime
                )
            }
        }
    }

    fun openFocus(durationMin: Int, isCatchUp: Boolean) {
        val prefs = uiState.value.prefs
        if (prefs.dndEnabled) dnd.setFocusSilence(true)
        audio.startTheme(prefs.soundTheme, prefs.soundVolume)
        destination.value = ActiveDestination.Focus(durationMin, isCatchUp)
    }

    fun toggleFocusSound(play: Boolean) {
        val prefs = uiState.value.prefs
        if (play) audio.startTheme(prefs.soundTheme, prefs.soundVolume) else audio.stop()
    }

    fun completeFocus(minutes: Int, cardsReviewed: Int, isCatchUp: Boolean) {
        audio.stop()
        dnd.setFocusSilence(false)
        haptics.complete()
        viewModelScope.launch {
            repo.recordFocusSession(minutes, cardsReviewed, isCatchUp)
            if (isCatchUp) missedYesterday.value = false
            DailyFlowScheduler.scheduleNinetyMinuteResetNudge(getApplication())
            destination.value = ActiveDestination.Home
        }
    }

    fun openReset(isMorningPrimer: Boolean) {
        audio.stop()
        destination.value = ActiveDestination.Reset(isMorningPrimer)
    }

    fun completeReset(minutes: Int, isMorningPrimer: Boolean) {
        haptics.complete()
        viewModelScope.launch {
            repo.recordCalmSession(
                minutes = minutes,
                kind = if (isMorningPrimer) "morning_primer" else "reset",
                note = if (isMorningPrimer) "Morning 5-breath primer" else "4-7-8 calm reset"
            )
            destination.value = ActiveDestination.Home
        }
    }

    fun openBodyScan() {
        audio.stop()
        destination.value = ActiveDestination.BodyScan
    }

    fun startBodyScanAudio() {
        audio.startTheme("body_scan", uiState.value.prefs.soundVolume)
    }

    fun completeBodyScan(minutes: Int) {
        audio.stop()
        if (uiState.value.prefs.dndEnabled) dnd.setFocusSilence(true)
        viewModelScope.launch {
            repo.recordCalmSession(minutes, "body_scan", "Evening $minutes-min body-scan")
            destination.value = ActiveDestination.Home
        }
    }

    fun tapWater() {
        haptics.waterDrop()
        viewModelScope.launch { repo.addWaterGlass() }
    }

    fun openMood() {
        destination.value = ActiveDestination.Mood
    }

    fun saveMood(mood: Int, note: String) {
        viewModelScope.launch {
            repo.saveMood(mood, note)
            destination.value = ActiveDestination.Home
        }
    }

    fun openSettings() {
        haptics.ringUnlock()
        billing.connectIfAvailable()
        destination.value = ActiveDestination.Settings
    }

    fun closeOverlay() {
        audio.stop()
        dnd.setFocusSilence(false)
        destination.value = ActiveDestination.Home
    }

    fun rateCard(cardId: String, packId: String, delta: Int) {
        val currentBox = uiState.value.mastery[cardId]?.box ?: 1
        viewModelScope.launch { repo.rateCard(cardId, packId, currentBox, delta) }
    }

    fun updatePrefs(transform: (UserPrefsEntity) -> UserPrefsEntity) {
        viewModelScope.launch {
            val next = transform(repo.getPrefsOnce())
            repo.savePrefs(next)
            audio.setVolume(next.soundVolume)
            if (next.notificationsEnabled) {
                DailyFlowScheduler.scheduleDailyRhythm(getApplication(), next.wakeTime, next.bedTime)
            }
        }
    }

    fun importCsvUri(uri: Uri, deckTitle: String) {
        viewModelScope.launch(Dispatchers.IO) {
            val ctx = getApplication<Application>()
            val csv = ctx.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                ?: return@launch
            repo.importCsvDeck(csv, deckTitle)
        }
    }

    fun exportSqlite(onReady: (Intent) -> Unit) {
        viewModelScope.launch(Dispatchers.IO) {
            val intent = repo.exportSqliteShareIntent()
            withContext(Dispatchers.Main) { onReady(intent) }
        }
    }

    fun toggleSocialGuard(enable: Boolean) {
        val ctx = getApplication<Application>()
        if (enable) {
            if (!SocialGuardService.hasUsageAccess(ctx)) {
                ctx.startActivity(
                    Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
                return
            }
            if (!Settings.canDrawOverlays(ctx)) {
                ctx.startActivity(
                    Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${ctx.packageName}")
                    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
                return
            }
            val svc = Intent(ctx, SocialGuardService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(svc)
            } else {
                ctx.startService(svc)
            }
        } else {
            ctx.stopService(Intent(ctx, SocialGuardService::class.java))
        }
        updatePrefs { it.copy(socialGuardEnabled = enable) }
    }

    fun gdprDeleteAll() {
        audio.stop()
        viewModelScope.launch {
            repo.gdprDeleteEverything()
            destination.value = ActiveDestination.Home
        }
    }

    override fun onCleared() {
        audio.stop()
        billing.release()
        super.onCleared()
    }
}
