package app.mindloop.data.repository

import android.content.Context
import android.content.Intent
import app.mindloop.data.local.CardMasteryEntity
import app.mindloop.data.local.DailyProgressEntity
import app.mindloop.data.local.LessonPack
import app.mindloop.data.local.Flashcard
import app.mindloop.data.local.MindLoopDatabase
import app.mindloop.data.local.PackLoader
import app.mindloop.data.local.SessionLogEntity
import app.mindloop.data.local.UserPrefsEntity
import app.mindloop.widget.RingGlanceWidget
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.UUID

class MindLoopRepository(private val context: Context) {
    private val db = MindLoopDatabase.get(context)
    private val dao = db.dao()
    val bundledPacks: List<LessonPack> = PackLoader.loadBundledPacks(context)

    val prefsFlow: Flow<UserPrefsEntity> = dao.observePrefs().map { it ?: UserPrefsEntity() }

    fun dailyFlow(date: String = todayKey()): Flow<DailyProgressEntity> =
        dao.observeDaily(date).map { it ?: DailyProgressEntity(date = date) }

    val masteryFlow: Flow<Map<String, CardMasteryEntity>> =
        dao.observeMastery().map { list -> list.associateBy { it.cardId } }

    val customPacksFlow: Flow<List<LessonPack>> =
        dao.observeCustomCards().map { entities ->
            entities.groupBy { it.packId }.map { (packId, list) ->
                LessonPack(
                    id = packId,
                    title = list.first().packTitle,
                    subtitle = "${list.size} custom flash-cards · private offline",
                    sizeLabel = "Custom CSV",
                    isCustom = true,
                    cards = list.map {
                        Flashcard(
                            id = it.id,
                            week = it.week,
                            category = it.category,
                            front = it.front,
                            hint = it.hint,
                            back = it.back,
                            example = it.example
                        )
                    }
                )
            }
        }

    suspend fun savePrefs(prefs: UserPrefsEntity) {
        dao.upsertPrefs(prefs)
    }

    suspend fun getPrefsOnce(): UserPrefsEntity = dao.getPrefsOnce() ?: UserPrefsEntity()

    suspend fun getTodayOnce(): DailyProgressEntity {
        val key = todayKey()
        return dao.getDailyOnce(key) ?: DailyProgressEntity(date = key)
    }

    /**
     * Miss a day? Next morning offer a 12-min condensed "Catch-up" session instead of guilt.
     */
    suspend fun checkMissedYesterday(): Boolean {
        val prefs = getPrefsOnce()
        val onboardedDate = prefs.onboardedAt?.take(10) ?: return false
        val today = todayKey()
        if (onboardedDate >= today) return false
        val yesterday = dao.getDailyOnce(yesterdayKey()) ?: return true
        return yesterday.totalGrowMinutes == 0 && yesterday.calmMinutes == 0
    }

    suspend fun recordFocusSession(minutes: Int, cardsReviewed: Int, isCatchUp: Boolean) {
        val cur = getTodayOnce()
        dao.upsertDaily(
            cur.copy(
                focusMinutes = cur.focusMinutes + minutes,
                cardsReviewed = cur.cardsReviewed + cardsReviewed
            )
        )
        dao.insertSession(
            SessionLogEntity(
                id = UUID.randomUUID().toString(),
                date = cur.date,
                kind = if (isCatchUp) "catchup" else "focus",
                minutes = minutes,
                ring = "grow",
                note = "$cardsReviewed micro-lesson cards",
                completedAt = System.currentTimeMillis()
            )
        )
        RingGlanceWidget.refreshAll(context)
    }

    suspend fun recordCalmSession(minutes: Int, kind: String, note: String) {
        val cur = getTodayOnce()
        dao.upsertDaily(
            cur.copy(
                calmMinutes = cur.calmMinutes + minutes,
                morningPrimed = cur.morningPrimed || kind == "morning_primer",
                eveningScanDone = cur.eveningScanDone || kind == "body_scan"
            )
        )
        dao.insertSession(
            SessionLogEntity(
                id = UUID.randomUUID().toString(),
                date = cur.date,
                kind = kind,
                minutes = minutes,
                ring = "calm",
                note = note,
                completedAt = System.currentTimeMillis()
            )
        )
        if (kind == "body_scan") {
            val prefs = getPrefsOnce()
            dao.upsertPrefs(prefs.copy(nightModeActive = true))
        }
        RingGlanceWidget.refreshAll(context)
    }

    /**
     * Step counter auto-conversion: ≈ 2,000 steps = 15 min added to Grow ring.
     */
    suspend fun onHardwareStepCount(totalSinceBoot: Int) {
        val cur = getTodayOnce()
        val baseline = if (cur.stepSensorBaseline < 0 || totalSinceBoot < cur.stepSensorBaseline) {
            totalSinceBoot
        } else {
            cur.stepSensorBaseline
        }
        val todaySteps = (totalSinceBoot - baseline).coerceAtLeast(cur.steps)
        val exerciseMin = (todaySteps * 15) / 2000
        dao.upsertDaily(
            cur.copy(
                steps = todaySteps,
                stepSensorBaseline = baseline,
                exerciseMinutes = exerciseMin
            )
        )
        RingGlanceWidget.refreshAll(context)
    }

    suspend fun addWaterGlass() {
        val cur = getTodayOnce()
        dao.upsertDaily(cur.copy(waterGlasses = cur.waterGlasses + 1))
    }

    suspend fun saveMood(mood: Int, note: String) {
        val cur = getTodayOnce()
        dao.upsertDaily(cur.copy(mood = mood.coerceIn(1, 5), moodNote = note))
    }

    suspend fun rateCard(cardId: String, packId: String, currentBox: Int, delta: Int) {
        val nextBox = if (delta <= 0) 1 else (currentBox + delta).coerceAtMost(5)
        dao.upsertMastery(
            CardMasteryEntity(
                cardId = cardId,
                packId = packId,
                box = nextBox,
                reviews = 1,
                lastReviewedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun importCsvDeck(csvText: String, title: String): String? {
        val entities = PackLoader.parseCsvToEntities(csvText, title)
        if (entities.isEmpty()) return null
        dao.insertCustomCards(entities)
        val newPackId = entities.first().packId
        dao.upsertPrefs(getPrefsOnce().copy(selectedSkillId = newPackId))
        return newPackId
    }

    suspend fun exportSqliteShareIntent(): Intent =
        db.exportCleanSqliteFile(context, todayKey())

    suspend fun gdprDeleteEverything() {
        dao.clearPrefs()
        dao.clearDaily()
        dao.clearSessions()
        dao.clearMastery()
        dao.clearCustomCards()
        RingGlanceWidget.refreshAll(context)
    }

    companion object {
        fun todayKey(date: Date = Date()): String =
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)

        fun yesterdayKey(): String {
            val cal = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -1) }
            return todayKey(cal.time)
        }
    }
}
