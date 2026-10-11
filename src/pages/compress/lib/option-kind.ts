import type { CodecOption } from '@/shared/api';

/**
 * The control a backend option takes, read from what `codecs()` says of it: `true` or `false` is
 * a switch, a range `a..=b` in the help is a slider, values listed in backticks with the default
 * among them are a select, and anything else is typed (ADR-0007 D6). A help the page cannot read
 * falls back to a field, so a new option in a release of `sqzer` is always reachable.
 */
export type OptionKind =
  | { kind: 'switch' }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'select'; values: string[] }
  | { kind: 'text' };

const RANGE = /`(-?\d+)\.\.=(-?\d+)`/u;
const LISTED = /`([\w-]+)`/gu;

export function kindOf({ default: fallback, help }: CodecOption): OptionKind {
  if (fallback === 'true' || fallback === 'false') return { kind: 'switch' };
  const range = RANGE.exec(help);
  if (range) return { kind: 'range', min: Number(range[1]), max: Number(range[2]) };
  const values = [...new Set([...help.matchAll(LISTED)].map((match) => match[1] ?? ''))];
  if (values.length >= 2 && values.includes(fallback)) return { kind: 'select', values };
  return { kind: 'text' };
}
