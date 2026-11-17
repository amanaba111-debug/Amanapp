package app.mindloop.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.mindloop.data.local.UserPrefsEntity
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoodBottomSheet(
    currentMood: Int?,
    currentNote: String,
    onSave: (Int, String) -> Unit,
    onDismiss: () -> Unit
) {
    val emojis = listOf("😔" to "Heavy", "😕" to "Stretched", "😌" to "Steady", "🙂" to "Good", "😊" to "Bright")
    var sliderVal by remember { mutableFloatStateOf((currentMood ?: 4).toFloat()) }
    var note by remember { mutableStateOf(currentNote) }
    val idx = (sliderVal.roundToInt() - 1).coerceIn(0, 4)

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(emojis[idx].first, style = MaterialTheme.typography.displayMedium)
            Text(emojis[idx].second, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Slider(
                value = sliderVal,
                onValueChange = { sliderVal = it },
                valueRange = 1f..5f,
                steps = 3
            )
            OutlinedTextField(
                value = note,
                onValueChange = { note = it.take(120) },
                placeholder = { Text("Optional evening reflection…") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Button(
                onClick = { onSave(idx + 1, note.trim()) },
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text("Save Mood")
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

/**
 * Hidden Settings screen unlocked exclusively by holding the main progress ring for 3 seconds.
 */
@Composable
fun SettingsScreen(
    state: MindLoopUiState,
    onUpdatePrefs: ((UserPrefsEntity) -> UserPrefsEntity) -> Unit,
    onImportCsv: (Uri, String) -> Unit,
    onExportSqlite: () -> Unit,
    onToggleSocialGuardService: (Boolean) -> Unit,
    onGdprDelete: () -> Unit,
    onClose: () -> Unit
) {
    var customDeckTitle by remember { mutableStateOf("") }
    var confirmDelete by remember { mutableStateOf(false) }

    val csvPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            onImportCsv(uri, customDeckTitle.ifBlank { "Custom 4-Week Pack" })
            customDeckTitle = ""
        }
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Settings", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                TextButton(onClick = onClose) { Text("Done") }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Theme: Auto / Light / Dark / AMOLED black
                SettingsCard(title = "Material You & AMOLED") {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("auto", "light", "dark", "amoled").forEach { mode ->
                            FilledTonalButton(
                                onClick = {
                                    onUpdatePrefs { it.copy(themeMode = mode, nightModeActive = false) }
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = if (mode == "amoled") "OLED" else mode.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = if (state.prefs.themeMode == mode) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }

                // Lesson packs + CSV customiser
                SettingsCard(title = "4-Week Lesson Packs (Offline)") {
                    state.allPacks.forEach { pack ->
                        val active = pack.id == state.prefs.selectedSkillId
                        TextButton(
                            onClick = { onUpdatePrefs { it.copy(selectedSkillId = pack.id) } },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = (if (active) "✓ " else "") + "${pack.title} (${pack.cards.size} cards)",
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                    OutlinedTextField(
                        value = customDeckTitle,
                        onValueChange = { customDeckTitle = it },
                        placeholder = { Text("Custom CSV deck title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    FilledTonalButton(
                        onClick = { csvPicker.launch("text/*") },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Import Custom Flash-Card CSV")
                    }
                }

                // Usage-Access 4-7-8 social app overlay
                SettingsCard(title = "Smart Automations") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("Instagram / TikTok 4-7-8 Bubble", fontWeight = FontWeight.SemiBold)
                            Text(
                                "Active outside lunch (${state.prefs.lunchStart}–${state.prefs.lunchEnd})",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = state.prefs.socialGuardEnabled,
                            onCheckedChange = onToggleSocialGuardService
                        )
                    }
                }

                // Offline SQLite export & GDPR delete
                SettingsCard(title = "Offline Privacy & Data") {
                    Text(
                        "No login, no cloud, zero telemetry. Everything stays inside your on-device Room SQLite file.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    FilledTonalButton(
                        onClick = onExportSqlite,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Export SQLite Database (.sqlite)")
                    }
                    if (!confirmDelete) {
                        TextButton(
                            onClick = { confirmDelete = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Delete All Data (GDPR)", color = MaterialTheme.colorScheme.error)
                        }
                    } else {
                        Button(
                            onClick = onGdprDelete,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Confirm Permanent Erase")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsCard(
    title: String,
    content: @Composable () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary
            )
            content()
        }
    }
}
