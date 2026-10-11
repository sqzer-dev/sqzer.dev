import type { EncodeOptions } from '@/shared/api';

/**
 * The package's defaults where its README states them, shown by a control until it is touched
 * (ADR-0001 D3, ADR-0007 D6). The one copy of what `crates/sqzer-wasm/README.md` says at 0.3.0, to
 * be read again at a version bump; what it does not state, `effort` and the padding of `contain`,
 * is shown as `default` with no number. Nothing here is ever sent: an untouched control sends
 * nothing, and the package applies these itself.
 */
export const DEFAULTS = {
  target: 70,
  maxPixels: 24_000_000,
  fit: 'inside',
  position: 'center',
  filter: 'lanczos3',
  subsampling: 'auto',
} as const satisfies Partial<{ [Key in keyof EncodeOptions]: NonNullable<EncodeOptions[Key]> }>;
