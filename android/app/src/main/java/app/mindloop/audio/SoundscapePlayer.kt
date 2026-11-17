package app.mindloop.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/**
 * Offline audio engine backed by Media3 ExoPlayer for downloaded audio packs,
 * with a seamless zero-asset PCM synthesizer fallback for Rain, Forest, Café, and Body-Scan.
 */
class SoundscapePlayer(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var exoPlayer: ExoPlayer? = null
    private var synthJob: Job? = null
    private var volume: Float = 0.55f

    fun setVolume(value: Float) {
        volume = value.coerceIn(0f, 1f)
        exoPlayer?.volume = volume
    }

    /**
     * Plays a calm theme ("rain", "forest", "cafe", or "body_scan").
     * Uses ExoPlayer when an offline pack file exists in filesDir/audio, otherwise synthesizes warmly.
     */
    fun startTheme(theme: String, targetVolume: Float = volume) {
        stop()
        volume = targetVolume.coerceIn(0f, 1f)

        val localTrack = File(context.filesDir, "audio/$theme.ogg")
        if (localTrack.exists()) {
            val player = ExoPlayer.Builder(context).build().apply {
                repeatMode = Player.REPEAT_MODE_ONE
                this.volume = this@SoundscapePlayer.volume
                setMediaItem(MediaItem.fromUri(Uri.fromFile(localTrack)))
                prepare()
                play()
            }
            exoPlayer = player
            return
        }

        // Offline procedural PCM soundscape so the APK sounds lush with zero bundled blobs
        synthJob = scope.launch {
            val sampleRate = 22_050
            val minBuf = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(4096)

            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(minBuf)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            val chunk = ShortArray(2048)
            var lp = 0.0
            var phase1 = 0.0
            var phase2 = 0.0
            val alpha = when (theme) {
                "rain" -> 0.22
                "forest" -> 0.11
                "cafe" -> 0.06
                else -> 0.04 // body_scan
            }

            try {
                track.play()
                while (isActive) {
                    val gain = (volume * 0.35).coerceIn(0.0, 0.5)
                    for (i in chunk.indices) {
                        val white = Random.nextDouble(-1.0, 1.0)
                        lp += alpha * (white - lp)
                        val sample = if (theme == "body_scan") {
                            phase1 += 2.0 * PI * 110.0 / sampleRate
                            phase2 += 2.0 * PI * 164.81 / sampleRate
                            (lp * 0.35 + sin(phase1) * 0.35 + sin(phase2) * 0.22) * gain
                        } else if (theme == "forest") {
                            phase1 += 2.0 * PI * 174.0 / sampleRate
                            (lp * 0.78 + sin(phase1) * 0.12) * gain
                        } else {
                            lp * 0.9 * gain
                        }
                        chunk[i] = (sample.coerceIn(-1.0, 1.0) * Short.MAX_VALUE).toInt().toShort()
                    }
                    track.write(chunk, 0, chunk.size)
                }
            } finally {
                runCatching {
                    track.stop()
                    track.release()
                }
            }
        }
    }

    fun stop() {
        synthJob?.cancel()
        synthJob = null
        exoPlayer?.run {
            stop()
            release()
        }
        exoPlayer = null
    }
}
