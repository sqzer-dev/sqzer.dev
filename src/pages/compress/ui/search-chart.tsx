import { useRef } from 'react';

import { chart, type Chart } from '../lib/chart';
import { bytes } from '../lib/result';
import { useSize } from '../lib/size';
import { useSearch } from '../model/context';
import { currentTarget, currentTrials } from '../model/run';

type TargetRuleProps = NonNullable<Chart['target']> & { score: number | null; width: number };

/** The target as one labelled rule, across the trials, its label where the current run keeps clear. */
function TargetRule({ y, label, side, score, width }: TargetRuleProps) {
  return (
    <>
      <line x1={0} x2={width} y1={y} y2={y} className="stroke-foreground/50" />
      <text
        x={label === 'end' ? width : 0}
        y={side === 'above' ? y - 3 : y + 11}
        textAnchor={label}
        className="fill-muted-foreground font-mono text-[0.625rem]"
      >
        target {score}
      </text>
    </>
  );
}

type SizeLineProps = Chart['bytes'] & { last: number | undefined; width: number };

/** The sizes of the current run as a dotted line, a share of the input's, a lone point for one trial, and the last size's number at its end. */
function SizeLine({ path, lone, end, last, width }: SizeLineProps) {
  return (
    <>
      <path
        data-series="size"
        d={path}
        strokeDasharray="1 2"
        strokeWidth={1.25}
        strokeLinecap="round"
        className="fill-none stroke-foreground"
      />
      {lone && <circle cx={lone.x} cy={lone.y} r={1.25} className="fill-foreground" />}
      {end && last !== undefined && (
        <text
          x={end.label === 'end' ? width : 0}
          y={end.side === 'above' ? end.y - 4 : end.y + 11}
          textAnchor={end.label}
          className="fill-muted-foreground font-mono text-[0.625rem]"
        >
          {bytes(last)}
        </text>
      )}
    </>
  );
}

type EarlierRunProps = Chart['previous'][number] & { index: number };

/** A run before the current one: its score and its quality, subtle, and a lone point where it had one trial. */
function EarlierRun({ index, path, quality, lone }: EarlierRunProps) {
  return (
    <g data-run={index} className="fill-foreground/45 stroke-foreground/45">
      <path data-series="quality" d={quality} strokeDasharray="3 2" className="fill-none stroke-foreground/30" />
      <path data-series="score" d={path} className="fill-none" />
      {lone && <circle cx={lone.x} cy={lone.y} r={1.5} className="stroke-none" />}
    </g>
  );
}

/**
 * The search drawn (ADR-0001 D4): the trials of the running or newest search across, in their
 * order and spanning the width, and one scale of 0 to 100 up, with the score as a line of points
 * and the quality as a lighter line, over rules every twenty points and the target as one labelled
 * rule. The sizes are a dotted line on the same rules, as a share of the input's size, so the top
 * rule is the input and a line at the bottom is a file that came out small; the last size is
 * written over its end. The runs before stay behind as subtle lines, their score and their
 * quality, for as long as the tab: the searches of a tab weave into one pattern. Nothing of it is announced: the list next
 * to it carries the numbers. Shown once a score is searched for, so the target's rule stands while
 * the first trial is on its way. The box it is measured in stays mounted, hidden, while there is
 * nothing to draw: `useSize` watches the element it finds at mount.
 */
export function SearchChart() {
  const trials = useSearch(currentTrials);
  const target = useSearch(currentTarget);
  const runs = useSearch((snapshot) => snapshot.context.runs);
  const input = useSearch((snapshot) => snapshot.context.image?.bytes.byteLength ?? 0);
  const box = useRef<HTMLDivElement>(null);
  const size = useSize(box);

  const shown = target !== null || trials.length > 0;
  const drawn = shown && size && size.width > 0 && input > 0 ? chart(trials, runs, target, size, input) : null;
  return (
    <div ref={box} hidden={!shown} className="h-32 w-full">
      {drawn && size && (
        <svg
          data-slot="search-chart"
          aria-hidden="true"
          width={size.width}
          height={size.height}
          className="overflow-visible"
        >
          {drawn.rules.map((y) => (
            <line key={y} x1={0} x2={size.width} y1={y} y2={y} className="stroke-border" />
          ))}
          {drawn.target !== null && <TargetRule {...drawn.target} score={target} width={size.width} />}
          {drawn.previous.map((run, index) => (
            // a run is never edited, so its place is its name
            // oxlint-disable-next-line react/no-array-index-key
            <EarlierRun key={index} index={index} {...run} />
          ))}
          <path
            data-series="quality"
            d={drawn.quality.path}
            strokeDasharray="3 2"
            className="fill-none stroke-foreground/50"
          />
          <SizeLine {...drawn.bytes} last={trials.at(-1)?.size} width={size.width} />
          <path
            data-series="score"
            d={drawn.score.path}
            strokeWidth={1.5}
            strokeLinejoin="round"
            className="fill-none stroke-foreground"
          />
          {drawn.score.points.map(({ x, y }, index) => (
            // oxlint-disable-next-line react/no-array-index-key
            <circle key={index} cx={x} cy={y} r={2.5} className="fill-foreground" />
          ))}
        </svg>
      )}
    </div>
  );
}
