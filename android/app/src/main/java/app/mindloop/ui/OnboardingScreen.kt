package app.mindloop.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.mindloop.data.local.LessonPack
import app.mindloop.data.local.UserPrefsEntity

/**
 * One-time 60-second setup:
 * 1) Pick a 4-week skill  2) Calm sound theme  3) DND + Notifications + Steps  4) Offline ready
 */
@Composable
fun OnboardingScreen(
    packs: List<LessonPack>,
    prefs: UserPrefsEntity,
    onPreviewSound: (String) -> Unit,
    onStopSound: () -> Unit,
    onRequestDndSettings: () -> Unit,
    onComplete: (UserPrefsEntity) -> Unit
) {
    var step by remember { mutableIntStateOf(1) }
    var skillId by remember { mutableStateOf(prefs.selectedSkillId) }
    var sound by remember { mutableStateOf(prefs.soundTheme) }
    var dnd by remember { mutableStateOf(prefs.dndEnabled) }
    var notif by remember { mutableStateOf(prefs.notificationsEnabled) }
    var steps by remember { mutableStateOf(prefs.stepCounterEnabled) }

    val notifLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> notif = granted }

    val stepLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> steps = granted }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "MindLoop · Step $step of 4",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                when (step) {
                    1 -> {
                        Text(
                            text = "Pick a 4-week skill",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Auto-curated 15-min micro-lessons inside every daily FOCUS session.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(6.dp))
                        packs.forEach { pack ->
                            val selected = pack.id == skillId
                            Surface(
                                onClick = { skillId = pack.id },
                                shape = RoundedCornerShape(22.dp),
                                color = if (selected) {
                                    MaterialTheme.colorScheme.primaryContainer
                                } else {
                                    MaterialTheme.colorScheme.surface
                                },
                                border = BorderStroke(
                                    width = if (selected) 1.5.dp else 1.dp,
                                    color = if (selected) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.outlineVariant
                                    }
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Text(
                                        text = pack.title,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = pack.subtitle,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    2 -> {
                        Text(
                            text = "Choose calm sound",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Tap any theme to hear a live offline preview.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        listOf(
                            Triple("rain", "Rain", "Soft rainfall on warm glass"),
                            Triple("forest", "Forest", "Canopy breeze & earth resonance"),
                            Triple("cafe", "Café", "Warm morning espresso room hum")
                        ).forEach { (id, title, desc) ->
                            val selected = sound == id
                            Surface(
                                onClick = {
                                    sound = id
                                    onPreviewSound(id)
                                },
                                shape = RoundedCornerShape(22.dp),
                                color = if (selected) {
                                    MaterialTheme.colorScheme.primaryContainer
                                } else {
                                    MaterialTheme.colorScheme.surface
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(Modifier.padding(18.dp)) {
                                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    Text(desc, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }

                    3 -> {
                        Text(
                            text = "Quiet automations",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        PermissionToggleCard(
                            title = "Do-Not-Disturb",
                            subtitle = "Silence distractions during 25-min FOCUS & bedtime",
                            checked = dnd,
                            onCheckedChange = {
                                dnd = it
                                if (it) onRequestDndSettings()
                            }
                        )
                        PermissionToggleCard(
                            title = "Daily Flow Cues",
                            subtitle = "Morning 5-breath primer, 90m RESET? & bedtime scan",
                            checked = notif,
                            onCheckedChange = { want ->
                                if (want && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                } else {
                                    notif = want
                                }
                            }
                        )
                        PermissionToggleCard(
                            title = "Step Counter",
                            subtitle = "Auto-adds exercise to Grow ring (2,000 steps = 15 min)",
                            checked = steps,
                            onCheckedChange = { want ->
                                if (want && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    stepLauncher.launch(Manifest.permission.ACTIVITY_RECOGNITION)
                                } else {
                                    steps = want
                                }
                            }
                        )
                    }

                    else -> {
                        Text(
                            text = "Grow calm. Grow smart. Daily.",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "No account needed. Works 100% offline. Your day is now two taps: FOCUS and RESET. Hold the progress ring 3 seconds anytime for Settings.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Bottom 1/3 one-hand primary button
            Button(
                onClick = {
                    if (step == 2) onStopSound()
                    if (step < 4) {
                        step++
                    } else {
                        onComplete(
                            prefs.copy(
                                selectedSkillId = skillId,
                                soundTheme = sound,
                                dndEnabled = dnd,
                                notificationsEnabled = notif,
                                stepCounterEnabled = steps
                            )
                        )
                    }
                },
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                Text(
                    text = if (step < 4) "Continue" else "Open MindLoop",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun PermissionToggleCard(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(22.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}
