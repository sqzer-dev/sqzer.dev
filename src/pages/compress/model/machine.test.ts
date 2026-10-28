import { expect, test } from 'vitest';

import { decoded, done, encoding, DEFAULTS, picked, start } from './machine.harness';

test('the worker loads before any image, and the controls get its codecs and its defaults', () => {
  const { actor, tell, workers, state } = start();

  expect(workers).toHaveLength(1);
  expect(actor.getSnapshot().context.defaults).toEqual({});
  tell({ type: 'ready', version: '0.4.0', codecs: [], defaults: DEFAULTS });
  actor.send({ type: 'options', options: { target: 50 } });

  const { version, defaults } = actor.getSnapshot().context;
  expect(version).toBe('0.4.0');
  // spelled as the package spells them, and a key with no default is not there
  expect(defaults).toMatchObject({ target: '70', effort: '6', fit: 'inside', maxPixels: '24000000' });
  expect(defaults).not.toHaveProperty('width');
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
  search.tell({ type: 'trial', trial: { n: 1, max: 6, quality: 60, score: 70, size: 4800 } });
  search.tell(done);
  search.clock.increment(1000);

  expect(search.asked()).toEqual([['read', 'encode', 'encode']]);
  expect(search.actor.getSnapshot().context.trials).toEqual([]);
  expect(search.state()).toEqual({ open: { searching: 'encoding' } });
});

test('cancelling ends the worker and leaves the result before, which the next change searches again from', () => {
  const search = encoding();
  search.tell(done);
  search.actor.send({ type: 'options', options: { target: 85 } });
  search.actor.send({ type: 'cancel' });

  expect(search.workers.map((worker) => worker.ended)).toEqual([true, false]);
  expect(search.state()).toEqual({ open: 'cancelled' });
  expect(search.actor.getSnapshot().context.result).toMatchObject({ asked: { target: 70 } });
  // a search that is not running has nothing to cancel
  search.actor.send({ type: 'cancel' });
  expect(search.workers).toHaveLength(2);
  search.actor.send({ type: 'options', options: { target: 80 } });
  expect(search.asked()).toEqual([['read', 'encode', 'encode'], ['read']]);
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

test("an image's own size is kept apart from the size it was drawn at", () => {
  const raster = encoding();
  expect(raster.actor.getSnapshot().context.original).toMatchObject({ width: 48, height: 32 });

  const vector = start();
  vector.actor.send({ type: 'picked', image: picked('c.svg', true), options: {} });
  vector.tell(decoded(0));
  expect(vector.actor.getSnapshot().context.original).toMatchObject({ width: 48, height: 32 });
  vector.tell(done);
  vector.actor.send({ type: 'options', options: { width: 24 } });
  vector.tell({
    type: 'decoded',
    decoded: { width: 24, height: 16, format: 'svg', alpha: false, animated: false },
    drawnWidth: 24,
  });
  expect(vector.actor.getSnapshot().context.decoded).toMatchObject({ width: 24 });
  expect(vector.actor.getSnapshot().context.original).toMatchObject({ width: 48 });
});

test('the box of a fit that needs both sides is filled at the encode from the image held, so another image gets its own', () => {
  const search = start();
  search.actor.send({ type: 'picked', image: picked('a.jpg'), options: { fit: 'cover', width: 24 } });
  search.tell(decoded());
  expect(search.workers[0]?.asked.at(-1)).toMatchObject({
    type: 'encode',
    options: { fit: 'cover', width: 24, height: 32 },
  });
  search.tell(done);

  // the next image is read before it is encoded, and its own size fills the box
  search.actor.send({ type: 'picked', image: picked('b.jpg'), options: { fit: 'cover' } });
  search.tell({
    type: 'decoded',
    decoded: { width: 200, height: 300, format: 'jpeg', alpha: false, animated: false },
    drawnWidth: null,
  });
  expect(search.workers[0]?.asked.at(-1)).toMatchObject({
    type: 'encode',
    options: { fit: 'cover', width: 200, height: 300 },
  });
  // the record of what was asked stays the reader's own
  search.tell(done);
  expect(search.actor.getSnapshot().context.result).toMatchObject({ asked: { fit: 'cover' } });
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
  search.tell({ type: 'unreadable', availableIn: undefined, message: 'no decoder for HEIC' });

  expect(search.workers[0]?.asked).toHaveLength(2);
  expect(search.workers[0]?.asked[1]).toMatchObject({
    type: 'read',
    onPage: true,
    unreadable: { message: 'no decoder for HEIC', availableIn: undefined },
  });
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
  search.tell({ type: 'failed', message: 'invalid parameters', stage: 'encode', broken: false });

  expect(search.state()).toEqual({ open: 'failed' });
  expect(search.actor.getSnapshot().context).toMatchObject({
    error: { message: 'invalid parameters', stage: 'encode' },
    result: null,
  });
  search.actor.send({ type: 'options', options: { quality: 80 } });
  expect(search.asked()).toEqual([['read', 'encode', 'encode', 'encode']]);
});

test('the alert of a failure is dismissed by the reader, and the next failure brings it back', () => {
  const search = encoding();
  search.tell({ type: 'failed', message: 'no', stage: 'encode', broken: false });
  search.actor.send({ type: 'dismiss' });

  expect(search.state()).toEqual({ open: 'failed' });
  expect(search.actor.getSnapshot().context.error).toBeNull();
  search.actor.send({ type: 'options', options: { quality: 80 } });
  search.tell({ type: 'failed', message: 'again', stage: 'encode', broken: false });
  expect(search.actor.getSnapshot().context.error).toMatchObject({ message: 'again' });
});

test('a worker that failed is replaced by the next search', () => {
  const search = start();
  search.tell({ type: 'failed', message: 'offline', stage: 'load', broken: true });
  search.actor.send({ type: 'picked', image: picked('a.jpg'), options: {} });

  expect(search.workers.map((worker) => worker.ended)).toEqual([true, false]);
  expect(search.asked()).toEqual([[], ['read']]);
});
