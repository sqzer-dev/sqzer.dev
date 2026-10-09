import type { Codec, CodecOption } from '@/shared/api';

import type { Controls } from '../model/controls';

/** The entry of `codecs()` for `format`. The package lists every format it reads or writes. */
export function codecOf(codecs: Codec[], format: string): Codec {
  const codec = codecs.find((entry) => entry.format === format);
  if (!codec) throw new Error(`\`codecs()\` has no entry for ${format}`);
  return codec;
}

/** The backend options of one encoder, under the format they belong to. */
export type CodecOptions = { format: string; options: CodecOption[] };

/**
 * Which controls apply to what the others say, from `codecs()`: a control shows only where it
 * applies, and one that does not apply sends nothing, so the package is never handed a combination
 * it refuses for a control the reader could not see (ADR-0001 D3). With `auto` the package chooses
 * the format per image, so every way to say the quality is open.
 */
export function applicable({ format, mode, fit }: Pick<Controls, 'format' | 'mode' | 'fit'>, codecs: Codec[]) {
  const encoder = format === 'auto' ? undefined : codecs.find((entry) => entry.format === format)?.encoder;
  const lossy = encoder?.lossy ?? true;
  return {
    /** A score or a fixed quality: nothing to an encoder that is lossless only (PNG, and WebP in this build). */
    target: lossy,
    quality: lossy,
    lossless: encoder?.lossless ?? true,
    subsampling: lossy,
    /** One encode at the seed quality of a target: the package refuses it with a quality or lossless. */
    fast: lossy && mode === 'target',
    /** Where `cover` crops and `contain` places, as the package's README states. */
    position: fit === 'cover' || fit === 'contain',
    background: fit === 'contain',
    /** The chosen encoder's backend options, or every encoder's under `auto`, which the package takes as well. */
    codecOpts: (encoder ? [codecOf(codecs, format)] : codecs)
      .filter((entry) => entry.encoder !== undefined && entry.encoder.options.length > 0)
      .map((entry): CodecOptions => ({ format: entry.format, options: entry.encoder?.options ?? [] })),
  };
}

/** What `applicable` says. */
export type Applicable = ReturnType<typeof applicable>;
