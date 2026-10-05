/**
 * What the controls say, as the reader left them. They are held above the panels, which are
 * laid out one way on a wide screen and another on a phone, so a change of layout keeps them.
 */
export type Controls = {
  /** A format of `codecs()`, or `auto` for the one the package chooses per image. */
  format: string;
  mode: 'target' | 'quality';
  /** The score to search for. Empty until it is typed, which leaves the package its default. */
  target: string;
  /** The package has no default for a fixed quality, so the field starts at one. */
  quality: string;
  width: string;
};

/** The controls of a page nobody touched. They send nothing (ADR-0001 D3). */
export const UNTOUCHED: Controls = { format: 'auto', mode: 'target', target: '', quality: '80', width: '' };
