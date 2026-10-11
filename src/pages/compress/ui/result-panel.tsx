import { useSearch } from '../model/context';
import { ResultDetails } from './result-details';
import { SearchChart } from './search-chart';
import { SearchFailure } from './search-failure';
import { TrialList } from './trial-list';

export { ResultHeadline } from './result-headline';

/**
 * Whether there is a result panel to show: a result, the failure in its place (ADR-0001 D6), or a
 * search with a trial landed, which the chart and the list show as it runs (D4).
 */
export function useHasResult() {
  return useSearch(
    (snapshot) =>
      snapshot.context.result !== null ||
      snapshot.matches({ open: 'failed' }) ||
      (snapshot.matches({ open: 'searching' }) && snapshot.context.trials.length > 0),
  );
}

/** Whether the image on the page failed to be read or encoded: its alert is in the result panel (ADR-0001 D6). */
export function useImageFailed() {
  return useSearch((snapshot) => snapshot.matches({ open: 'failed' }) && snapshot.context.image !== null);
}

type ResultPanelProps = {
  /** The details behind an expander, on a wide screen; on a phone they follow on scroll (ADR-0001 D5). */
  expander: boolean;
};

/**
 * Under the headline (`ResultHeadline`): why nothing was made, if so (ADR-0001 D6), the search as
 * it runs and the result it ends in, as the chart and the trials (D4), and everything else of the
 * result (D5).
 */
export function ResultPanel({ expander }: ResultPanelProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <SearchFailure of="image" />
      <SearchChart />
      <TrialList />
      <ResultDetails expander={expander} />
    </div>
  );
}
