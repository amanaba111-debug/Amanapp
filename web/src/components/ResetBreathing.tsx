import React, { useEffect, useState } from 'react';
import { Check, Pause, Play, Smartphone, Volume2, VolumeX, X } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';
import { haptics } from '../lib/haptics';

type BreathPhase = 'inhale' | 'hold' | 'exhale';

interface ResetBreathingProps {
  mode: 'standard' | 'morning_primer' | 'quick_widget';
  onComplete: (creditedMinutes: number, wasMorningPrimer: boolean) => void;
  onClose: () => void;
}

const PHASES_478: Array<{ phase: BreathPhase; seconds: number; label: string; sub: string }> = [
  { phase: 'inhale', seconds: 4, label: 'Inhale', sub: 'Quietly through your nose' },
  { phase: 'hold', seconds: 7, label: 'Hold', sub: 'Rest in calm stillness' },
  { phase: 'exhale', seconds: 8, label: 'Exhale', sub: 'Long, soft release through lips' },
];

const PHASES_MORNING: Array<{ phase: BreathPhase; seconds: number; label: string; sub: string }> = [
  { phase: 'inhale', seconds: 4, label: 'Breathe in', sub: 'Wake your lungs gently' },
  { phase: 'hold', seconds: 2, label: 'Pause', sub: 'Feel your shoulders soften' },
  { phase: 'exhale', seconds: 6, label: 'Let go', sub: 'Start clear and unhurried' },
];

