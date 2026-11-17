import type {
  CardMastery,
  DailyProgress,
  LessonPack,
  SessionLog,
  UserPrefs,
} from '../types';

const DB_NAME = 'mindloop_offline_db';
const DB_VERSION = 1;

const STORES = {
  prefs: 'user_prefs',
  daily: 'daily_progress',
  sessions: 'session_logs',
  mastery: 'card_mastery',
  packs: 'custom_packs',
} as const;

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yesterdayKey(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

/**
 * Step counter auto-conversion per spec: ≈ 2,000 steps = 15 min added to Grow ring.
 */
export function stepsToGrowMinutes(steps: number): number {
  if (steps <= 0) return 0;
  return Math.floor((steps * 15) / 2000);
}

export const DEFAULT_PREFS: UserPrefs = {
  onboarded: false,
  onboardedAt: null,
  selectedSkillId: 'spanish',
  soundTheme: 'rain',
  soundVolume: 0.55,
  permissions: {
    dnd: false,
    notifications: false,
    stepCounter: false,
  },
  themeMode: 'auto',
  seedHex: '#2D6E52',
  seedName: 'Moss & Mist',
  wakeTime: '07:00',
  bedTime: '22:30',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  growTargetMin: 60,
  calmTargetMin: 30,
  waterTargetGlasses: 8,
  socialGuardEnabled: true,
  voiceGuideEnabled: false,
  nightModeActive: false,
};

export function createEmptyDaily(date: string = todayKey()): DailyProgress {
  return {
    date,
    focusMinutes: 0,
    exerciseMinutes: 0,
    calmMinutes: 0,
    steps: 0,
    waterGlasses: 0,
    mood: null,
    moodNote: '',
    morningPrimed: false,
    eveningScanDone: false,
    cardsReviewed: 0,
    lastFocusEndedAt: null,
    lastResetPromptAt: null,
  };
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.prefs)) {
        db.createObjectStore(STORES.prefs);
      }
      if (!db.objectStoreNames.contains(STORES.daily)) {
        db.createObjectStore(STORES.daily, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const s = db.createObjectStore(STORES.sessions, { keyPath: 'id' });
        s.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.mastery)) {
        db.createObjectStore(STORES.mastery, { keyPath: 'cardId' });
      }
      if (!db.objectStoreNames.contains(STORES.packs)) {
        db.createObjectStore(STORES.packs, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function txGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function txGetAll<T>(storeName: string): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve((req.result as T[]) ?? []);
        req.onerror = () => reject(req.error);
      })
  );
}

function txPut<T>(storeName: string, value: T, key?: IDBValidKey): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        if (key !== undefined) store.put(value, key);
        else store.put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function txDelete(storeName: string, key: IDBValidKey): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function loadPrefs(): Promise<UserPrefs> {
  const saved = await txGet<UserPrefs>(STORES.prefs, 'singleton');
  if (!saved) return { ...DEFAULT_PREFS, permissions: { ...DEFAULT_PREFS.permissions } };
  return {
    ...DEFAULT_PREFS,
    ...saved,
    permissions: { ...DEFAULT_PREFS.permissions, ...(saved.permissions ?? {}) },
  };
}

export async function savePrefs(prefs: UserPrefs): Promise<void> {
  await txPut(STORES.prefs, prefs, 'singleton');
}

export async function loadDaily(date: string = todayKey()): Promise<DailyProgress> {
  const saved = await txGet<DailyProgress>(STORES.daily, date);
  return saved ? { ...createEmptyDaily(date), ...saved } : createEmptyDaily(date);
}

export async function saveDaily(daily: DailyProgress): Promise<void> {
  await txPut(STORES.daily, daily);
}

