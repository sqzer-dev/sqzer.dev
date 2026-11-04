import { useRef, useState, type ReactNode } from 'react';

import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui/drawer';

// How far the expander is pulled up: a share of the screen, the rest of the sheet below its edge.
const TOP = 0.85;
// What the sheet shows at rest, around what is above the fold: the swipe handle, the padding over
// it and a little under it, in px, so nothing below the fold peeks, then the browser's bar. The
// padding under the fold is `gap-6` less `--spacing(4)`, which its `pb` says too. Until the fold
// is measured.
const HANDLE_PX = 12;
const PADDING_PX = 8;
const REST_GUESS = '8rem';
// On the screen's edges, with no border or corner where they meet: the sheet is the bottom of the
// screen. `glass` sets its border after these in the stylesheet, so the two are important.
const SHEET = 'mx-0 mb-0 rounded-b-none border-x-0! border-b-0!';
// What is above the fold. Under it at rest are the padding and the bar: the gap to the rest grows
// past `gap-6` by what the bar is over `gap-6` less that padding, so nothing below the fold peeks.
const FOLD =
  'flex flex-col gap-6 pb-[max(0px,calc(env(safe-area-inset-bottom)---spacing(4)))] *:shrink-0 [--inset:env(safe-area-inset-bottom)]';

/**
 * The browser's own bar at the bottom edge, in px, which the sheet runs under: `--inset` on the
 * element is `env(safe-area-inset-bottom)`, which a snap point cannot say itself. Nothing on a
 * desktop, the home indicator and Safari's tab bar on an iPhone.
 */
function barBelow(element: Element) {
  const inset = getComputedStyle(element).getPropertyValue('--inset').trim();
  return (inset.endsWith('px') && Number(inset.slice(0, -2))) || 0;
}

/**
 * Where the sheet rests: around the element the ref is on, which is what is above the fold, and
 * above the browser's bar. The ref is a callback: the element is in the sheet's portal, which is
 * not there yet when an effect of the mount would look for it.
 */
function useRest() {
  const [rest, setRest] = useState<string | number>(REST_GUESS);
  const above = (element: HTMLDivElement | null) => {
    if (!element) return;
    let height = 0;
    const settle = () => {
      if (height > 0) setRest(HANDLE_PX + PADDING_PX + height + PADDING_PX + barBelow(element));
    };
    const observer = new ResizeObserver(([entry]) => {
      height = entry?.contentRect.height ?? 0;
      settle();
    });
    observer.observe(element);
    // the bar changes with the viewport: Safari's shrinks as the page is scrolled
    window.addEventListener('resize', settle);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', settle);
    };
  };
  return { rest, above };
}

type BottomExpanderProps = {
  /** Pulled up as this turns true: for an alert that has to be seen (ADR-0001 D6). */
  raise?: boolean;
  /** What shows while the image has the screen: the sheet rests at its height, measured. */
  fold: ReactNode;
  /** The rest, reached by pulling the sheet up. */
  children: ReactNode;
};

/**
 * The panels of a phone: one glass sheet on the bottom edge of the screen, the width of it, pulled
 * up over the image and let go again (ADR-0001 D2). It never takes the image away from the reader:
 * no backdrop, no focus trap. And it never closes: what would close it, Escape or a swipe down,
 * lets the image go again. At rest it shows what is above the fold, as tall as that is, over the
 * browser's own bar, which it runs under, and scrolls nothing, and it is back at its top each time
 * it comes to rest; pulled up, it scrolls, with room at the end for the share of the sheet that
 * stays below the screen's edge and for the bar.
 */
export function BottomExpander({ raise = false, fold, children }: BottomExpanderProps) {
  // up from the start for an alert that is there already, as when the first image fails at once
  const [snap, setSnap] = useState<'rest' | 'top'>(raise ? 'top' : 'rest');
  // the turn of `raise` is what pulls it up: not every render while it holds
  const [raised, setRaised] = useState(raise);
  if (raise !== raised) {
    setRaised(raise);
    if (raise) setSnap('top');
  }
  // where the sheet rests: around what is above the fold, which changes with the result
  const { rest, above } = useRest();
  const scroller = useRef<HTMLDivElement>(null);
  // what shows at rest is the top of the sheet, wherever it was scrolled to
  const toRest = () => {
    setSnap('rest');
    scroller.current?.scrollTo({ top: 0 });
  };

  return (
    <Drawer
      open
      modal={false}
      disablePointerDismissal
      showSwipeHandle
      snapPoints={[rest, TOP]}
      snapPoint={snap === 'rest' ? rest : TOP}
      // a swipe down that would close it: Base UI asks for no snap point first, and takes a refusal
      onSnapPointChange={(next, details) => {
        if (next === null) details.cancel();
        if (next === TOP) setSnap('top');
        else toRest();
      }}
      // and Escape
      onOpenChange={(open, details) => {
        if (open) return;
        details.cancel();
        toRest();
      }}
    >
      <DrawerContent className={SHEET}>
        <DrawerTitle className="sr-only">Result and options</DrawerTitle>
        {/* a column that scrolls squeezes what it holds: nothing here gives up its height */}
        <div
          ref={scroller}
          className={`flex flex-col gap-6 p-4 pt-2 pb-[calc(15dvh+--spacing(4)+env(safe-area-inset-bottom))] *:shrink-0 ${snap === 'rest' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          <div ref={above} className={FOLD}>
            {fold}
          </div>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
