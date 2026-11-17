import spanishPack from '@packs/spanish-4week.json';
import codingPack from '@packs/coding-4week.json';
import chessPack from '@packs/chess-4week.json';
import guitarPack from '@packs/guitar-4week.json';
import type { CardMastery, Flashcard, LessonPack } from '../types';

export const BUILTIN_PACKS: LessonPack[] = [
  spanishPack as LessonPack,
  codingPack as LessonPack,
  chessPack as LessonPack,
  guitarPack as LessonPack,
];

/**
 * Calculates which week (1..4) of the 4-week journey the user is currently in.
 */
export function getCurrentCurriculumWeek(onboardedAt: string | null): number {
  if (!onboardedAt) return 1;
  const start = new Date(onboardedAt).getTime();
  if (Number.isNaN(start)) return 1;
  const days = Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
  return Math.min(4, Math.floor(days / 7) + 1);
}

/**
 * Auto-curates today's 15-min micro-lesson card queue:
 * prioritizes current week's cards and lower Leitner mastery boxes first.
 */
export function curateMicroLessonQueue(
  pack: LessonPack,
  masteryMap: Record<string, CardMastery>,
  targetWeek: number
): Flashcard[] {
  return [...pack.cards].sort((a, b) => {
    const aDist = a.week === targetWeek ? 0 : a.week < targetWeek ? 1 : 2 + (a.week - targetWeek);
    const bDist = b.week === targetWeek ? 0 : b.week < targetWeek ? 1 : 2 + (b.week - targetWeek);
    if (aDist !== bDist) return aDist - bDist;

    const aBox = masteryMap[a.id]?.box ?? 0;
    const bBox = masteryMap[b.id]?.box ?? 0;
    if (aBox !== bBox) return aBox - bBox;

    const aLast = masteryMap[a.id]?.lastReviewedAt ?? 0;
    const bLast = masteryMap[b.id]?.lastReviewedAt ?? 0;
    return aLast - bLast;
  });
}

/**
 * RFC-4180 compliant CSV parser for custom offline flashcard packs.
 * Accepts either:
 *   - 6 columns: week,category,front,hint,back,example
 *   - 2-5 columns: front,back[,hint,example,week]
 */
function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some((v) => v.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((v) => v.length > 0)) rows.push(row);
  return rows;
}

export function parseCustomPackCsv(csvText: string, packTitle: string): LessonPack {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const firstLower = rows[0].map((c) => c.toLowerCase());
  const hasHeader =
    firstLower.includes('front') ||
    firstLower.includes('question') ||
    firstLower.includes('prompt') ||
    firstLower.includes('back') ||
    firstLower.includes('answer');

  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (dataRows.length === 0) {
    throw new Error('Add at least one flashcard row below the header.');
  }

  const colIdx = (names: string[], fallback: number): number => {
    if (!hasHeader) return fallback;
    for (const name of names) {
      const idx = firstLower.indexOf(name);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const frontIdx = hasHeader ? colIdx(['front', 'question', 'prompt', 'term'], 0) : 0;
  const backIdx = hasHeader ? colIdx(['back', 'answer', 'definition', 'meaning'], 1) : 1;
  const hintIdx = hasHeader ? colIdx(['hint', 'clue', 'pronunciation'], -1) : 2;
  const exampleIdx = hasHeader ? colIdx(['example', 'note', 'context'], -1) : 3;
  const weekIdx = hasHeader ? colIdx(['week'], -1) : -1;
  const catIdx = hasHeader ? colIdx(['category', 'topic', 'tag'], -1) : -1;

  const slug = `custom-${packTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'deck'}-${Date.now().toString(36)}`;

  const cards: Flashcard[] = [];
  dataRows.forEach((cols, idx) => {
    const front = frontIdx >= 0 ? (cols[frontIdx] ?? '') : (cols[0] ?? '');
    const back = backIdx >= 0 ? (cols[backIdx] ?? '') : (cols[1] ?? '');
    if (!front || !back) return;

    const parsedWeek = weekIdx >= 0 ? parseInt(cols[weekIdx] ?? '', 10) : NaN;
    const week =
      !Number.isNaN(parsedWeek) && parsedWeek >= 1 && parsedWeek <= 4
        ? parsedWeek
        : Math.min(4, Math.floor((idx / Math.max(1, dataRows.length)) * 4) + 1);

    const rawCat = catIdx >= 0 ? (cols[catIdx] ?? '') : '';
    const category = rawCat ? `Week ${week} · ${rawCat}` : `Week ${week} · Custom`;
    const hint = hintIdx >= 0 ? (cols[hintIdx] ?? '') : '';
    const example = exampleIdx >= 0 ? (cols[exampleIdx] ?? '') : '';

    cards.push({
      id: `${slug}-c${idx + 1}`,
      week,
      category,
      front,
      hint,
      back,
      example,
    });
  });

  if (cards.length === 0) {
    throw new Error('Could not find valid front/back flashcard columns in CSV.');
  }

  const bytes = new Blob([csvText]).size;
  const sizeLabel =
    bytes < 1024 ? `${bytes} B offline` : `${(bytes / 1024).toFixed(1)} KB offline`;

  return {
    id: slug,
    title: packTitle.trim() || 'Custom 4-Week Pack',
    subtitle: `${cards.length} custom flash-cards · 100% private offline`,
    dailyMinutes: 15,
    weeks: 4,
    sizeLabel,
    isCustom: true,
    cards,
  };
}

export const SAMPLE_CSV_TEMPLATE = `week,category,front,hint,back,example
1,Basics,"How do you say 'Good morning, how are you?' in Italian?","Think 'Buon...' + friendly greeting","Buongiorno, come stai?","Buongiorno, come stai? — Benissimo, grazie!"
1,Café,"What does 'Un caffè, per favore' order in Italy?","Not a drip coffee!","A single shot of espresso, please.","Al banco: 'Un caffè, per favore.' (Faster and cheaper at the bar.)"
2,Travel,"How do you ask 'Where is the train station?'","Dov'è = where is","Dov'è la stazione dei treni?","Scusi, dov'è la stazione dei treni? — Sempre dritto."
3,Dining,"Translate: 'I would like to book a table for two.'","Vorrei = I would like","Vorrei prenotare un tavolo per due.","Buonasera, vorrei prenotare un tavolo per due alle otto."
4,Idioms,"What does 'In bocca al lupo' mean?","Reply with 'Viva il lupo!'","Good luck! (Literally: Into the mouth of the wolf.)","Hai l'esame oggi? In bocca al lupo!"`;
