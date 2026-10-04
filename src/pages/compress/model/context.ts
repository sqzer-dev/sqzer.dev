import { createActorContext } from '@xstate/react';

import { searchMachine } from './machine';

const SearchContext = createActorContext(searchMachine);

/** Runs the search machine for the page under it. */
export const SearchProvider = SearchContext.Provider;
/** A value read from the machine's snapshot. */
export const useSearch = SearchContext.useSelector;
/** The machine itself, to send it events. */
export const useSearchRef = SearchContext.useActorRef;
