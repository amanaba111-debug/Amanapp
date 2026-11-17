export type BuiltinSkillId = 'spanish' | 'coding' | 'chess' | 'guitar';
export type SkillId = BuiltinSkillId | string;

export type SoundTheme = 'rain' | 'forest' | 'cafe';

export type ThemeMode = 'auto' | 'light' | 'dark' | 'amoled';

export type ResolvedTheme = 'light' | 'dark' | 'amoled';

export type PrimaryActionMode = 'focus' | 'reset';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface Flashcard {
  id: string;
  week: number;
  category: string;
  front: string;
  hint: string;
  back: string;
  example: string;
}

export interface LessonPack {
  id: SkillId;
  title: string;
  subtitle: string;
  dailyMinutes: number;
  weeks: number;
  sizeLabel: string;
  isCustom?: boolean;
  cards: Flashcard[];
}

export interface CardMastery {
  cardId: string;
  packId: SkillId;
  box: number; // 1..5 Leitner box
  reviews: number;
  lastReviewedAt: number;
}

export interface UserPrefs {
  onboarded: boolean;
  onboardedAt: string | null;
  selectedSkillId: SkillId;
  soundTheme: SoundTheme;
  soundVolume: number; // 0..1
  permissions: {
    dnd: boolean;
    notifications: boolean;
    stepCounter: boolean;
  };
  themeMode: ThemeMode;
  seedHex: string;
  seedName: string;
  wakeTime: string; // "07:00"
  bedTime: string; // "22:30"
  lunchStart: string; // "12:00"
  lunchEnd: string; // "13:00"
  growTargetMin: number; // default 60
  calmTargetMin: number; // default 30
  waterTargetGlasses: number; // default 8
  socialGuardEnabled: boolean;
  voiceGuideEnabled: boolean;
  nightModeActive: boolean;
}

export interface DailyProgress {
  date: string; // YYYY-MM-DD
  focusMinutes: number;
  exerciseMinutes: number; // auto-computed from steps (2000 steps = 15 min) + manual
  calmMinutes: number;
  steps: number;
  waterGlasses: number;
  mood: MoodLevel | null;
  moodNote: string;
  morningPrimed: boolean;
  eveningScanDone: boolean;
  cardsReviewed: number;
  lastFocusEndedAt: number | null;
  lastResetPromptAt: number | null;
}

export type SessionKind =
  | 'focus'
  | 'catchup'
  | 'reset'
  | 'morning_primer'
  | 'body_scan'
  | 'social_pause';

export interface SessionLog {
  id: string;
  date: string;
  kind: SessionKind;
  minutes: number;
  ring: 'grow' | 'calm';
  note: string;
  completedAt: number;
}

export type SocialAppName = 'Instagram' | 'TikTok' | 'YouTube Shorts' | 'X';

export type ActiveModal =
  | { type: 'none' }
  | { type: 'focus'; durationMin: number; isCatchUp: boolean }
  | { type: 'reset'; mode: 'standard' | 'morning_primer' | 'quick_widget' }
  | { type: 'body_scan'; initialMin?: 5 | 10 | 15 }
  | { type: 'mood' }
  | { type: 'steps' }
  | { type: 'settings' }
  | { type: 'social_guard'; appName: SocialAppName }
  | { type: 'widgets_preview' };
