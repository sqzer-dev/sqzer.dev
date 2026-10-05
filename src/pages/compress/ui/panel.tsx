import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/shared/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';

type PanelProps = {
  title: string;
  /** Where the panel floats. */
  className?: string;
  children: ReactNode;
};

/**
 * A glass panel floating over the image (ADR-0001 D2). Its title collapses it, and what was typed
 * into a collapsed panel stays: its content is hidden, not unmounted.
 */
export function Panel({ title, className, children }: PanelProps) {
  return (
    <Collapsible
      defaultOpen
      render={<Card size="sm" className={cn('absolute max-h-[calc(100dvh-5rem)] w-72', className)} />}
    >
      <h2 className="px-(--card-spacing)">
        <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {title}
          <ChevronDownIcon className="size-4 transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent keepMounted render={<CardContent className="overflow-y-auto" />}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
