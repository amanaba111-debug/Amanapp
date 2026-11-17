package app.mindloop.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

// Semantic Grow (green) & Calm (blue) accents harmonized across Light, Dark & AMOLED
val GrowLight = Color(0xFF237451)
val GrowDark = Color(0xFF69DA9E)
val CalmLight = Color(0xFF23649E)
val CalmDark = Color(0xFF7CC4FA)

private val FallbackLight = lightColorScheme(
    primary = Color(0xFF256B4D),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD3F0DF),
    onPrimaryContainer = Color(0xFF0D2F20),
    secondary = CalmLight,
    onSecondary = Color.White,
    background = Color(0xFFF5F7F3),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFE7EDE4)
)

private val FallbackDark = darkColorScheme(
    primary = GrowDark,
    onPrimary = Color(0xFF072818),
    primaryContainer = Color(0xFF173D2B),
    onPrimaryContainer = Color(0xFFD3F5E3),
    secondary = CalmDark,
    onSecondary = Color(0xFF062138),
    background = Color(0xFF0E1511),
    surface = Color(0xFF151E19),
    surfaceVariant = Color(0xFF1D2922)
)

/**
 * Pure Material You theme: pulls dynamic colors from the user's wallpaper on Android 12+,
 * and supports true #000000 AMOLED black automatically at night or on demand.
 */
@Composable
fun MindLoopTheme(
    themeMode: String = "auto",
    nightModeActive: Boolean = false,
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    val systemDark = isSystemInDarkTheme()
    val useAmoled = nightModeActive || themeMode == "amoled"
    val useDark = useAmoled || themeMode == "dark" || (themeMode == "auto" && systemDark)

    val baseScheme = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (useDark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    } else {
        if (useDark) FallbackDark else FallbackLight
    }

    val finalScheme = if (useAmoled) {
        baseScheme.copy(
            background = Color.Black,
            surface = Color(0xFF0B0F0D),
            surfaceContainer = Color(0xFF0E1310)
        )
    } else {
        baseScheme
    }

    MaterialTheme(
        colorScheme = finalScheme,
        content = content
    )
}
