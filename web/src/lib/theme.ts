import type { ResolvedTheme, ThemeMode } from '../types';

export interface WallpaperSeed {
  name: string;
  hex: string;
  description: string;
}

export const WALLPAPER_SEEDS: WallpaperSeed[] = [
  { name: 'Moss & Mist', hex: '#2D6E52', description: 'Botanical sage' },
  { name: 'Coastal Slate', hex: '#2F628C', description: 'Nordic sea' },
  { name: 'Terracotta Dawn', hex: '#9A543B', description: 'Warm clay' },
  { name: 'Hinoki Cedar', hex: '#7A6338', description: 'Sunlit timber' },
  { name: 'Twilight Iris', hex: '#5A548E', description: 'Evening dusk' },
  { name: 'Eucalyptus Teal', hex: '#246B6D', description: 'Deep fjord' },
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue} ${Math.max(0, Math.min(100, s))}% ${Math.max(0, Math.min(100, l))}%)`;
}

function hsla(h: number, s: number, l: number, a: number): string {
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue} ${Math.max(0, Math.min(100, s))}% ${Math.max(0, Math.min(100, l))}% / ${a})`;
}

export function resolveThemeMode(
  mode: ThemeMode,
  nightModeActive: boolean,
  prefersDark: boolean,
  hour: number = new Date().getHours()
): ResolvedTheme {
  if (nightModeActive) return 'amoled';
  if (mode === 'light' || mode === 'dark' || mode === 'amoled') return mode;
  // Auto switches smoothly: late night (22:00-05:59) -> AMOLED black, evening or OS dark -> dark
  if (hour >= 22 || hour < 6) return 'amoled';
  if (hour >= 19 || prefersDark) return 'dark';
  return 'light';
}

/**
 * Generates a complete Material Design 3 (Material You) tonal scheme from any wallpaper seed hex.
 * Harmonizes Grow (green) and Calm (blue) subtly toward the user's wallpaper hue while keeping
 * their semantic green / blue identities instantly recognizable at a glance.
 */
