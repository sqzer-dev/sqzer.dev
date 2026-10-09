import { expect, test } from 'vitest';
import { createActor, fromCallback, SimulatedClock } from 'xstate';

import type { Output } from '@/shared/api';

import type { EncoderCommand, EncoderEvent } from './encoder';
import { searchMachine } from './machine';
import type { Picked } from './picked';

type StubWorker = { asked: EncoderCommand[]; ended: boolean };

/** The machine over a worker that does nothing: the test plays the worker's part through `tell`. */
function start() {
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

const picked = (name: string, vector = false): Picked => ({
  name,
  vector,
  bytes: new ArrayBuffer(0),
  blob: new Blob(),
});

const decoded = (drawnWidth: number | null = null): EncoderEvent => ({
  type: 'decoded',
  decoded: { width: 48, height: 32, format: 'jpeg', alpha: false, animated: false },
  drawnWidth,
});

const output: Output = {
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
const done: EncoderEvent = { type: 'done', result: { output, file: new File([], 'a.avif'), seconds: 1 } };

/** A machine with `a.jpg` picked, decoded and being encoded. */
function encoding() {
  const search = start();
  search.actor.send({ type: 'picked', image: picked('a.jpg'), options: { target: 70 } });
  search.tell(decoded());
  return search;
}

test('the worker loads before any image, and the controls get its codecs', () => {
  const { actor, tell, workers, state } = start();

  expect(workers).toHaveLength(1);
  tell({ type: 'ready', version: '0.3.0', codecs: [] });
  actor.send({ type: 'options', options: { target: 50 } });

  expect(actor.getSnapshot().context.version).toBe('0.3.0');
  expect(state()).toEqual({ open: 'empty' });
});

test('a picked image is read, then encoded, on the worker that is there', () => {
  const search = encoding();

  expect(search.state()).toEqual({ open: { searching: 'encoding' } });
  search.tell(done);

  expect(search.state()).toEqual({ open: 'result' });
  expect(search.asked()).toEqual([['read', 'encode']]);
  // the result carries what it was asked, which is what its output answers
  expect(search.actor.getSnapshot().context.result).toMatchObject({ asked: { target: 70 } });
});

test('the controls moving during a search end the worker once the patience runs out', () => {
  const search = encoding();
  search.actor.send({ type: 'options', options: { target: 80 } });

  search.clock.increment(299);
  expect(search.workers).toHaveLength(1);
  search.clock.increment(1);

  expect(search.workers.map((worker) => worker.ended)).toEqual([true, false]);
  expect(search.state()).toEqual({ open: { searching: 'reading' } });
  search.tell(decoded());
  expect(search.workers[1]?.asked.at(-1)).toEqual({ type: 'encode', options: { target: 80 } });
});

test('an encode that finishes within the patience keeps its worker, which encodes again', () => {
  const search = encoding();
  search.actor.send({ type: 'options', options: { target: 80 } });
  search.tell({ type: 'trial', trial: { n: 1, max: 6, quality: 60, score: 70 } });
  search.tell(done);
  search.clock.increment(1000);

  expect(search.asked()).toEqual([['read', 'encode', 'encode']]);
  expect(search.actor.getSnapshot().context.trials).toEqual([]);
  expect(search.state()).toEqual({ open: { searching: 'encoding' } });
});

test('the controls moving after a result only pay for the encode', () => {
  const search = encoding();
  search.tell(done);
  search.actor.send({ type: 'options', options: { quality: 80 } });

  expect(search.asked()).toEqual([['read', 'encode', 'encode']]);
  expect(search.workers[0]?.ended).toBe(false);
});

test('another image during a search ends the worker at once', () => {
  const search = encoding();
  search.actor.send({ type: 'picked', image: picked('b.png'), options: {} });

  expect(search.workers.map((worker) => worker.ended)).toEqual([true, false]);
  expect(search.workers[1]?.asked[0]).toMatchObject({ type: 'read', image: { name: 'b.png' } });
});

test('another image after a result goes to the worker that is there', () => {
  const search = encoding();
  search.tell(done);
  search.actor.send({ type: 'picked', image: picked('b.png'), options: {} });

  expect(search.workers).toHaveLength(1);
  expect(search.asked()).toEqual([['read', 'encode', 'read']]);
  expect(search.actor.getSnapshot().context.result).toBeNull();
});

test('a vector image is drawn again when its width changes, and not when it stays', () => {
  const search = start();
  search.actor.send({ type: 'picked', image: picked('c.svg', true), options: { width: 100 } });
  expect(search.workers[0]?.asked[0]).toMatchObject({ type: 'read', onPage: true, width: 100 });
  search.tell(decoded(100));
  search.tell(done);

  search.actor.send({ type: 'options', options: { width: 100, quality: 50 } });
  search.tell(done);
  search.actor.send({ type: 'options', options: { width: 200 } });

  expect(search.asked()).toEqual([['read', 'encode', 'encode', 'read']]);
  expect(search.workers[0]?.asked.at(-1)).toMatchObject({ type: 'read', width: 200 });
});

test('a new limit on the pixels reads the image again under it, and the same limit does not', () => {
  const search = encoding();
  expect(search.workers[0]?.asked[0]).toMatchObject({ type: 'read', maxPixels: undefined });
  search.tell(done);

  search.actor.send({ type: 'options', options: { maxPixels: 1000 } });
  expect(search.workers[0]?.asked.at(-1)).toMatchObject({ type: 'read', maxPixels: 1000 });
  search.tell(decoded());
  search.tell(done);
  search.actor.send({ type: 'options', options: { maxPixels: 1000, quality: 50 } });

  expect(search.asked()).toEqual([['read', 'encode', 'read', 'encode', 'encode']]);
});

test('an image the package cannot decode is drawn on the page', () => {
  const search = start();
  search.actor.send({ type: 'picked', image: picked('d.heic'), options: {} });
  search.tell({ type: 'unreadable', message: 'no decoder for HEIC' });

  expect(search.workers[0]?.asked).toHaveLength(2);
  expect(search.workers[0]?.asked[1]).toMatchObject({ type: 'read', onPage: true, unreadable: 'no decoder for HEIC' });
});

test('an image the browser cannot show is asked for once the worker holds it', () => {
  const search = start();
  search.actor.send({ type: 'picked', image: picked('e.tiff'), options: {} });
  search.actor.send({ type: 'unshowable' });
  expect(search.asked()).toEqual([['read']]);

  search.tell(decoded());
  search.actor.send({ type: 'unshowable' });

  expect(search.asked()).toEqual([['read', 'preview', 'encode']]);
});

test('a failure clears the result, and the next change of the controls searches again', () => {
  const search = encoding();
  search.tell(done);
  search.actor.send({ type: 'options', options: { quality: 101 } });
  search.tell({ type: 'failed', message: 'invalid parameters.', broken: false });

  expect(search.state()).toEqual({ open: 'failed' });
  expect(search.actor.getSnapshot().context).toMatchObject({ error: 'invalid parameters.', result: null });
  search.actor.send({ type: 'options', options: { quality: 80 } });
  expect(search.asked()).toEqual([['read', 'encode', 'encode', 'encode']]);
});

test('a worker that failed is replaced by the next search', () => {
  const search = start();
  search.tell({ type: 'failed', message: 'The encoder could not load: offline.', broken: true });
  search.actor.send({ type: 'picked', image: picked('a.jpg'), options: {} });

  expect(search.workers.map((worker) => worker.ended)).toEqual([true, false]);
  expect(search.asked()).toEqual([[], ['read']]);
});
