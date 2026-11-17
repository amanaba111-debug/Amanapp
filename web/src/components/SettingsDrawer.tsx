import React, { useRef, useState } from 'react';
import {
  Check,
  Database,
  Download,
  FileSpreadsheet,
  ImagePlus,
  LayoutGrid,
  Moon,
  ShieldAlert,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Wind,
  X,
} from 'lucide-react';
import { WALLPAPER_SEEDS, extractSeedFromImage } from '../lib/theme';
import { parseCustomPackCsv, SAMPLE_CSV_TEMPLATE } from '../data/lessonPacks';
import { exportSqliteDatabase } from '../lib/db';
import { audioEngine } from '../lib/audioEngine';
import { haptics } from '../lib/haptics';
import type {
  DailyProgress,
  LessonPack,
  SocialAppName,
  SoundTheme,
  ThemeMode,
  UserPrefs,
} from '../types';

interface SettingsDrawerProps {
  prefs: UserPrefs;
  daily: DailyProgress;
  packs: LessonPack[];
  activeDays: number;
  onUpdatePrefs: (patch: Partial<UserPrefs>) => Promise<void>;
  onImportPack: (pack: LessonPack) => Promise<void>;
  onDeletePack: (packId: string) => Promise<void>;
  onGdprDelete: () => Promise<void>;
  onTriggerMorningPrimer: () => void;
  onTriggerResetHeadsUp: () => void;
  onTriggerCatchUp: () => void;
  onTriggerSocialGuard: (app: SocialAppName) => void;
  onTriggerBodyScan: () => void;
  onTriggerQuickBreathe: () => void;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  prefs,
  daily,
  packs,
  activeDays,
  onUpdatePrefs,
  onImportPack,
  onDeletePack,
  onGdprDelete,
  onTriggerMorningPrimer,
  onTriggerResetHeadsUp,
  onTriggerCatchUp,
  onTriggerSocialGuard,
  onTriggerBodyScan,
  onTriggerQuickBreathe,
  onClose,
}) => {
  const [packTitle, setPackTitle] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const growTotal = daily.focusMinutes + daily.exerciseMinutes;
  const growPct = Math.min(100, Math.round((growTotal / prefs.growTargetMin) * 100));
  const calmPct = Math.min(100, Math.round((daily.calmMinutes / prefs.calmTargetMin) * 100));

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleWallpaperExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const hex = await extractSeedFromImage(file);
      haptics.complete();
      await onUpdatePrefs({ seedHex: hex, seedName: 'From wallpaper' });
      flashStatus(`Material You color extracted (${hex.toUpperCase()})`);
    } catch {
      flashStatus('Could not read wallpaper image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const fallback = file.name.replace(/\.csv$/i, '').replace(/[-_]+/g, ' ');
      const title =
        packTitle.trim() || fallback.charAt(0).toUpperCase() + fallback.slice(1);
      const pack = parseCustomPackCsv(text, title);
      await onImportPack(pack);
      await onUpdatePrefs({ selectedSkillId: pack.id });
      setPackTitle('');
      haptics.complete();
      flashStatus(`Loaded "${pack.title}" (${pack.cards.length} cards)`);
    } catch (err) {
      flashStatus(err instanceof Error ? err.message : 'Invalid CSV format');
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindloop-custom-pack-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSqlite = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await exportSqliteDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      haptics.complete();
      flashStatus(`Exported ${filename}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MindLoop Settings"
      className="fixed inset-0 z-40 flex justify-center anim-fade"
      style={{ backgroundColor: 'var(--md-bg)', color: 'var(--md-on-surface)' }}
    >
      <div className="w-full max-w-[430px] h-full flex flex-col px-5 pt-safe pb-safe">
        {/* Sticky header */}
        <div className="flex items-center justify-between pt-1 pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-semibold leading-tight">Settings</h2>
            <p className="text-[11px]" style={{ color: 'var(--md-on-surface-subtle)' }}>
              100% offline · {activeDays} active {activeDays === 1 ? 'day' : 'days'} stored on device
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Settings"
            onClick={() => {
              audioEngine.stopSoundscape();
              onClose();
            }}
            className="m3-press w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--md-surface-low)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className="mb-3 px-4 py-2.5 rounded-2xl text-xs font-semibold anim-fade shrink-0"
            style={{
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
          {/* 1. Material You Dynamic Colour & AMOLED */}
          <section
            className="rounded-[26px] p-4 space-y-3.5"
            style={{
              backgroundColor: 'var(--md-surface-card)',
              border: '1px solid var(--md-outline)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Material You Theme
              </h3>
              {prefs.nightModeActive && (
                <button
                  type="button"
                  onClick={() => onUpdatePrefs({ nightModeActive: false })}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--md-calm-soft)',
                    color: 'var(--md-calm)',
                  }}
                >
                  Night mode on · exit
                </button>
              )}
            </div>

            {/* Theme mode segmented row */}
            <div
              className="grid grid-cols-4 gap-1 p-1 rounded-2xl"
              style={{ backgroundColor: 'var(--md-surface-low)' }}
            >
              {(
                [
                  { id: 'auto', label: 'Auto' },
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                  { id: 'amoled', label: 'AMOLED' },
                ] as Array<{ id: ThemeMode; label: string }>
              ).map((m) => {
                const active = prefs.themeMode === m.id && !prefs.nightModeActive;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      onUpdatePrefs({ themeMode: m.id, nightModeActive: false });
                    }}
                    className="m3-press h-9 rounded-xl text-xs font-semibold"
                    style={{
                      backgroundColor: active ? 'var(--md-primary)' : 'transparent',
                      color: active ? 'var(--md-on-primary)' : 'var(--md-on-surface-muted)',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Wallpaper dynamic colour seeds */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--md-on-surface-muted)' }}>
                  Dynamic seed · {prefs.seedName}
                </span>
                <input
                  ref={wallpaperInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleWallpaperExtract}
                />
                <button
                  type="button"
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: 'var(--md-primary)' }}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Match wallpaper
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                {WALLPAPER_SEEDS.map((seed) => {
                  const selected =
                    prefs.seedHex.toLowerCase() === seed.hex.toLowerCase();
                  return (
                    <button
                      key={seed.hex}
                      type="button"
                      title={`${seed.name} (${seed.description})`}
                      aria-label={seed.name}
                      onClick={() => {
                        haptics.tap();
                        onUpdatePrefs({ seedHex: seed.hex, seedName: seed.name });
                      }}
                      className="m3-press w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: seed.hex,
                        outline: selected ? '2.5px solid var(--md-on-surface)' : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {selected && <Check className="w-4 h-4 text-white stroke-[2.8]" />}
                    </button>
                  );
                })}
                <label
                  title="Pick any custom colour"
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--md-surface-low)',
                    border: '1px dashed var(--md-outline-strong)',
                  }}
                >
                  +
                  <input
                    type="color"
                    value={prefs.seedHex}
                    onChange={(e) =>
                      onUpdatePrefs({ seedHex: e.target.value, seedName: 'Custom' })
                    }
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* 2. 4-Week Lesson Packs & CSV Customiser */}
          <section
            className="rounded-[26px] p-4 space-y-3"
            style={{
              backgroundColor: 'var(--md-surface-card)',
              border: '1px solid var(--md-outline)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Offline Lesson Packs
              </h3>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: 'var(--md-primary)' }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV template
              </button>
            </div>

            <div className="space-y-1.5">
              {packs.map((pack) => {
                const active = pack.id === prefs.selectedSkillId;
                return (
                  <div
                    key={pack.id}
                    className="rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2"
                    style={{
                      backgroundColor: active
                        ? 'var(--md-primary-container)'
                        : 'var(--md-surface-low)',
                      color: active
                        ? 'var(--md-on-primary-container)'
                        : 'var(--md-on-surface)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        haptics.tap();
                        onUpdatePrefs({ selectedSkillId: pack.id });
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="text-xs font-semibold truncate">{pack.title}</div>
                      <div className="text-[11px] opacity-75 tabular-nums">
                        {pack.cards.length} cards · {pack.sizeLabel}
                      </div>
                    </button>
                    {pack.isCustom && (
                      <button
                        type="button"
                        aria-label={`Remove ${pack.title}`}
                        onClick={() => onDeletePack(pack.id)}
                        className="p-1.5 rounded-full opacity-70 hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Custom CSV uploader */}
            <div className="pt-1 flex gap-2">
              <input
                type="text"
                value={packTitle}
                onChange={(e) => setPackTitle(e.target.value)}
                placeholder="Custom deck name…"
                className="flex-1 h-10 px-3 rounded-xl text-xs outline-none"
                style={{
                  backgroundColor: 'var(--md-surface-low)',
                  border: '1px solid var(--md-outline)',
                }}
              />
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvUpload}
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="m3-press h-10 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                style={{
                  backgroundColor: 'var(--md-primary)',
                  color: 'var(--md-on-primary)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload CSV
              </button>
            </div>
          </section>

          {/* 3. Sound & Daily Schedule */}
          <section
            className="rounded-[26px] p-4 space-y-3.5"
            style={{
              backgroundColor: 'var(--md-surface-card)',
              border: '1px solid var(--md-outline)',
            }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Sound & Daily Rhythm
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {(['rain', 'forest', 'cafe'] as SoundTheme[]).map((s) => {
                const active = prefs.soundTheme === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      onUpdatePrefs({ soundTheme: s });
                      audioEngine.startSoundscape(s, prefs.soundVolume);
                    }}
                    className="m3-press h-10 rounded-xl text-xs font-semibold capitalize"
                    style={{
                      backgroundColor: active
                        ? 'var(--md-calm-soft)'
                        : 'var(--md-surface-low)',
                      color: active ? 'var(--md-calm)' : 'var(--md-on-surface-muted)',
                      border: `1px solid ${active ? 'var(--md-calm)' : 'transparent'}`,
                    }}
                  >
                    {s === 'cafe' ? 'Café' : s}
                  </button>
                );
              })}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--md-on-surface-muted)' }}>Calm audio volume</span>
                <span className="tabular-nums font-semibold">
                  {Math.round(prefs.soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(prefs.soundVolume * 100)}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  audioEngine.setVolume(v);
                  onUpdatePrefs({ soundVolume: v });
                }}
                className="m3-slider"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label
                className="rounded-2xl p-2.5 flex flex-col gap-1"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <span style={{ color: 'var(--md-on-surface-subtle)' }}>Morning primer</span>
                <input
                  type="time"
                  value={prefs.wakeTime}
                  onChange={(e) => onUpdatePrefs({ wakeTime: e.target.value })}
                  className="bg-transparent font-semibold tabular-nums outline-none"
                />
              </label>
              <label
                className="rounded-2xl p-2.5 flex flex-col gap-1"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <span style={{ color: 'var(--md-on-surface-subtle)' }}>Bedtime (scan −1h)</span>
                <input
                  type="time"
                  value={prefs.bedTime}
                  onChange={(e) => onUpdatePrefs({ bedTime: e.target.value })}
                  className="bg-transparent font-semibold tabular-nums outline-none"
                />
              </label>
              <label
                className="rounded-2xl p-2.5 flex flex-col gap-1"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <span style={{ color: 'var(--md-on-surface-subtle)' }}>Lunch open from</span>
                <input
                  type="time"
                  value={prefs.lunchStart}
                  onChange={(e) => onUpdatePrefs({ lunchStart: e.target.value })}
                  className="bg-transparent font-semibold tabular-nums outline-none"
                />
              </label>
              <label
                className="rounded-2xl p-2.5 flex flex-col gap-1"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <span style={{ color: 'var(--md-on-surface-subtle)' }}>Lunch open until</span>
                <input
                  type="time"
                  value={prefs.lunchEnd}
                  onChange={(e) => onUpdatePrefs({ lunchEnd: e.target.value })}
                  className="bg-transparent font-semibold tabular-nums outline-none"
                />
              </label>
            </div>
          </section>

          {/* 4. Widgets Preview (1x1 Breathe + 2x1 Ring + QS Tile) */}
          <section
            className="rounded-[26px] p-4 space-y-3"
            style={{
              backgroundColor: 'var(--md-surface-card)',
              border: '1px solid var(--md-outline)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 opacity-70" />
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Widgets & Quick Tile
              </h3>
            </div>

            <div className="flex items-stretch gap-2.5">
              {/* 1x1 Breathe Widget */}
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSoundscape();
                  onTriggerQuickBreathe();
                }}
                className="m3-press w-[88px] rounded-[22px] p-3 flex flex-col items-center justify-center gap-1.5 shrink-0"
                style={{
                  backgroundColor: 'var(--md-calm)',
                  color: 'var(--md-on-calm)',
                }}
              >
                <Wind className="w-5 h-5" />
                <span className="text-[11px] font-bold">Breathe</span>
                <span className="text-[9px] opacity-80">1×1</span>
              </button>

              {/* 2x1 Ring Progress Widget */}
              <div
                className="flex-1 rounded-[22px] p-3 flex flex-col justify-between"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold opacity-70">
                  <span>MindLoop</span>
                  <span>2×1 Widget</span>
                </div>
                <div className="space-y-1.5 mt-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold tabular-nums">
                      <span>Grow</span>
                      <span style={{ color: 'var(--md-grow)' }}>{growPct}%</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden mt-0.5"
                      style={{ backgroundColor: 'var(--md-grow-track)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${growPct}%`, backgroundColor: 'var(--md-grow)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold tabular-nums">
                      <span>Calm</span>
                      <span style={{ color: 'var(--md-calm)' }}>{calmPct}%</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden mt-0.5"
                      style={{ backgroundColor: 'var(--md-calm-track)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${calmPct}%`, backgroundColor: 'var(--md-calm)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Try Smart Automations & Daily Flow Moments */}
          <section
            className="rounded-[26px] p-4 space-y-2.5"
            style={{
              backgroundColor: 'var(--md-surface-card)',
              border: '1px solid var(--md-outline)',
            }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Preview Daily Flow & Automations
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSoundscape();
                  onTriggerMorningPrimer();
                }}
                className="m3-press rounded-2xl p-3 text-left flex items-center gap-2 font-medium"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <Sun className="w-4 h-4 shrink-0" style={{ color: 'var(--md-grow)' }} />
                <span>5-Breath Primer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSoundscape();
                  onTriggerResetHeadsUp();
                }}
                className="m3-press rounded-2xl p-3 text-left flex items-center gap-2 font-medium"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <Wind className="w-4 h-4 shrink-0" style={{ color: 'var(--md-calm)' }} />
                <span>90m "RESET?"</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSoundscape();
                  onTriggerSocialGuard('TikTok');
                }}
                className="m3-press rounded-2xl p-3 text-left flex items-center gap-2 font-medium"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: 'var(--md-calm)' }} />
                <span>TikTok Shield</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSoundscape();
                  onTriggerCatchUp();
                }}
                className="m3-press rounded-2xl p-3 text-left flex items-center gap-2 font-medium"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--md-amber)' }} />
                <span>12m Catch-up</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.stopSoundscape();
                  onTriggerBodyScan();
                }}
                className="m3-press col-span-2 rounded-2xl p-3 text-left flex items-center justify-center gap-2 font-medium"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <Moon className="w-4 h-4 shrink-0" style={{ color: 'var(--md-calm)' }} />
                <span>Evening Body-Scan (5 / 10 / 15 min)</span>
              </button>
            </div>
          </section>

          {/* 6. Offline Data & GDPR Privacy */}
          <section
            className="rounded-[26px] p-4 space-y-2.5"
            style={{
              backgroundColor: 'var(--md-surface-card)',
              border: '1px solid var(--md-outline)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 opacity-70" />
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Offline Data & GDPR Privacy
              </h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--md-on-surface-muted)' }}>
              Zero accounts, zero telemetry, zero servers. Export your complete SQLite database any
              time or permanently erase everything.
            </p>

            <button
              type="button"
              disabled={exporting}
              onClick={handleExportSqlite}
              className="m3-press w-full h-11 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--md-primary-container)',
                color: 'var(--md-on-primary-container)',
              }}
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Building SQLite file…' : 'Export SQLite Database (.sqlite)'}
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="m3-press w-full h-10 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400"
                style={{ backgroundColor: 'var(--md-surface-low)' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All Local Data (GDPR)
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 anim-fade">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="m3-press h-10 rounded-2xl text-xs font-semibold"
                  style={{ backgroundColor: 'var(--md-surface-low)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    audioEngine.stopAll();
                    haptics.tap();
                    await onGdprDelete();
                  }}
                  className="m3-press h-10 rounded-2xl text-xs font-semibold bg-red-600 text-white"
                >
                  Erase Everything
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
