// The chart of the search (ADR-0001 D4): the trials across in their order, each run spanning the
// width, and one scale of 0 to 100 up, which holds the score and the quality as two curves, each
// trial a point on the score's, over plain horizontal rules every twenty points, with no ticks and
// no background. The target is one labelled rule. The current run's sizes are a third curve on the
// same rules, each a share of the input's size, so the top rule is the input (ADR-0008 D2). The runs
// before stay behind as subtle lines, their score and their quality, so the searches of a tab
// weave into one pattern. The chart comes from the numbers and draws nothing that did not happen.
// Arithmetic only.
import type { Trial } from '@/shared/api';

import type { Point, Size } from './view';

/** What the chart draws of a trial of a run before: its quality and its score, on the one scale. */
type Plotted = Pick<Trial, 'quality' | 'score'>;

export type Chart = {
  /** The rules, from 0 at the bottom up, one every twenty points. */
  rules: number[];
  /**
   * Where the target's rule stands, once a score is searched for, and where its label goes: at the
   * end the current run's point is further from, and on the side of the rule that point is not.
   */
  target: { y: number; label: 'start' | 'end'; side: 'above' | 'below' } | null;
  /** The runs before, each its score and its quality as the `d` of a path, and the score as a lone point where it has one trial: a path of one point draws nothing. */
  previous: { path: string; quality: string; lone: Point | null }[];
  /** The running or newest search: its score as a path and its points, and its quality as a path. */
  score: { path: string; points: Point[] };
  quality: { path: string };
  /**
   * Its sizes as a path, each a share of the input's, a lone point where it has one trial, and the
   * last size's height with where its number goes: at the end its point stands, the right one or
   * the left one for a run of one trial, and over the line or under it, as `target` places its label.
   */
  bytes: { path: string; lone: Point | null; end: NonNullable<Chart['target']> | null };
};

const RULE_STEP = 20;
/** Room above the top rule for the target's label, when the target is near 100. */
export const TOP = 14;
/** Room at each side for a point's radius. */
export const SIDE = 4;

/** A number as an attribute says it: short, and the same in every browser. */
const at = (n: number) => String(Math.round(n * 10) / 10);
const scores = (trials: Plotted[]) => trials.map((trial) => trial.score);

/**
 * The slope a monotone cubic takes through an inner point: zero where the line turns, else the
 * gentler of its two sides, as Fritsch and Carlson have it and d3's `curveMonotoneX` draws it, so
 * the curve never climbs above or dips below the points it passes.
 */
function tangent(before: number, after: number) {
  if (before * after <= 0) return 0;
  return Math.sign(before) * Math.min(Math.abs(before), Math.abs(after), Math.abs(before + after) / 4);
}

/** The slope at an end, from the slope of its one segment and the tangent at the point after. */
const endTangent = (slope: number, next: number) => (3 * slope - next) / 2;

/**
 * The `d` of a path through `points`, in their order: a curve of cubic segments, monotone between
 * each pair of points, so the line bends and draws nothing that did not happen. Two points are a
 * straight line, and one point is a move that draws nothing.
 */
function curve(points: Point[]): string {
  const [first] = points;
  if (!first) return '';
  const move = `M${at(first.x)} ${at(first.y)}`;
  if (points.length === 1) return move;
  const slopes = points.slice(1).map((point, index) => {
    const previous = points[index] ?? point;
    return (point.y - previous.y) / (point.x - previous.x);
  });
  if (slopes.length === 1) return `${move} L${at(points[1]?.x ?? 0)} ${at(points[1]?.y ?? 0)}`;
  const tangents = slopes.map((slope, index) => (index === 0 ? 0 : tangent(slopes[index - 1] ?? 0, slope)));
  tangents.push(endTangent(slopes.at(-1) ?? 0, tangents.at(-1) ?? 0));
  tangents[0] = endTangent(slopes[0] ?? 0, tangents[1] ?? 0);
  const segments = points.slice(1).map((to, index) => {
    const from = points[index] ?? to;
    const dx = (to.x - from.x) / 3;
    const [t0, t1] = [tangents[index] ?? 0, tangents[index + 1] ?? 0];
    return `C${at(from.x + dx)} ${at(from.y + dx * t0)} ${at(to.x - dx)} ${at(to.y - dx * t1)} ${at(to.x)} ${at(to.y)}`;
  });
  return [move, ...segments].join(' ');
}

/** The height of a rule's label, which goes above where there is no room under. */
const LABEL = 12;

