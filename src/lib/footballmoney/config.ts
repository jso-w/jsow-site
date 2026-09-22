/** Shared constants and small helpers for the football-money dashboard. */

export const TOP5 = ['GB1', 'ES1', 'L1', 'IT1', 'FR1'] as const;
export type League = (typeof TOP5)[number];

export const LNAMES: Record<League, string> = {
  GB1: 'Premier League',
  ES1: 'La Liga',
  L1: 'Bundesliga',
  IT1: 'Serie A',
  FR1: 'Ligue 1',
};

/**
 * Palette tuned for the dark-green pitch: softened from the original neon
 * tones, and Serie A moved off green (which vanished against the pitch) to an
 * azure that also fits Italy's azzurri. Each hue is well separated.
 */
export const LCOLORS: Record<League, string> = {
  GB1: '#22D3E0',
  ES1: '#F2B705',
  L1: '#E8503A',
  IT1: '#5C8DEF',
  FR1: '#E8E2CF',
};

export const SEASON_MIN = 2010;
export const SEASON_MAX = 2024;
export const SEASONS: number[] = Array.from(
  { length: SEASON_MAX - SEASON_MIN + 1 },
  (_, i) => SEASON_MIN + i,
);

/** Slider steps for the "most valuable players" chart. */
export const TOP_N_STEPS: number[] = Array.from({ length: 15 }, (_, i) => (i + 1) * 10);
export const DEFAULT_TOP_N = 150;

export function hexToRgba(hex: string, alpha = 0.35): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 2017 -> "2017/18" */
export function seasonLabel(year: number): string {
  return `${year}/${String(year + 1).slice(2)}`;
}

/** Surname = everything after the first token, so "De Bruyne" survives. */
export function surname(name: string): string {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : (parts[0] ?? '');
}

/**
 * Build a URL under the site's base path. Astro's BASE_URL may or may not carry
 * a trailing slash, so normalise before joining.
 */
export function asset(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/footballmoney/${path.replace(/^\//, '')}`;
}

/** Crest filenames keyed by the buying club as the dataset names it. */
export const CREST_BY_CLUB: Record<string, string> = {
  'Chelsea FC': 'Chelsea_FC.webp',
  Chelsea: 'Chelsea_FC.webp',
  'Paris Saint-Germain': 'PSG.webp',
  PSG: 'PSG.webp',
  'Real Madrid': 'Real_Madrid_CF.webp',
  'FC Barcelona': 'FC_Barcelona.webp',
  'Manchester City': 'Manchester_City_FC.webp',
  'Man City': 'Manchester_City_FC.webp',
  'Manchester United': 'Manchester_United_FC.webp',
  'Man Utd': 'Manchester_United_FC.webp',
  'Atlético de Madrid': 'Atletico_Madrid.webp',
};

export const LEAGUE_BADGE: Record<League, string> = {
  GB1: 'pl.svg',
  ES1: 'laliga.svg',
  L1: 'bundesliga.svg',
  IT1: 'seriea.svg',
  FR1: 'ligue1.svg',
};

/** Sprite files that exist in public/footballmoney/sprites (14 was never cut). */
export const SPRITE_IDS: string[] = Array.from({ length: 55 }, (_, i) => i + 1)
  .filter((n) => n !== 14)
  .map((n) => String(n).padStart(2, '0'));
