import type { Codec, EncodeOptions } from '@/shared/api';

import type { Searched } from '../model/machine';
import type { Defaults } from './defaults';

/** One chip of the result (ADR-0001 D5): its word, and its full meaning, which starts with the word. */
export type Chip = { word: string; meaning: string };

// What the result says elsewhere: the format in its select and the details, the target on the chart,
// the quality in the details, the size in the corner labels and the `resized` chip, and the two
// things kept as their own chips.
const SAID_ELSEWHERE: Set<string> = new Set<keyof EncodeOptions>([
  'format',
  'target',
  'quality',
  'lossless',
  'width',
  'height',
  'keepIcc',
  'keepMetadata',
]);

// What an option that is only on or off does, after its name.
const DOES: Map<string, string> = new Map<keyof EncodeOptions, string>([
  ['fast', 'one encode at the seed quality, no search'],
  ['enlarge', 'scaled up to the box'],
]);

/** The default of a backend option, as `codecs()` lists it. */
function backendDefault(codecs: Codec[], key: string) {
  return codecs.flatMap((codec) => codec.encoder?.options ?? []).find((option) => option.key === key)?.default;
}

/** An option sent, as `effort 9, default 6`, or `enlarge` with what it does where it is only on. */
function sent(key: string, value: unknown, fallback: string | undefined): Chip {
  if (value === true) {
    const does = DOES.get(key);
    return { word: key, meaning: does === undefined ? key : `${key}: ${does}` };
  }
  const said = `${key} ${String(value)}`;
  return { word: key, meaning: fallback === undefined ? said : `${said}, default ${fallback}` };
}

/** Whether `value` is the package's default: chosen by hand, it is sent (ADR-0007 D7), and it is no chip. */
const isDefault = (value: unknown, fallback: string | undefined) =>
  fallback !== undefined && String(value) === fallback;

/** The chips of the options sent away from their default, in the order they were, with the backend options last. */
function optionChips(asked: EncodeOptions, codecs: Codec[], defaults: Defaults): Chip[] {
  const chips: Chip[] = [];
  const fallbacks = new Map(Object.entries(defaults));
  for (const [key, value] of Object.entries(asked)) {
    if (SAID_ELSEWHERE.has(key) || key === 'codecOpts') continue;
    const fallback = fallbacks.get(key);
    if (!isDefault(value, fallback)) chips.push(sent(key, value, fallback));
  }
  for (const [key, value] of asked.codecOpts ?? []) {
    const fallback = backendDefault(codecs, key);
    if (!isDefault(value, fallback)) chips.push(sent(key, value, fallback));
  }
  return chips;
}

/**
 * The chips under the size (ADR-0001 D5), one word each: the booleans of the output that applied,
 * `lossless`, `reached` or `missed`, `resized`, `animated`, then what was kept of the input,
 * `metadata` and `icc`, then the name of every other option sent away from its default: an untouched
 * control sends nothing (D3), and a default chosen by hand is sent (ADR-0007 D7) and is no chip. A
 * result with no chips is the package's defaults. The full meaning of a chip is its tooltip and its name.
 */
export function chipsOf({ output, asked }: Searched, codecs: Codec[], defaults: Defaults): Chip[] {
  const chips: Chip[] = [];
  const { lossless, reached, capped, target, score, width, height, outputWidth, outputHeight, animated } = output;
  if (lossless) chips.push({ word: 'lossless', meaning: 'lossless: the output is exact' });
  if (reached !== undefined && target !== undefined && score !== undefined) {
    const at = `the target of ${target} at a score of ${score.toFixed(1)}`;
    const ceiling = capped === true ? ', the best quality the encoder has' : '';
    chips.push(
      reached ? { word: 'reached', meaning: `reached: ${at}` } : { word: 'missed', meaning: `missed: ${at}${ceiling}` },
    );
  }
  if (outputWidth !== width || outputHeight !== height)
    chips.push({ word: 'resized', meaning: `resized: from ${width} × ${height} to ${outputWidth} × ${outputHeight}` });
  if (animated) chips.push({ word: 'animated', meaning: 'animated: only the first frame was encoded' });
  if (asked.keepMetadata === true) chips.push({ word: 'metadata', meaning: 'metadata: EXIF and XMP kept' });
  if (asked.keepIcc === true) chips.push({ word: 'icc', meaning: 'icc: the ICC profile kept, not converted to sRGB' });
  return [...chips, ...optionChips(asked, codecs, defaults)];
}
