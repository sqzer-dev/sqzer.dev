import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/shared/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';

type PanelProps = {
  title: string;
  /** What stays in sight when the panel is collapsed, under its title. */
  pinned?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * A glass panel floating over the image (ADR-0001 D2). Its title collapses it, and what was typed
 * into a collapsed panel stays: its content is hidden, not unmounted. In a column of panels it
 * gives up height to the others and scrolls.
 */
export function Panel({ title, pinned, className, children }: PanelProps) {
  return (
    <Collapsible defaultOpen render={<Card size="sm" className={cn('min-h-0 w-72 shrink', className)} />}>
      <h2 className="px-(--card-spacing)">
        <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:py-2">
          {title}
          <ChevronDownIcon className="size-4 transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
      </h2>
      {pinned !== undefined && <div className="px-(--card-spacing) select-text">{pinned}</div>}
      {/* The hit area of a switch reaches 0.5rem below it, and a scroll container counts it: the padding
          makes room for it at the bottom, and the margin gives the room back. */}
      <CollapsibleContent
        keepMounted
        render={<CardContent className="-mb-2 min-h-0 overflow-y-auto pb-2 select-text" />}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
