import { fromCallback } from 'xstate';

import {
  startEncoder,
  type Codec,
  type Decoded,
  type EncodeOptions,
  type FailureKind,
  type Output,
  type Reply,
  type TrialProgress,
} from '@/shared/api';

import { codecOf } from '../lib/codec';
import { draw } from '../lib/draw';
import { rename, type EncodeResult } from './encode-result';
import type { Picked } from './picked';

/** The package has no decoder for the image: its words, and the builds of `sqzer` that have one. */
export type Unreadable = { message: string; availableIn: string[] | undefined };

/**
 * Why a search failed: the package's or the browser's own words, which failure where the package
 * threw it, and where in the search. The alert of ADR-0001 D6 makes its sentence from them.
 */
export type Failure = {
  message: string;
  kind?: FailureKind | undefined;
  /** For `DecoderUnavailable` and `EncoderUnavailable`: the Cargo features of a build that has the backend. */
  availableIn?: string[] | undefined;
  /** The worker's start or load, the reading of the image, or its encode. */
  stage: 'start' | 'load' | 'read' | 'encode';
};

/** Give the worker the image: decoded there, or drawn here at `width` when it is `onPage`. */
type Read = {
  type: 'read';
  image: Picked;
  onPage: boolean;
  width: number;
  /** The package's words for having no decoder for the image, when it said so. */
  unreadable: Unreadable | null;
  /** The limit to read it under: the package's own when the control was not touched. */
  maxPixels: number | undefined;
};

/** What the machine asks of the actor. */
export type EncoderCommand =
  | Read
  | { type: 'encode'; options: EncodeOptions }
  /** The image the worker holds, as a file every browser can show. */
  | { type: 'preview' };

/** What the actor tells the machine. */
export type EncoderEvent =
  | { type: 'ready'; version: string; codecs: Codec[] }
  | ({ type: 'unreadable' } & Unreadable)
  /** `drawnWidth` is the width an image drawn on the page was drawn at, null for one the worker decoded. */
  | { type: 'decoded'; decoded: Decoded; drawnWidth: number | null }
  | { type: 'trial'; trial: TrialProgress }
  | { type: 'previewed'; preview: Blob }
  | { type: 'done'; result: EncodeResult }
  /** `broken` when the worker itself failed, and has to be replaced before anything else is asked. */
  | ({ type: 'failed'; broken: boolean } & Failure);

const reason = (thrown: unknown) => (thrown instanceof Error ? thrown.message : String(thrown));

/** One worker, and what it was last asked. */
class Session {
  readonly #tell: (event: EncoderEvent) => void;
  readonly #worker = startEncoder({
    onMessage: (reply) => {
      this.#answer(reply);
    },
  });
  #stopped = false;
  #codecs: Codec[] = [];
  // The image the worker was last given, and the number its messages carry.
  #id = 0;
  #read: Read | null = null;
  #startedAt = 0;

  constructor(tell: (event: EncoderEvent) => void) {
    this.#tell = tell;
  }

  take(command: EncoderCommand) {
    if (command.type === 'read') {
      this.#id += 1;
      this.#read = command;
      if (command.onPage) void this.#drawOnPage(command, this.#id);
      else
        this.#worker.send({ type: 'decode', id: this.#id, bytes: command.image.bytes, maxPixels: command.maxPixels });
    } else if (command.type === 'encode') {
      this.#startedAt = performance.now();
      this.#worker.send({ type: 'encode', id: this.#id, options: command.options });
    } else {
      this.#worker.send({ type: 'preview', id: this.#id });
    }
  }

  end() {
    this.#stopped = true;
    this.#worker.terminate();
  }

  #fail(failure: Failure, broken = false) {
    this.#tell({ type: 'failed', broken, ...failure });
  }

  #answer(reply: Reply) {
    const read = this.#read;
    if (reply.type === 'ready') {
      this.#codecs = reply.codecs;
      this.#tell(reply);
    } else if (reply.type === 'error' && (reply.stage === 'start' || reply.stage === 'load')) {
      this.#fail({ message: reply.message, kind: reply.kind, stage: reply.stage }, true);
    } else if (reply.id !== this.#id || !read) {
      // about an image that was replaced since
    } else if (reply.type === 'error') {
      const { message, kind, availableIn, stage } = reply;
      if (stage === 'preview') return;
      // the package has no decoder and the worker's canvas had none
      // either. the machine asks again, for the page's own `<img>`
      if (stage === 'decode' && kind === 'DecoderUnavailable') {
        this.#tell({ type: 'unreadable', message, availableIn });
      } else this.#fail({ message, kind, availableIn, stage: stage === 'encode' ? 'encode' : 'read' });
    } else if (reply.type === 'decoded') {
      this.#tell({ type: 'decoded', decoded: reply.image, drawnWidth: read.onPage ? read.width : null });
    } else if (reply.type === 'trial') {
      this.#tell(reply);
    } else if (reply.type === 'previewed') {
      this.#tell({ type: 'previewed', preview: new Blob([reply.bytes], { type: 'image/webp' }) });
    } else {
      this.#finish(read.image, reply.result);
    }
  }

  #finish(image: Picked, output: Output) {
    const { mime, extension } = codecOf(this.#codecs, output.format);
    const file = new File([output.bytes], rename(image.name, extension), { type: mime });
    const seconds = (performance.now() - this.#startedAt) / 1000;
    this.#tell({ type: 'done', result: { output, file, seconds } });
  }

  async #drawOnPage({ image, width, unreadable, maxPixels }: Read, drawing: number) {
    const current = () => !this.#stopped && drawing === this.#id;
    try {
      const { data, width: w, height: h } = await draw(image, width, maxPixels);
      if (!current()) return;
      this.#worker.send({ type: 'pixels', id: drawing, rgba: data.buffer, width: w, height: h, maxPixels }, [
        data.buffer,
      ]);
    } catch (thrown) {
      if (!current()) return;
      // the package's own refusal is the one to explain, where it refused first
      this.#fail(
        unreadable === null
          ? { message: reason(thrown), stage: 'read' }
          : { ...unreadable, kind: 'DecoderUnavailable', stage: 'read' },
      );
    }
  }
}

/**
 * The worker as an actor. It lives as long as the state that invoked it, and
 * stopping it ends the worker: the only way a search is cancelled.
 */
export const encoder = fromCallback<EncoderCommand>(({ sendBack, receive }) => {
  const session = new Session((event) => {
    sendBack(event);
  });
  receive((command) => {
    session.take(command);
  });
  return () => {
    session.end();
  };
});
