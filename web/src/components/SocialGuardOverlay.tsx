import React, { useEffect, useState } from 'react';
import { Check, ShieldAlert, Wind } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';
import { haptics } from '../lib/haptics';
import { isInsideTimeWindow } from '../lib/stepTracker';
import type { SocialAppName } from '../types';

interface SocialGuardOverlayProps {
  appName: SocialAppName;
  lunchStart: string;
  lunchEnd: string;
  onCompleteBreath: () => void;
  onDismiss: () => void;
}

const QUICK_478 = [
  { label: 'Inhale', seconds: 4, scale: 1.12, cue: 'inhale' as const },
  { label: 'Hold', seconds: 7, scale: 1.12, cue: 'hold' as const },
  { label: 'Exhale', seconds: 8, scale: 0.72, cue: 'exhale' as const },
];

export const SocialGuardOverlay: React.FC<SocialGuardOverlayProps> = ({
  appName,
  lunchStart,
  lunchEnd,
  onCompleteBreath,
  onDismiss,
}) => {
  const [breathing, setBreathing] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(4);
  const [finished, setFinished] = useState(false);

  const inLunch = isInsideTimeWindow(lunchStart, lunchEnd);
  const phase = QUICK_478[phaseIdx];

  useEffect(() => {
    if (!breathing || finished) return;
    audioEngine.playBreathCue(phase.cue);
    if (phase.cue === 'inhale') haptics.inhale();
    else if (phase.cue === 'hold') haptics.hold();
    else haptics.exhale();
  }, [breathing, phaseIdx, finished, phase.cue]);

  useEffect(() => {
    if (!breathing || finished) return;
    const id = window.setInterval(() => {
      setSecLeft((s) => {
        if (s > 1) return s - 1;
        if (phaseIdx + 1 < QUICK_478.length) {
          setPhaseIdx(phaseIdx + 1);
          return QUICK_478[phaseIdx + 1].seconds;
        }
        setFinished(true);
        audioEngine.playBreathCue('complete');
        haptics.complete();
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [breathing, phaseIdx, finished]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`MindLoop 4-7-8 pause before ${appName}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-md anim-fade"
    >
      <div
        className="w-full max-w-[390px] rounded-[32px] p-6 text-center anim-up"
        style={{
          backgroundColor: 'var(--md-surface-card)',
          color: 'var(--md-on-surface)',
          border: '1px solid var(--md-outline-strong)',
        }}
      >
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
          style={{
            backgroundColor: 'var(--md-calm-soft)',
            color: 'var(--md-calm)',
          }}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Usage-Access 4-7-8 Bubble
        </div>

        {!breathing ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight">
              Opening {appName}?
            </h2>
            <p
              className="text-xs leading-relaxed mt-1.5"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              {inLunch
                ? `You're inside your ${lunchStart}–${lunchEnd} lunch window—still fancy one grounding 4-7-8 breath first?`
                : `It's outside your ${lunchStart}–${lunchEnd} lunch window. Pause for one 19-second 4-7-8 breath before scrolling.`}
            </p>

            {/* Floating calm bubble preview */}
            <div className="my-6 flex justify-center">
              <div
                className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
                style={{
                  backgroundColor: 'var(--md-calm-soft)',
                  color: 'var(--md-calm)',
                  border: '2px solid var(--md-calm)',
                }}
              >
                <Wind className="w-6 h-6 mb-1" />
                <span className="text-xs font-bold tabular-nums">4 · 7 · 8</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  haptics.tap();
                  setPhaseIdx(0);
                  setSecLeft(4);
                  setBreathing(true);
                }}
                className="m3-press w-full h-13 rounded-full font-semibold text-sm"
                style={{
                  backgroundColor: 'var(--md-calm)',
                  color: 'var(--md-on-calm)',
                }}
              >
                Breathe 4-7-8 instead (+1m Calm)
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.tap();
                  onDismiss();
                }}
                className="m3-press w-full h-11 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--md-surface-low)',
                  color: 'var(--md-on-surface-muted)',
                }}
              >
                Dismiss overlay
              </button>
            </div>
          </>
        ) : finished ? (
          <div className="py-2 anim-fade">
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'var(--md-calm-soft)',
                color: 'var(--md-calm)',
              }}
            >
              <Check className="w-9 h-9 stroke-[2.6]" />
            </div>
            <h3 className="text-lg font-semibold">Urge surfed · Mind clear</h3>
            <p
              className="text-xs mt-1 mb-6"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              +1 min added to your Calm ring. Return to what matters.
            </p>
            <button
              type="button"
              onClick={onCompleteBreath}
              className="m3-press w-full h-13 rounded-full font-semibold text-sm"
              style={{
                backgroundColor: 'var(--md-calm)',
                color: 'var(--md-on-calm)',
              }}
            >
              Close {appName} & Return
            </button>
          </div>
        ) : (
          <div className="py-2 anim-fade">
            <div className="my-5 h-32 flex items-center justify-center">
              <div
                className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
                style={{
                  backgroundColor: 'var(--md-calm)',
                  color: 'var(--md-on-calm)',
                  transform: `scale(${phase.scale})`,
                  transition: `transform ${phase.seconds * 1000}ms cubic-bezier(0.37, 0, 0.63, 1)`,
                }}
              >
                <span className="text-3xl font-semibold tabular-nums leading-none">
                  {secLeft}
                </span>
                <span className="text-[11px] font-semibold mt-1">{phase.label}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCompleteBreath}
              className="m3-press w-full h-11 rounded-full text-xs font-semibold mt-2"
              style={{
                backgroundColor: 'var(--md-calm-soft)',
                color: 'var(--md-calm)',
              }}
            >
              Complete & close {appName} (+1m)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
