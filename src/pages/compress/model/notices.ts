import type { UseToastManagerReturnValue } from '@base-ui/react/toast';
import { useEffect } from 'react';
import type { SnapshotFrom } from 'xstate';

import { useSearchRef } from './context';
import type { searchMachine } from './machine';

type Snapshot = SnapshotFrom<typeof searchMachine>;

/** One thing the page says in passing, as a toast (ADR-0005 D2). */
export type Notice = {
  type: 'loading' | 'success';
  title: string;
  description?: string;
};

// How long a search runs before its toast appears, so a fast encode does not flash one (ADR-0001 D4).
const QUIET_MS = 500;

/**
 * Whether the encoder is loaded. Null once it failed to, there is nothing left to wait for, and null
 * once an image is on the page, which says it as well as the toast did.
 */
export function encoderNotice(snapshot: Snapshot): Notice | null {
  const { version, image } = snapshot.context;
  if (version !== null) return image === null ? { type: 'success', title: 'Ready.' } : null;
  if (snapshot.matches({ open: 'failed' })) return null;
  return { type: 'loading', title: 'Loading the encoder.' };
}

/** Where the search is, with the newest trial. Null while there is no search to tell of. */
export function searchNotice(snapshot: Snapshot): Notice | null {
  const { image, trials, result } = snapshot.context;
  if (snapshot.matches({ open: { searching: 'reading' } }))
    return { type: 'loading', title: `Reading ${image?.name}.` };
  if (snapshot.matches({ open: 'searching' })) {
    const trial = trials.at(-1);
    return {
      type: 'loading',
      title: `Encoding ${image?.name}.`,
      ...(trial && {
        description: `Trial ${trial.n} of at most ${trial.max}: quality ${trial.quality} scores ${trial.score.toFixed(1)}.`,
      }),
    };
  }
  if (snapshot.matches({ open: 'result' }))
    return { type: 'success', title: `Done in ${result?.seconds.toFixed(1)} s.` };
  return null;
}

const same = (one: Notice | null, other: Notice | null) =>
  one?.type === other?.type && one?.title === other?.title && one?.description === other?.description;

/** The toaster's part, as `useToastManager` gives it: what the page says, and what it takes back. */
type Toaster = Pick<UseToastManagerReturnValue, 'add' | 'close'>;

/** Tells the `encoder` toast: loading, ready, or gone once the worker failed to load. */
function encoderTeller({ add, close }: Toaster) {
  let encoder: Notice | null = null;
  return (snapshot: Snapshot) => {
    const next = encoderNotice(snapshot);
    if (same(encoder, next)) return;
    encoder = next;
    if (next) add({ id: 'encoder', ...next, timeout: next.type === 'loading' ? 0 : undefined });
    else close('encoder');
  };
}

/**
 * Tells the `search` toast, updated in place. It appears once a search has run for the quiet 500 ms
 * and says done for that search alone: a search over sooner shows nothing, the result panel is its
 * message. One the reader closed stays closed until the search is done.
 */
function searchTeller({ add, close }: Toaster) {
  let search: Notice | null = null;
  // whether the toast has told of the running search: only then does it tell of its end
  let told = false;
  // the reader closed it while the search ran: no trial brings it back, the end of the search does
  let dismissed = false;
  let quiet = 0;

  const show = () => {
    if (!search) return;
    add({
      id: 'search',
      ...search,
      // every field, each time: a toast with the id of one on the screen is merged into it, and a
      // description left out would stay
      description: search.description,
      timeout: search.type === 'loading' ? 0 : undefined,
      // at the close, not after the slide out: a trial landing meanwhile would bring the toast back
      onClose: () => {
        if (search?.type === 'loading') dismissed = true;
      },
    });
  };
  const settle = () => {
    clearTimeout(quiet);
    quiet = 0;
  };
  const tell = (snapshot: Snapshot) => {
    const next = searchNotice(snapshot);
    if (same(search, next)) return;
    search = next;
    if (next === null) {
      settle();
      dismissed = false;
      told = false;
      // a toast that is not on the screen is nothing to close, and Base UI takes it so
      close('search');
    } else if (next.type === 'success') {
      settle();
      dismissed = false;
      if (told) show();
      told = false;
    } else if (dismissed) {
      // closed by the reader: nothing until the search is done
    } else if (told) {
      show();
    } else if (quiet === 0) {
      quiet = window.setTimeout(() => {
        quiet = 0;
        told = true;
        show();
      }, QUIET_MS);
    }
  };
  return { tell, stop: settle };
}

/** Keeps the toaster saying what the machine says: two toasts, `encoder` and `search` (ADR-0005 D2). */
function teller(toaster: Toaster) {
  const encoder = encoderTeller(toaster);
  const search = searchTeller(toaster);
  return {
    tell: (snapshot: Snapshot) => {
      encoder(snapshot);
      search.tell(snapshot);
    },
    stop: search.stop,
  };
}

/**
 * Tells the toaster what the search machine above is doing, as long as the component is mounted. The
 * toaster is the one `useToastManager` gives, bound to the provider: the global manager hands its
 * events to the provider through a subscription made in an effect, after a child's effect has run.
 */
export function useNotices({ add, close }: Toaster) {
  const search = useSearchRef();

  useEffect(() => {
    const { tell, stop } = teller({ add, close });
    tell(search.getSnapshot());
    const subscription = search.subscribe(tell);
    return () => {
      subscription.unsubscribe();
      stop();
    };
  }, [search, add, close]);
}