export function applyMaterialYouTheme(seedHex: string, resolved: ResolvedTheme): void {
  const { h, s } = hexToHsl(seedHex);
  const neutralSat = Math.min(18, Math.max(6, Math.round(s * 0.24)));
  const accentSat = Math.min(58, Math.max(34, s));

  // Harmonize Grow (~152 deg emerald) and Calm (~207 deg ocean blue) slightly toward wallpaper seed
  const growHue = Math.round(152 + Math.sin(((h - 152) * Math.PI) / 180) * 10);
  const calmHue = Math.round(207 + Math.sin(((h - 207) * Math.PI) / 180) * 10);

  const root = document.documentElement;
  const themeMeta = document.getElementById('theme-color-meta');

  if (resolved === 'light') {
    const bg = hsl(h, neutralSat, 96.5);
    root.style.setProperty('--md-backdrop', hsl(h, neutralSat, 91.5));
    root.style.setProperty('--md-bg', bg);
    root.style.setProperty('--md-surface-low', hsl(h, neutralSat, 93.5));
    root.style.setProperty('--md-surface', hsl(h, neutralSat, 90.5));
    root.style.setProperty('--md-surface-high', hsl(h, neutralSat, 86.5));
    root.style.setProperty('--md-surface-card', hsl(h, Math.max(4, neutralSat - 4), 99.2));
    root.style.setProperty('--md-on-surface', hsl(h, neutralSat + 6, 11));
    root.style.setProperty('--md-on-surface-muted', hsl(h, neutralSat, 33));
    root.style.setProperty('--md-on-surface-subtle', hsl(h, neutralSat - 2, 46));
    root.style.setProperty('--md-outline', hsla(h, neutralSat, 15, 0.09));
    root.style.setProperty('--md-outline-strong', hsla(h, neutralSat, 15, 0.18));

    root.style.setProperty('--md-primary', hsl(h, accentSat, 31));
    root.style.setProperty('--md-on-primary', '#ffffff');
    root.style.setProperty('--md-primary-container', hsl(h, Math.min(52, accentSat + 6), 88));
    root.style.setProperty('--md-on-primary-container', hsl(h, accentSat + 8, 15));

    root.style.setProperty('--md-grow', hsl(growHue, 54, 30));
    root.style.setProperty('--md-on-grow', '#ffffff');
    root.style.setProperty('--md-grow-soft', hsla(growHue, 54, 34, 0.12));
    root.style.setProperty('--md-grow-track', hsla(growHue, 44, 36, 0.14));

    root.style.setProperty('--md-calm', hsl(calmHue, 60, 36));
    root.style.setProperty('--md-on-calm', '#ffffff');
    root.style.setProperty('--md-calm-soft', hsla(calmHue, 60, 40, 0.12));
    root.style.setProperty('--md-calm-track', hsla(calmHue, 50, 42, 0.14));

    root.style.setProperty('--md-amber', hsl(35, 74, 34));
    root.style.setProperty('--md-amber-soft', hsla(35, 78, 44, 0.13));
    root.style.colorScheme = 'light';
    if (themeMeta) themeMeta.setAttribute('content', bg);
  } else if (resolved === 'dark') {
    const bg = hsl(h, neutralSat + 2, 7.5);
    root.style.setProperty('--md-backdrop', hsl(h, neutralSat, 5));
    root.style.setProperty('--md-bg', bg);
    root.style.setProperty('--md-surface-low', hsl(h, neutralSat + 2, 10.5));
    root.style.setProperty('--md-surface', hsl(h, neutralSat + 2, 13.5));
    root.style.setProperty('--md-surface-high', hsl(h, neutralSat + 2, 17.5));
    root.style.setProperty('--md-surface-card', hsl(h, neutralSat + 2, 11.5));
    root.style.setProperty('--md-on-surface', hsl(h, neutralSat, 93));
    root.style.setProperty('--md-on-surface-muted', hsl(h, neutralSat - 2, 71));
    root.style.setProperty('--md-on-surface-subtle', hsl(h, neutralSat - 3, 55));
    root.style.setProperty('--md-outline', hsla(h, neutralSat, 88, 0.09));
    root.style.setProperty('--md-outline-strong', hsla(h, neutralSat, 88, 0.18));

    root.style.setProperty('--md-primary', hsl(h, Math.min(62, accentSat + 12), 74));
    root.style.setProperty('--md-on-primary', hsl(h, accentSat + 8, 12));
    root.style.setProperty('--md-primary-container', hsl(h, accentSat, 22));
    root.style.setProperty('--md-on-primary-container', hsl(h, Math.min(68, accentSat + 16), 88));

    root.style.setProperty('--md-grow', hsl(growHue, 56, 65));
    root.style.setProperty('--md-on-grow', hsl(growHue, 62, 9));
    root.style.setProperty('--md-grow-soft', hsla(growHue, 56, 62, 0.15));
    root.style.setProperty('--md-grow-track', hsla(growHue, 44, 62, 0.16));

    root.style.setProperty('--md-calm', hsl(calmHue, 72, 71));
    root.style.setProperty('--md-on-calm', hsl(calmHue, 68, 10));
    root.style.setProperty('--md-calm-soft', hsla(calmHue, 72, 68, 0.15));
    root.style.setProperty('--md-calm-track', hsla(calmHue, 56, 68, 0.16));

    root.style.setProperty('--md-amber', hsl(38, 84, 70));
    root.style.setProperty('--md-amber-soft', hsla(38, 84, 66, 0.15));
    root.style.colorScheme = 'dark';
    if (themeMeta) themeMeta.setAttribute('content', '#0F1512');
  } else {
    // True AMOLED Black (#000000) — pixels completely off for deep calm & battery savings
    root.style.setProperty('--md-backdrop', '#000000');
    root.style.setProperty('--md-bg', '#000000');
    root.style.setProperty('--md-surface-low', hsl(h, neutralSat, 5.5));
    root.style.setProperty('--md-surface', hsl(h, neutralSat, 8.5));
    root.style.setProperty('--md-surface-high', hsl(h, neutralSat, 12.5));
    root.style.setProperty('--md-surface-card', hsl(h, neutralSat, 6));
    root.style.setProperty('--md-on-surface', hsl(h, neutralSat, 92));
    root.style.setProperty('--md-on-surface-muted', hsl(h, neutralSat - 2, 67));
    root.style.setProperty('--md-on-surface-subtle', hsl(h, neutralSat - 3, 50));
    root.style.setProperty('--md-outline', hsla(h, neutralSat, 88, 0.11));
    root.style.setProperty('--md-outline-strong', hsla(h, neutralSat, 88, 0.2));

    root.style.setProperty('--md-primary', hsl(h, Math.min(60, accentSat + 10), 72));
    root.style.setProperty('--md-on-primary', hsl(h, accentSat + 8, 9));
    root.style.setProperty('--md-primary-container', hsl(h, accentSat, 17));
    root.style.setProperty('--md-on-primary-container', hsl(h, Math.min(66, accentSat + 14), 87));

    root.style.setProperty('--md-grow', hsl(growHue, 54, 62));
    root.style.setProperty('--md-on-grow', hsl(growHue, 64, 7));
    root.style.setProperty('--md-grow-soft', hsla(growHue, 54, 60, 0.14));
    root.style.setProperty('--md-grow-track', hsla(growHue, 42, 58, 0.16));

    root.style.setProperty('--md-calm', hsl(calmHue, 68, 69));
    root.style.setProperty('--md-on-calm', hsl(calmHue, 68, 8));
    root.style.setProperty('--md-calm-soft', hsla(calmHue, 68, 66, 0.14));
    root.style.setProperty('--md-calm-track', hsla(calmHue, 54, 64, 0.16));

    root.style.setProperty('--md-amber', hsl(38, 80, 68));
    root.style.setProperty('--md-amber-soft', hsla(38, 80, 64, 0.14));
    root.style.colorScheme = 'dark';
    if (themeMeta) themeMeta.setAttribute('content', '#000000');
  }
}

/**
 * Extracts a pleasing vibrant Material You seed color from a user-selected wallpaper image
 * entirely offline via an offscreen canvas.
 */
export async function extractSeedFromImage(file: File): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image'));
      el.src = bitmapUrl;
    });

    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#2D6E52';
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Quantize into 18 hue buckets, weighted by chroma & mid-tone luminance (Monet-inspired)
    const buckets = Array.from({ length: 18 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 180) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = max - min;
      const lum = (max + min) / 2;
      if (chroma < 18 || lum < 25 || lum > 235) continue;

      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const { h } = hexToHsl(hex);
      const idx = Math.floor(h / 20) % 18;
      const w = (chroma / 255) * (1 - Math.abs(lum - 128) / 140);
      buckets[idx].weight += w;
      buckets[idx].r += r * w;
      buckets[idx].g += g * w;
      buckets[idx].b += b * w;
    }

    const best = buckets.reduce((acc, cur) => (cur.weight > acc.weight ? cur : acc), buckets[0]);
    if (best.weight <= 0.01) return '#2D6E52';
    const r = Math.round(best.r / best.weight);
    const g = Math.round(best.g / best.weight);
    const b = Math.round(best.b / best.weight);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
