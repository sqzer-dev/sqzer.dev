// The machine in a test: over a worker that does nothing, whose part the test plays through `tell`.
import { createActor, fromCallback, SimulatedClock, type CallbackActorLogic } from 'xstate';

import type { OptionInfo, Output } from '@/shared/api';

import { defaultsOf } from '../lib/defaults';
import type { EncoderCommand, EncoderEvent } from './encoder';
import { searchMachine } from './machine';
import type { Picked } from './picked';

type StubWorker = { asked: EncoderCommand[]; ended: boolean };

/** The machine over a worker that does nothing: the test plays the worker's part through `tell`. */
export function start() {
  const workers: StubWorker[] = [];
  const answer: { to?: (event: EncoderEvent) => void } = {};
  const encoder = fromCallback<EncoderCommand>(({ sendBack, receive }) => {
    const worker: StubWorker = { asked: [], ended: false };
    workers.push(worker);
    receive((command) => {
      worker.asked.push(command);
    });
    answer.to = sendBack;
    return () => {
      worker.ended = true;
    };
  });
  const clock = new SimulatedClock();
  const actor = createActor(searchMachine.provide({ actors: { encoder } }), { clock });
  actor.start();
  return {
    actor,
    clock,
    workers,
    tell: (event: EncoderEvent) => answer.to?.(event),
    asked: () => workers.map((worker) => worker.asked.map((command) => command.type)),
    state: () => actor.getSnapshot().value,
  };
}

/** Part of what `options()` lists at 0.4.0: the keys the page shows a default for, and one with none. */
const OPTIONS: OptionInfo[] = [
  { key: 'format', default: 'auto', help: 'output format' },
  { key: 'target', default: '70', help: 'SSIMULACRA2 score to reach' },
  { key: 'quality', help: 'encode at this quality, with no search' },
  { key: 'lossless', default: 'false', help: 'lossless output' },
  { key: 'effort', default: '6', help: '0 to 10. Higher is slower and smaller' },
  { key: 'subsampling', default: 'auto', help: 'chroma subsampling' },
  { key: 'fast', default: 'false', help: 'one encode at the seed quality' },
  { key: 'width', help: 'target width in pixels' },
  { key: 'fit', default: 'inside', help: 'how the image meets the box' },
  { key: 'position', default: 'center', help: 'where cover crops and contain places the image' },
  { key: 'background', default: 'auto', help: 'padding of contain' },
  { key: 'scale', help: 'a factor instead of a box' },
  { key: 'enlarge', default: 'false', help: 'allow scaling up' },
  { key: 'filter', default: 'lanczos3', help: 'resampling filter' },
  { key: 'maxPixels', default: '24000000', help: 'refuse an image above this many pixels' },
];

/** Those defaults, as the encoder hands them to the machine. */
export const DEFAULTS = defaultsOf(OPTIONS);

/** The machine over a stub worker a test of the page plays. */
export const stubbed = (encoder: CallbackActorLogic<EncoderCommand>) => searchMachine.provide({ actors: { encoder } });

export const picked = (name: string, vector = false): Picked => ({
  name,
  vector,
  bytes: new ArrayBuffer(0),
  blob: new Blob(),
});

export const decoded = (drawnWidth: number | null = null): EncoderEvent => ({
  type: 'decoded',
  decoded: { width: 48, height: 32, format: 'jpeg', alpha: false, animated: false },
  drawnWidth,
});

export const output: Output = {
  bytes: new Uint8Array(1),
  animated: false,
  width: 48,
  height: 32,
  alpha: false,
  content: 'photo',
  format: 'avif',
  outputWidth: 48,
  outputHeight: 32,
  backend: 'ravif',
  tier: 'portable',
  quality: 62,
  lossless: false,
};
export const done: EncoderEvent = { type: 'done', result: { output, file: new File([], 'a.avif'), seconds: 1 } };

/** A machine with `a.jpg` picked, decoded and being encoded. */
export function encoding() {
  const search = start();
  search.actor.send({ type: 'picked', image: picked('a.jpg'), options: { target: 70 } });
  search.tell(decoded());
  return search;
}
