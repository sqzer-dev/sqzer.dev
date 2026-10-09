import type { Codec, EncodeOptions } from '@/shared/api';

import type { Controls } from '../model/controls';
import { applicable } from './codec';

/** A number typed into a field, or nothing from an empty one. */
const typed = (value: string) => (value === '' ? undefined : Number(value));

/**
 * What the controls say, as the options of the package: the one place the form becomes a call. A
 * control that was not touched, or does not apply to the rest, is left out, so the package's
 * defaults stay its own and it validates what it is given (ADR-0001 D3).
 */
export function optionsOf(controls: Controls, codecs: Codec[]): EncodeOptions {
  const { format, target, quality, codecOpts } = controls;
  const applies = applicable(controls, codecs);
  const { mode } = applies;
  const options: EncodeOptions = {
    // The list comes from `codecs()`, and the package validates what it is given.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    format: format === 'auto' ? undefined : (format as EncodeOptions['format']),
    target: applies.target && mode === 'target' && target !== null ? target : undefined,
    quality: applies.quality && mode === 'quality' ? typed(quality) : undefined,
    lossless: applies.lossless && mode === 'lossless' ? true : undefined,
    effort: typed(controls.effort),
    subsampling: applies.subsampling ? (controls.subsampling ?? undefined) : undefined,
    fast: applies.fast && controls.fast ? true : undefined,
    keepIcc: controls.keepIcc ? true : undefined,
    keepMetadata: controls.keepMetadata ? true : undefined,
    width: typed(controls.width),
    height: typed(controls.height),
    fit: controls.fit ?? undefined,
    position: applies.position ? (controls.position ?? undefined) : undefined,
    background: applies.background && controls.background !== '' ? controls.background : undefined,
    scale: typed(controls.scale),
    enlarge: controls.enlarge ? true : undefined,
    filter: controls.filter ?? undefined,
    maxPixels: typed(controls.maxPixels),
  };
  const backend = applies.codecOpts
    .flatMap(({ options: keys }) => keys)
    .flatMap(({ key }) =>
      codecOpts[key] === undefined || codecOpts[key] === '' ? [] : [[key, codecOpts[key]] as const],
    );
  if (backend.length > 0) options.codecOpts = new Map(backend);
  // a key that is sent must mean something: the package takes `undefined` for a default, but the
  // record of a search should carry what was asked and nothing else
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
}
