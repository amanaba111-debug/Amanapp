import React, { useState } from 'react';
import { Footprints, RotateCcw, X } from 'lucide-react';
import { haptics } from '../lib/haptics';
import { stepsToGrowMinutes } from '../lib/db';
import type { MoodLevel } from '../types';

const MOODS: Array<{ level: MoodLevel; emoji: string; title: string; subtitle: string }> = [
  { level: 1, emoji: '😔', title: 'Heavy', subtitle: 'Be extra gentle with yourself tonight' },
  { level: 2, emoji: '😕', title: 'Stretched', subtitle: 'A slow breath or early sleep helps' },
  { level: 3, emoji: '😌', title: 'Steady', subtitle: 'Balanced, calm, and grounded' },
  { level: 4, emoji: '🙂', title: 'Good', subtitle: 'Clear focus and quiet momentum' },
  { level: 5, emoji: '😊', title: 'Bright', subtitle: 'Energized, grateful, and deeply calm' },
];

interface MoodSheetProps {
  currentMood: MoodLevel | null;
  currentNote: string;
  bedTime: string;
  onSave: (mood: MoodLevel, note: string) => void;
  onClose: () => void;
}

export const MoodSheet: React.FC<MoodSheetProps> = ({
  currentMood,
  currentNote,
  bedTime,
  onSave,
  onClose,
}) => {
  const [level, setLevel] = useState<MoodLevel>(currentMood ?? 4);
  const [note, setNote] = useState(currentNote);
  const active = MOODS.find((m) => m.level === level) ?? MOODS[3];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily mood check-in"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-xs anim-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[32px] p-6 pb-safe anim-up"
        style={{
          backgroundColor: 'var(--md-surface-card)',
          color: 'var(--md-on-surface)',
          borderTop: '1px solid var(--md-outline-strong)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">How does your mind feel?</h2>
            <p className="text-xs" style={{ color: 'var(--md-on-surface-subtle)' }}>
              Night reminder set before {bedTime} · stored locally
            </p>
          </div>
          <button
            type="button"
            aria-label="Close mood slider"
            onClick={onClose}
            className="m3-press w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--md-surface-low)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active emoji display */}
        <div className="text-center py-3">
          <div className="text-5xl mb-2 transition-transform duration-200">{active.emoji}</div>
          <div className="text-base font-semibold">{active.title}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--md-on-surface-muted)' }}>
            {active.subtitle}
          </div>
        </div>

        {/* Emoji tap row + continuous M3 slider */}
        <div className="mt-3 mb-5">
          <div className="flex justify-between px-1 mb-2.5">
            {MOODS.map((m) => (
              <button
                key={m.level}
                type="button"
                aria-label={m.title}
                onClick={() => {
                  haptics.tap();
                  setLevel(m.level);
                }}
                className="m3-press w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all"
                style={{
                  backgroundColor:
                    level === m.level ? 'var(--md-primary-container)' : 'transparent',
                  transform: level === m.level ? 'scale(1.12)' : 'scale(0.95)',
                  opacity: level === m.level ? 1 : 0.6,
                }}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            aria-label="Mood emoji slider"
            value={level}
            onChange={(e) => {
              haptics.tap();
              setLevel(Number(e.target.value) as MoodLevel);
            }}
            className="m3-slider"
          />
        </div>

        {/* Optional single-line note */}
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 120))}
          placeholder="One quiet note for today (optional)…"
          className="w-full h-11 px-4 rounded-2xl text-sm outline-none mb-4"
          style={{
            backgroundColor: 'var(--md-surface-low)',
            color: 'var(--md-on-surface)',
            border: '1px solid var(--md-outline)',
          }}
        />

        <button
          type="button"
          onClick={() => {
            haptics.complete();
            onSave(level, note.trim());
          }}
          className="m3-press w-full h-13 rounded-full font-semibold text-sm"
          style={{
            backgroundColor: 'var(--md-primary)',
            color: 'var(--md-on-primary)',
          }}
        >
          Save Mood
        </button>
      </div>
    </div>
  );
};

interface StepsSheetProps {
  steps: number;
  sensorEnabled: boolean;
  waterGlasses: number;
  waterTarget: number;
  onAddSteps: (delta: number) => void;
  onResetWater: () => void;
  onToggleSensor: () => void;
  onClose: () => void;
}

export const StepsSheet: React.FC<StepsSheetProps> = ({
  steps,
  sensorEnabled,
  waterGlasses,
  waterTarget,
  onAddSteps,
  onResetWater,
  onToggleSensor,
  onClose,
}) => {
  const growBonus = stepsToGrowMinutes(steps);
  const nextMilestone = (Math.floor(steps / 2000) + 1) * 2000;
  const toNext = nextMilestone - steps;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live steps and Grow automation"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-xs anim-fade"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[32px] p-6 pb-safe anim-up"
        style={{
          backgroundColor: 'var(--md-surface-card)',
          color: 'var(--md-on-surface)',
          borderTop: '1px solid var(--md-outline-strong)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--md-grow-soft)', color: 'var(--md-grow)' }}
            >
              <Footprints className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Steps → Grow Ring</h2>
              <p className="text-xs" style={{ color: 'var(--md-on-surface-muted)' }}>
                Every 2,000 steps auto-adds 15 min exercise
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close steps sheet"
            onClick={onClose}
            className="m3-press w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--md-surface-low)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="rounded-3xl p-4 mb-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--md-surface-low)' }}
        >
          <div>
            <div className="text-3xl font-semibold tabular-nums">{steps.toLocaleString()}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--md-on-surface-muted)' }}>
              {toNext.toLocaleString()} steps to next +15m milestone
            </div>
          </div>
          <div
            className="px-3.5 py-2 rounded-2xl text-right"
            style={{ backgroundColor: 'var(--md-grow-soft)', color: 'var(--md-grow)' }}
          >
            <div className="text-lg font-bold tabular-nums leading-none">+{growBonus}m</div>
            <div className="text-[10px] font-semibold mt-1">Grow credit</div>
          </div>
        </div>

        {/* Live motion sensor status */}
        <div className="flex items-center justify-between text-xs mb-3 px-1">
          <span style={{ color: 'var(--md-on-surface-muted)' }}>
            Live motion pedometer:{' '}
            <strong style={{ color: 'var(--md-on-surface)' }}>
              {sensorEnabled ? 'Active' : 'Paused'}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onToggleSensor();
            }}
            className="font-semibold"
            style={{ color: 'var(--md-primary)' }}
          >
            {sensorEnabled ? 'Pause' : 'Enable'}
          </button>
        </div>

        {/* Quick log walk buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onAddSteps(500);
            }}
            className="m3-press h-12 rounded-2xl text-xs font-semibold"
            style={{
              backgroundColor: 'var(--md-surface-low)',
              color: 'var(--md-on-surface)',
            }}
          >
            +500 steps · short walk
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.complete();
              onAddSteps(2000);
            }}
            className="m3-press h-12 rounded-2xl text-xs font-semibold"
            style={{
              backgroundColor: 'var(--md-grow)',
              color: 'var(--md-on-grow)',
            }}
          >
            +2,000 steps (+15m Grow)
          </button>
        </div>

        {waterGlasses > 0 && (
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onResetWater();
            }}
            className="w-full py-2 text-[11px] font-medium flex items-center justify-center gap-1.5"
            style={{ color: 'var(--md-on-surface-subtle)' }}
          >
            <RotateCcw className="w-3 h-3" />
            Reset today's water ({waterGlasses}/{waterTarget} glasses)
          </button>
        )}
      </div>
    </div>
  );
};
