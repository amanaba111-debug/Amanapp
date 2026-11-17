package app.mindloop.data.local

import android.content.Context
import org.json.JSONObject

data class Flashcard(
    val id: String,
    val week: Int,
    val category: String,
    val front: String,
    val hint: String,
    val back: String,
    val example: String
)

data class LessonPack(
    val id: String,
    val title: String,
    val subtitle: String,
    val sizeLabel: String,
    val isCustom: Boolean = false,
    val cards: List<Flashcard>
)

object PackLoader {
    private val BUNDLED_FILES = listOf(
        "packs/spanish-4week.json",
        "packs/coding-4week.json",
        "packs/chess-4week.json",
        "packs/guitar-4week.json"
    )

    fun loadBundledPacks(context: Context): List<LessonPack> {
        return BUNDLED_FILES.mapNotNull { assetPath ->
            runCatching {
                val jsonText = context.assets.open(assetPath).bufferedReader().use { it.readText() }
                val root = JSONObject(jsonText)
                val cardsJson = root.getJSONArray("cards")
                val cards = buildList {
                    for (i in 0 until cardsJson.length()) {
                        val c = cardsJson.getJSONObject(i)
                        add(
                            Flashcard(
                                id = c.getString("id"),
                                week = c.optInt("week", 1),
                                category = c.optString("category", "Week 1"),
                                front = c.getString("front"),
                                hint = c.optString("hint", ""),
                                back = c.getString("back"),
                                example = c.optString("example", "")
                            )
                        )
                    }
                }
                LessonPack(
                    id = root.getString("id"),
                    title = root.getString("title"),
                    subtitle = root.optString("subtitle", ""),
                    sizeLabel = root.optString("sizeLabel", "Offline pack"),
                    cards = cards
                )
            }.getOrNull()
        }
    }

    /**
     * Parses a user-uploaded CSV (week,category,front,hint,back,example or front,back) into Room entities.
     */
    fun parseCsvToEntities(csvText: String, packTitle: String): List<CustomFlashcardEntity> {
        val rows = parseCsvRows(csvText)
        if (rows.size < 2) return emptyList()
        val header = rows.first().map { it.lowercase() }
        val hasHeader = header.contains("front") || header.contains("question") || header.contains("back")
        val data = if (hasHeader) rows.drop(1) else rows

        val slug = "custom-" + packTitle.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-') +
            "-" + (System.currentTimeMillis() % 100_000)

        val frontIdx = header.indexOfFirst { it in listOf("front", "question", "term") }.takeIf { it >= 0 } ?: 0
        val backIdx = header.indexOfFirst { it in listOf("back", "answer", "meaning") }.takeIf { it >= 0 } ?: 1
        val hintIdx = header.indexOf("hint")
        val exampleIdx = header.indexOf("example")
        val weekIdx = header.indexOf("week")
        val catIdx = header.indexOf("category")

        return data.mapIndexedNotNull { idx, cols ->
            val front = cols.getOrNull(frontIdx)?.trim().orEmpty()
            val back = cols.getOrNull(backIdx)?.trim().orEmpty()
            if (front.isEmpty() || back.isEmpty()) return@mapIndexedNotNull null
            val week = cols.getOrNull(weekIdx)?.toIntOrNull()?.coerceIn(1, 4)
                ?: ((idx * 4) / data.size.coerceAtLeast(1) + 1).coerceIn(1, 4)
            val cat = cols.getOrNull(catIdx)?.takeIf { it.isNotBlank() }?.let { "Week $week · $it" }
                ?: "Week $week · Custom"
            CustomFlashcardEntity(
                id = "$slug-${idx + 1}",
                packId = slug,
                packTitle = packTitle.ifBlank { "Custom 4-Week Pack" },
                week = week,
                category = cat,
                front = front,
                hint = if (hintIdx >= 0) cols.getOrNull(hintIdx).orEmpty() else "",
                back = back,
                example = if (exampleIdx >= 0) cols.getOrNull(exampleIdx).orEmpty() else ""
            )
        }
    }

    private fun parseCsvRows(raw: String): List<List<String>> {
        val rows = mutableListOf<List<String>>()
        var row = mutableListOf<String>()
        val cell = StringBuilder()
        var inQuotes = false
        val text = raw.replace("\r\n", "\n").replace("\r", "\n")
        var i = 0
        while (i < text.length) {
            val ch = text[i]
            when {
                inQuotes && ch == '"' && text.getOrNull(i + 1) == '"' -> {
                    cell.append('"')
                    i++
                }
                inQuotes && ch == '"' -> inQuotes = false
                inQuotes -> cell.append(ch)
                ch == '"' -> inQuotes = true
                ch == ',' -> {
                    row.add(cell.toString().trim())
                    cell.clear()
                }
                ch == '\n' -> {
                    row.add(cell.toString().trim())
                    cell.clear()
                    if (row.any { it.isNotEmpty() }) rows.add(row)
                    row = mutableListOf()
                }
                else -> cell.append(ch)
            }
            i++
        }
        row.add(cell.toString().trim())
        if (row.any { it.isNotEmpty() }) rows.add(row)
        return rows
    }
}
