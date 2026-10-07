import { useState, type ReactNode } from 'react';

import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui/drawer';

// How much of the expander shows while the image has the screen, and how far it is pulled up.
const REST = '6rem';
const SNAPS = [REST, 0.85];

/**
 * The panels of a phone: one glass sheet at the bottom edge, pulled up over the image and let go
 * again (ADR-0001 D2). It never takes the image away from the reader: no backdrop, no focus trap.
 * And it never closes: what would close it, Escape or a swipe down, lets the image go again.
 */
export function BottomExpander({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<string | number>(REST);

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
      <DrawerContent>
        <DrawerTitle className="sr-only">Result and options</DrawerTitle>
        <div className="flex flex-col gap-6 overflow-y-auto p-4 pt-2">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
