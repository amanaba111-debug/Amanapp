import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUILTIN_PACKS,
  getCurrentCurriculumWeek,
} from './data/lessonPacks';
import {
  DEFAULT_PREFS,
  checkMissedYesterday,
  computeActiveDaysCount,
  createEmptyDaily,
  deleteCustomPack,
  gdprDeleteAllData,
  loadAllDaily,
  loadCustomPacks,
  loadDaily,
  loadMasteryMap,
  loadPrefs,
  logSession,
  saveCardMastery,
  saveCustomPack,
  saveDaily,
  savePrefs,
  stepsToGrowMinutes,
  todayKey,
} from './lib/db';
import { applyMaterialYouTheme, resolveThemeMode } from './lib/theme';
import { audioEngine } from './lib/audioEngine';
import { LiveStepTracker, sendLocalNotification } from './lib/stepTracker';
import { Onboarding } from './components/Onboarding';
import { HomeScreen } from './components/HomeScreen';
import { FocusSession } from './components/FocusSession';
import { ResetBreathing } from './components/ResetBreathing';
import { BodyScanSheet } from './components/BodyScanSheet';
import { MoodSheet, StepsSheet } from './components/MoodStepsSheets';
import { SocialGuardOverlay } from './components/SocialGuardOverlay';
import { SettingsDrawer } from './components/SettingsDrawer';
import type {
  ActiveModal,
  CardMastery,
  DailyProgress,
  LessonPack,
  MoodLevel,
  SocialAppName,
  SoundTheme,
  UserPrefs,
} from './types';

const NINETY_MIN_MS = 90 * 60 * 1000;

