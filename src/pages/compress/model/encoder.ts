import { fromCallback } from 'xstate';
import { startEncoder, type Codec, type Decoded, type EncodeOptions, type TrialProgress } from '@/shared/api';
import { codecOf } from '../lib/codec';
import { draw } from '../lib/draw';
import { rename, type EncodeResult } from './encode-result';
import type { Picked } from './picked';

/** What the machine asks of the actor. */
export type EncoderCommand =
  | {
      /** Give the worker the image: decoded there, or drawn here at `width` when it is `onPage`. */
      type: 'read';
      image: Picked;
      onPage: boolean;
      width: number;
      /** The package's words for having no decoder for the image, when it said so. */
      unreadable: string | null;
    }
  | { type: 'encode'; options: EncodeOptions }
  /** The image the worker holds, as a file every browser can show. */
  | { type: 'preview' };

/** What the actor tells the machine. */
export type EncoderEvent =
  | { type: 'ready'; version: string; codecs: Codec[] }
  | { type: 'unreadable'; message: string }
  /** `drawnWidth` is the width an image drawn on the page was drawn at, null for one the worker decoded. */
  | { type: 'decoded'; decoded: Decoded; drawnWidth: number | null }
  | { type: 'trial'; trial: TrialProgress }
  | { type: 'previewed'; preview: Blob }
  | { type: 'done'; result: EncodeResult }
  /** `broken` when the worker itself failed, and has to be replaced before anything else is asked. */
  | { type: 'failed'; message: string; broken: boolean };

const reason = (thrown: unknown) => (thrown instanceof Error ? thrown.message : String(thrown));

/**
 * The worker as an actor. It lives as long as the state that invoked it, and
 * stopping it ends the worker: the only way a search is cancelled.
 */
export const encoder = fromCallback<EncoderCommand>(({ sendBack, receive }) => {
  const tell = (event: EncoderEvent) => sendBack(event);
  // a browser's own message may end in a full stop already
  const fail = (text: string, broken = false) =>
    tell({ type: 'failed', message: text.replace(/\.+$/, '.'), broken });

  let stopped = false;
  let codecs: Codec[] = [];
  // The image the worker was last given, and the number its messages carry.
  let id = 0;
  let read: Extract<EncoderCommand, { type: 'read' }> | null = null;
  let startedAt = 0;

  const worker = startEncoder({
    onMessage(reply) {
      if (reply.type === 'ready') {
        codecs = reply.codecs;
        tell(reply);
      } else if (reply.type === 'error' && reply.stage === 'start') {
        fail(`The encoder could not start: ${reply.message}.`, true);
      } else if (reply.type === 'error' && reply.stage === 'load') {
        fail(`The encoder could not load: ${reply.message}.`, true);
      } else if (reply.id !== id || !read) {
        // about an image that was replaced since
      } else if (reply.type === 'error') {
        if (reply.stage === 'preview') return;
        if (reply.stage === 'decode' && reply.kind === 'DecoderUnavailable') {
          // the package has no decoder and the worker's canvas had none
          // either. the machine asks again, for the page's own `<img>`
          tell({ type: 'unreadable', message: reply.message });
        } else fail(`${reply.message}.`);
      } else if (reply.type === 'decoded') {
        tell({ type: 'decoded', decoded: reply.image, drawnWidth: read.onPage ? read.width : null });
      } else if (reply.type === 'trial') {
        tell(reply);
      } else if (reply.type === 'previewed') {
        tell({ type: 'previewed', preview: new Blob([reply.bytes], { type: 'image/webp' }) });
      } else {
        const output = reply.result;
        const { mime, extension } = codecOf(codecs, output.format);
        const file = new File([output.bytes], rename(read.image.name, extension), { type: mime });
        tell({ type: 'done', result: { output, file, seconds: (performance.now() - startedAt) / 1000 } });
      }
    },
  });

  async function drawOnPage({ image, width, unreadable }: NonNullable<typeof read>, drawing: number) {
    const current = () => !stopped && drawing === id;
    try {
      const { data, width: w, height: h } = await draw(image, width);
      if (current()) worker.send({ type: 'pixels', id, rgba: data.buffer, width: w, height: h }, [data.buffer]);
    } catch (thrown) {
      if (!current()) return;
      fail(unreadable ? `${unreadable}.` : `The browser could not read this image: ${reason(thrown)}.`);
    }
  }

  receive((command) => {
    if (command.type === 'read') {
      id += 1;
      read = command;
      if (command.onPage) void drawOnPage(command, id);
      else worker.send({ type: 'decode', id, bytes: command.image.bytes });
    } else if (command.type === 'encode') {
      startedAt = performance.now();
      worker.send({ type: 'encode', id, options: command.options });
    } else {
      worker.send({ type: 'preview', id });
    }
  });

  return () => {
    stopped = true;
    worker.terminate();
  };
});
