import type { Codec, EncodeOptions } from '@/shared/api';

import type { Controls } from '../model/controls';
import { isLossy } from './codec';

/** What the controls say, as the options of the package. It validates them. */
export function optionsOf({ format, mode, target, quality, width }: Controls, codecs: Codec[]): EncodeOptions {
  const options: EncodeOptions = {};
  // The list comes from `codecs()`, and the package validates what it is given.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  if (format !== 'auto') options.format = format as EncodeOptions['format'];
  if (isLossy(codecs, format)) {
    const value = mode === 'target' ? target : quality;
    if (value !== '') options[mode] = Number(value);
  }
  if (width !== '') options.width = Number(width);
  return options;
}
