// The chart of the search (ADR-0001 D4): the trials across in their order, and one scale of 0 to
// 100 up, which holds the score and the quality as two curves, each trial a point on the score's,
// over plain horizontal rules every twenty points, with no ticks and no background. The target is
// one labelled rule. The runs before stay behind as subtle lines of their score. The chart comes
// from the numbers and draws nothing that did not happen. Arithmetic only.
import type { Trial } from '@/shared/api';

import type { Point, Size } from './view';

export type Chart = {
  /** The rules, from 0 at the bottom up, one every twenty points. */
  rules: number[];
  /** Where the target's rule stands, once a score is searched for. */
  target: number | null;
  /** The runs before, each its score as the `d` of a path, and as a lone point where it has one trial: a path of one point draws nothing. */
  previous: { path: string; lone: Point | null }[];
  /** The running or newest search: its score as a path and its points, and its quality as a path. */
  score: { path: string; points: Point[] };
  quality: { path: string };
  /** How many trials stand across: the longest run drawn, and room for two. */
  slots: number;
};

const RULE_STEP = 20;
/** Room above the top rule for the target's label, when the target is near 100. */
export const TOP = 14;
/** Room at each side for a point's radius. */
export const SIDE = 4;

/** A number as an attribute says it: short, and the same in every browser. */
const at = (n: number) => String(Math.round(n * 10) / 10);
const scores = (trials: Trial[]) => trials.map((trial) => trial.score);

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

/** The chart of `current` over `previous`, drawn in a box of `size`. */
export function chart(current: Trial[], previous: Trial[][], target: number | null, size: Size): Chart {
  const slots = Math.max(2, current.length, ...previous.map((run) => run.length));
  const bottom = size.height - 1;
  const x = (index: number) => SIDE + (index / (slots - 1)) * (size.width - 2 * SIDE);
  const y = (value: number) => bottom - (Math.min(Math.max(value, 0), 100) / 100) * (bottom - TOP);
  const path = (values: number[]) => curve(values.map((value, index) => ({ x: x(index), y: y(value) })));
  const rules = [];
  for (let value = 0; value <= 100; value += RULE_STEP) rules.push(Math.round(y(value)) + 0.5);
  return {
    rules,
    target: target === null ? null : Math.round(y(target)) + 0.5,
    previous: previous.map((run) => ({
      path: path(scores(run)),
      lone: run.length === 1 && run[0] ? { x: x(0), y: y(run[0].score) } : null,
    })),
    score: { path: path(scores(current)), points: current.map((trial, index) => ({ x: x(index), y: y(trial.score) })) },
    quality: { path: path(current.map((trial) => trial.quality)) },
    slots,
  };
}
