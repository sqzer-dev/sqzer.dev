import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/shared/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import type { Chip } from '../lib/chips';

/**
 * How many chips of `row` fit on its first line, with the `+N` chip after them when not all do.
 * Every chip is laid out, the ones past the line invisible, so each has its width to measure.
 * The row has no padding, so its `clientWidth` is the room the chips have.
 */
function fitting(row: HTMLElement) {
  const widths = [...row.querySelectorAll('[data-chip]')].map((chip) => chip.getBoundingClientRect().width);
  const room = row.clientWidth;
  // the browser says the gap in px
  const gap = Number(getComputedStyle(row).columnGap.replace('px', '')) || 0;
  let used = 0;
  let count = 0;
  for (const width of widths) {
    const next = used + (count > 0 ? gap : 0) + width;
    if (next > room) break;
    used = next;
    count += 1;
  }
  if (count === widths.length) return count;
  const more = row.querySelector('[data-more]')?.getBoundingClientRect().width ?? 0;
  while (count > 0 && used + gap + more > room) {
    count -= 1;
    used -= (widths[count] ?? 0) + (count > 0 ? gap : 0);
  }
  return count;
}

type ChipItemProps = {
  chip: Chip;
  /** Past the first line of a collapsed row: laid out for its width, and nothing else. */
  shown: boolean;
};

/** One chip: its word, with its full meaning as its tooltip and its name. */
function ChipItem({ chip: { word, meaning }, shown }: ChipItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        data-chip=""
        inert={!shown}
        className={cn('text-foreground', !shown && 'invisible')}
        render={<Badge variant="outline" render={<button type="button" aria-label={meaning} />} />}
      >
        {word}
      </TooltipTrigger>
      <TooltipContent>{meaning}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The chips of the result (ADR-0001 D5), on one line: the ones that fit, and the rest behind a
 * last chip, `+3`, that expands them. The row is measured, not guessed: a resize of what holds it
 * counts again. The `+N` chip keeps one width, so the count it makes room for is never off by its
 * own digits.
 */
export function Chips({ chips }: { chips: Chip[] }) {
  const row = useRef<HTMLDivElement>(null);
  // how many fit on the first line, or null until the row is measured, when all are shown
  const [fit, setFit] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const element = row.current;
    // a new set of chips is measured anew: the observer tells of the row as soon as it watches it
    if (!element || expanded || chips.length === 0) return;
    const observer = new ResizeObserver(() => {
      setFit(fitting(element));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [chips, expanded]);

  if (chips.length === 0) return null;
  const shown = expanded || fit === null ? chips.length : fit;
  const hidden = chips.length - shown;
  return (
    // the clip is one line of chips, with room for a focus ring inside it; the row measured is the one without padding
    <div className={cn('-m-1 p-1', !expanded && 'max-h-7 overflow-hidden')}>
      <div ref={row} className="flex flex-wrap gap-1">
        {chips.slice(0, shown).map((chip) => (
          <ChipItem key={chip.word} chip={chip} shown />
        ))}
        {!expanded && (
          <Badge
            variant="outline"
            data-more=""
            inert={hidden === 0}
            className={cn('min-w-8 text-foreground', hidden === 0 && 'invisible')}
            render={
              <button
                type="button"
                aria-label={`${hidden} more`}
                onClick={() => {
                  setExpanded(true);
                }}
              />
            }
          >
            +{hidden}
          </Badge>
        )}
        {chips.slice(shown).map((chip) => (
          <ChipItem key={chip.word} chip={chip} shown={false} />
        ))}
      </div>
    </div>
  );
}
