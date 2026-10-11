import type { Codec, EncodeOptions } from '@/shared/api';

import type { Controls } from '../model/controls';
import { applicable } from './codec';

/** A number typed into a field, or nothing from an empty one. */
const typed = (value: string) => (value === '' ? undefined : Number(value));

/** The image's own size, which an empty side of the box shows. */
export type Size = { width: number; height: number };

/**
 * `options` with the box filled for a fit that needs both sides, every fit but `inside`: a side
 * not asked for is the image's own, which is what the field shows. The machine does this at the
 * encode, from the image the worker holds, so another image picked gets its own size and not the
 * one before.
 */
export function boxed(options: EncodeOptions, image: Size | null): EncodeOptions {
  const { fit, width, height } = options;
  if (fit === undefined || fit === 'inside' || image === null || (width !== undefined && height !== undefined))
    return options;
  return { ...options, width: width ?? image.width, height: height ?? image.height };
}

/**
 * What the controls say, as the options of the package: the one place the form becomes a call. A
 * control that was not touched, or does not apply to the rest, is left out, so the package's
 * defaults stay its own and it validates what it is given (ADR-0001 D3). `chosen` is the format
 * the newest result says the package chose, for the backend options under `auto`.
 */
export function optionsOf(controls: Controls, codecs: Codec[], chosen: string | null = null): EncodeOptions {
  const { format, target, quality, codecOpts } = controls;
  const applies = applicable(controls, codecs, chosen);
  const { mode } = applies;
  const options: EncodeOptions = {
    // The list comes from `codecs()`, and the package validates what it is given.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    format: format === 'auto' ? undefined : (format as EncodeOptions['format']),
    target: applies.target && mode === 'target' && target !== null ? target : undefined,
    quality: applies.quality && mode === 'quality' ? quality : undefined,
    lossless: applies.lossless && mode === 'lossless' ? true : undefined,
    effort: controls.effort ?? undefined,
    subsampling: applies.subsampling ? (controls.subsampling ?? undefined) : undefined,
    fast: applies.fast && controls.fast ? true : undefined,
    keepIcc: controls.keepIcc ? true : undefined,
    keepMetadata: controls.keepMetadata ? true : undefined,
    width: typed(controls.width),
    height: typed(controls.height),
    fit: controls.fit ?? undefined,
    position: applies.position ? (controls.position ?? undefined) : undefined,
    background: applies.background && controls.background !== '' ? controls.background : undefined,
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
