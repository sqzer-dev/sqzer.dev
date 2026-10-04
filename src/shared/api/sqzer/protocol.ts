// The messages between the page and the worker. The worker holds one image
// at a time, and every message names it by `id`: a reply for an image that
// was replaced since is dropped by whoever reads it.
import type { Codec, Options, Output as Encoded, SqzerError, TrialProgress } from 'sqzer';

export type { Codec, TrialProgress };

/** Bytes that crossed from the worker: transferred, so in a buffer of their own. */
export type Bytes = Uint8Array<ArrayBuffer>;

/** What `encode` returns, as it reaches the page. */
export type Output = Omit<Encoded, 'bytes'> & { bytes: Bytes };

/** The options of the package that can cross to the worker. `onTrial` is the worker's own. */
export type EncodeOptions = Omit<Options, 'onTrial'>;

/** What the worker says about the image it holds. */
export type Decoded = {
  width: number;
  height: number;
  /** Left out for an image the page drew itself. */
  format: string | undefined;
  alpha: boolean;
  animated: boolean;
};

export type Request =
  /** A file, as it was picked. */
  | { type: 'decode'; id: number; bytes: ArrayBuffer }
  /** RGBA the page drew itself. */
  | { type: 'pixels'; id: number; rgba: ArrayBuffer; width: number; height: number }
  | { type: 'encode'; id: number; options: EncodeOptions }
  /** The image the worker holds, as a file every browser can show. */
  | { type: 'preview'; id: number };

export type Failure = {
  type: 'error';
  /** `start` and `load` come before any request and name no image, the rest name the request that failed. */
  stage: 'start' | 'load' | Request['type'];
  id?: number | undefined;
  kind: SqzerError['kind'];
  message: string;
  availableIn?: string[] | undefined;
};

export type Reply =
  | { type: 'ready'; version: string; codecs: Codec[] }
  | { type: 'decoded'; id: number; image: Decoded }
  | { type: 'trial'; id: number; trial: TrialProgress }
  | { type: 'encoded'; id: number; result: Output }
  | { type: 'previewed'; id: number; bytes: Bytes }
  | Failure;
