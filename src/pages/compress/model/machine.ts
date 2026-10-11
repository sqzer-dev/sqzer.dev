import { and, assertEvent, assign, cancel, enqueueActions, not, raise, setup, stateIn } from 'xstate';

import type { Codec, Decoded, EncodeOptions, Trial, TrialProgress } from '@/shared/api';

import { boxed } from '../lib/options-of';
import type { EncodeResult } from './encode-result';
import { encoder, type EncoderCommand, type EncoderEvent } from './encoder';
import type { Picked } from './picked';

// How long the worker may take to finish what it is doing, once the controls
// have moved on, before it is ended.
const PATIENCE_MS = 300;

/** A result, with what the search was asked: the output answers those options, and nothing else. */
export type Searched = EncodeResult & { asked: EncodeOptions };

type Context = {
  /** The version of `sqzer`, once a worker has loaded it. */
  version: string | null;
  /** What `codecs()` lists. Empty until then. */
  codecs: Codec[];
  /** The file on the page. */
  image: Picked | null;
  /** What the controls said when the newest search was asked for. */
  options: EncodeOptions;
  /** What the running encode was asked: `options` may have moved on while the worker finishes it. */
  running: EncodeOptions;
  /** The package's words for having no decoder for the image. The page draws it from then on. */
  unreadable: string | null;
  /** The worker holds the image, decoded. */
  held: boolean;
  /** The width an image drawn on the page was last drawn at. */
  drawnWidth: number | null;
  /** The image's own size: as decoded, or as drawn at its own size. A vector drawn at a width asked for keeps the one before. */
  original: Decoded | null;
  /** The `maxPixels` the held image was read under. The limit is the package's at the decode, so a new one reads again. */
  heldLimit: number | undefined;
  /** The controls moved while the worker was busy with what they said before. */
  outdated: boolean;
  /** The browser cannot show the image itself, a TIFF say. */
  unshowable: boolean;
  /** The worker was asked for the image in a format every browser shows. */
  previewAsked: boolean;
  preview: Blob | null;
  decoded: Decoded | null;
  /** The trials of the running search as they land, and of the newest one after it. */
  trials: TrialProgress[];
  /** The searches before that one, oldest first, each as far as it got: the subtle lines of the chart (ADR-0001 D4). They last as long as the tab. */
  runs: Trial[][];
  result: Searched | null;
  error: string | null;
  /** The worker itself failed. The next search starts another. */
  broken: boolean;
};

type SearchEvent =
  | { type: 'picked'; image: Picked; options: EncodeOptions }
  | { type: 'options'; options: EncodeOptions }
  | { type: 'unshowable' }
  /** End the worker, start another and search again. */
  | { type: 'restart' }
  /** End the worker, start another and search no further: the result before stays (ADR-0005 D4). */
  | { type: 'cancel' }
  | EncoderEvent;

/** Drawn by the page's own `<img>` instead of decoded in the worker. */
const onPage = ({ image, unreadable }: Context) => image?.vector === true || unreadable !== null;

/** The width to draw a vector image at. A width the package will refuse is not one to draw at. */
function drawWidth({ image, options: { width = 0 } }: Context) {
  return image?.vector === true && Number.isInteger(width) && width > 0 ? width : 0;
}

/**
 * The search (ADR-0002 D10, ADR-0004). The worker lives as long as `open`
 * and keeps the decoded image between searches, so a change of the controls
 * only pays for the encode. A search cannot be interrupted: `restart` and
 * `cancel` re-enter `open`, which ends the worker and starts another, and
 * that is the only way an encode is cancelled. `restart` searches again,
 * `cancel` leaves the result before.
 */
