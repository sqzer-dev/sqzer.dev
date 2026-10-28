import type { SnapshotFrom } from 'xstate';

import type { EncodeOptions, Trial } from '@/shared/api';

import { defaultTarget } from '../lib/defaults';
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

/** The score `asked` searches for, or null where it asks for none: a fixed quality, lossless, or an encoder that is lossless only. */
function searchedFor(asked: EncodeOptions, { codecs, defaults }: Snapshot['context']) {
  if (asked.quality !== undefined || asked.lossless === true) return null;
  const encoder =
    asked.format === undefined ? undefined : codecs.find((codec) => codec.format === asked.format)?.encoder;
  if (encoder !== undefined && !encoder.lossy) return null;
  return asked.target ?? defaultTarget(defaults);
}

/**
 * The score those trials search for, which is the target's rule on the chart: what the running
 * encode was asked, which the controls may have moved on from, or what the search about to start
 * asks, with the package's default while it has not said its own; or what the result reports.
 * Null where no score is searched for: a fixed quality, lossless, or an encoder that is lossless
 * only; a result the package went lossless for, which reports the target it was asked; and one
 * that ran at no quality, such as a palette of `png:colors`, which reports the default it ignored.
 */
export function currentTarget(snapshot: Snapshot): number | null {
  const { options, running, result } = snapshot.context;
  if (snapshot.matches({ open: { searching: 'encoding' } })) return searchedFor(running, snapshot.context);
  if (snapshot.matches({ open: 'searching' })) return searchedFor(options, snapshot.context);
  if (!result || result.output.lossless || result.output.quality === undefined) return null;
  return result.output.target ?? null;
}
