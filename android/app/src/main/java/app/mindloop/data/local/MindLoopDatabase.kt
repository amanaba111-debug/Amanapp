package app.mindloop.data.local

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SimpleSQLiteQuery
import java.io.File

@Database(
    entities = [
        UserPrefsEntity::class,
        DailyProgressEntity::class,
        SessionLogEntity::class,
        CardMasteryEntity::class,
        CustomFlashcardEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class MindLoopDatabase : RoomDatabase() {
    abstract fun dao(): MindLoopDao

    /**
     * Flushes WAL pages and copies the offline Room SQLite file into a shareable export.
     */
    suspend fun exportCleanSqliteFile(context: Context, dateStamp: String): Intent {
        dao().checkpointWal(SimpleSQLiteQuery("PRAGMA wal_checkpoint(FULL)"))
        val dbFile = context.getDatabasePath(DB_NAME)
        val exportDir = File(context.cacheDir, "exports").apply { mkdirs() }
        val target = File(exportDir, "mindloop-backup-$dateStamp.sqlite")
        dbFile.copyTo(target, overwrite = true)

        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            target
        )
        return Intent(Intent.ACTION_SEND).apply {
            type = "application/x-sqlite3"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }

    companion object {
        const val DB_NAME = "mindloop.sqlite"

        @Volatile
        private var instance: MindLoopDatabase? = null

        fun get(context: Context): MindLoopDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    MindLoopDatabase::class.java,
                    DB_NAME
                )
                    .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING)
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { instance = it }
            }
        }
    }
}
