import { useRef } from 'react';

import { chart, SIDE, TOP } from '../lib/chart';
import { useSize } from '../lib/size';
import type { Size } from '../lib/view';
import { useSearch } from '../model/context';
import { currentTarget, currentTrials } from '../model/run';

/** Nearer the right edge than this, the target's label stands to the left of its rule. */
const LABEL_ROOM = 64;

type TargetRuleProps = { x: number; score: number | null; size: Size };

/** The target as one labelled rule, across the quality, its label to the left of it near the right edge. */
function TargetRule({ x, score, size }: TargetRuleProps) {
  const left = x > size.width - LABEL_ROOM;
  return (
    <>
      <line x1={x} x2={x} y1={TOP} y2={size.height - 1} className="stroke-foreground/50" />
      <text
        x={x + (left ? -SIDE : SIDE)}
        y={TOP - 4}
        textAnchor={left ? 'end' : 'start'}
        className="fill-muted-foreground font-mono text-[0.625rem]"
      >
        target {score}
      </text>
    </>
  );
}

/**
 * The search drawn (ADR-0001 D4): the score across, the quality up, the trials of the running or
 * newest search as points joined in their order, over rules every twenty points of quality and the
 * target as one labelled rule. The runs before stay behind as subtle lines, for as long as the tab.
 * Nothing of it is announced: the list next to it carries the numbers. Shown once a score is
 * searched for, so the target's rule stands while the first trial is on its way. The box it is
 * measured in stays mounted, hidden, while there is nothing to draw: `useSize` watches the element
 * it finds at mount.
 */
export function SearchChart() {
  const trials = useSearch(currentTrials);
  const target = useSearch(currentTarget);
  const runs = useSearch((snapshot) => snapshot.context.runs);
  const box = useRef<HTMLDivElement>(null);
  const size = useSize(box);

  const shown = target !== null || trials.length > 0;
  const drawn = shown && size && size.width > 0 ? chart(trials, runs, target, size) : null;
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
          {drawn.target !== null && <TargetRule x={drawn.target} score={target} size={size} />}
          {drawn.previous.map(({ path, lone }, index) => (
            // a run is never edited, so its place is its name
            // oxlint-disable-next-line react/no-array-index-key
            <g key={index} className="fill-muted-foreground/40 stroke-muted-foreground/40">
              <path d={path} className="fill-none" />
              {lone && <circle cx={lone.x} cy={lone.y} r={1.5} className="stroke-none" />}
            </g>
          ))}
          <path
            d={drawn.current.path}
            strokeWidth={1.5}
            strokeLinejoin="round"
            className="fill-none stroke-foreground"
          />
          {drawn.current.points.map(({ x, y }, index) => (
            // oxlint-disable-next-line react/no-array-index-key
            <circle key={index} cx={x} cy={y} r={2.5} className="fill-foreground" />
          ))}
        </svg>
      )}
    </div>
  );
}
