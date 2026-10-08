import { useEffect, useEffectEvent, type RefObject } from 'react';

import { pinched, type Change, type Point } from './view';

type Gestures = {
  /** A pan, a zoom, or both in one move, as the pointer, the wheel or a key asks. */
  onChange: (change: Change) => void;
  /** One step in or out, from a key. */
  onStep: (direction: 'in' | 'out') => void;
};

type Listen = (change: Change) => void;

/** How far an arrow key pans, in pixels. */
const KEY_PAN = 40;
/** The pixels in a line of the wheel, where a mouse reports lines. */
const LINE = 15;
/** How much wheel makes a zoom by e: a mouse's, and a trackpad's pinch, which comes as a wheel with `ctrlKey` and is finer. */
const WHEEL = { mouse: 300, pinch: 100 };

/** A point of the pointer as an offset from the centre of `element`. */
function fromCentre(element: Element, { clientX, clientY }: { clientX: number; clientY: number }): Point {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: clientX - left - width / 2, y: clientY - top - height / 2 };
}

/**
 * The pointers down on `element`, each at its last point: one drags, two pinch. A drag that started
 * on the element follows the pointer anywhere, over the panels too, so the window hears it out.
 */
function pointing(element: HTMLElement, change: Listen) {
  const pointers = new Map<number, Point>();
  const pair = (): [Point, Point] | null => {
    const [a, b] = [...pointers.values()];
    return a && b ? [a, b] : null;
  };
  const move = (event: PointerEvent) => {
    const was = pointers.get(event.pointerId);
    if (!was) return;
    // a mouse let go outside the window
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      up(event);
      return;
    }
    const pairWas = pair();
    const now = fromCentre(element, event);
    pointers.set(event.pointerId, now);
    const pairNow = pair();
    if (pairWas && pairNow) change(pinched(pairWas, pairNow));
    else change({ dx: now.x - was.x, dy: now.y - was.y });
  };
  const up = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) stop();
  };
  const stop = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
  const down = (event: PointerEvent) => {
    // the handle's own drag is the slider's, and a second button is the browser's
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('[data-slot=split]'))) return;
    if (pointers.size === 0) {
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }
    pointers.set(event.pointerId, fromCentre(element, event));
  };
  return { down, stop };
}

function wheeling(element: HTMLElement, change: Listen) {
  return (event: WheelEvent) => {
    event.preventDefault();
    const deltaY = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * LINE : event.deltaY;
    change({
      factor: Math.exp(-deltaY / (event.ctrlKey ? WHEEL.pinch : WHEEL.mouse)),
      origin: fromCentre(element, event),
    });
  };
}

/** The arrows pan, as they scroll, and plus and minus zoom in and out. The handle's keys are its own. */
function keying(element: HTMLElement, change: Listen, step: Gestures['onStep']) {
  const pans: Record<string, Change> = {
    ArrowLeft: { dx: KEY_PAN },
    ArrowRight: { dx: -KEY_PAN },
    ArrowUp: { dy: KEY_PAN },
    ArrowDown: { dy: -KEY_PAN },
  };
  const steps: Record<string, 'in' | 'out'> = { '+': 'in', '=': 'in', '-': 'out' };
  return (event: KeyboardEvent) => {
    if (event.target !== element) return;
    const pan = pans[event.key];
    const direction = steps[event.key];
    if (pan) change(pan);
    else if (direction) step(direction);
    else return;
    event.preventDefault();
  };
}

/**
 * The reader's hands on the comparison: a drag pans, two fingers pinch, the wheel zooms about the
 * pointer, and the keys do the same from the keyboard (ADR-0001 D9). The listeners are attached by
 * hand: React's wheel listener is passive, so it could not keep the page from scrolling.
 */
export function useGestures(ref: RefObject<HTMLElement | null>, { onChange, onStep }: Gestures) {
  const change = useEffectEvent(onChange);
  const step = useEffectEvent(onStep);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const pointer = pointing(element, change);
    const wheel = wheeling(element, change);
    const key = keying(element, change, step);
    element.addEventListener('pointerdown', pointer.down);
    element.addEventListener('wheel', wheel, { passive: false });
    element.addEventListener('keydown', key);
    return () => {
      element.removeEventListener('pointerdown', pointer.down);
      element.removeEventListener('wheel', wheel);
      element.removeEventListener('keydown', key);
      pointer.stop();
    };
  }, [ref]);
}
