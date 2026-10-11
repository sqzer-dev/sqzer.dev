import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';

type ExpanderProps = {
  /** What it opens, which is the button's name. */
  title: string;
  children: ReactNode;
};

/** A section that stays closed until opened: Resize, Advanced (ADR-0001 D3) and the details of the result (D5). */
export function Expander({ title, children }: ExpanderProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-1 rounded-sm text-xs/relaxed font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRightIcon className="size-3.5 transition-transform group-data-panel-open:rotate-90" /> {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
