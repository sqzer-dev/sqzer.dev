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

/** Whether the encoder is loaded. */
export function encoderNotice({ context }: Snapshot): Notice {
  return context.version === null
    ? { type: 'loading', title: 'Loading the encoder.' }
    : { type: 'success', title: 'Ready.' };
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

/**
 * Keeps the toaster saying what the machine says: two toasts, `encoder` and `search`, each updated in
 * place. The search toast waits out the quiet first 500 ms of a search unless it is on the screen
 * already, and one the reader closed stays closed until the search is done.
 */
function teller({ add, close }: Toaster) {
  let encoder: Notice | null = null;
  let search: Notice | null = null;
  // whether the search toast is on the screen, until the reader or its timeout takes it off
  let shown = false;
  let quiet = 0;

  // every field, each time: a toast with the id of one on the screen is merged into it, and a
  // description left out would stay
  const show = (id: string, { type, title, description }: Notice, onRemove?: () => void) => {
    add({ id, type, title, description, timeout: type === 'loading' ? 0 : undefined, onRemove });
  };
  const showSearch = () => {
    if (!search) return;
    shown = true;
    show('search', search, () => {
      shown = false;
    });
  };
  const settle = () => {
    clearTimeout(quiet);
    quiet = 0;
  };

  const tell = (snapshot: Snapshot) => {
    const nextEncoder = encoderNotice(snapshot);
    if (!same(encoder, nextEncoder)) {
      encoder = nextEncoder;
      show('encoder', nextEncoder);
    }

    const next = searchNotice(snapshot);
    if (same(search, next)) return;
    search = next;
    if (next === null) {
      settle();
      if (shown) close('search');
    } else if (next.type === 'success') {
      settle();
      showSearch();
    } else if (shown) {
      showSearch();
    } else if (quiet === 0) {
      quiet = window.setTimeout(() => {
        quiet = 0;
        showSearch();
      }, QUIET_MS);
    }
  };

  return { tell, stop: settle };
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
