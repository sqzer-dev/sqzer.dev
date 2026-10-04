import { and, assertEvent, assign, cancel, enqueueActions, not, raise, setup } from 'xstate';
import type { Codec, Decoded, EncodeOptions, TrialProgress } from '@/shared/api';
import type { EncodeResult } from './encode-result';
import { encoder, type EncoderCommand, type EncoderEvent } from './encoder';
import type { Picked } from './picked';

// How long the worker may take to finish what it is doing, once the controls
// have moved on, before it is ended.
const PATIENCE_MS = 300;

type Context = {
  /** The version of `sqzer`, once a worker has loaded it. */
  version: string | null;
  /** What `codecs()` lists. Empty until then. */
  codecs: Codec[];
  /** The file on the page. */
  image: Picked | null;
  /** What the controls said when the newest search was asked for. */
  options: EncodeOptions;
  /** The package's words for having no decoder for the image. The page draws it from then on. */
  unreadable: string | null;
  /** The worker holds the image, decoded. */
  held: boolean;
  /** The width an image drawn on the page was last drawn at. */
  drawnWidth: number | null;
  /** The controls moved while the worker was busy with what they said before. */
  outdated: boolean;
  /** The browser cannot show the image itself, a TIFF say. */
  unshowable: boolean;
  /** The worker was asked for the image in a format every browser shows. */
  previewAsked: boolean;
  preview: Blob | null;
  decoded: Decoded | null;
  /** The trials of the running search, as they land. */
  trials: TrialProgress[];
  result: EncodeResult | null;
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
  | EncoderEvent;

/** Drawn by the page's own `<img>` instead of decoded in the worker. */
const onPage = ({ image, unreadable }: Context) => Boolean(image?.vector) || unreadable !== null;

/** The width to draw a vector image at. A width the package will refuse is not one to draw at. */
function drawWidth({ image, options: { width = 0 } }: Context) {
  return image?.vector && Number.isInteger(width) && width > 0 ? width : 0;
}

/**
 * The search (ADR-0002 D10, ADR-0004). The worker lives as long as `open`
 * and keeps the decoded image between searches, so a change of the controls
 * only pays for the encode. A search cannot be interrupted: `restart`
 * re-enters `open`, which ends the worker and starts another, and that is
 * the only way an encode is cancelled.
 */
export const searchMachine = setup({
  types: { context: {} as Context, events: {} as SearchEvent },
  actors: { encoder },
  guards: {
    hasImage: ({ context }) => context.image !== null,
    showable: ({ context }) => !context.unshowable,
    broken: ({ context }) => context.broken,
    outdated: ({ context }) => context.outdated,
    needsReading: ({ context }) =>
      !context.held || (onPage(context) && context.drawnWidth !== drawWidth(context)),
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
    read: enqueueActions(({ context, enqueue }) => {
      const { image, unreadable } = context;
      if (!image) return;
      const command: EncoderCommand = {
        type: 'read',
        image,
        onPage: onPage(context),
        width: drawWidth(context),
        unreadable,
      };
      enqueue.sendTo('encoder', command);
    }),
    encode: enqueueActions(({ context, enqueue }) => {
      const command: EncoderCommand = { type: 'encode', options: context.options };
      enqueue.sendTo('encoder', command);
    }),
    // Only an image the worker holds can be asked for, and only once.
    askForPreview: enqueueActions(({ context, enqueue }) => {
      const { unshowable, preview, previewAsked, held } = context;
      if (!unshowable || preview || previewAsked || !held) return;
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
    unreadable: null,
    held: false,
    drawnWidth: null,
    outdated: false,
    unshowable: false,
    previewAsked: false,
    preview: null,
    decoded: null,
    trials: [],
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
                    assign(({ event }) => ({ decoded: event.decoded, held: true, drawnWidth: event.drawnWidth })),
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
              entry: [assign({ trials: [], outdated: false }), 'askForPreview', 'encode'],
              on: {
                trial: {
                  guard: not('outdated'),
                  actions: assign(({ context, event }) => ({ trials: [...context.trials, event.trial] })),
                },
                done: [
                  // the controls moved while this one ran
                  { guard: 'outdated', target: 'starting', actions: 'keepPatience' },
                  { target: '#search.open.result', actions: assign(({ event }) => ({ result: event.result })) },
                ],
              },
            },
          },
        },
        result: {},
        failed: {},
      },
    },
  },
});
