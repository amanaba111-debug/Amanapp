package app.mindloop.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "user_prefs")
data class UserPrefsEntity(
    @PrimaryKey val id: Int = 1,
    @ColumnInfo(name = "onboarded") val onboarded: Boolean = false,
    @ColumnInfo(name = "onboarded_at") val onboardedAt: String? = null,
    @ColumnInfo(name = "selected_skill_id") val selectedSkillId: String = "spanish",
    @ColumnInfo(name = "sound_theme") val soundTheme: String = "rain", // rain | forest | cafe
    @ColumnInfo(name = "sound_volume") val soundVolume: Float = 0.55f,
    @ColumnInfo(name = "theme_mode") val themeMode: String = "auto", // auto | light | dark | amoled
    @ColumnInfo(name = "wake_time") val wakeTime: String = "07:00",
    @ColumnInfo(name = "bed_time") val bedTime: String = "22:30",
    @ColumnInfo(name = "lunch_start") val lunchStart: String = "12:00",
    @ColumnInfo(name = "lunch_end") val lunchEnd: String = "13:00",
    @ColumnInfo(name = "grow_target_min") val growTargetMin: Int = 60,
    @ColumnInfo(name = "calm_target_min") val calmTargetMin: Int = 30,
    @ColumnInfo(name = "dnd_enabled") val dndEnabled: Boolean = false,
    @ColumnInfo(name = "notifications_enabled") val notificationsEnabled: Boolean = false,
    @ColumnInfo(name = "step_counter_enabled") val stepCounterEnabled: Boolean = false,
    @ColumnInfo(name = "social_guard_enabled") val socialGuardEnabled: Boolean = true,
    @ColumnInfo(name = "night_mode_active") val nightModeActive: Boolean = false
)

@Entity(tableName = "daily_progress")
data class DailyProgressEntity(
    @PrimaryKey
    @ColumnInfo(name = "date") val date: String, // YYYY-MM-DD
    @ColumnInfo(name = "focus_minutes") val focusMinutes: Int = 0,
    @ColumnInfo(name = "exercise_minutes") val exerciseMinutes: Int = 0, // ~2000 steps = 15 min
    @ColumnInfo(name = "calm_minutes") val calmMinutes: Int = 0,
    @ColumnInfo(name = "steps") val steps: Int = 0,
    @ColumnInfo(name = "step_sensor_baseline") val stepSensorBaseline: Int = -1,
    @ColumnInfo(name = "water_glasses") val waterGlasses: Int = 0,
    @ColumnInfo(name = "mood") val mood: Int? = null, // 1..5
    @ColumnInfo(name = "mood_note") val moodNote: String = "",
    @ColumnInfo(name = "morning_primed") val morningPrimed: Boolean = false,
    @ColumnInfo(name = "evening_scan_done") val eveningScanDone: Boolean = false,
    @ColumnInfo(name = "cards_reviewed") val cardsReviewed: Int = 0
) {
    val totalGrowMinutes: Int get() = focusMinutes + exerciseMinutes
}

@Entity(tableName = "session_logs")
data class SessionLogEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "date") val date: String,
    @ColumnInfo(name = "kind") val kind: String, // focus | catchup | reset | morning_primer | body_scan | social_pause
    @ColumnInfo(name = "minutes") val minutes: Int,
    @ColumnInfo(name = "ring") val ring: String, // grow | calm
    @ColumnInfo(name = "note") val note: String,
    @ColumnInfo(name = "completed_at") val completedAt: Long
)

@Entity(tableName = "card_mastery")
data class CardMasteryEntity(
    @PrimaryKey
    @ColumnInfo(name = "card_id") val cardId: String,
    @ColumnInfo(name = "pack_id") val packId: String,
    @ColumnInfo(name = "box") val box: Int = 1,
    @ColumnInfo(name = "reviews") val reviews: Int = 0,
    @ColumnInfo(name = "last_reviewed_at") val lastReviewedAt: Long = 0L
)

@Entity(tableName = "custom_flashcards")
data class CustomFlashcardEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "pack_id") val packId: String,
    @ColumnInfo(name = "pack_title") val packTitle: String,
    @ColumnInfo(name = "week") val week: Int,
    @ColumnInfo(name = "category") val category: String,
    @ColumnInfo(name = "front") val front: String,
    @ColumnInfo(name = "hint") val hint: String,
    @ColumnInfo(name = "back") val back: String,
    @ColumnInfo(name = "example") val example: String
)