export const App: React.FC = () => {
  const [hydrated, setHydrated] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [daily, setDaily] = useState<DailyProgress>(() => createEmptyDaily());
  const [customPacks, setCustomPacks] = useState<LessonPack[]>([]);
  const [masteryMap, setMasteryMap] = useState<Record<string, CardMastery>>({});
  const [activeDays, setActiveDays] = useState(0);
  const [missedYesterday, setMissedYesterday] = useState(false);
  const [showResetHeadsUp, setShowResetHeadsUp] = useState(false);
  const [modal, setModal] = useState<ActiveModal>({ type: 'none' });
  const [prefersDark, setPrefersDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );

  const stepTrackerRef = useRef<LiveStepTracker | null>(null);
  const dailyRef = useRef<DailyProgress>(daily);
  dailyRef.current = daily;

  const allPacks = useMemo(
    () => [...BUILTIN_PACKS, ...customPacks],
    [customPacks]
  );

  const activePack = useMemo(
    () => allPacks.find((p) => p.id === prefs.selectedSkillId) ?? BUILTIN_PACKS[0],
    [allPacks, prefs.selectedSkillId]
  );

  const curriculumWeek = useMemo(
    () => getCurrentCurriculumWeek(prefs.onboardedAt),
    [prefs.onboardedAt]
  );

  // Hydrate strictly from offline IndexedDB + inspect PWA shortcut deep-link (?action=reset|focus|bodyscan)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedPrefs, loadedDaily, loadedPacks, loadedMastery, allDaily] =
        await Promise.all([
          loadPrefs(),
          loadDaily(todayKey()),
          loadCustomPacks(),
          loadMasteryMap(),
          loadAllDaily(),
        ]);
      if (cancelled) return;

      const missed = await checkMissedYesterday(loadedPrefs.onboardedAt);
      if (cancelled) return;

      setPrefs(loadedPrefs);
      setDaily(loadedDaily);
      setCustomPacks(loadedPacks);
      setMasteryMap(loadedMastery);
      setActiveDays(computeActiveDaysCount(allDaily));
      setMissedYesterday(missed);
      audioEngine.setVolume(loadedPrefs.soundVolume);
      setHydrated(true);

      // Handle PWA home-screen shortcut intents (1x1 Breathe / Focus / Evening Body-Scan)
      if (loadedPrefs.onboarded) {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action === 'reset') {
          setModal({ type: 'reset', mode: 'quick_widget' });
          window.history.replaceState({}, '', '/');
        } else if (action === 'focus') {
          setModal({ type: 'focus', durationMin: 25, isCatchUp: false });
          window.history.replaceState({}, '', '/');
        } else if (action === 'bodyscan') {
          setModal({ type: 'body_scan', initialMin: 10 });
          window.history.replaceState({}, '', '/');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track OS dark-mode changes for automatic Material You switching
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Apply Material You tonal tokens whenever seed color or theme mode updates
  useEffect(() => {
    const resolved = resolveThemeMode(
      prefs.themeMode,
      prefs.nightModeActive,
      prefersDark
    );
    applyMaterialYouTheme(prefs.seedHex, resolved);
  }, [prefs.seedHex, prefs.themeMode, prefs.nightModeActive, prefersDark]);

  // Persist daily helper
  const updateDaily = useCallback(
    async (updater: (prev: DailyProgress) => DailyProgress) => {
      const next = updater(dailyRef.current);
      dailyRef.current = next;
      setDaily(next);
      await saveDaily(next);
    },
    []
  );

  // Persist prefs helper
  const updatePrefs = useCallback(async (patch: Partial<UserPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next).catch(() => {});
      return next;
    });
  }, []);

  // Live hardware accelerometer step tracker -> auto-adds exercise minutes to Grow ring (2000 steps = 15 min)
  useEffect(() => {
    if (!hydrated || !prefs.onboarded || !prefs.permissions.stepCounter) {
      stepTrackerRef.current?.stop();
      return;
    }
    if (!stepTrackerRef.current) {
      stepTrackerRef.current = new LiveStepTracker();
    }
    stepTrackerRef.current.start(() => {
      updateDaily((prev) => {
        const steps = prev.steps + 1;
        return {
          ...prev,
          steps,
          exerciseMinutes: stepsToGrowMinutes(steps),
        };
      });
    });
    return () => {
      stepTrackerRef.current?.stop();
    };
  }, [hydrated, prefs.onboarded, prefs.permissions.stepCounter, updateDaily]);

  // 90-minute work session "RESET?" heads-up cadence + midnight day rollover watcher
  useEffect(() => {
    if (!hydrated || !prefs.onboarded) return;
    const id = window.setInterval(() => {
      const today = todayKey();
      const cur = dailyRef.current;

      // Seamless new-day rollover
      if (cur.date !== today) {
        loadDaily(today).then((fresh) => {
          setDaily(fresh);
          updatePrefs({ nightModeActive: false });
          checkMissedYesterday(prefs.onboardedAt).then(setMissedYesterday);
        });
        return;
      }

      // Every 90 min after a focus block: surface subtle "RESET?" heads-up
      if (
        cur.lastFocusEndedAt &&
        modal.type === 'none' &&
        !showResetHeadsUp &&
        Date.now() - cur.lastFocusEndedAt >= NINETY_MIN_MS &&
        (!cur.lastResetPromptAt || Date.now() - cur.lastResetPromptAt >= NINETY_MIN_MS)
      ) {
        setShowResetHeadsUp(true);
        updateDaily((d) => ({ ...d, lastResetPromptAt: Date.now() }));
        if (prefs.permissions.notifications) {
          sendLocalNotification(
            'RESET?',
            'Take one 60-second 4-7-8 breath to refresh your nervous system.'
          );
        }
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [
    hydrated,
    prefs.onboarded,
    prefs.onboardedAt,
    prefs.permissions.notifications,
    modal.type,
    showResetHeadsUp,
    updateDaily,
    updatePrefs,
  ]);

  const refreshActiveDays = useCallback(async () => {
    const all = await loadAllDaily();
    setActiveDays(computeActiveDaysCount(all));
  }, []);

  const handleImportPack = useCallback(async (pack: LessonPack) => {
    await saveCustomPack(pack);
    setCustomPacks((prev) => [...prev.filter((p) => p.id !== pack.id), pack]);
  }, []);

  const handleDeletePack = useCallback(
    async (packId: string) => {
      await deleteCustomPack(packId);
      setCustomPacks((prev) => prev.filter((p) => p.id !== packId));
      if (prefs.selectedSkillId === packId) {
        await updatePrefs({ selectedSkillId: 'spanish' });
      }
    },
    [prefs.selectedSkillId, updatePrefs]
  );

  const handleCompleteOnboarding = useCallback(async (nextPrefs: UserPrefs) => {
    setPrefs(nextPrefs);
    audioEngine.setVolume(nextPrefs.soundVolume);
    await savePrefs(nextPrefs);
  }, []);

  const handleRateCard = useCallback(
    async (cardId: string, packId: string, rating: 'again' | 'good' | 'easy') => {
      const existing = masteryMap[cardId];
      const prevBox = existing?.box ?? 1;
      const nextBox =
        rating === 'again'
          ? 1
          : rating === 'good'
            ? Math.min(5, prevBox + 1)
            : Math.min(5, prevBox + 2);

      const updated: CardMastery = {
        cardId,
        packId,
        box: nextBox,
        reviews: (existing?.reviews ?? 0) + 1,
        lastReviewedAt: Date.now(),
      };
      setMasteryMap((prev) => ({ ...prev, [cardId]: updated }));
      await saveCardMastery(updated);
    },
    [masteryMap]
  );

  const handleCompleteFocus = useCallback(
    async (creditedMinutes: number, cardsReviewed: number, isCatchUp: boolean) => {
      await updateDaily((prev) => ({
        ...prev,
        focusMinutes: prev.focusMinutes + creditedMinutes,
        cardsReviewed: prev.cardsReviewed + cardsReviewed,
        lastFocusEndedAt: Date.now(),
      }));
      await logSession({
        date: todayKey(),
        kind: isCatchUp ? 'catchup' : 'focus',
        minutes: creditedMinutes,
        ring: 'grow',
        note: `${activePack.title} · ${cardsReviewed} cards`,
      });
      if (isCatchUp) setMissedYesterday(false);
      await refreshActiveDays();
      setModal({ type: 'none' });
    },
    [activePack.title, refreshActiveDays, updateDaily]
  );

  const handleCompleteReset = useCallback(
    async (creditedMinutes: number, wasMorningPrimer: boolean) => {
      await updateDaily((prev) => ({
        ...prev,
        calmMinutes: prev.calmMinutes + creditedMinutes,
        morningPrimed: prev.morningPrimed || wasMorningPrimer,
      }));
      await logSession({
        date: todayKey(),
        kind: wasMorningPrimer ? 'morning_primer' : 'reset',
        minutes: creditedMinutes,
        ring: 'calm',
        note: wasMorningPrimer ? 'Morning 5-breath primer' : '4-7-8 calm reset',
      });
      await refreshActiveDays();
      setModal({ type: 'none' });
    },
    [refreshActiveDays, updateDaily]
  );

  const handleCompleteBodyScan = useCallback(
    async (minutes: number, activateNightMode: boolean) => {
      await updateDaily((prev) => ({
        ...prev,
        calmMinutes: prev.calmMinutes + minutes,
        eveningScanDone: true,
      }));
      if (activateNightMode) {
        await updatePrefs({ nightModeActive: true });
      }
      await logSession({
        date: todayKey(),
        kind: 'body_scan',
        minutes,
        ring: 'calm',
        note: `Evening ${minutes}-min body-scan`,
      });
      await refreshActiveDays();
      setModal({ type: 'none' });
    },
    [refreshActiveDays, updateDaily, updatePrefs]
  );

  const handleAddWater = useCallback(() => {
    updateDaily((prev) => ({
      ...prev,
      waterGlasses: prev.waterGlasses + 1,
    }));
  }, [updateDaily]);

  const handleAddSteps = useCallback(
    (delta: number) => {
      updateDaily((prev) => {
        const steps = Math.max(0, prev.steps + delta);
        return {
          ...prev,
          steps,
          exerciseMinutes: stepsToGrowMinutes(steps),
        };
      });
      refreshActiveDays();
    },
    [refreshActiveDays, updateDaily]
  );

  const handleSaveMood = useCallback(
    async (mood: MoodLevel, note: string) => {
      await updateDaily((prev) => ({ ...prev, mood, moodNote: note }));
      setModal({ type: 'none' });
    },
    [updateDaily]
  );

  const handleGdprDelete = useCallback(async () => {
    await gdprDeleteAllData();
    const freshPrefs = { ...DEFAULT_PREFS, permissions: { ...DEFAULT_PREFS.permissions } };
    setPrefs(freshPrefs);
    setDaily(createEmptyDaily());
    setCustomPacks([]);
    setMasteryMap({});
    setActiveDays(0);
    setMissedYesterday(false);
    setShowResetHeadsUp(false);
    setModal({ type: 'none' });
  }, []);

  if (!hydrated) {
    return (
      <div
        className="h-dvh w-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--md-bg)' }}
      />
    );
  }

  return (
    <div
      className="h-dvh w-full flex items-center justify-center overflow-hidden sm:p-4"
      style={{ backgroundColor: 'var(--md-backdrop)' }}
    >
      {/* Mobile-native Material You viewport */}
      <div
        className="relative w-full h-full sm:max-w-[412px] sm:max-h-[860px] sm:rounded-[40px] overflow-hidden sm:shadow-2xl"
        style={{
          backgroundColor: 'var(--md-bg)',
          border: '1px solid var(--md-outline)',
        }}
      >
        {!prefs.onboarded ? (
          <Onboarding
            packs={allPacks}
            initialPrefs={prefs}
            onImportPack={handleImportPack}
            onComplete={handleCompleteOnboarding}
          />
        ) : (
          <HomeScreen
            prefs={prefs}
            daily={daily}
            activePack={activePack}
            curriculumWeek={curriculumWeek}
            missedYesterday={missedYesterday}
            showResetHeadsUp={showResetHeadsUp}
            onDismissResetHeadsUp={() => setShowResetHeadsUp(false)}
            onStartFocus={(durationMin, isCatchUp) =>
              setModal({ type: 'focus', durationMin, isCatchUp })
            }
            onStartReset={(mode) => setModal({ type: 'reset', mode })}
            onOpenBodyScan={() => setModal({ type: 'body_scan', initialMin: 10 })}
            onAddWater={handleAddWater}
            onOpenMood={() => setModal({ type: 'mood' })}
            onOpenSteps={() => setModal({ type: 'steps' })}
            onOpenSettings={() => setModal({ type: 'settings' })}
          />
        )}
      </div>

      {/* Full-screen / bottom-sheet experiences */}
      {modal.type === 'focus' && (
        <FocusSession
          durationMin={modal.durationMin}
          isCatchUp={modal.isCatchUp}
          pack={activePack}
          curriculumWeek={curriculumWeek}
          prefs={prefs}
          masteryMap={masteryMap}
          onRateCard={handleRateCard}
          onChangeSound={(theme: SoundTheme) => updatePrefs({ soundTheme: theme })}
          onTriggerSocialGuard={(appName: SocialAppName) =>
            setModal({ type: 'social_guard', appName })
          }
          onComplete={handleCompleteFocus}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'reset' && (
        <ResetBreathing
          mode={modal.mode}
          onComplete={handleCompleteReset}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'body_scan' && (
        <BodyScanSheet
          initialDuration={modal.initialMin}
          voiceGuideEnabled={prefs.voiceGuideEnabled}
          onToggleVoiceGuide={(enabled) => updatePrefs({ voiceGuideEnabled: enabled })}
          onComplete={handleCompleteBodyScan}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'mood' && (
        <MoodSheet
          currentMood={daily.mood}
          currentNote={daily.moodNote}
          bedTime={prefs.bedTime}
          onSave={handleSaveMood}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'steps' && (
        <StepsSheet
          steps={daily.steps}
          sensorEnabled={prefs.permissions.stepCounter}
          waterGlasses={daily.waterGlasses}
          waterTarget={prefs.waterTargetGlasses}
          onAddSteps={handleAddSteps}
          onResetWater={() => updateDaily((d) => ({ ...d, waterGlasses: 0 }))}
          onToggleSensor={() =>
            updatePrefs({
              permissions: {
                ...prefs.permissions,
                stepCounter: !prefs.permissions.stepCounter,
              },
            })
          }
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'social_guard' && (
        <SocialGuardOverlay
          appName={modal.appName}
          lunchStart={prefs.lunchStart}
          lunchEnd={prefs.lunchEnd}
          onCompleteBreath={async () => {
            await updateDaily((prev) => ({
              ...prev,
              calmMinutes: prev.calmMinutes + 1,
            }));
            await logSession({
              date: todayKey(),
              kind: 'social_pause',
              minutes: 1,
              ring: 'calm',
              note: `4-7-8 pause instead of ${modal.appName}`,
            });
            await refreshActiveDays();
            setModal({ type: 'none' });
          }}
          onDismiss={() => setModal({ type: 'none' })}
        />
      )}

      {modal.type === 'settings' && (
        <SettingsDrawer
          prefs={prefs}
          daily={daily}
          packs={allPacks}
          activeDays={activeDays}
          onUpdatePrefs={updatePrefs}
          onImportPack={handleImportPack}
          onDeletePack={handleDeletePack}
          onGdprDelete={handleGdprDelete}
          onTriggerMorningPrimer={() =>
            setModal({ type: 'reset', mode: 'morning_primer' })
          }
          onTriggerResetHeadsUp={() => {
            setModal({ type: 'none' });
            setShowResetHeadsUp(true);
          }}
          onTriggerCatchUp={() =>
            setModal({ type: 'focus', durationMin: 12, isCatchUp: true })
          }
          onTriggerSocialGuard={(app) =>
            setModal({ type: 'social_guard', appName: app })
          }
          onTriggerBodyScan={() =>
            setModal({ type: 'body_scan', initialMin: 10 })
          }
          onTriggerQuickBreathe={() =>
            setModal({ type: 'reset', mode: 'quick_widget' })
          }
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  );
};

export default App;
