// The target score: its range, the package's presets on it, and what a score looks like, in the
// words SSIMULACRA2 publishes for its own numbers (ADR-0001, section 1 and D3).

/** The slider runs from `low` to identical. */
export const TARGET = { min: 30, max: 100 };

/** The package's presets, marked on the track. `lossless` is no score. */
export const PRESETS = [
  { name: 'thumbnail', score: 60 },
  { name: 'web', score: 70 },
  { name: 'archive', score: 85 },
];

// From the top down: a score reads as the highest line it reaches, and `low` under them all.
const WORDS = [
  [90, 'visually lossless'],
  [85, 'excellent: not noticeable in place'],
  [80, 'very high: not noticeable side by side'],
  [70, 'high: barely noticeable side by side'],
  [50, 'medium: slightly annoying artifacts'],
] as const;
const LOW = 'low: obvious artifacts';

/**
 * The bands of the track, from worst to visually lossless: where each starts, and the token it is
 * painted in (ADR-0007 D5). They end where the presets sit: red to `thumbnail`, yellow to `web`,
 * green to `archive`, blue beyond.
 */
export const BANDS = [
  { from: TARGET.min, token: 'low' },
  { from: 60, token: 'good' },
  { from: 70, token: 'better' },
  { from: 85, token: 'best' },
] as const;

/** Where a score sits on the track, as a share of its length. */
export const share = (score: number) => ((score - TARGET.min) / (TARGET.max - TARGET.min)) * 100;

/** The words for a score, `high: barely noticeable side by side`, without its number. */
export const words = (score: number) => WORDS.find(([from]) => score >= from)?.[1] ?? LOW;

/** What a score looks like, as `70, high: barely noticeable side by side`. */
export const describe = (score: number) => `${score}, ${words(score)}`;
