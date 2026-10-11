import type { SnapshotFrom } from 'xstate';

import type { Trial } from '@/shared/api';

import { DEFAULTS } from '../lib/defaults';
import type { searchMachine } from './machine';

type Snapshot = SnapshotFrom<typeof searchMachine>;

// one empty list, so a selector that finds no trials answers the same thing each time
const NONE: Trial[] = [];

/**
 * The trials the chart draws at full weight and the list shows (ADR-0001 D4, ADR-0005 D4): the
 * running search's, as they land, or the newest result's. Nothing after a failure, which clears the
 * result, or after a cancel with no result before it.
 */
export function currentTrials(snapshot: Snapshot): Trial[] {
  const { trials, result } = snapshot.context;
  if (snapshot.matches({ open: 'searching' })) return trials;
  return result?.output.trials ?? NONE;
}

/**
 * The score those trials search for, which is the target's rule on the chart: what the search was
 * asked, or the package's default while it has not said its own, or what the result reports. Null
 * where no score is searched for: a fixed quality, or lossless.
 */
export function currentTarget(snapshot: Snapshot): number | null {
  const { options, result } = snapshot.context;
  if (snapshot.matches({ open: 'searching' })) {
    if (options.quality !== undefined || options.lossless === true) return null;
    return options.target ?? DEFAULTS.target;
  }
  return result?.output.target ?? null;
}
