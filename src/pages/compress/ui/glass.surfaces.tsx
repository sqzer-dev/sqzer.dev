// The glass surfaces of the page, as `glass.test.tsx` measures them: each one the component the
// page uses, holding what a panel can hold. A new glass surface is added here (ADR-0003 D5).
import type { ComponentType } from 'react';

import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';

import { BottomExpander } from './bottom-expander';
import { CornerLabel } from './corner-label';
import { Panel } from './panel';
import { ViewBar } from './view-bar';

/** What a panel holds: body text, a chip, a slider and a field, here with the focus on it. */
function Content() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">The target was reached in 4 trials.</p>
      <p className="text-xs text-muted-foreground">70, high: barely noticeable side by side</p>
      <Badge variant="outline">lossless</Badge>
      <Slider defaultValue={[70]} aria-label="Target" />
      {/* oxlint-disable-next-line jsx-a11y/no-autofocus -- the focus ring is one of the lines measured */}
      <Input autoFocus aria-label="Width" />
    </div>
  );
}

function Floating() {
  return (
    <Panel title="Options" className="top-16 left-4">
      <Content />
    </Panel>
  );
}

function Expander() {
  return (
    <BottomExpander>
      <Content />
    </BottomExpander>
  );
}

// nobody presses anything on a surface that is only measured
const unheard = () => {};

function Bar() {
  return <ViewBar floating flat={false} onFlat={unheard} onPick={unheard} />;
}

function Label() {
  return <CornerLabel side="before" name="Before" size={{ width: 4032, height: 3024 }} />;
}

// The glass surfaces of the page (ADR-0003 D5), as the page builds them.
export const surfaces: Record<string, { Surface: ComponentType; selector: string }> = {
  'a panel': { Surface: Floating, selector: '[data-size]' },
  'the bottom expander': { Surface: Expander, selector: '[data-slot=drawer-popup]' },
  'the view bar': { Surface: Bar, selector: '[data-slot=view-bar]' },
  'a corner label': { Surface: Label, selector: 'span' },
};
