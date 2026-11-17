package app.mindloop.ui

import android.app.Activity
import android.view.WindowManager
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.mindloop.audio.HapticGuide
import app.mindloop.data.local.CardMasteryEntity
import app.mindloop.data.local.LessonPack
import app.mindloop.ui.theme.CalmDark
import kotlinx.coroutines.delay
import java.util.Locale
import kotlin.math.PI
import kotlin.math.sin

/**
 * 25-min Pomodoro (or 12-min missed-day Catch-up) + flash-cards + DND & social-app shield.
 */
@Composable
fun FocusSessionScreen(
    durationMin: Int,
    isCatchUp: Boolean,
    pack: LessonPack,
    mastery: Map<String, CardMasteryEntity>,
    soundTheme: String,
    onRateCard: (cardId: String, packId: String, delta: Int) -> Unit,
    onToggleSound: (Boolean) -> Unit,
    onComplete: (minutes: Int, cardsReviewed: Int, isCatchUp: Boolean) -> Unit,
    onDismiss: () -> Unit
) {
    val totalSec = durationMin * 60
    var secondsLeft by remember { mutableIntStateOf(totalSec) }
    var running by remember { mutableStateOf(true) }
    var soundOn by remember { mutableStateOf(true) }
    var cardIdx by remember { mutableIntStateOf(0) }
    var revealed by remember { mutableStateOf(false) }
    var reviewed by remember { mutableIntStateOf(0) }

    val queue = remember(pack.id) {
        pack.cards.sortedBy { mastery[it.id]?.box ?: 0 }
    }
    val card = queue.getOrNull(cardIdx % queue.size.coerceAtLeast(1))

    LaunchedEffect(running) {
        while (running && secondsLeft > 0) {
            delay(1_000L)
            secondsLeft--
        }
        if (secondsLeft == 0) {
            onComplete(durationMin, reviewed, isCatchUp)
        }
    }

    val mm = secondsLeft / 60
    val ss = secondsLeft % 60

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(20.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) { Text("Close") }
                    TextButton(
                        onClick = {
                            soundOn = !soundOn
                            onToggleSound(soundOn)
                        }
                    ) {
                        Text(if (soundOn) "Sound: ${soundTheme.replaceFirstChar { it.uppercase() }}" else "Sound off")
                    }
                }
                Text(
                    text = String.format(Locale.US, "%02d:%02d", mm, ss),
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold
                )
                LinearProgressIndicator(
                    progress = { (totalSec - secondsLeft).toFloat() / totalSec },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                )
            }

            if (card != null) {
                Surface(
                    onClick = { revealed = true },
                    shape = RoundedCornerShape(28.dp),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(vertical = 16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(22.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = card.category,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(
                                text = card.front,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                            if (!revealed && card.hint.isNotBlank()) {
                                Text(
                                    text = card.hint,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (revealed) {
                                Text(
                                    text = card.back,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.SemiBold
                                )
                                if (card.example.isNotBlank()) {
                                    Text(
                                        text = card.example,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                        Text(
                            text = if (revealed) "Rate recall below" else "Tap card to reveal",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!revealed) {
                    Button(
                        onClick = { revealed = true },
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        Text("Reveal Answer")
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("Again" to 0, "Got it" to 1, "Easy" to 2).forEach { (label, delta) ->
                            FilledTonalButton(
                                onClick = {
                                    card?.let { onRateCard(it.id, pack.id, delta) }
                                    reviewed++
                                    revealed = false
                                    cardIdx++
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp)
                            ) { Text(label) }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    OutlinedButton(onClick = { running = !running }) {
                        Text(if (running) "Pause" else "Resume")
                    }
                    TextButton(onClick = { onComplete(durationMin, reviewed, isCatchUp) }) {
                        Text("Complete +${durationMin}m")
                    }
                }
            }
        }
    }
}

/**
 * 1-minute 4-7-8 breathing animation + haptic guide (also serves 5-breath Morning Primer).
 */
@Composable
fun ResetBreathingScreen(
    isMorningPrimer: Boolean,
    haptics: HapticGuide,
    onComplete: (creditedMinutes: Int) -> Unit,
    onDismiss: () -> Unit
) {
    val phases = if (isMorningPrimer) {
        listOf(Triple("Breathe in", 4, 1.15f), Triple("Pause", 2, 1.15f), Triple("Let go", 6, 0.68f))
    } else {
        listOf(Triple("Inhale", 4, 1.18f), Triple("Hold", 7, 1.18f), Triple("Exhale", 8, 0.65f))
    }
    val totalCycles = if (isMorningPrimer) 5 else 3

    var cycle by remember { mutableIntStateOf(1) }
    var phaseIdx by remember { mutableIntStateOf(0) }
    var secLeft by remember { mutableIntStateOf(phases[0].second) }

    val current = phases[phaseIdx]
    val orbScale by animateFloatAsState(
        targetValue = current.third,
        animationSpec = tween(durationMillis = current.second * 1_000),
        label = "breathScale"
    )

    LaunchedEffect(cycle, phaseIdx) {
        when (phaseIdx) {
            0 -> haptics.inhale()
            1 -> haptics.hold()
            else -> haptics.exhale()
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1_000L)
            if (secLeft > 1) {
                secLeft--
            } else if (phaseIdx + 1 < phases.size) {
                phaseIdx++
                secLeft = phases[phaseIdx].second
            } else if (cycle < totalCycles) {
                cycle++
                phaseIdx = 0
                secLeft = phases[0].second
            } else {
                onComplete(1)
                break
            }
        }
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = onDismiss) { Text("Close") }
                Text(
                    text = if (isMorningPrimer) "5-Breath Primer" else "RESET · 4-7-8",
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.align(Alignment.CenterVertically)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(210.dp)
                        .scale(orbScale)
                        .background(CalmDark.copy(alpha = 0.2f), CircleShape)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(136.dp)
                            .background(CalmDark, CircleShape)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "$secLeft",
                                style = MaterialTheme.typography.displaySmall,
                                color = Color(0xFF061A2B),
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = current.first,
                                style = MaterialTheme.typography.labelLarge,
                                color = Color(0xFF061A2B)
                            )
                        }
                    }
                }
                Spacer(Modifier.height(28.dp))
                Text(
                    text = "Breath $cycle of $totalCycles",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            FilledTonalButton(
                onClick = { onComplete(1) },
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text("Finish +1m Calm")
            }
        }
    }
}

/**
 * Evening 1-tap body-scan audio (5, 10, or 15 min) -> dims window brightness & fades to pure black + Night Mode.
 */
@Composable
fun BodyScanScreen(
    activity: Activity,
    onStartAudio: () -> Unit,
    onStopAudio: () -> Unit,
    onComplete: (minutes: Int) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedMin by remember { mutableIntStateOf(10) }
    var started by remember { mutableStateOf(false) }
    var secLeft by remember { mutableIntStateOf(10 * 60) }
    var wavePhase by remember { mutableFloatStateOf(0f) }

    val zones = listOf(
        "Crown & Forehead · Unfurrow your brow",
        "Eyes & Jaw · Let eyelids grow heavy",
        "Shoulders · Drop deeper into the mattress",
        "Chest & Heart · Follow your slow breath",
        "Hands & Belly · Release every trace of effort",
        "Legs & Feet · Drift into quiet sleep"
    )

    // Restore system window brightness when leaving
    DisposableEffect(Unit) {
        onDispose {
            onStopAudio()
            val lp = activity.window.attributes
            lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
            activity.window.attributes = lp
        }
    }

    LaunchedEffect(started) {
        if (!started) return@LaunchedEffect
        val total = (selectedMin * 60).coerceAtLeast(1)
        while (secLeft > 0) {
            delay(1_000L)
            secLeft--
            val progress = 1f - (secLeft.toFloat() / total)
            // Gradually lower hardware OLED screen brightness down to 1%
            val lp = activity.window.attributes
            lp.screenBrightness = (0.35f * (1f - progress)).coerceAtLeast(0.01f)
            activity.window.attributes = lp
        }
        onComplete(selectedMin)
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(32L)
            wavePhase += if (started) 0.06f else 0.02f
        }
    }

    val progress = if (started) 1f - secLeft.toFloat() / (selectedMin * 60) else 0f
    val currentZone = zones[((progress * zones.size).toInt()).coerceIn(0, zones.lastIndex)]

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = onDismiss) { Text("Close", color = Color.White.copy(alpha = 0.7f)) }
                Text(
                    "Evening Body-Scan",
                    color = CalmDark,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.align(Alignment.CenterVertically)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Canvas(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(96.dp)
                ) {
                    val path = Path()
                    val midY = size.height / 2f
                    val steps = 80
                    for (i in 0..steps) {
                        val norm = i / steps.toFloat()
                        val x = norm * size.width
                        val env = sin(norm * PI).toFloat()
                        val y = midY + sin(norm * PI * 3.0 + wavePhase).toFloat() * 22.dp.toPx() * env
                        if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
                    }
                    drawPath(
                        path = path,
                        color = CalmDark.copy(alpha = (0.85f - progress * 0.6f).coerceAtLeast(0.15f)),
                        style = Stroke(width = 2.5.dp.toPx())
                    )
                }

                Spacer(Modifier.height(20.dp))

                if (!started) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        listOf(5, 10, 15).forEach { m ->
                            FilledTonalButton(
                                onClick = {
                                    selectedMin = m
                                    secLeft = m * 60
                                }
                            ) {
                                Text(
                                    text = "$m min",
                                    fontWeight = if (selectedMin == m) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                } else {
                    Text(
                        text = String.format(Locale.US, "%02d:%02d", secLeft / 60, secLeft % 60),
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White.copy(alpha = (0.85f - progress * 0.65f).coerceAtLeast(0.15f))
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = currentZone,
                        color = Color.White.copy(alpha = (0.65f - progress * 0.5f).coerceAtLeast(0.12f)),
                        textAlign = TextAlign.Center
                    )
                }
            }

            Button(
                onClick = {
                    if (!started) {
                        started = true
                        onStartAudio()
                    } else {
                        onComplete(selectedMin)
                    }
                },
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
            ) {
                Text(if (!started) "Start $selectedMin-min Body-Scan" else "Sleep Now (+${selectedMin}m Calm)")
            }
        }
    }
}
