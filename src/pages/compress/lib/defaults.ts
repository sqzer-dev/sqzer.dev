import type { EncodeOptions, OptionInfo } from '@/shared/api';

/**
 * The package's defaults, by key, spelled as `options()` spells them: `70`, `inside`, `auto`
 * (ADR-0008). A control shows its default until it is touched (ADR-0001 D3, ADR-0007 D6), and
 * nothing here is ever sent: an untouched control sends nothing, and the package applies these
 * itself. Empty until a worker has loaded the package; a key that has no default is not in it.
 */
export type Defaults = Readonly<Partial<Record<keyof EncodeOptions, string>>>;

/** The defaults of what `options()` lists. */
export function defaultsOf(listed: OptionInfo[]): Defaults {
  return Object.fromEntries(listed.flatMap(({ key, default: value }) => (value === undefined ? [] : [[key, value]])));
}

/** A default as a control rests at it: a number where it is one, else its word, such as `auto`. */
export function restingAt(value: string | undefined): number | string | undefined {
  return value !== undefined && /^-?\d+$/u.test(value) ? Number(value) : value;
}

/** The score the package searches for when none is asked, or null until it is known. */
export function defaultTarget(defaults: Defaults): number | null {
  const target = restingAt(defaults.target);
  return typeof target === 'number' ? target : null;
}
