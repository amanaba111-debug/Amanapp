import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  CloudRain,
  Code2,
  Coffee,
  Crown,
  Footprints,
  Music,
  ShieldOff,
  Sparkles,
  Trees,
  Upload,
  Volume2,
  WifiOff,
} from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';
import { haptics } from '../lib/haptics';
import {
  LiveStepTracker,
  requestBrowserNotificationPermission,
} from '../lib/stepTracker';
import { parseCustomPackCsv } from '../data/lessonPacks';
import type { LessonPack, SkillId, SoundTheme, UserPrefs } from '../types';

interface OnboardingProps {
  packs: LessonPack[];
  initialPrefs: UserPrefs;
  onImportPack: (pack: LessonPack) => Promise<void>;
  onComplete: (prefs: UserPrefs) => Promise<void>;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  spanish: <BookOpen className="w-5 h-5" />,
  coding: <Code2 className="w-5 h-5" />,
  chess: <Crown className="w-5 h-5" />,
  guitar: <Music className="w-5 h-5" />,
};

const SOUND_OPTIONS: Array<{
  id: SoundTheme;
  label: string;
  caption: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'rain',
    label: 'Rain',
    caption: 'Soft rainfall on warm glass',
    icon: <CloudRain className="w-5 h-5" />,
  },
  {
    id: 'forest',
    label: 'Forest',
    caption: 'Canopy breeze & distant birdsong',
    icon: <Trees className="w-5 h-5" />,
  },
  {
    id: 'cafe',
    label: 'Café',
    caption: 'Quiet morning espresso bar hum',
    icon: <Coffee className="w-5 h-5" />,
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({
  packs,
  initialPrefs,
  onImportPack,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [skillId, setSkillId] = useState<SkillId>(initialPrefs.selectedSkillId);
  const [soundTheme, setSoundTheme] = useState<SoundTheme>(initialPrefs.soundTheme);
  const [previewingSound, setPreviewingSound] = useState<SoundTheme | null>(null);
  const [permissions, setPermissions] = useState(initialPrefs.permissions);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setElapsedSec((s) => Math.min(60, s + 1)), 1000);
    return () => {
      window.clearInterval(id);
      audioEngine.stopSoundscape();
    };
  }, []);

  const selectedPack = packs.find((p) => p.id === skillId) ?? packs[0];

  const handleSelectSound = (theme: SoundTheme) => {
    haptics.tap();
    setSoundTheme(theme);
    if (previewingSound === theme) {
      audioEngine.stopSoundscape();
      setPreviewingSound(null);
    } else {
      audioEngine.startSoundscape(theme, initialPrefs.soundVolume);
      setPreviewingSound(theme);
    }
  };

  const handleNext = async () => {
    haptics.tap();
    if (step === 2 && previewingSound) {
      audioEngine.stopSoundscape();
      setPreviewingSound(null);
    }
    if (step < 4) {
      setStep((step + 1) as 1 | 2 | 3 | 4);
      return;
    }
    audioEngine.stopSoundscape();
    haptics.complete();
    await onComplete({
      ...initialPrefs,
      onboarded: true,
      onboardedAt: new Date().toISOString(),
      selectedSkillId: skillId,
      soundTheme,
      permissions,
    });
  };

  const handleTogglePermission = async (key: 'dnd' | 'notifications' | 'stepCounter') => {
    haptics.tap();
    const nextVal = !permissions[key];
    if (nextVal && key === 'notifications') {
      await requestBrowserNotificationPermission();
    }
    if (nextVal && key === 'stepCounter') {
      await LiveStepTracker.requestPermissionIfNeeded();
    }
    setPermissions((prev) => ({ ...prev, [key]: nextVal }));
  };

  const handleGrantAll = async () => {
    haptics.tap();
    await requestBrowserNotificationPermission();
    await LiveStepTracker.requestPermissionIfNeeded();
    setPermissions({ dnd: true, notifications: true, stepCounter: true });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    try {
      const text = await file.text();
      const name = file.name.replace(/\.csv$/i, '').replace(/[-_]+/g, ' ');
      const title = name.charAt(0).toUpperCase() + name.slice(1);
      const customPack = parseCustomPackCsv(text, title);
      await onImportPack(customPack);
      setSkillId(customPack.id);
      haptics.complete();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Invalid CSV file');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full px-6 pt-safe pb-safe justify-between select-none"
      style={{ backgroundColor: 'var(--md-bg)', color: 'var(--md-on-surface)' }}
    >
      {/* Top header & 4-step indicator */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button
                type="button"
                aria-label="Previous step"
                onClick={() => {
                  haptics.tap();
                  if (previewingSound) {
                    audioEngine.stopSoundscape();
                    setPreviewingSound(null);
                  }
                  setStep((step - 1) as 1 | 2 | 3 | 4);
                }}
                className="m3-press w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--md-surface)' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: 'var(--md-primary-container)',
                  color: 'var(--md-on-primary-container)',
                }}
              >
                MindLoop
              </span>
            )}
          </div>
          <span
            className="text-xs font-medium tabular-nums"
            style={{ color: 'var(--md-on-surface-subtle)' }}
          >
            Step {step} of 4 · 60s setup
          </span>
        </div>

        {/* Step progress pills */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  idx <= step ? 'var(--md-primary)' : 'var(--md-surface-high)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Middle content area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-4 anim-fade" key={step}>
        {step === 1 && (
          <div>
            <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight mb-1.5">
              Pick a 4-week skill
            </h1>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              Auto-curated 15-minute micro-lessons live right inside your daily FOCUS sessions.
            </p>

            <div className="space-y-2.5">
              {packs.map((pack) => {
                const active = pack.id === skillId;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      setSkillId(pack.id);
                    }}
                    className="m3-press w-full text-left rounded-[22px] px-4 py-3.5 flex items-center gap-3.5 transition-all"
                    style={{
                      backgroundColor: active
                        ? 'var(--md-primary-container)'
                        : 'var(--md-surface-card)',
                      color: active
                        ? 'var(--md-on-primary-container)'
                        : 'var(--md-on-surface)',
                      border: `1.5px solid ${active ? 'var(--md-primary)' : 'var(--md-outline)'}`,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: active
                          ? 'var(--md-primary)'
                          : 'var(--md-surface-low)',
                        color: active ? 'var(--md-on-primary)' : 'var(--md-primary)',
                      }}
                    >
                      {SKILL_ICONS[pack.id] ?? <Sparkles className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[0.95rem] truncate">
                          {pack.title}
                        </span>
                        <span
                          className="text-[11px] font-medium shrink-0 opacity-75 tabular-nums"
                        >
                          {pack.cards.length} cards
                        </span>
                      </div>
                      <p className="text-xs opacity-80 truncate mt-0.5">{pack.subtitle}</p>
                    </div>
                    {active && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: 'var(--md-primary)',
                          color: 'var(--md-on-primary)',
                        }}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="m3-press mt-3 w-full rounded-2xl py-2.5 px-3.5 text-xs font-medium flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--md-surface-low)',
                color: 'var(--md-on-surface-muted)',
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              Or import your own flash-card CSV
            </button>
            {csvError && (
              <p className="text-xs mt-2 text-red-600 dark:text-red-400 text-center">{csvError}</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight mb-1.5">
              Choose your calm sound
            </h1>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              Tap any theme to hear a live offline preview. Plays gently while you focus.
            </p>

            <div className="space-y-3">
              {SOUND_OPTIONS.map((opt) => {
                const active = soundTheme === opt.id;
                const playing = previewingSound === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectSound(opt.id)}
                    className="m3-press w-full text-left rounded-[24px] p-4 flex items-center gap-4"
                    style={{
                      backgroundColor: active
                        ? 'var(--md-primary-container)'
                        : 'var(--md-surface-card)',
                      color: active
                        ? 'var(--md-on-primary-container)'
                        : 'var(--md-on-surface)',
                      border: `1.5px solid ${active ? 'var(--md-primary)' : 'var(--md-outline)'}`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: active ? 'var(--md-primary)' : 'var(--md-calm-soft)',
                        color: active ? 'var(--md-on-primary)' : 'var(--md-calm)',
                      }}
                    >
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{opt.label}</div>
                      <div className="text-xs opacity-80 mt-0.5">{opt.caption}</div>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 shrink-0"
                      style={{
                        backgroundColor: playing
                          ? 'var(--md-primary)'
                          : 'var(--md-surface-low)',
                        color: playing ? 'var(--md-on-primary)' : 'var(--md-on-surface-muted)',
                      }}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {playing ? 'Playing' : 'Preview'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight mb-1.5">
              Quiet automations
            </h1>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              Everything stays on your device. Enable the helpers you want—or leave any off.
            </p>

            <div className="space-y-3">
              {[
                {
                  key: 'dnd' as const,
                  title: 'Do-Not-Disturb & Social Shield',
                  desc: 'Silences distractions in FOCUS & nudges a 4-7-8 breath on social apps.',
                  icon: <ShieldOff className="w-5 h-5" />,
                },
                {
                  key: 'notifications' as const,
                  title: 'Gentle Daily Cues',
                  desc: 'Morning breath, 90-min RESET? nudge, and bedtime body-scan.',
                  icon: <Bell className="w-5 h-5" />,
                },
                {
                  key: 'stepCounter' as const,
                  title: 'Live Step Counter',
                  desc: 'Auto-adds exercise to your Grow ring (2,000 steps = 15 min).',
                  icon: <Footprints className="w-5 h-5" />,
                },
              ].map((item) => {
                const enabled = permissions[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => handleTogglePermission(item.key)}
                    className="m3-press w-full text-left rounded-[24px] p-4 flex items-center gap-3.5"
                    style={{
                      backgroundColor: 'var(--md-surface-card)',
                      border: `1.5px solid ${enabled ? 'var(--md-primary)' : 'var(--md-outline)'}`,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: enabled
                          ? 'var(--md-primary-container)'
                          : 'var(--md-surface-low)',
                        color: enabled
                          ? 'var(--md-on-primary-container)'
                          : 'var(--md-on-surface-muted)',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[0.93rem]">{item.title}</div>
                      <div
                        className="text-xs leading-snug mt-0.5"
                        style={{ color: 'var(--md-on-surface-muted)' }}
                      >
                        {item.desc}
                      </div>
                    </div>
                    {/* Material 3 switch pill */}
                    <div
                      className="w-12 h-7 rounded-full p-1 transition-colors flex items-center shrink-0"
                      style={{
                        backgroundColor: enabled
                          ? 'var(--md-primary)'
                          : 'var(--md-surface-high)',
                        justifyContent: enabled ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full transition-transform"
                        style={{
                          backgroundColor: enabled ? 'var(--md-on-primary)' : 'var(--md-bg)',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {!(permissions.dnd && permissions.notifications && permissions.stepCounter) && (
              <button
                type="button"
                onClick={handleGrantAll}
                className="m3-press mt-3.5 w-full py-2.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--md-surface-low)',
                  color: 'var(--md-primary)',
                }}
              >
                Enable all three in one tap
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col justify-center pt-2">
            <div
              className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-5"
              style={{
                backgroundColor: 'var(--md-primary-container)',
                color: 'var(--md-primary)',
              }}
            >
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight mb-2">
              Grow calm. Grow smart. Daily.
            </h1>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: 'var(--md-on-surface-muted)' }}
            >
              Ready in <span className="tabular-nums font-semibold">{Math.max(4, elapsedSec)}s</span>.
              From now on, your entire day is two taps:{' '}
              <strong style={{ color: 'var(--md-grow)' }}>FOCUS</strong> and{' '}
              <strong style={{ color: 'var(--md-calm)' }}>RESET</strong>.
            </p>

            <div
              className="rounded-[26px] p-5 space-y-3.5"
              style={{
                backgroundColor: 'var(--md-surface-card)',
                border: '1px solid var(--md-outline)',
              }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--md-on-surface-muted)' }}>4-week skill</span>
                <span className="font-semibold">{selectedPack?.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--md-on-surface-muted)' }}>Calm sound</span>
                <span className="font-semibold capitalize">{soundTheme}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--md-on-surface-muted)' }}>Daily targets</span>
                <span className="font-semibold tabular-nums">
                  <span style={{ color: 'var(--md-grow)' }}>60m Grow</span> ·{' '}
                  <span style={{ color: 'var(--md-calm)' }}>30m Calm</span>
                </span>
              </div>
              <div
                className="pt-3 flex items-center gap-2 text-xs"
                style={{
                  borderTop: '1px solid var(--md-outline)',
                  color: 'var(--md-on-surface-muted)',
                }}
              >
                <WifiOff className="w-4 h-4 shrink-0" style={{ color: 'var(--md-primary)' }} />
                <span>No account. No cloud. Works 100% offline. Hold the ring 3s for settings.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom 1/3 primary thumb CTA */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={handleNext}
          className="m3-press w-full h-14 rounded-full font-semibold text-base flex items-center justify-center gap-2 shadow-sm"
          style={{
            backgroundColor: 'var(--md-primary)',
            color: 'var(--md-on-primary)',
          }}
        >
          {step < 4 ? 'Continue' : 'Open MindLoop'}
        </button>
        {step === 1 && (
          <button
            type="button"
            onClick={async () => {
              haptics.tap();
              audioEngine.stopSoundscape();
              await onComplete({
                ...initialPrefs,
                onboarded: true,
                onboardedAt: new Date().toISOString(),
                selectedSkillId: skillId,
                soundTheme,
                permissions: { dnd: true, notifications: false, stepCounter: true },
              });
            }}
            className="w-full py-1.5 text-xs font-medium text-center"
            style={{ color: 'var(--md-on-surface-subtle)' }}
          >
            Quick start with {selectedPack?.title} & Rain
          </button>
        )}
      </div>
    </div>
  );
};
