import React, { useRef, useState } from 'react';
import {
  Footprints,
  GlassWater,
  Moon,
  Play,
  Sparkles,
  Sun,
  Wind,
  X,
} from 'lucide-react';
import { ProgressRing } from './ProgressRing';
import { haptics } from '../lib/haptics';
import { audioEngine } from '../lib/audioEngine';
import { isEveningWindDownWindow } from '../lib/stepTracker';
import type { DailyProgress, LessonPack, MoodLevel, UserPrefs } from '../types';

const MOOD_EMOJIS: Record<MoodLevel, { emoji: string; label: string }> = {
  1: { emoji: '😔', label: 'Low' },
  2: { emoji: '😕', label: 'Tired' },
  3: { emoji: '😌', label: 'Steady' },
  4: { emoji: '🙂', label: 'Good' },
  5: { emoji: '😊', label: 'Bright' },
};

interface HomeScreenProps {
  prefs: UserPrefs;
  daily: DailyProgress;
  activePack: LessonPack;
  curriculumWeek: number;
  missedYesterday: boolean;
  showResetHeadsUp: boolean;
  onDismissResetHeadsUp: () => void;
  onStartFocus: (durationMin: number, isCatchUp: boolean) => void;
  onStartReset: (mode: 'standard' | 'morning_primer') => void;
  onOpenBodyScan: () => void;
  onAddWater: () => void;
  onOpenMood: () => void;
  onOpenSteps: () => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  prefs,
  daily,
  activePack,
  curriculumWeek,
  missedYesterday,
  showResetHeadsUp,
  onDismissResetHeadsUp,
  onStartFocus,
  onStartReset,
  onOpenBodyScan,
  onAddWater,
  onOpenMood,
  onOpenSteps,
  onOpenSettings,
}) => {
  const [waterPulse, setWaterPulse] = useState(false);
  const [swipeDx, setSwipeDx] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  const growTotal = daily.focusMinutes + daily.exerciseMinutes;
  const eveningWindow = isEveningWindDownWindow(prefs.bedTime);
  const moodEntry = daily.mood ? MOOD_EMOJIS[daily.mood] : null;
  const showMoodReminderDot = !daily.mood && (eveningWindow || new Date().getHours() >= 19);

  // Pick at most ONE gentle contextual cue at a time — zero clutter
  const showCatchUp = !showResetHeadsUp && missedYesterday && daily.focusMinutes === 0;
  const showMorningCue =
    !showResetHeadsUp &&
    !showCatchUp &&
    !daily.morningPrimed &&
    daily.focusMinutes === 0 &&
    !eveningWindow;
  const showEveningCue =
    !showResetHeadsUp && !showCatchUp && eveningWindow && !daily.eveningScanDone;

  const handleWaterTap = () => {
    haptics.water();
    audioEngine.playWaterDrop();
    setWaterPulse(true);
    onAddWater();
    window.setTimeout(() => setWaterPulse(false), 260);
  };

  // Swipe gesture on 90-min "RESET?" heads-up notification
  const handleHeadsUpDown = (e: React.PointerEvent) => {
    swipeStartX.current = e.clientX;
  };
  const handleHeadsUpMove = (e: React.PointerEvent) => {
    if (swipeStartX.current === null) return;
    setSwipeDx(e.clientX - swipeStartX.current);
  };
  const handleHeadsUpEnd = () => {
    if (swipeStartX.current === null) return;
    const dx = swipeDx;
    swipeStartX.current = null;
    setSwipeDx(0);
    if (dx > 55) {
      haptics.tap();
      onDismissResetHeadsUp();
      onStartReset('standard');
    } else if (dx < -65) {
      haptics.tap();
      onDismissResetHeadsUp();
    }
  };

  return (
    <main
      className="relative flex flex-col justify-between h-full w-full px-5 pt-safe pb-safe overflow-hidden select-none"
      style={{ backgroundColor: 'var(--md-bg)', color: 'var(--md-on-surface)' }}
    >
      {/* Top minimal chrome: Wordmark + Bedtime Moon */}
      <header className="flex items-center justify-between pt-1 pb-2 shrink-0">
        <div>
          <h1 className="text-lg font-semibold tracking-tight leading-none">MindLoop</h1>
          <p
            className="text-[11px] mt-1 leading-none"
            style={{ color: 'var(--md-on-surface-subtle)' }}
          >
            Hold ring 3s for settings
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            haptics.tap();
            onOpenBodyScan();
          }}
          aria-label="Evening body-scan"
          title="Evening body-scan"
          className="m3-press w-11 h-11 rounded-full flex items-center justify-center relative"
          style={{
            backgroundColor:
              eveningWindow || prefs.nightModeActive
                ? 'var(--md-calm-soft)'
                : 'var(--md-surface-low)',
            color:
              eveningWindow || prefs.nightModeActive
                ? 'var(--md-calm)'
                : 'var(--md-on-surface-muted)',
          }}
        >
          <Moon className="w-[19px] h-[19px]" />
          {showEveningCue && (
            <span
              className="absolute top-2 right-2.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--md-calm)' }}
            />
          )}
        </button>
      </header>

      {/* Upper section: Progress Ring + single optional daily-flow cue */}
      <section className="flex-1 flex flex-col justify-center gap-3 min-h-0 py-1">
        {/* 90-min Work "RESET?" swipeable heads-up */}
        {showResetHeadsUp && (
          <div
            onPointerDown={handleHeadsUpDown}
            onPointerMove={handleHeadsUpMove}
            onPointerUp={handleHeadsUpEnd}
            onPointerCancel={handleHeadsUpEnd}
            style={{
              backgroundColor: 'var(--md-calm-soft)',
              border: '1px solid var(--md-calm)',
              transform: `translateX(${swipeDx * 0.55}px)`,
            }}
            className="anim-down rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 touch-pan-y"
          >
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                onDismissResetHeadsUp();
                onStartReset('standard');
              }}
              className="flex items-center gap-2.5 text-left flex-1 min-w-0"
            >
              <Wind className="w-4 h-4 shrink-0" style={{ color: 'var(--md-calm)' }} />
              <div className="min-w-0">
                <span className="text-xs font-semibold block">RESET? · 90 min check-in</span>
                <span
                  className="text-[11px] block truncate"
                  style={{ color: 'var(--md-on-surface-muted)' }}
                >
                  Swipe right or tap for 60s 4-7-8 breath
                </span>
              </div>
            </button>
            <button
              type="button"
              aria-label="Dismiss RESET heads-up"
              onClick={() => {
                haptics.tap();
                onDismissResetHeadsUp();
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Missed a day: guilt-free 12-min Catch-up pill */}
        {showCatchUp && (
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onStartFocus(12, true);
            }}
            className="m3-press anim-fade rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 text-left"
            style={{
              backgroundColor: 'var(--md-amber-soft)',
              color: 'var(--md-on-surface)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--md-amber)' }} />
              <span className="text-xs font-medium truncate">
                Missed yesterday? Try a gentle <strong>12-min Catch-up</strong>
              </span>
            </div>
            <span
              className="text-[11px] font-semibold shrink-0"
              style={{ color: 'var(--md-amber)' }}
            >
              Start
            </span>
          </button>
        )}

        {/* Morning 5-breath primer pill */}
        {showMorningCue && (
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onStartReset('morning_primer');
            }}
            className="m3-press anim-fade rounded-full px-4 py-2 flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--md-grow-soft)',
              color: 'var(--md-on-surface)',
            }}
          >
            <span className="flex items-center gap-2 text-xs font-medium truncate">
              <Sun className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--md-grow)' }} />
              Morning 5-breath primer
            </span>
            <span
              className="text-[11px] font-semibold shrink-0"
              style={{ color: 'var(--md-grow)' }}
            >
              Prime ring →
            </span>
          </button>
        )}

        {/* Evening 1h-before-bed cue */}
        {showEveningCue && (
          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onOpenBodyScan();
            }}
            className="m3-press anim-fade rounded-full px-4 py-2 flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--md-calm-soft)',
              color: 'var(--md-on-surface)',
            }}
          >
            <span className="flex items-center gap-2 text-xs font-medium truncate">
              <Moon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--md-calm)' }} />
              Evening body-scan · wind down
            </span>
            <span
              className="text-[11px] font-semibold shrink-0"
              style={{ color: 'var(--md-calm)' }}
            >
              5–15 min →
            </span>
          </button>
        )}

        {/* Top card: Concentric Progress Ring */}
        <ProgressRing
          growMinutes={growTotal}
          growTarget={prefs.growTargetMin}
          calmMinutes={daily.calmMinutes}
          calmTarget={prefs.calmTargetMin}
          morningPrimed={daily.morningPrimed}
          skillLabel={activePack.title}
          curriculumWeek={curriculumWeek}
          onLongPressSettings={onOpenSettings}
        />
      </section>

      {/* Bottom 1/3 ergonomic thumb zone: FOCUS / RESET + Bottom Mini-Bar */}
      <section aria-label="Primary actions" className="pt-2 space-y-2.5 shrink-0">
        {/* Two-tap central action buttons: FOCUS (green) & RESET (blue) */}
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            data-testid="btn-focus"
            onClick={() => {
              haptics.tap();
              onStartFocus(25, false);
            }}
            className="m3-press w-full h-[62px] sm:h-[66px] rounded-[26px] px-5 flex items-center justify-between shadow-sm"
            style={{
              backgroundColor: 'var(--md-grow)',
              color: 'var(--md-on-grow)',
            }}
          >
            <div className="flex items-center gap-3.5 text-left">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div>
                <div className="text-base font-bold tracking-wide leading-tight">FOCUS</div>
                <div className="text-xs opacity-85 leading-tight mt-0.5">
                  25 min · {activePack.title.replace(' 4-Week', '')} cards
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold opacity-90 tabular-nums px-2.5 py-1 rounded-full bg-black/10">
              25m
            </span>
          </button>

          <button
            type="button"
            data-testid="btn-reset"
            onClick={() => {
              haptics.tap();
              onStartReset('standard');
            }}
            className="m3-press w-full h-[56px] sm:h-[58px] rounded-[24px] px-5 flex items-center justify-between shadow-sm"
            style={{
              backgroundColor: 'var(--md-calm)',
              color: 'var(--md-on-calm)',
            }}
          >
            <div className="flex items-center gap-3.5 text-left">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
                <Wind className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="text-[0.95rem] font-bold tracking-wide leading-tight">RESET</div>
                <div className="text-xs opacity-85 leading-tight mt-0.5">
                  1 min · 4-7-8 breath + haptic
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold opacity-90 tabular-nums px-2.5 py-1 rounded-full bg-black/10">
              60s
            </span>
          </button>
        </div>

        {/* Bottom mini-bar: Steps (live) · Water (tap glass) · Mood (emoji slider) */}
        <nav
          aria-label="Daily essentials"
          className="grid grid-cols-3 gap-1.5 rounded-[24px] p-1.5"
          style={{
            backgroundColor: 'var(--md-surface-low)',
            border: '1px solid var(--md-outline)',
          }}
        >
          {/* Steps */}
          <button
            type="button"
            data-testid="bar-steps"
            onClick={() => {
              haptics.tap();
              onOpenSteps();
            }}
            className="m3-press rounded-[18px] py-2.5 px-2 flex flex-col items-center justify-center min-h-[56px]"
            style={{ backgroundColor: 'var(--md-surface-card)' }}
          >
            <div className="flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5" style={{ color: 'var(--md-grow)' }} />
              <span className="text-xs font-semibold tabular-nums">
                {daily.steps.toLocaleString()}
              </span>
            </div>
            <span
              className="text-[10px] mt-0.5 tabular-nums"
              style={{ color: 'var(--md-on-surface-subtle)' }}
            >
              {daily.exerciseMinutes > 0 ? `+${daily.exerciseMinutes}m Grow` : 'Steps'}
            </span>
          </button>

          {/* Water — single tap refills glass */}
          <button
            type="button"
            data-testid="bar-water"
            onClick={handleWaterTap}
            aria-label={`Water: ${daily.waterGlasses} of ${prefs.waterTargetGlasses} glasses. Tap to add a glass.`}
            className="m3-press rounded-[18px] py-2.5 px-2 flex flex-col items-center justify-center min-h-[56px]"
            style={{
              backgroundColor: waterPulse ? 'var(--md-calm-soft)' : 'var(--md-surface-card)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <GlassWater className="w-3.5 h-3.5" style={{ color: 'var(--md-calm)' }} />
              <span className="text-xs font-semibold tabular-nums">
                {daily.waterGlasses}/{prefs.waterTargetGlasses}
              </span>
            </div>
            <span
              className="text-[10px] mt-0.5"
              style={{ color: 'var(--md-on-surface-subtle)' }}
            >
              Water
            </span>
          </button>

          {/* Mood — opens emoji slider */}
          <button
            type="button"
            data-testid="bar-mood"
            onClick={() => {
              haptics.tap();
              onOpenMood();
            }}
            className="m3-press rounded-[18px] py-2.5 px-2 flex flex-col items-center justify-center min-h-[56px] relative"
            style={{ backgroundColor: 'var(--md-surface-card)' }}
          >
            {showMoodReminderDot && (
              <span
                className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--md-amber)' }}
              />
            )}
            <div className="flex items-center gap-1">
              <span className="text-sm leading-none" aria-hidden="true">
                {moodEntry ? moodEntry.emoji : '🙂'}
              </span>
              <span className="text-xs font-semibold">
                {moodEntry ? moodEntry.label : 'Mood'}
              </span>
            </div>
            <span
              className="text-[10px] mt-0.5"
              style={{ color: 'var(--md-on-surface-subtle)' }}
            >
              {moodEntry ? 'Logged' : 'Check in'}
            </span>
          </button>
        </nav>
      </section>
    </main>
  );
};
