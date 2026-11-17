import React, { useEffect, useRef, useState } from 'react';
import { Check, Mic, MicOff, Moon, Pause, Play, X } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';
import { haptics } from '../lib/haptics';

interface BodyScanSheetProps {
  initialDuration?: 5 | 10 | 15;
  voiceGuideEnabled: boolean;
  onToggleVoiceGuide: (enabled: boolean) => void;
  onComplete: (minutes: number, activateNightMode: boolean) => void;
  onClose: () => void;
}

const BODY_ZONES = [
  {
    zone: 'Crown & Forehead',
    cue: 'Unfurrow your brow. Let every thought from today settle like snow.',
  },
  {
    zone: 'Eyes & Jaw',
    cue: 'Rest your eyelids heavily. Unclench your jaw and let your tongue float.',
  },
  {
    zone: 'Neck & Shoulders',
    cue: 'Let both shoulders drop an inch deeper into the mattress with each exhale.',
  },
  {
    zone: 'Chest & Heart',
    cue: 'Notice the slow tide of your ribs rising and falling all on their own.',
  },
  {
    zone: 'Arms & Hands',
    cue: 'Feel quiet warmth travel from your elbows down into every fingertip.',
  },
  {
    zone: 'Belly & Lower Back',
    cue: 'Release any holding in your stomach. Nothing left to carry tonight.',
  },
  {
    zone: 'Hips & Legs',
    cue: 'Allow your thighs, knees, and calves to grow pleasantly heavy and still.',
  },
  {
    zone: 'Feet & Deep Sleep',
    cue: 'Your whole body rests in darkness. Screen fading out—sleep well.',
  },
];

