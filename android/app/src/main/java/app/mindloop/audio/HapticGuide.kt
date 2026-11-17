package app.mindloop.audio

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Tactile haptic cues for 4-7-8 breathing, water refill, and 3-second ring long-press.
 * Safe across Android 7.0 (API 24) through Android 15 (API 35).
 */
class HapticGuide(context: Context) {
    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    fun inhale() = waveform(longArrayOf(0, 30, 70, 45))
    fun hold() = oneShot(22)
    fun exhale() = waveform(longArrayOf(0, 50, 90, 28))
    fun waterDrop() = waveform(longArrayOf(0, 16, 35, 24))
    fun ringUnlock() = waveform(longArrayOf(0, 22, 40, 60))
    fun complete() = waveform(longArrayOf(0, 35, 55, 45, 55, 75))

    private fun oneShot(durationMs: Long) {
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(durationMs)
        }
    }

    private fun waveform(timings: LongArray) {
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createWaveform(timings, -1))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(timings, -1)
        }
    }
}
