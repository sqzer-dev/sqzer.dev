import type { Codec } from '@/shared/api';

/** The entry of `codecs()` for `format`. The package lists every format it reads or writes. */
export function codecOf(codecs: Codec[], format: string): Codec {
  const codec = codecs.find((entry) => entry.format === format);
  if (!codec) throw new Error(`\`codecs()\` has no entry for ${format}`);
  return codec;
}

/**
 * Whether quality means anything for `format`. An encoder that is lossless
 * only (PNG, and WebP in this build) takes no target and no quality.
 */
export function isLossy(codecs: Codec[], format: string) {
  return format === 'auto' || codecs.find((entry) => entry.format === format)?.encoder?.lossy !== false;
}
