import { useSearch } from '../model/context';
import { currentTrials } from '../model/run';

/**
 * The trials of the running or newest search, each with its number, its quality and its score
 * (ADR-0001 D4, ADR-0005 D4): the numbers the chart draws, for reading after the search and for a
 * screen reader, which the drawing is hidden from.
 */
export function TrialList() {
  const trials = useSearch(currentTrials);

  if (trials.length === 0) return null;
  return (
    <table className="font-mono text-xs/relaxed tabular-nums">
      <caption className="sr-only">Trials</caption>
      <thead className="text-muted-foreground">
        <tr>
          <th scope="col" className="sr-only">
            Trial
          </th>
          <th scope="col" className="pr-4 text-left font-normal">
            quality
          </th>
          <th scope="col" className="text-left font-normal">
            score
          </th>
        </tr>
      </thead>
      <tbody>
        {trials.map((trial, index) => (
          // trials are only ever added, in their order
          // oxlint-disable-next-line react/no-array-index-key
          <tr key={index}>
            <th scope="row" className="pr-3 text-right font-normal text-muted-foreground">
              {index + 1}
            </th>
            <td className="pr-4">{trial.quality}</td>
            <td>{trial.score.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