export const ResetBreathing: React.FC<ResetBreathingProps> = ({
  mode,
  onComplete,
  onClose,
}) => {
  const isMorning = mode === 'morning_primer';
  const phases = isMorning ? PHASES_MORNING : PHASES_478;
  // 3 cycles × 19s = 57s (~1 min RESET); 5 cycles for morning 5-breath primer
  const totalCycles = isMorning ? 5 : 3;

  const [cycle, setCycle] = useState(1);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(phases[0].seconds);
  const [running, setRunning] = useState(true);
  const [chimesOn, setChimesOn] = useState(true);
  const [hapticOn, setHapticOn] = useState(true);
  const [done, setDone] = useState(false);

  const current = phases[phaseIdx];

  // Fire singing bowl + haptic guide on each phase transition
  useEffect(() => {
    if (!running || done) return;
    if (chimesOn) audioEngine.playBreathCue(current.phase);
    if (hapticOn) {
      if (current.phase === 'inhale') haptics.inhale();
      else if (current.phase === 'hold') haptics.hold();
      else haptics.exhale();
    }
  }, [cycle, phaseIdx, running, done, chimesOn, hapticOn, current.phase]);

  // 1-second phase ticker
  useEffect(() => {
    if (!running || done) return;
    const id = window.setInterval(() => {
      setSecLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Advance phase or cycle
        const nextPhaseIdx = phaseIdx + 1;
        if (nextPhaseIdx < phases.length) {
          setPhaseIdx(nextPhaseIdx);
          return phases[nextPhaseIdx].seconds;
        }
        if (cycle < totalCycles) {
          setCycle((c) => c + 1);
          setPhaseIdx(0);
          return phases[0].seconds;
        }

        // Completed all cycles
        setDone(true);
        setRunning(false);
        if (chimesOn) audioEngine.playBreathCue('complete');
        if (hapticOn) haptics.complete();
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, done, phaseIdx, cycle, totalCycles, phases, chimesOn, hapticOn]);

  useEffect(() => () => haptics.stop(), []);

  // Organic circle scale matched smoothly to phase duration
  const orbScale = done
    ? 0.92
    : current.phase === 'inhale'
      ? 1.08
      : current.phase === 'hold'
        ? 1.08
        : 0.62;

  const orbDurationMs = running ? current.seconds * 1000 : 300;
  const accentColor = isMorning ? 'var(--md-grow)' : 'var(--md-calm)';
  const accentSoft = isMorning ? 'var(--md-grow-soft)' : 'var(--md-calm-soft)';
  const onAccent = isMorning ? 'var(--md-on-grow)' : 'var(--md-on-calm)';

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center anim-fade select-none"
      style={{ backgroundColor: 'var(--md-bg)', color: 'var(--md-on-surface)' }}
    >
      <div className="w-full max-w-[430px] h-full flex flex-col justify-between px-6 pt-safe pb-safe">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            aria-label="Close breathing session"
            onClick={() => {
              haptics.stop();
              onClose();
            }}
            className="m3-press w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--md-surface-low)' }}
          >
            <X className="w-5 h-5" />
          </button>

          <span
            className="text-xs font-semibold tracking-wide"
            style={{ color: 'var(--md-on-surface-muted)' }}
          >
            {isMorning ? 'Morning 5-Breath Primer' : 'RESET · 4-7-8 Breath'}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={hapticOn ? 'Disable haptic guide' : 'Enable haptic guide'}
              onClick={() => setHapticOn((v) => !v)}
              className="m3-press w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: hapticOn ? accentSoft : 'var(--md-surface-low)',
                color: hapticOn ? accentColor : 'var(--md-on-surface-subtle)',
              }}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label={chimesOn ? 'Mute breathing chimes' : 'Unmute breathing chimes'}
              onClick={() => setChimesOn((v) => !v)}
              className="m3-press w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: chimesOn ? accentSoft : 'var(--md-surface-low)',
                color: chimesOn ? accentColor : 'var(--md-on-surface-subtle)',
              }}
            >
              {chimesOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center breathing sculpture */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 'clamp(184px, 29dvh, 252px)',
              height: 'clamp(184px, 29dvh, 252px)',
            }}
          >
            {/* Outer soft halo */}
            <div
              className="absolute inset-2 rounded-full"
              style={{
                backgroundColor: accentSoft,
                transform: `scale(${orbScale * 1.06})`,
                transition: `transform ${orbDurationMs}ms cubic-bezier(0.37, 0, 0.63, 1)`,
              }}
            />
            {/* Middle tonal ring */}
            <div
              className="absolute inset-8 rounded-full"
              style={{
                backgroundColor: accentSoft,
                border: `2px solid ${accentColor}`,
                opacity: 0.85,
                transform: `scale(${orbScale})`,
                transition: `transform ${orbDurationMs}ms cubic-bezier(0.37, 0, 0.63, 1)`,
              }}
            />
            {/* Core orb */}
            <div
              className="relative w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-sm"
              style={{
                backgroundColor: accentColor,
                color: onAccent,
                transform: `scale(${0.86 + (orbScale - 0.62) * 0.35})`,
                transition: `transform ${orbDurationMs}ms cubic-bezier(0.37, 0, 0.63, 1)`,
              }}
            >
              {done ? (
                <Check className="w-11 h-11 stroke-[2.6]" />
              ) : (
                <>
                  <span className="text-4xl font-semibold tabular-nums leading-none">
                    {secLeft}
                  </span>
                  <span className="text-xs font-semibold tracking-wide mt-1.5 opacity-90">
                    {current.label}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="text-center mt-8 min-h-[56px]">
            {done ? (
              <>
                <h2 className="text-xl font-semibold">
                  {isMorning ? 'Ring primed green' : 'Nervous system reset'}
                </h2>
                <p
                  className="text-xs mt-1.5"
                  style={{ color: 'var(--md-on-surface-muted)' }}
                >
                  {isMorning
                    ? 'Quiet until your first FOCUS session · +1 min Calm'
                    : '+1 minute added to your Calm ring'}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-medium">{current.sub}</p>
                {/* Cycle dots */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  {Array.from({ length: totalCycles }, (_, i) => {
                    const idx = i + 1;
                    const active = idx <= cycle;
                    return (
                      <span
                        key={idx}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: idx === cycle ? '22px' : '8px',
                          backgroundColor: active ? accentColor : 'var(--md-surface-high)',
                        }}
                      />
                    );
                  })}
                </div>
                <p
                  className="text-[11px] mt-2 tabular-nums"
                  style={{ color: 'var(--md-on-surface-subtle)' }}
                >
                  Breath {cycle} of {totalCycles}
                  {!isMorning ? ' · 4s in · 7s hold · 8s out' : ''}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bottom thumb zone */}
        <div className="space-y-2.5 shrink-0">
          {done ? (
            <button
              type="button"
              onClick={() => onComplete(1, isMorning)}
              className="m3-press w-full h-14 rounded-full font-semibold text-base"
              style={{ backgroundColor: accentColor, color: onAccent }}
            >
              Done
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  haptics.tap();
                  setRunning((r) => !r);
                }}
                className="m3-press flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--md-surface-low)',
                  color: 'var(--md-on-surface)',
                }}
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {running ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.complete();
                  onComplete(1, isMorning);
                }}
                className="m3-press h-13 px-5 rounded-full font-semibold text-sm"
                style={{
                  backgroundColor: accentSoft,
                  color: accentColor,
                }}
              >
                Finish +1m
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
