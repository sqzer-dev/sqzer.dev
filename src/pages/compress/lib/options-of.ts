import type { Codec, EncodeOptions } from '@/shared/api';

import { isLossy } from './codec';

/** What the controls say, as the options of the package. It validates them. */
export function optionsOf(form: HTMLFormElement, codecs: Codec[]): EncodeOptions {
  const data = new FormData(form);
  const field = (name: string) => {
    const value = data.get(name);
    return typeof value === 'string' ? value : '';
  };
  const options: EncodeOptions = {};
  const format = field('format');
  // The list comes from `codecs()`, and the package validates what it is given.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  if (format !== 'auto') options.format = format as EncodeOptions['format'];
  if (isLossy(codecs, format)) {
    const mode = field('mode');
    const value = field(mode);
    if ((mode === 'target' || mode === 'quality') && value !== '') options[mode] = Number(value);
  }
  const width = field('width');
  if (width !== '') options.width = Number(width);
  return options;
}
