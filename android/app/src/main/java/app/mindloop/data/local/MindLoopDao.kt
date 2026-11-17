package app.mindloop.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RawQuery
import androidx.sqlite.db.SupportSQLiteQuery
import kotlinx.coroutines.flow.Flow

@Dao
interface MindLoopDao {
    @Query("SELECT * FROM user_prefs WHERE id = 1")
    fun observePrefs(): Flow<UserPrefsEntity?>

    @Query("SELECT * FROM user_prefs WHERE id = 1")
    suspend fun getPrefsOnce(): UserPrefsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertPrefs(prefs: UserPrefsEntity)

    @Query("SELECT * FROM daily_progress WHERE date = :date")
    fun observeDaily(date: String): Flow<DailyProgressEntity?>

    @Query("SELECT * FROM daily_progress WHERE date = :date")
    suspend fun getDailyOnce(date: String): DailyProgressEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDaily(daily: DailyProgressEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: SessionLogEntity)

    @Query("SELECT * FROM card_mastery")
    fun observeMastery(): Flow<List<CardMasteryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMastery(mastery: CardMasteryEntity)

    @Query("SELECT * FROM custom_flashcards")
    fun observeCustomCards(): Flow<List<CustomFlashcardEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomCards(cards: List<CustomFlashcardEntity>)

    @RawQuery
    suspend fun checkpointWal(query: SupportSQLiteQuery): Int

    // GDPR-compliant single-tap full local deletion
    @Query("DELETE FROM user_prefs")
    suspend fun clearPrefs()

    @Query("DELETE FROM daily_progress")
    suspend fun clearDaily()

    @Query("DELETE FROM session_logs")
    suspend fun clearSessions()

    @Query("DELETE FROM card_mastery")
    suspend fun clearMastery()

    @Query("DELETE FROM custom_flashcards")
    suspend fun clearCustomCards()
}