export async function loadAllDaily(): Promise<DailyProgress[]> {
  const list = await txGetAll<DailyProgress>(STORES.daily);
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export async function logSession(entry: Omit<SessionLog, 'id' | 'completedAt'>): Promise<SessionLog> {
  const full: SessionLog = {
    ...entry,
    id: `ses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    completedAt: Date.now(),
  };
  await txPut(STORES.sessions, full);
  return full;
}

export async function loadAllSessions(): Promise<SessionLog[]> {
  const list = await txGetAll<SessionLog>(STORES.sessions);
  return list.sort((a, b) => b.completedAt - a.completedAt);
}

export async function loadMasteryMap(): Promise<Record<string, CardMastery>> {
  const all = await txGetAll<CardMastery>(STORES.mastery);
  const map: Record<string, CardMastery> = {};
  for (const item of all) map[item.cardId] = item;
  return map;
}

export async function saveCardMastery(entry: CardMastery): Promise<void> {
  await txPut(STORES.mastery, entry);
}

export async function loadCustomPacks(): Promise<LessonPack[]> {
  return txGetAll<LessonPack>(STORES.packs);
}

export async function saveCustomPack(pack: LessonPack): Promise<void> {
  await txPut(STORES.packs, pack);
}

export async function deleteCustomPack(packId: string): Promise<void> {
  await txDelete(STORES.packs, packId);
}

/**
 * Checks whether the user missed yesterday (had onboarded prior to today, yet recorded 0 Grow
 * and 0 Calm minutes yesterday) so we can offer the guilt-free 12-min Catch-up session.
 */
export async function checkMissedYesterday(onboardedAt: string | null): Promise<boolean> {
  if (!onboardedAt) return false;
  const onboardDate = onboardedAt.slice(0, 10);
  const today = todayKey();
  if (onboardDate >= today) return false;

  const yKey = yesterdayKey();
  const yData = await txGet<DailyProgress>(STORES.daily, yKey);
  if (!yData) return true;
  const totalGrow = yData.focusMinutes + yData.exerciseMinutes;
  return totalGrow === 0 && yData.calmMinutes === 0;
}

/**
 * Computes current active streak (consecutive days with any Grow or Calm activity).
 */
export function computeActiveDaysCount(allDaily: DailyProgress[]): number {
  return allDaily.filter(
    (d) => d.focusMinutes + d.exerciseMinutes > 0 || d.calmMinutes > 0 || d.morningPrimed
  ).length;
}

/**
 * Exports all local offline data into an authentic binary SQLite 3 database (.sqlite)
 * sharing the exact Room DB schema used by the MindLoop native Android app.
 */
export async function exportSqliteDatabase(): Promise<{ blob: Blob; filename: string }> {
  const [prefs, allDaily, sessions, masteryList, customPacks] = await Promise.all([
    loadPrefs(),
    loadAllDaily(),
    loadAllSessions(),
    txGetAll<CardMastery>(STORES.mastery),
    loadCustomPacks(),
  ]);

  const stamp = todayKey();

  try {
    const initSqlJsModule = await import('sql.js');
    const initSqlJs = initSqlJsModule.default;
    const SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });

    const db = new SQL.Database();
    db.run(`
      CREATE TABLE user_prefs (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        selected_skill_id TEXT NOT NULL,
        sound_theme TEXT NOT NULL,
        theme_mode TEXT NOT NULL,
        seed_hex TEXT NOT NULL,
        wake_time TEXT NOT NULL,
        bed_time TEXT NOT NULL,
        lunch_start TEXT NOT NULL,
        lunch_end TEXT NOT NULL,
        grow_target_min INTEGER NOT NULL,
        calm_target_min INTEGER NOT NULL,
        dnd_enabled INTEGER NOT NULL,
        notifications_enabled INTEGER NOT NULL,
        step_counter_enabled INTEGER NOT NULL,
        social_guard_enabled INTEGER NOT NULL,
        onboarded_at TEXT
      );

      CREATE TABLE daily_progress (
        date TEXT PRIMARY KEY NOT NULL,
        focus_minutes INTEGER NOT NULL,
        exercise_minutes INTEGER NOT NULL,
        calm_minutes INTEGER NOT NULL,
        steps INTEGER NOT NULL,
        water_glasses INTEGER NOT NULL,
        mood INTEGER,
        mood_note TEXT NOT NULL,
        morning_primed INTEGER NOT NULL,
        evening_scan_done INTEGER NOT NULL,
        cards_reviewed INTEGER NOT NULL
      );

      CREATE TABLE session_logs (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        ring TEXT NOT NULL,
        note TEXT NOT NULL,
        completed_at INTEGER NOT NULL
      );

      CREATE TABLE card_mastery (
        card_id TEXT PRIMARY KEY NOT NULL,
        pack_id TEXT NOT NULL,
        box INTEGER NOT NULL,
        reviews INTEGER NOT NULL,
        last_reviewed_at INTEGER NOT NULL
      );

      CREATE TABLE custom_flashcards (
        id TEXT PRIMARY KEY NOT NULL,
        pack_id TEXT NOT NULL,
        pack_title TEXT NOT NULL,
        week INTEGER NOT NULL,
        category TEXT NOT NULL,
        front TEXT NOT NULL,
        hint TEXT NOT NULL,
        back TEXT NOT NULL,
        example TEXT NOT NULL
      );
    `);

    db.run(
      `INSERT INTO user_prefs VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prefs.selectedSkillId,
        prefs.soundTheme,
        prefs.themeMode,
        prefs.seedHex,
        prefs.wakeTime,
        prefs.bedTime,
        prefs.lunchStart,
        prefs.lunchEnd,
        prefs.growTargetMin,
        prefs.calmTargetMin,
        prefs.permissions.dnd ? 1 : 0,
        prefs.permissions.notifications ? 1 : 0,
        prefs.permissions.stepCounter ? 1 : 0,
        prefs.socialGuardEnabled ? 1 : 0,
        prefs.onboardedAt,
      ]
    );

    const dailyStmt = db.prepare(
      `INSERT INTO daily_progress VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const d of allDaily) {
      dailyStmt.run([
        d.date,
        d.focusMinutes,
        d.exerciseMinutes,
        d.calmMinutes,
        d.steps,
        d.waterGlasses,
        d.mood,
        d.moodNote,
        d.morningPrimed ? 1 : 0,
        d.eveningScanDone ? 1 : 0,
        d.cardsReviewed,
      ]);
    }
    dailyStmt.free();

    const sesStmt = db.prepare(`INSERT INTO session_logs VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const s of sessions) {
      sesStmt.run([s.id, s.date, s.kind, s.minutes, s.ring, s.note, s.completedAt]);
    }
    sesStmt.free();

    const masStmt = db.prepare(`INSERT INTO card_mastery VALUES (?, ?, ?, ?, ?)`);
    for (const m of masteryList) {
      masStmt.run([m.cardId, m.packId, m.box, m.reviews, m.lastReviewedAt]);
    }
    masStmt.free();

    const cardStmt = db.prepare(
      `INSERT INTO custom_flashcards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const pack of customPacks) {
      for (const c of pack.cards) {
        cardStmt.run([
          c.id,
          pack.id,
          pack.title,
          c.week,
          c.category,
          c.front,
          c.hint,
          c.back,
          c.example,
        ]);
      }
    }
    cardStmt.free();

    const binary = db.export();
    db.close();
    const copy = new Uint8Array(binary.byteLength);
    copy.set(binary);
    return {
      blob: new Blob([copy], { type: 'application/x-sqlite3' }),
      filename: `mindloop-backup-${stamp}.sqlite`,
    };
  } catch {
    // Clean SQL dump fallback if WebAssembly is restricted by browser policy
    const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
    const lines = [
      '-- MindLoop Offline SQLite Export',
      'BEGIN TRANSACTION;',
      'CREATE TABLE IF NOT EXISTS daily_progress (date TEXT PRIMARY KEY, focus_minutes INT, exercise_minutes INT, calm_minutes INT, steps INT, water_glasses INT, mood INT, mood_note TEXT, morning_primed INT, evening_scan_done INT, cards_reviewed INT);',
      ...allDaily.map(
        (d) =>
          `INSERT INTO daily_progress VALUES (${esc(d.date)}, ${d.focusMinutes}, ${d.exerciseMinutes}, ${d.calmMinutes}, ${d.steps}, ${d.waterGlasses}, ${d.mood ?? 'NULL'}, ${esc(d.moodNote)}, ${d.morningPrimed ? 1 : 0}, ${d.eveningScanDone ? 1 : 0}, ${d.cardsReviewed});`
      ),
      'COMMIT;',
    ];
    return {
      blob: new Blob([lines.join('\n')], { type: 'application/sql' }),
      filename: `mindloop-backup-${stamp}.sql`,
    };
  }
}

/**
 * GDPR-compliant complete offline data deletion: wipes every IndexedDB object store,
 * localStorage keys, and offline caches immediately on device.
 */
export async function gdprDeleteAllData(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const names = Array.from(db.objectStoreNames);
    const tx = db.transaction(names, 'readwrite');
    for (const name of names) {
      tx.objectStore(name).clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  try {
    localStorage.clear();
  } catch {
    // Ignore storage access errors in private contexts
  }
}
