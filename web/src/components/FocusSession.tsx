import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { curateMicroLessonQueue } from '../data/lessonPacks';
import { audioEngine } from '../lib/audioEngine';
import { haptics } from '../lib/haptics';
import type {
  CardMastery,
  LessonPack,
  SocialAppName,
  SoundTheme,
  UserPrefs,
} from '../types';

interface FocusSessionProps {
  durationMin: number;
  isCatchUp: boolean;
  pack: LessonPack;
  curriculumWeek: number;
  prefs: UserPrefs;
  masteryMap: Record<string, CardMastery>;
  onRateCard: (cardId: string, packId: string, rating: 'again' | 'good' | 'easy') => void;
  onChangeSound: (theme: SoundTheme) => void;
  onTriggerSocialGuard: (appName: SocialAppName) => void;
  onComplete: (creditedMinutes: number, cardsReviewed: number, isCatchUp: boolean) => void;
  onClose: () => void;
}

const SOUND_LABELS: Record<SoundTheme, string> = {
  rain: 'Rain',
  forest: 'Forest',
  cafe: 'Café',
};

export const FocusSession: React.FC<FocusSessionProps> = ({
  durationMin,
  isCatchUp,
  pack,
  curriculumWeek,
  prefs,
  masteryMap,
  onRateCard,
  onChangeSound,
  onTriggerSocialGuard,
  onComplete,
  onClose,
}) => {
  const totalSeconds = durationMin * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [finished, setFinished] = useState(false);

  // Snapshot the queue order when the session opens so card positions stay stable mid-session
  const queue = useMemo(
    () => curateMicroLessonQueue(pack, masteryMap, curriculumWeek),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack.id, curriculumWeek]
  );

  const currentCard = queue[cardIndex % Math.max(1, queue.length)];

  // Manage ambient soundscape lifecycle
  useEffect(() => {
    if (soundOn && running && !finished) {
      audioEngine.startSoundscape(prefs.soundTheme, prefs.soundVolume);
    } else {
      audioEngine.stopSoundscape();
    }
    return () => {
      audioEngine.stopSoundscape();
    };
  }, [soundOn, running, finished, prefs.soundTheme, prefs.soundVolume]);

  // Pomodoro timer countdown
  useEffect(() => {
    if (!running || finished) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setFinished(true);
          setRunning(false);
          audioEngine.stopSoundscape();
          audioEngine.playBreathCue('complete');
          haptics.complete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, finished]);

  const elapsedSeconds = totalSeconds - secondsLeft;
  const progress = Math.min(1, elapsedSeconds / totalSeconds);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const handleGrade = (rating: 'again' | 'good' | 'easy') => {
    if (!currentCard) return;
    haptics.tap();
    onRateCard(currentCard.id, pack.id, rating);
    setReviewedCount((c) => c + 1);
    setRevealed(false);
    setShowHint(false);
    setCardIndex((i) => i + 1);
  };

  const cycleSound = () => {
    haptics.tap();
    const order: SoundTheme[] = ['rain', 'forest', 'cafe'];
    const next = order[(order.indexOf(prefs.soundTheme) + 1) % order.length];
    onChangeSound(next);
    if (!soundOn) setSoundOn(true);
  };

  const handleFinishAndCredit = (fullSession: boolean) => {
    audioEngine.stopSoundscape();
    haptics.complete();
    const mins = fullSession
      ? durationMin
      : Math.max(1, Math.round(elapsedSeconds / 60));
    onComplete(mins, reviewedCount, isCatchUp);
  };

  const handleExit = () => {
    audioEngine.stopSoundscape();
    if (elapsedSeconds >= 60) {
      onComplete(Math.round(elapsedSeconds / 60), reviewedCount, isCatchUp);
    } else {
      onClose();
    }
  };

  if (finished) {
    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center anim-fade"
        style={{ backgroundColor: 'var(--md-bg)', color: 'var(--md-on-surface)' }}
      >
        <div className="w-full max-w-[430px] h-full flex flex-col justify-between px-6 pt-safe pb-safe text-center">
          <div />
          <div className="flex flex-col items-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{
                backgroundColor: 'var(--md-grow-soft)',
                color: 'var(--md-grow)',
              }}
            >
              <Check className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {isCatchUp ? 'Catch-up complete' : 'Focus session complete'}
            </h2>
            <p
              className="text-sm mt-2 max-w-[280px]"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              +{durationMin} minutes added to your Grow ring · {reviewedCount} micro-lesson{' '}
              {reviewedCount === 1 ? 'card' : 'cards'} practiced.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleFinishAndCredit(true)}
            className="m3-press w-full h-14 rounded-full font-semibold text-base"
            style={{
              backgroundColor: 'var(--md-grow)',
              color: 'var(--md-on-grow)',
            }}
          >
            Back to Ring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center anim-fade"
      style={{ backgroundColor: 'var(--md-bg)', color: 'var(--md-on-surface)' }}
    >
      <div className="w-full max-w-[430px] h-full flex flex-col justify-between px-5 pt-safe pb-safe">
        {/* Session top bar */}
        <div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              aria-label="Close Focus session"
              onClick={handleExit}
              className="m3-press w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--md-surface-low)' }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ambient sound controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cycleSound}
                className="m3-press h-9 px-3 rounded-full text-xs font-medium flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--md-surface-low)',
                  color: 'var(--md-on-surface-muted)',
                }}
              >
                {SOUND_LABELS[prefs.soundTheme]}
              </button>
              <button
                type="button"
                aria-label={soundOn ? 'Mute calm sound' : 'Unmute calm sound'}
                onClick={() => {
                  haptics.tap();
                  setSoundOn((v) => !v);
                }}
                className="m3-press w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: soundOn ? 'var(--md-grow-soft)' : 'var(--md-surface-low)',
                  color: soundOn ? 'var(--md-grow)' : 'var(--md-on-surface-muted)',
                }}
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Pomodoro timer + Social shield pill */}
          <div className="flex items-end justify-between mt-3 mb-2">
            <div>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--md-grow)' }}
              >
                {isCatchUp ? '12-Min Catch-Up' : 'Focus Pomodoro'}
              </span>
              <div className="text-4xl font-semibold tabular-nums tracking-tight leading-none mt-1">
                {mm}:{ss}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptics.tap();
                onTriggerSocialGuard('Instagram');
              }}
              title="Tap to preview social-app 4-7-8 shield"
              className="m3-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: 'var(--md-grow-soft)',
                color: 'var(--md-grow)',
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Social apps blocked
            </button>
          </div>

          {/* Progress track */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--md-grow-track)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, progress * 100)}%`,
                backgroundColor: 'var(--md-grow)',
              }}
            />
          </div>
        </div>

        {/* Center: Auto-curated micro-lesson flashcard */}
        {currentCard && (
          <div className="flex-1 flex flex-col justify-center my-4 min-h-0">
            <div
              onClick={() => {
                if (!revealed) {
                  haptics.flip();
                  setRevealed(true);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  haptics.flip();
                  setRevealed((v) => !v);
                }
              }}
              className="w-full flex-1 max-h-[410px] rounded-[28px] p-5 flex flex-col justify-between overflow-y-auto no-scrollbar transition-all"
              style={{
                backgroundColor: 'var(--md-surface-card)',
                border: '1px solid var(--md-outline-strong)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full truncate"
                  style={{
                    backgroundColor: 'var(--md-surface-low)',
                    color: 'var(--md-on-surface-muted)',
                  }}
                >
                  {currentCard.category}
                </span>
                <span
                  className="text-[11px] tabular-nums shrink-0"
                  style={{ color: 'var(--md-on-surface-subtle)' }}
                >
                  Card {(cardIndex % queue.length) + 1}/{queue.length}
                </span>
              </div>

              <div className="my-auto py-4">
                <p className="text-[1.15rem] sm:text-xl font-semibold leading-snug tracking-tight">
                  {currentCard.front}
                </p>

                {!revealed && showHint && currentCard.hint && (
                  <p
                    className="mt-3 text-xs leading-relaxed px-3 py-2 rounded-2xl anim-fade"
                    style={{
                      backgroundColor: 'var(--md-surface-low)',
                      color: 'var(--md-on-surface-muted)',
                    }}
                  >
                    {currentCard.hint}
                  </p>
                )}

                {revealed && (
                  <div
                    className="mt-4 pt-4 space-y-2.5 anim-fade"
                    style={{ borderTop: '1px solid var(--md-outline)' }}
                  >
                    <p
                      className="text-base font-semibold leading-snug"
                      style={{ color: 'var(--md-grow)' }}
                    >
                      {currentCard.back}
                    </p>
                    {currentCard.example && (
                      <p
                        className="text-xs leading-relaxed whitespace-pre-line rounded-2xl p-3"
                        style={{
                          backgroundColor: 'var(--md-surface-low)',
                          color: 'var(--md-on-surface-muted)',
                        }}
                      >
                        {currentCard.example}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!revealed ? (
                <div className="flex items-center justify-between gap-2 pt-1">
                  {currentCard.hint ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.tap();
                        setShowHint((v) => !v);
                      }}
                      className="m3-press inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--md-surface-low)',
                        color: 'var(--md-on-surface-muted)',
                      }}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {showHint ? 'Hide hint' : 'Hint'}
                    </button>
                  ) : (
                    <span />
                  )}
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: 'var(--md-grow)' }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Tap card to reveal
                  </span>
                </div>
              ) : (
                <div
                  className="text-[11px] text-center"
                  style={{ color: 'var(--md-on-surface-subtle)' }}
                >
                  How effortless did that feel?
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom thumb zone: Reveal / Spaced-repetition grading + Timer control */}
        <div className="space-y-2.5 shrink-0">
          {!revealed ? (
            <button
              type="button"
              onClick={() => {
                haptics.flip();
                setRevealed(true);
              }}
              className="m3-press w-full h-13 rounded-full font-semibold text-sm"
              style={{
                backgroundColor: 'var(--md-grow)',
                color: 'var(--md-on-grow)',
              }}
            >
              Reveal Answer
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2 anim-fade">
              <button
                type="button"
                onClick={() => handleGrade('again')}
                className="m3-press h-13 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1"
                style={{
                  backgroundColor: 'var(--md-surface-low)',
                  color: 'var(--md-on-surface)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Again
              </button>
              <button
                type="button"
                onClick={() => handleGrade('good')}
                className="m3-press h-13 rounded-2xl text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--md-grow-soft)',
                  color: 'var(--md-grow)',
                }}
              >
                Got it
              </button>
              <button
                type="button"
                onClick={() => handleGrade('easy')}
                className="m3-press h-13 rounded-2xl text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--md-grow)',
                  color: 'var(--md-on-grow)',
                }}
              >
                Easy
              </button>
            </div>
          )}

          {/* Compact timer pause + complete bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                setRunning((r) => !r);
              }}
              className="m3-press h-10 px-4 rounded-full text-xs font-semibold flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--md-surface-low)',
                color: 'var(--md-on-surface)',
              }}
            >
              {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Pause' : 'Resume'}
            </button>

            <span
              className="text-[11px] tabular-nums"
              style={{ color: 'var(--md-on-surface-subtle)' }}
            >
              {reviewedCount} reviewed
            </span>

            <button
              type="button"
              onClick={() => handleFinishAndCredit(true)}
              className="m3-press h-10 px-4 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: 'var(--md-surface-low)',
                color: 'var(--md-grow)',
              }}
            >
              Complete +{durationMin}m
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