type Label = Pick<NonNullable<Chart['target']>, 'label' | 'side'>;
// in the order a tie falls back through
const PLACES: Label[] = [
  { label: 'end', side: 'above' },
  { label: 'start', side: 'above' },
  { label: 'end', side: 'below' },
  { label: 'start', side: 'below' },
];

/**
 * The target's rule at `y`, labelled where the current run keeps clear of it: of the ends and sides
 * of the rule, the one whose nearest point of the run, its score or its quality, is furthest from
 * the label's middle. A run hugging the rule from above at both ends still leaves the space under
 * it. The right end, above, with nothing drawn, and nothing below a rule at the bottom edge.
 */
function labelled(y: number, points: Record<Label['label'], number[]>, height: number): NonNullable<Chart['target']> {
  const middle = (side: Label['side']) => (side === 'above' ? y - LABEL / 2 : y + LABEL / 2);
  const clearance = ({ label, side }: Label) =>
    Math.min(...points[label].map((point) => Math.abs(point - middle(side))));
  let best: Label = { label: 'end', side: 'above' };
  for (const place of PLACES.filter((candidate) => candidate.side === 'above' || y + LABEL < height))
    if (clearance(place) > clearance(best)) best = place;
  return { y, ...best };
}

type Placed = NonNullable<Chart['target']>;

/**
 * Where the last size's number goes, at the ys of the size's line: over its last point, or under it
 * where the line comes down into the point, so the number does not sit on the line, unless the
 * point is at the bottom edge.
 */
function sizeEnd(ys: number[], height: number): Placed | null {
  const last = ys.at(-1);
  if (last === undefined) return null;
  const before = ys.at(-2);
  const side = before !== undefined && before < last && last + LABEL < height ? 'below' : 'above';
  return { y: Number(at(last)), label: ys.length === 1 ? 'start' : 'end', side };
}

/** The middle of a label set at a line, 4 px over it, or with its baseline 11 px under it. */
const middleOf = ({ y, side }: Placed) => (side === 'above' ? y - 4 - LABEL / 2 : y + 11 - LABEL / 2);

/** The points of a run at each end of the chart, as the ys of its lines there. */
function ends(ys: number[][]): Record<Label['label'], number[]> {
  return { start: ys[0] ?? [], end: ys.at(-1) ?? [] };
}

/** The chart of `current` over `previous`, drawn in a box of `size`, the sizes a share of `input` bytes. */
export function chart(
  current: Trial[],
  previous: Plotted[][],
  target: number | null,
  size: Size,
  input: number,
): Chart {
  const bottom = size.height - 1;
  // every run spans the width, its trials spread evenly along it
  const x = (index: number, of: number) => SIDE + (of > 1 ? index / (of - 1) : 0) * (size.width - 2 * SIDE);
  const y = (value: number) => bottom - (Math.min(Math.max(value, 0), 100) / 100) * (bottom - TOP);
  const path = (values: number[]) => curve(values.map((value, index) => ({ x: x(index, values.length), y: y(value) })));
  const rules = [];
  for (let value = 0; value <= 100; value += RULE_STEP) rules.push(Math.round(y(value)) + 0.5);
  // a size past the input's stops at the top rule, as a score past 100 would
  const shares = current.map((trial) => (trial.size / input) * 100);
  const sized = sizeEnd(
    shares.map((share) => y(share)),
    size.height,
  );
  return {
    rules,
    target:
      target === null
        ? null
        : labelled(
            Math.round(y(target)) + 0.5,
            // the size's line is kept clear of too, and its number at the last point
            ends(
              current.map((trial, index) => {
                const ys = [y(trial.score), y(trial.quality), y(shares[index] ?? 0)];
                return index === current.length - 1 && sized ? [...ys, middleOf(sized)] : ys;
              }),
            ),
            size.height,
          ),
    previous: previous.map((run) => ({
      path: path(scores(run)),
      quality: path(run.map((trial) => trial.quality)),
      lone: run.length === 1 && run[0] ? { x: x(0, 1), y: y(run[0].score) } : null,
    })),
    score: {
      path: path(scores(current)),
      points: current.map((trial, index) => ({ x: x(index, current.length), y: y(trial.score) })),
    },
    quality: { path: path(current.map((trial) => trial.quality)) },
    bytes: {
      path: path(shares),
      lone: shares.length === 1 && sized ? { x: x(0, 1), y: sized.y } : null,
      end: sized,
    },
  };
}