export const searchMachine = setup({
  // XState reads the two types off these values and nothing else.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  types: { context: {} as Context, events: {} as SearchEvent },
  actors: { encoder },
  guards: {
    hasImage: ({ context }) => context.image !== null,
    showable: ({ context }) => !context.unshowable,
    broken: ({ context }) => context.broken,
    outdated: ({ context }) => context.outdated,
    searching: stateIn('#search.open.searching'),
    needsReading: ({ context }) =>
      !context.held ||
      context.heldLimit !== context.options.maxPixels ||
      (onPage(context) && context.drawnWidth !== drawWidth(context)),
  },
  actions: {
    takeImage: assign(({ event }) => {
      assertEvent(event, 'picked');
      return {
        image: event.image,
        options: event.options,
        unreadable: null,
        held: false,
        drawnWidth: null,
        heldLimit: undefined,
        original: null,
        unshowable: false,
        previewAsked: false,
        preview: null,
        decoded: null,
        result: null,
      };
    }),
    takeOptions: assign(({ event }) => {
      assertEvent(event, 'options');
      return { options: event.options };
    }),
    // the trials of the search before, as far as it got, become a run behind the one starting: at the
    // start of a search, and at an encode that follows one the controls outdated
    keepRun: assign(({ context }) => ({
      trials: [],
      runs: context.trials.length === 0 ? context.runs : [...context.runs, context.trials],
    })),
    read: enqueueActions(({ context, enqueue }) => {
      const { image, unreadable } = context;
      if (!image) return;
      const command: EncoderCommand = {
        type: 'read',
        image,
        onPage: onPage(context),
        width: drawWidth(context),
        unreadable,
        maxPixels: context.options.maxPixels,
      };
      enqueue.sendTo('encoder', command);
    }),
    // the box of a fit that needs both sides is filled from the image held, which is this one's size
    encode: enqueueActions(({ context, enqueue }) => {
      const command: EncoderCommand = { type: 'encode', options: boxed(context.options, context.original) };
      enqueue.sendTo('encoder', command);
    }),
    // Only an image the worker holds can be asked for, and only once.
    askForPreview: enqueueActions(({ context, enqueue }) => {
      const { unshowable, preview, previewAsked, held } = context;
      if (!unshowable || preview !== null || previewAsked || !held) return;
      const command: EncoderCommand = { type: 'preview' };
      enqueue.sendTo('encoder', command);
      enqueue.assign({ previewAsked: true });
    }),
    restart: raise({ type: 'restart' }),
    // What the worker is doing gets a moment to finish, then the worker is ended.
    losePatience: raise({ type: 'restart' }, { delay: PATIENCE_MS, id: 'patience' }),
    keepPatience: cancel('patience'),
  },
}).createMachine({
  id: 'search',
  context: {
    version: null,
    codecs: [],
    image: null,
    options: {},
    running: {},
    unreadable: null,
    held: false,
    drawnWidth: null,
    heldLimit: undefined,
    original: null,
    outdated: false,
    unshowable: false,
    previewAsked: false,
    preview: null,
    decoded: null,
    trials: [],
    runs: [],
    result: null,
    error: null,
    broken: false,
  },
  initial: 'open',
  states: {
    open: {
      // a new worker holds nothing and was asked for nothing
      entry: assign({ held: false, previewAsked: false, outdated: false, broken: false }),
      invoke: { id: 'encoder', src: 'encoder' },
      initial: 'empty',
      on: {
        restart: { target: '.searching', reenter: true },
        cancel: { guard: 'searching', target: '.cancelled', reenter: true },
        ready: { actions: assign(({ event }) => ({ version: event.version, codecs: event.codecs })) },
        previewed: { actions: assign(({ event }) => ({ preview: event.preview })) },
        // the worker is idle: it takes the new image, or the new options for the one it holds
        picked: [
          { guard: 'broken', actions: ['takeImage', 'restart'] },
          { target: '.searching', actions: 'takeImage' },
        ],
        options: [
          { guard: and(['hasImage', 'broken']), actions: ['takeOptions', 'restart'] },
          { guard: 'hasImage', target: '.searching', actions: 'takeOptions' },
        ],
        unshowable: { guard: 'showable', actions: [assign({ unshowable: true }), 'askForPreview'] },
        failed: {
          target: '.failed',
          actions: assign(({ event }) => ({ error: event.message, result: null, broken: event.broken })),
        },
      },
      states: {
        empty: {},
        searching: {
          initial: 'starting',
          entry: 'keepRun',
          exit: 'keepPatience',
          on: {
            // the worker is busy with the image that just left
            picked: { actions: ['takeImage', 'restart'] },
            options: { actions: ['takeOptions', assign({ outdated: true }), 'keepPatience', 'losePatience'] },
            // the newest options get their run, whatever came of the ones before
            failed: { guard: 'outdated', actions: 'restart' },
          },
          states: {
            starting: {
              always: [{ guard: 'needsReading', target: 'reading' }, { target: 'encoding' }],
            },
            reading: {
              entry: 'read',
              on: {
                decoded: {
                  target: 'starting',
                  actions: [
                    'keepPatience',
                    assign(({ context, event }) => ({
                      decoded: event.decoded,
                      held: true,
                      drawnWidth: event.drawnWidth,
                      original: event.drawnWidth === null || event.drawnWidth === 0 ? event.decoded : context.original,
                      heldLimit: context.options.maxPixels,
                    })),
                  ],
                },
                // the worker's canvas had no decoder either: the page's own `<img>` is the last one to ask
                unreadable: {
                  target: 'reading',
                  reenter: true,
                  actions: assign(({ event }) => ({ unreadable: event.message })),
                },
              },
            },
            encoding: {
              entry: [
                'keepRun',
                assign(({ context }) => ({ running: context.options, outdated: false })),
                'askForPreview',
                'encode',
              ],
              on: {
                trial: {
                  guard: not('outdated'),
                  actions: assign(({ context, event }) => ({ trials: [...context.trials, event.trial] })),
                },
                done: [
                  // the controls moved while this one ran
                  { guard: 'outdated', target: 'starting', actions: 'keepPatience' },
                  {
                    target: '#search.open.result',
                    actions: assign(({ context, event }) => ({ result: { ...event.result, asked: context.options } })),
                  },
                ],
              },
            },
          },
        },
        result: {},
        failed: {},
        /** The reader cancelled the search: the image stays, and the result before it, if any. */
        cancelled: {},
      },
    },
  },
});
