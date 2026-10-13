import { expect, test } from 'vitest';
// The encoder actor over the real worker, on the path the page draws for itself: what it tells the
// machine when the browser cannot draw the image either (ADR-0001 D6).
import { assign, createActor, sendTo, setup } from 'xstate';

import { encoder, type EncoderCommand, type EncoderEvent, type Unreadable } from './encoder';
import type { Picked } from './picked';

/** What the parent takes: the actor's events, and a command to pass on. */
type Heard = EncoderEvent | { type: 'ask'; command: EncoderCommand };
type Kept = { events: Heard[] };

/** A parent for the actor, which keeps every event it sends back. */
const parent = setup({
  // XState reads the types off these values and nothing else.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  types: { context: {} as Kept, events: {} as Heard },
  actors: { encoder },
}).createMachine({
  context: { events: [] },
  invoke: { id: 'encoder', src: 'encoder' },
  on: {
    ask: { actions: sendTo('encoder', ({ event }) => event.command) },
    '*': { actions: assign(({ context, event }) => ({ events: [...context.events, event] })) },
  },
});

// Bytes no browser draws, typed so the page tries to.
const undrawable: Picked = {
  name: 'not.svg',
  vector: true,
  bytes: new ArrayBuffer(0),
  blob: new Blob(['not an image'], { type: 'image/svg+xml' }),
};

/** The actor asked to read `undrawable` on the page, and the failure it answers with. */
async function drawingFailure(unreadable: Unreadable | null) {
  const actor = createActor(parent).start();
  actor.send({
    type: 'ask',
    command: { type: 'read', image: undrawable, onPage: true, width: 0, unreadable, maxPixels: undefined },
  });
  const failed = () => actor.getSnapshot().context.events.find((event) => event.type === 'failed');
  await expect.poll(failed, { timeout: 30_000 }).toBeDefined();
  actor.stop();
  return failed();
}

test("the browser's own refusal to draw the image is a failure of the read, in the browser's words, with no kind", async () => {
  const failure = await drawingFailure(null);
  expect(failure).toMatchObject({ type: 'failed', stage: 'read', broken: false });
  expect(failure).not.toHaveProperty('kind');
  expect(failure).not.toHaveProperty('availableIn');
  expect(failure?.type === 'failed' ? failure.message : '').not.toBe('');
});

test('after the package refused the image first, its refusal is the failure, with the builds that have the decoder', async () => {
  const failure = await drawingFailure({ message: 'no decoder for HEIC in this build', availableIn: ['native-heic'] });
  expect(failure).toMatchObject({
    type: 'failed',
    stage: 'read',
    broken: false,
    kind: 'DecoderUnavailable',
    message: 'no decoder for HEIC in this build',
    availableIn: ['native-heic'],
  });
});
