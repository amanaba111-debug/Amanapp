import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { haptics } from '../lib/haptics';

interface ProgressRingProps {
  growMinutes: number;
  growTarget: number;
  calmMinutes: number;
  calmTarget: number;
  morningPrimed: boolean;
  skillLabel: string;
  curriculumWeek: number;
  onLongPressSettings: () => void;
}

const HOLD_DURATION_MS = 3000;

export const ProgressRing: React.FC<ProgressRingProps> = ({
  growMinutes,
  growTarget,
  calmMinutes,
  calmTarget,
  morningPrimed,
  skillLabel,
  curriculumWeek,
  onLongPressSettings,
}) => {
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const rafRef = useRef<number | null>(null);
  const startMsRef = useRef<number | null>(null);
  const unlockedRef = useRef(false);

  const growPct = Math.min(1, growTarget > 0 ? growMinutes / growTarget : 0);
  const calmPct = Math.min(1, calmTarget > 0 ? calmMinutes / calmTarget : 0);
  const growPercentInt = Math.min(100, Math.round(growPct * 100));
  const calmPercentInt = Math.min(100, Math.round(calmPct * 100));
  const combinedPct = Math.round(((growPct + calmPct) / 2) * 100);
  const allComplete = growPct >= 1 && calmPct >= 1;

  // Concentric geometry (viewBox 240x240)
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const rHold = 109;
  const rGrow = 94;
  const rCalm = 71;

  const cHold = 2 * Math.PI * rHold;
  const cGrow = 2 * Math.PI * rGrow;
  const cCalm = 2 * Math.PI * rCalm;

  // Show a soft primed green arc on the outer ring when morning 5-breath primer is done
  const visibleGrowPct = growPct > 0 ? growPct : morningPrimed ? 0.045 : 0;

  const cancelHold = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startMsRef.current = null;
    setHoldProgress(0);
  };

  useEffect(() => () => cancelHold(), []);

  const startHold = () => {
    cancelHold();
    unlockedRef.current = false;
    startMsRef.current = performance.now();

    const tick = (now: number) => {
      if (startMsRef.current === null) return;
      const elapsed = now - startMsRef.current;
      const ratio = Math.min(1, elapsed / HOLD_DURATION_MS);
      // Only show visual ring after 180ms so normal taps stay completely quiet
      setHoldProgress(elapsed > 180 ? ratio : 0);

      if (ratio >= 1 && !unlockedRef.current) {
        unlockedRef.current = true;
        cancelHold();
        haptics.longPressUnlock();
        onLongPressSettings();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      onLongPressSettings();
    }
  };

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={`Today's loop: Grow ${growMinutes} of ${growTarget} minutes, Calm ${calmMinutes} of ${calmTarget} minutes. Press and hold 3 seconds for settings.`}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      className="w-full rounded-[30px] px-5 pt-4 pb-3.5 flex flex-col items-center select-none touch-none transition-transform duration-200 outline-none"
      style={{
        backgroundColor: 'var(--md-surface-card)',
        border: `1px solid ${morningPrimed && growPct === 0 ? 'var(--md-grow)' : 'var(--md-outline)'}`,
        transform: holdProgress > 0 ? 'scale(0.988)' : 'scale(1)',
      }}
    >
      {/* Concentric SVG ring — fluidly adapts to both tall phones & compact preview panes */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 'clamp(152px, 24.5dvh, 214px)',
          height: 'clamp(152px, 24.5dvh, 214px)',
        }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          {/* 3-second hold progress halo */}
          {holdProgress > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={rHold}
              fill="none"
              stroke="var(--md-primary)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={cHold}
              strokeDashoffset={cHold * (1 - holdProgress)}
              opacity={0.85}
            />
          )}

          {/* Outer Track: Grow (60 min) */}
          <circle
            cx={cx}
            cy={cy}
            r={rGrow}
            fill="none"
            stroke="var(--md-grow-track)"
            strokeWidth="15"
          />
          {visibleGrowPct > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={rGrow}
              fill="none"
              stroke="var(--md-grow)"
              strokeWidth="15"
              strokeLinecap="round"
              strokeDasharray={cGrow}
              strokeDashoffset={cGrow * (1 - visibleGrowPct)}
              style={{
                transition: 'stroke-dashoffset 650ms cubic-bezier(0.2, 0, 0, 1)',
              }}
            />
          )}

          {/* Inner Track: Calm (30 min) */}
          <circle
            cx={cx}
            cy={cy}
            r={rCalm}
            fill="none"
            stroke="var(--md-calm-track)"
            strokeWidth="15"
          />
          {calmPct > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={rCalm}
              fill="none"
              stroke="var(--md-calm)"
              strokeWidth="15"
              strokeLinecap="round"
              strokeDasharray={cCalm}
              strokeDashoffset={cCalm * (1 - calmPct)}
              style={{
                transition: 'stroke-dashoffset 650ms cubic-bezier(0.2, 0, 0, 1)',
              }}
            />
          )}
        </svg>

        {/* Center readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          {holdProgress > 0 ? (
            <>
              <span
                className="text-2xl font-semibold tabular-nums"
                style={{ color: 'var(--md-primary)' }}
              >
                {Math.max(1, Math.ceil((1 - holdProgress) * 3))}s
              </span>
              <span
                className="text-[11px] font-medium mt-0.5"
                style={{ color: 'var(--md-on-surface-muted)' }}
              >
                Settings
              </span>
            </>
          ) : allComplete ? (
            <>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                style={{
                  backgroundColor: 'var(--md-grow-soft)',
                  color: 'var(--md-grow)',
                }}
              >
                <Check className="w-4 h-4 stroke-[2.8]" />
              </div>
              <span className="text-xl font-semibold tabular-nums tracking-tight">100%</span>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--md-on-surface-muted)' }}
              >
                Loop complete
              </span>
            </>
          ) : (
            <>
              <span className="text-[2rem] leading-none font-semibold tabular-nums tracking-tight">
                {combinedPct}%
              </span>
              <span
                className="text-[11px] font-medium mt-1.5 truncate max-w-[110px]"
                style={{ color: 'var(--md-on-surface-muted)' }}
              >
                {morningPrimed && combinedPct === 0
                  ? 'Primed · Ready'
                  : `${skillLabel.replace(' 4-Week', '')} · W${curriculumWeek}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Compact two-target summary row */}
      <div className="w-full grid grid-cols-2 gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--md-outline)' }}>
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--md-grow)' }}
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold">Grow</span>
              {growPercentInt >= 100 && (
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--md-grow)' }}
                >
                  100%
                </span>
              )}
            </div>
            <div
              className="text-xs tabular-nums"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              <strong style={{ color: 'var(--md-on-surface)' }}>{growMinutes}</strong> / {growTarget} min
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-end text-right">
          <div className="min-w-0">
            <div className="flex items-baseline justify-end gap-1.5">
              {calmPercentInt >= 100 && (
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--md-calm)' }}
                >
                  100%
                </span>
              )}
              <span className="text-xs font-semibold">Calm</span>
            </div>
            <div
              className="text-xs tabular-nums"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              <strong style={{ color: 'var(--md-on-surface)' }}>{calmMinutes}</strong> / {calmTarget} min
            </div>
          </div>
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--md-calm)' }}
          />
        </div>
      </div>
    </div>
  );
};
