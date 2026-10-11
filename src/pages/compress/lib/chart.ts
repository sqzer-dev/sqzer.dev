// The chart of the search (ADR-0001 D4): the score across and the quality up, each trial a point
// and consecutive trials joined, over plain rules every twenty points of quality, with no ticks and
// no background. The target is one labelled rule. The runs before stay behind as subtle lines. The
// chart comes from the numbers and draws nothing that did not happen. Arithmetic only.
import type { Trial } from '@/shared/api';

import { TARGET } from './score';
import type { Point, Size } from './view';

export type Chart = {
  /** The rules, from the quality of 0 at the bottom up, one every twenty points. */
  rules: number[];
  /** Where the target stands across, once a score is searched for. */
  target: number | null;
  /** The runs before, each as the `d` of a path. */
  previous: string[];
  /** The running or newest search: its path, and its points. */
  current: { path: string; points: Point[] };
  /** The score at the left edge: the slider's lowest, or a lower ten a trial fell under. */
  low: number;
};

const RULE_STEP = 20;
/** Room above the top rule for the target's label. */
export const TOP = 14;
/** Room at each side for a point's radius. */
export const SIDE = 4;

/** The ten under the lowest score of `trials`, or the slider's lowest, whichever is lower. */
function lowest(trials: Trial[]) {
  const scores = trials.map((trial) => trial.score);
  return Math.min(TARGET.min, Math.floor(Math.min(...scores) / 10) * 10);
}

/** A number as an attribute says it: short, and the same in every browser. */
const at = (n: number) => String(Math.round(n * 10) / 10);

/** The chart of `current` over `previous`, drawn in a box of `size`. */
export function chart(current: Trial[], previous: Trial[][], target: number | null, size: Size): Chart {
  const low = lowest([...current, ...previous.flat()]);
  const bottom = size.height - 1;
  const x = (score: number) => SIDE + ((Math.min(score, 100) - low) / (100 - low)) * (size.width - 2 * SIDE);
  const y = (quality: number) => bottom - (Math.min(Math.max(quality, 0), 100) / 100) * (bottom - TOP);
  const point = (trial: Trial): Point => ({ x: x(trial.score), y: y(trial.quality) });
  const path = (trials: Trial[]) =>
    trials.map((trial, index) => `${index === 0 ? 'M' : 'L'}${at(x(trial.score))} ${at(y(trial.quality))}`).join(' ');
  const rules = [];
  for (let quality = 0; quality <= 100; quality += RULE_STEP) rules.push(Math.round(y(quality)) + 0.5);
  return {
    rules,
    target: target === null ? null : x(target),
    previous: previous.map((run) => path(run)),
    current: { path: path(current), points: current.map((trial) => point(trial)) },
    low,
  };
}
