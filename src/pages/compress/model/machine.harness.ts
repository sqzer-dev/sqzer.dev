// The machine in a test: over a worker that does nothing, whose part the test plays through `tell`.
import { createActor, fromCallback, SimulatedClock } from 'xstate';

import type { Output } from '@/shared/api';

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
