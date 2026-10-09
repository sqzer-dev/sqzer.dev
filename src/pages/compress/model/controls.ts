import type { EncodeOptions } from '@/shared/api';

/** One of the values the package lists for an option, or null until one is chosen. */
type Choice<Key extends keyof EncodeOptions> = NonNullable<EncodeOptions[Key]> | null;

/**
 * What the controls say, as the reader left them: the fields of the form the page holds above the
 * panels, which are laid out one way on a wide screen and another on a phone, so a change of
 * layout keeps them. A field that was not touched is empty, null or off and sends nothing, so the
 * defaults stay the package's (ADR-0001 D3). `optionsOf` turns them into the package's options.
 */
export type Controls = {
  /** A format of `codecs()`, or `auto` for the one the package chooses per image. */
  format: string;
  /** The way the quality is said: a score to search for, a fixed quality, or lossless. */
  mode: 'target' | 'quality' | 'lossless';
  /** The score to search for. Null until the slider is moved, which leaves the package its default. */
  target: number | null;
  /** The package has no default for a fixed quality, so the field starts at one. */
  quality: string;
  width: string;
  height: string;
  effort: string;
  subsampling: Choice<'subsampling'>;
  fast: boolean;
  keepIcc: boolean;
  keepMetadata: boolean;
  fit: Choice<'fit'>;
  position: Choice<'position'>;
  background: string;
  scale: string;
  enlarge: boolean;
  filter: Choice<'filter'>;
  maxPixels: string;
  /** The backend options of every encoder, by their `codecOpts` key, as typed. Only those of the chosen encoder are sent. */
  codecOpts: Record<string, string>;
};

/** The controls of a page nobody touched. They send nothing (ADR-0001 D3). */
export const UNTOUCHED: Controls = {
  format: 'auto',
  mode: 'target',
  target: null,
  quality: '80',
  width: '',
  height: '',
  effort: '',
  subsampling: null,
  fast: false,
  keepIcc: false,
  keepMetadata: false,
  fit: null,
  position: null,
  background: '',
  scale: '',
  enlarge: false,
  filter: null,
  maxPixels: '',
  codecOpts: {},
};
