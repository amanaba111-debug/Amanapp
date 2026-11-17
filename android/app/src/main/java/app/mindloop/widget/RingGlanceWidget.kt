package app.mindloop.widget

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import app.mindloop.MainActivity
import app.mindloop.data.repository.MindLoopRepository

/**
 * 2×1 Home-Screen Widget: shows today's Grow (60m) & Calm (30m) progress without opening the app.
 */
class RingGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val repo = MindLoopRepository(context)
        val prefs = repo.getPrefsOnce()
        val daily = repo.getTodayOnce()
        val growPct = ((daily.totalGrowMinutes * 100) / prefs.growTargetMin.coerceAtLeast(1)).coerceAtMost(100)
        val calmPct = ((daily.calmMinutes * 100) / prefs.calmTargetMin.coerceAtLeast(1)).coerceAtMost(100)

        provideContent {
            GlanceTheme {
                Row(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .cornerRadius(24.dp)
                        .background(Color(0xFF111915))
                        .clickable(actionStartActivity<MainActivity>())
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = GlanceModifier.defaultWeight()) {
                        Text(
                            text = "Grow · $growPct%",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFF69DA9E)),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        )
                        Text(
                            text = "${daily.totalGrowMinutes}/${prefs.growTargetMin}m",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFFA9B8B0)),
                                fontSize = 11.sp
                            )
                        )
                    }
                    Spacer(modifier = GlanceModifier.width(12.dp))
                    Column(modifier = GlanceModifier.defaultWeight()) {
                        Text(
                            text = "Calm · $calmPct%",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFF7CC4FA)),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        )
                        Text(
                            text = "${daily.calmMinutes}/${prefs.calmTargetMin}m",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFFA9B8B0)),
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        }
    }

    companion object {
        suspend fun refreshAll(context: Context) {
            runCatching { RingGlanceWidget().updateAll(context) }
        }
    }
}

class RingWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = RingGlanceWidget()
}

/**
 * 1×1 "Breathe" Widget: single tap launches instant 4-7-8 overlay anywhere.
 */
class BreatheGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            GlanceTheme {
                Box(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .cornerRadius(24.dp)
                        .background(Color(0xFF1D5C92))
                        .clickable(actionStartActivity<BreatheOverlayActivity>())
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        modifier = GlanceModifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "4·7·8",
                            style = TextStyle(
                                color = ColorProvider(Color.White),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        )
                        Text(
                            text = "Breathe",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFFD5ECFF)),
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        }
    }
}

class BreatheWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = BreatheGlanceWidget()
}
