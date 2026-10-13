import { useState, type ReactNode } from 'react';

import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui/drawer';

// How much of the expander shows while the image has the screen, the view bar and the chips, and
// how far it is pulled up: a share of the screen, the rest of the sheet below its edge.
const REST = '7rem';
const TOP = 0.85;
const SNAPS = [REST, TOP];

type BottomExpanderProps = {
  /** Pulled up as this turns true: for an alert that has to be seen (ADR-0001 D6). */
  raise?: boolean;
  children: ReactNode;
};

/**
 * The panels of a phone: one glass sheet at the bottom edge, pulled up over the image and let go
 * again (ADR-0001 D2). It never takes the image away from the reader: no backdrop, no focus trap.
 * And it never closes: what would close it, Escape or a swipe down, lets the image go again. At
 * rest it shows what is at its top and scrolls nothing; pulled up, it scrolls, with room at the end
 * for the share of the sheet that stays below the screen's edge and for the browser's own bar
 * there, which the page runs under.
 */
export function BottomExpander({ raise = false, children }: BottomExpanderProps) {
  // up from the start for an alert that is there already, as when the first image fails at once
  const [snap, setSnap] = useState<string | number>(raise ? TOP : REST);
  // the turn of `raise` is what pulls it up: not every render while it holds
  const [raised, setRaised] = useState(raise);
  if (raise !== raised) {
    setRaised(raise);
    if (raise) setSnap(TOP);
  }

  return (
    <Drawer
      open
      modal={false}
      disablePointerDismissal
      showSwipeHandle
      snapPoints={SNAPS}
      snapPoint={snap}
      // a swipe down that would close it: Base UI asks for no snap point first, and takes a refusal
      onSnapPointChange={(next, details) => {
        if (next === null) details.cancel();
        setSnap(next ?? REST);
      }}
      // and Escape
      onOpenChange={(open, details) => {
        if (open) return;
        details.cancel();
        setSnap(REST);
      }}
    >
      <DrawerContent className="mb-[calc(--spacing(2)+env(safe-area-inset-bottom))]">
        <DrawerTitle className="sr-only">Result and options</DrawerTitle>
        {/* a column that scrolls squeezes what it holds: nothing here gives up its height */}
        <div
          className={`flex flex-col gap-6 p-4 pt-2 pb-[calc(15dvh+--spacing(4))] *:shrink-0 ${snap === REST ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
