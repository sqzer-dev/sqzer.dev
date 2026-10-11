import type { Output } from '@/shared/api';

import type { Searched } from '../model/machine';
import { words } from './score';

/** `673 B`, `45.6 KB`, `1.2 MB`, as the command line prints them. */
export function bytes(n: number) {
  if (n < 1000) return `${n} B`;
  if (n < 1e6) return `${(n / 1e3).toFixed(1)} KB`;
  return `${(n / 1e6).toFixed(1)} MB`;
}

/** The difference the result made to the size, `96 % smaller`, `12 % larger`, or `the same size`. */
export function difference(before: number, after: number) {
  const percent = Math.round((1 - after / before) * 100);
  if (percent > 0) return `${percent} % smaller`;
  if (percent < 0) return `${-percent} % larger`;
  return 'the same size';
}

/** One line of the details: what it is of, and what it says. */
export type Detail = { term: string; said: string };

/** What the search did about the target, after the number of trials: reached, missed, or stopped at the encoder's ceiling. */
function searched({ reached, capped, iterations, trials }: Output) {
  const count = iterations ?? trials?.length ?? 0;
  const trial = count === 1 ? '1 trial' : `${count} trials`;
  if (reached === true) return `reached in ${trial}`;
  if (capped === true) return `not reached in ${trial}; this is the best quality the encoder has`;
  return `not reached in ${trial}`;
}

/**
 * Everything of the result but the size, the difference and the chips (ADR-0001 D5): the input,
 * the output with its backend and tier, the quality, the score with its words, the target and how
 * the search went, and the time. The dimensions are in the corner labels of D2, not here.
 */
export function detailsOf(source: { name: string; size: number }, { output, file, seconds }: Searched): Detail[] {
  const { inputFormat, content, format, backend, tier, lossless, quality, score, target } = output;
  const details: Detail[] = [
    {
      term: 'input',
      said: `${source.name}, ${bytes(source.size)}, ${inputFormat ?? 'drawn by the browser'}, ${content}`,
    },
    { term: 'output', said: `${file.name}, ${bytes(file.size)}, ${format} by ${backend} (${tier})` },
    { term: 'quality', said: lossless ? 'lossless' : String(quality ?? 'unstated') },
  ];
  if (score !== undefined) details.push({ term: 'score', said: `${score.toFixed(1)}, ${words(score)}` });
  if (target !== undefined && !lossless) details.push({ term: 'target', said: `${target}, ${searched(output)}` });
  details.push({ term: 'time', said: `${seconds.toFixed(1)} s` });
  return details;
}

/** The record the package returned, as it would print it, without the bytes: for a bug report. */
export function recordOf(output: Output) {
  return JSON.stringify(output, (key: string, value: unknown) => (key === 'bytes' ? undefined : value), 2);
}