export const BodyScanSheet: React.FC<BodyScanSheetProps> = ({
  initialDuration = 10,
  voiceGuideEnabled,
  onToggleVoiceGuide,
  onComplete,
  onClose,
}) => {
  const [durationMin, setDurationMin] = useState<5 | 10 | 15>(initialDuration);
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialDuration * 60);
  const [screenBlackout, setScreenBlackout] = useState(false);
  const [finished, setFinished] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastZoneRef = useRef<number>(-1);

  const totalSec = durationMin * 60;
  const elapsed = Math.max(0, totalSec - secondsLeft);
  const progress = Math.min(1, elapsed / totalSec);
  const zoneIdx = Math.min(
    BODY_ZONES.length - 1,
    Math.floor(progress * BODY_ZONES.length)
  );
  const currentZone = BODY_ZONES[zoneIdx];

  // Progressive automatic screen fade-to-black across session (0 -> 0.88 opacity, 1.0 at finish)
  const autoFadeOpacity = finished ? 0.96 : started ? Math.min(0.84, progress * 0.92) : 0;

  // Start / pause body-scan restorative audio
  useEffect(() => {
    if (started && running && !finished) {
      audioEngine.startBodyScanAudio();
    } else {
      audioEngine.stopBodyScanAudio();
    }
    return () => {
      audioEngine.stopBodyScanAudio();
    };
  }, [started, running, finished]);

  // Bell + optional gentle voice prompt when advancing to a new body zone
  useEffect(() => {
    if (!started || !running || finished) return;
    if (lastZoneRef.current !== zoneIdx) {
      lastZoneRef.current = zoneIdx;
      audioEngine.playBodyScanZoneBell();
      if (voiceGuideEnabled) {
        audioEngine.speakCalmPrompt(`${currentZone.zone}. ${currentZone.cue}`);
      }
    }
  }, [zoneIdx, started, running, finished, voiceGuideEnabled, currentZone]);

  // Countdown + final 30-second gentle audio fade-out
  useEffect(() => {
    if (!started || !running || finished) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 30 && prev > 1) {
          audioEngine.setBodyScanFadeFactor(prev / 30);
        }
        if (prev <= 1) {
          window.clearInterval(id);
          audioEngine.stopBodyScanAudio();
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, running, finished]);

  // Smooth AMOLED audio wave canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    const data = new Uint8Array(64);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      let energy = running ? 0.38 : 0.14;
      const analyser = audioEngine.getScanAnalyser();
      if (analyser && running) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        energy = Math.min(0.85, 0.28 + Math.sqrt(sum / data.length) * 2.8);
      }

      phase += running ? 0.022 : 0.008;
      const midY = h / 2;

      [
        { amp: 22 * energy, freq: 1.5, speed: 1, alpha: 0.85, width: 2.2 },
        { amp: 15 * energy, freq: 2.3, speed: -0.7, alpha: 0.42, width: 1.6 },
        { amp: 9 * energy, freq: 3.1, speed: 1.3, alpha: 0.22, width: 1.2 },
      ].forEach((wave) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const norm = x / w;
          // Smooth bell-curve envelope so ends taper silently
          const env = Math.sin(norm * Math.PI);
          const y =
            midY +
            Math.sin(norm * Math.PI * 2 * wave.freq + phase * wave.speed) *
              wave.amp *
              env;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(118, 188, 248, ${wave.alpha})`;
        ctx.lineWidth = wave.width;
        ctx.stroke();
      });

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [running, started]);

  const handleStart = () => {
    haptics.tap();
    lastZoneRef.current = -1;
    setSecondsLeft(durationMin * 60);
    setStarted(true);
    setRunning(true);
    setFinished(false);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center select-none anim-fade"
      style={{ backgroundColor: '#030507', color: '#E4ECF2' }}
    >
      {/* Pure AMOLED blackout veil — tap anywhere to wake softly */}
      {screenBlackout && !finished && (
        <button
          type="button"
          onClick={() => setScreenBlackout(false)}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-end pb-12 text-white/20 text-xs"
        >
          <span className="tabular-nums">
            {mm}:{ss} · tap anywhere to wake screen
          </span>
        </button>
      )}

      {/* Progressive fade-to-black overlay */}
      {autoFadeOpacity > 0 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
          style={{ backgroundColor: '#000000', opacity: autoFadeOpacity * 0.72 }}
        />
      )}

      <div className="relative z-10 w-full max-w-[430px] h-full flex flex-col justify-between px-6 pt-safe pb-safe">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            aria-label="Close evening body-scan"
            onClick={() => {
              audioEngine.stopBodyScanAudio();
              onClose();
            }}
            className="m3-press w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.07] text-white/80"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7CC4FA]">
            <Moon className="w-3.5 h-3.5" />
            Evening Body-Scan
          </span>

          <button
            type="button"
            aria-label={voiceGuideEnabled ? 'Disable spoken cues' : 'Enable spoken cues'}
            title={voiceGuideEnabled ? 'Voice guide on' : 'Voice guide off'}
            onClick={() => {
              haptics.tap();
              onToggleVoiceGuide(!voiceGuideEnabled);
            }}
            className="m3-press w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: voiceGuideEnabled
                ? 'rgba(124,196,250,0.18)'
                : 'rgba(255,255,255,0.07)',
              color: voiceGuideEnabled ? '#7CC4FA' : 'rgba(255,255,255,0.6)',
            }}
          >
            {voiceGuideEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Center audio wave + body zone guide */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <canvas ref={canvasRef} className="w-full h-28 mb-4" />

          {finished ? (
            <div className="anim-fade flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-[#7CC4FA]/15 text-[#7CC4FA] flex items-center justify-center mb-4">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-semibold text-white/90">Sleep tight</h2>
              <p className="text-xs text-white/50 mt-1.5 max-w-[250px]">
                +{durationMin} min added to Calm · AMOLED Night Mode active.
              </p>
            </div>
          ) : !started ? (
            <div className="anim-fade">
              <h2 className="text-2xl font-semibold tracking-tight text-white/95">
                Unwind & fade to black
              </h2>
              <p className="text-sm text-white/55 mt-2 max-w-[290px] mx-auto leading-relaxed">
                Warm restorative audio guides you from head to toe, dims the screen to pure black,
                and turns on Night Mode.
              </p>

              {/* 5, 10, or 15 min selector */}
              <div className="grid grid-cols-3 gap-2.5 mt-7">
                {([5, 10, 15] as const).map((m) => {
                  const active = durationMin === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        haptics.tap();
                        setDurationMin(m);
                        setSecondsLeft(m * 60);
                      }}
                      className="m3-press h-13 rounded-2xl font-semibold text-sm tabular-nums transition-colors"
                      style={{
                        backgroundColor: active
                          ? 'rgba(124, 196, 250, 0.22)'
                          : 'rgba(255, 255, 255, 0.06)',
                        color: active ? '#9BD2FC' : 'rgba(255,255,255,0.72)',
                        border: `1.5px solid ${active ? '#7CC4FA' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {m} min
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="anim-fade">
              <span className="text-3xl font-semibold tabular-nums text-white/85">
                {mm}:{ss}
              </span>
              <h3 className="text-lg font-semibold text-[#9BD2FC] mt-4">
                {currentZone.zone}
              </h3>
              <p className="text-sm text-white/60 mt-2 max-w-[290px] mx-auto leading-relaxed">
                {currentZone.cue}
              </p>
              <button
                type="button"
                onClick={() => setScreenBlackout(true)}
                className="m3-press mt-5 px-4 py-2 rounded-full text-xs font-medium bg-white/[0.06] text-white/55"
              >
                Fade screen to pure black now
              </button>
            </div>
          )}
        </div>

        {/* Bottom thumb zone */}
        <div className="space-y-2.5 shrink-0">
          {finished ? (
            <button
              type="button"
              onClick={() => onComplete(durationMin, true)}
              className="m3-press w-full h-14 rounded-full font-semibold text-base bg-[#7CC4FA] text-[#061826]"
            >
              Goodnight · +{durationMin}m Calm
            </button>
          ) : !started ? (
            <button
              type="button"
              onClick={handleStart}
              className="m3-press w-full h-14 rounded-full font-semibold text-base bg-[#7CC4FA] text-[#061826]"
            >
              Start {durationMin}-min Body-Scan
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  haptics.tap();
                  setRunning((r) => !r);
                }}
                className="m3-press flex-1 h-13 rounded-full text-sm font-semibold bg-white/[0.08] text-white/85 flex items-center justify-center gap-2"
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {running ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopBodyScanAudio();
                  haptics.complete();
                  onComplete(durationMin, true);
                }}
                className="m3-press h-13 px-5 rounded-full text-sm font-semibold bg-[#7CC4FA]/20 text-[#9BD2FC]"
              >
                Sleep now +{durationMin}m
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
