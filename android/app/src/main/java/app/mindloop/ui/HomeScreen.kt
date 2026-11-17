package app.mindloop.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Air
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.mindloop.ui.theme.CalmDark
import app.mindloop.ui.theme.CalmLight
import app.mindloop.ui.theme.GrowDark
import app.mindloop.ui.theme.GrowLight
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val MOOD_MAP = mapOf(1 to "😔", 2 to "😕", 3 to "😌", 4 to "🙂", 5 to "😊")

/**
 * Zero-clutter single Home Screen:
 * - Top card: Concentric Grow (60 min) + Calm (30 min) progress ring (3-s hold opens Settings)
 * - Bottom 1/3 thumb zone: FOCUS (green) & RESET (blue) primary toggles
 * - Bottom mini-bar: Steps (live) · Water (1-tap glass refill) · Mood (emoji slider)
 */
@Composable
fun HomeScreen(
    state: MindLoopUiState,
    onStartFocus: (durationMin: Int, isCatchUp: Boolean) -> Unit,
    onStartReset: (isMorningPrimer: Boolean) -> Unit,
    onOpenBodyScan: () -> Unit,
    onTapWater: () -> Unit,
    onOpenMood: () -> Unit,
    onOpenSettings: () -> Unit
) {
    val dark = state.prefs.nightModeActive || state.prefs.themeMode in listOf("dark", "amoled") ||
        (state.prefs.themeMode == "auto" && isSystemInDarkTheme())
    val growColor = if (dark) GrowDark else GrowLight
    val calmColor = if (dark) CalmDark else CalmLight

    val growMin = state.daily.totalGrowMinutes
    val calmMin = state.daily.calmMinutes
    val growPct by animateFloatAsState(
        targetValue = (growMin.toFloat() / state.prefs.growTargetMin.coerceAtLeast(1)).coerceIn(0f, 1f),
        animationSpec = tween(600),
        label = "growPct"
    )
    val calmPct by animateFloatAsState(
        targetValue = (calmMin.toFloat() / state.prefs.calmTargetMin.coerceAtLeast(1)).coerceIn(0f, 1f),
        animationSpec = tween(600),
        label = "calmPct"
    )

    var holdRatio by remember { mutableFloatStateOf(0f) }
    val scope = rememberCoroutineScope()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Minimal top bar: Wordmark + Evening Moon button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "MindLoop",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "Hold ring 3s for settings",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
                    IconButton(onClick = onOpenBodyScan) {
                        Icon(
                            imageVector = Icons.Rounded.Bedtime,
                            contentDescription = "Evening body-scan",
                            tint = calmColor
                        )
                    }
                }
            }

            // Contextual single cue (12-min Catch-up OR Morning 5-breath primer)
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (state.missedYesterday && state.daily.focusMinutes == 0) {
                    Surface(
                        onClick = { onStartFocus(12, true) },
                        shape = RoundedCornerShape(50),
                        color = MaterialTheme.colorScheme.secondaryContainer
                    ) {
                        Text(
                            text = "Missed yesterday? Tap for a 12-min Catch-up →",
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp)
                        )
                    }
                } else if (!state.daily.morningPrimed && state.daily.focusMinutes == 0) {
                    Surface(
                        onClick = { onStartReset(true) },
                        shape = RoundedCornerShape(50),
                        color = growColor.copy(alpha = 0.14f)
                    ) {
                        Text(
                            text = "Morning · 5-breath primer →",
                            style = MaterialTheme.typography.labelMedium,
                            color = growColor,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp)
                        )
                    }
                }

                // Concentric Progress Ring Card with 3-second long-press for Settings
                Surface(
                    shape = RoundedCornerShape(32.dp),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier
                        .fillMaxWidth()
                        .pointerInput(Unit) {
                            awaitEachGesture {
                                awaitFirstDown(requireUnconsumed = false)
                                val ticker = scope.launch {
                                    val start = System.currentTimeMillis()
                                    while (true) {
                                        val elapsed = System.currentTimeMillis() - start
                                        holdRatio = if (elapsed > 180) {
                                            (elapsed / 3_000f).coerceAtMost(1f)
                                        } else {
                                            0f
                                        }
                                        if (elapsed >= 3_000L) {
                                            holdRatio = 0f
                                            onOpenSettings()
                                            break
                                        }
                                        delay(16L)
                                    }
                                }
                                waitForUpOrCancellation()
                                ticker.cancel()
                                holdRatio = 0f
                            }
                        }
                ) {
                    Column(
                        modifier = Modifier.padding(22.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(210.dp)) {
                            val primary = MaterialTheme.colorScheme.primary
                            Canvas(modifier = Modifier.fillMaxSize()) {
                                val stroke = 15.dp.toPx()
                                val outerInset = stroke
                                val innerInset = stroke * 2.55f

                                if (holdRatio > 0f) {
                                    drawArc(
                                        color = primary,
                                        startAngle = -90f,
                                        sweepAngle = 360f * holdRatio,
                                        useCenter = false,
                                        style = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round)
                                    )
                                }

                                // Outer ring: Grow 60 min
                                val outerSize = Size(size.width - outerInset * 2, size.height - outerInset * 2)
                                drawArc(
                                    color = growColor.copy(alpha = 0.16f),
                                    startAngle = -90f,
                                    sweepAngle = 360f,
                                    useCenter = false,
                                    topLeft = Offset(outerInset, outerInset),
                                    size = outerSize,
                                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                                )
                                val visibleGrow = if (growPct > 0f) growPct else if (state.daily.morningPrimed) 0.05f else 0f
                                if (visibleGrow > 0f) {
                                    drawArc(
                                        color = growColor,
                                        startAngle = -90f,
                                        sweepAngle = 360f * visibleGrow,
                                        useCenter = false,
                                        topLeft = Offset(outerInset, outerInset),
                                        size = outerSize,
                                        style = Stroke(width = stroke, cap = StrokeCap.Round)
                                    )
                                }

                                // Inner ring: Calm 30 min
                                val innerSize = Size(size.width - innerInset * 2, size.height - innerInset * 2)
                                drawArc(
                                    color = calmColor.copy(alpha = 0.16f),
                                    startAngle = -90f,
                                    sweepAngle = 360f,
                                    useCenter = false,
                                    topLeft = Offset(innerInset, innerInset),
                                    size = innerSize,
                                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                                )
                                if (calmPct > 0f) {
                                    drawArc(
                                        color = calmColor,
                                        startAngle = -90f,
                                        sweepAngle = 360f * calmPct,
                                        useCenter = false,
                                        topLeft = Offset(innerInset, innerInset),
                                        size = innerSize,
                                        style = Stroke(width = stroke, cap = StrokeCap.Round)
                                    )
                                }
                            }

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                val pct = (((growPct + calmPct) / 2f) * 100).toInt()
                                Text(
                                    text = if (holdRatio > 0f) "Settings…" else "$pct%",
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = state.activePack.title.removeSuffix(" 4-Week"),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Grow $growMin/${state.prefs.growTargetMin}m",
                                style = MaterialTheme.typography.labelLarge,
                                color = growColor,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Calm $calmMin/${state.prefs.calmTargetMin}m",
                                style = MaterialTheme.typography.labelLarge,
                                color = calmColor,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            // Bottom 1/3 ergonomic thumb zone: FOCUS (green) + RESET (blue) + Mini-Bar
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { onStartFocus(25, false) },
                    shape = RoundedCornerShape(26.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = growColor,
                        contentColor = if (dark) Color(0xFF062516) else Color.White
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(66.dp)
                ) {
                    Icon(Icons.Rounded.PlayArrow, contentDescription = null)
                    Text(
                        text = "  FOCUS · 25 min",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Button(
                    onClick = { onStartReset(false) },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = calmColor,
                        contentColor = if (dark) Color(0xFF061E33) else Color.White
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(58.dp)
                ) {
                    Icon(Icons.Rounded.Air, contentDescription = null)
                    Text(
                        text = "  RESET · 1 min 4-7-8",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Bottom mini-bar: Steps (live) · Water (tap glass) · Mood (emoji slider)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MiniBarPill(
                        modifier = Modifier.weight(1f),
                        top = "${state.daily.steps}",
                        bottom = if (state.daily.exerciseMinutes > 0) {
                            "+${state.daily.exerciseMinutes}m Grow"
                        } else {
                            "Steps"
                        },
                        onClick = {}
                    )
                    Surface(
                        onClick = onTapWater,
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surface,
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Rounded.WaterDrop,
                                    contentDescription = null,
                                    tint = calmColor,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(
                                    text = " ${state.daily.waterGlasses}/8",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Text(
                                text = "Water",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    MiniBarPill(
                        modifier = Modifier.weight(1f),
                        top = state.daily.mood?.let { MOOD_MAP[it] } ?: "🙂",
                        bottom = "Mood",
                        onClick = onOpenMood
                    )
                }
            }
        }
    }
}

@Composable
private fun MiniBarPill(
    modifier: Modifier,
    top: String,
    bottom: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = modifier.height(56.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = top, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Text(
                text = bottom,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
