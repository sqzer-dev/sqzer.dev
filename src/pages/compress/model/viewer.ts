import { useState, type RefObject, type SyntheticEvent } from 'react';

import { BASE_RATIO, useDevicePixelRatio } from '@/shared/lib/device-pixel-ratio';

import { useSize } from '../lib/size';
import { changed, fitted, stepped, type Change, type Frame, type Size, type View } from '../lib/view';
import { useSearch } from './context';
import type { Picked } from './picked';

type Loaded = { of: Blob; width: number; height: number };

/** The reader's own zoom and pan, and the image it is of: another image starts fitted. */
type Zoomed = { of: Picked | null; view: View | null };

export type Viewer = {
  /** What the before side shows: the worker's preview, or the file itself. */
  input: Blob | null;
  /** CSS pixels to one of the view's: under 1 once the browser is zoomed in, so the picture holds its size on the device. */
  css: number;
  /** The picture's size, once it is known. */
  picture: Size | null;
  /** Where the picture stands, once the screen and the picture are measured. */
  view: View | null;
  /** What the before side's `<img>` reports on load: the picture's size until the worker has decoded it. */
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  change: (change: Change) => void;
  /** A step in or out, the fit, or a scale to go to, about the screen's centre. */
  zoom: (to: 'in' | 'out' | 'fit' | number) => void;
};

/** The screen and the picture to hold a view against, once both are measured. The screen is in the view's pixels, not CSS ones. */
function framed(screen: Size | null, picture: Size | null, css: number): Frame | null {
  return screen && picture
    ? {
        screen: { width: screen.width / css, height: screen.height / css },
        picture: { width: picture.width, height: picture.height },
      }
    : null;
}

/**
 * Where the picture stands on the screen (ADR-0001 D2): fitted to it until the reader zooms or pans,
 * then as the reader left it, for as long as the image is on the page. Both sides of the comparison
 * share it, so they zoom and pan together, as on Squoosh. `screen` is the box the comparison fills,
 * measured here. The view is in the pixels of the moment the page loaded: a zoom of the browser
 * changes what a CSS pixel is, and the picture holds its size on the device while the rest scales
 * (ADR-0007 D8), so the screen and every move are brought into those pixels, and the comparison
 * takes the view back into CSS ones through `css`.
 */
export function useViewer(screen: RefObject<Element | null>): Viewer {
  const image = useSearch((snapshot) => snapshot.context.image);
  const preview = useSearch((snapshot) => snapshot.context.preview);
  const decoded = useSearch((snapshot) => snapshot.context.decoded);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [zoomed, setZoomed] = useState<Zoomed>({ of: null, view: null });
  const box = useSize(screen);
  const css = BASE_RATIO / useDevicePixelRatio();

  // an image the browser cannot show itself, a TIFF say, is shown as the worker decoded it
  const input = preview ?? image?.blob ?? null;
  // the size of the input: as the worker decoded it, or as the browser loaded it before that. A vector
  // has no size of its own until it is drawn.
  const picture = decoded ?? (image?.vector === false && loaded?.of === input ? loaded : null);
  const frame = framed(box, picture, css);
  const view = frame ? ((zoomed.of === image ? zoomed.view : null) ?? fitted(frame)) : null;

  // from what the view is at the moment of the update: a run of moves between two renders adds up. The
  // frame is measured again here, not taken from above: the view above changes with every pan, and a
  // function that changed with it would have the view bar and the panels drawn again on each move
  const update = (next: (current: View, measured: Frame) => View) => {
    const measured = framed(box, picture, css);
    if (!measured) return;
    setZoomed((was) => ({
      of: image,
      view: next((was.of === image ? was.view : null) ?? fitted(measured), measured),
    }));
  };

  return {
    input,
    css,
    picture,
    view,
    onLoad: ({ currentTarget }) => {
      if (input) setLoaded({ of: input, width: currentTarget.naturalWidth, height: currentTarget.naturalHeight });
    },
    change: ({ dx, dy, origin, ...rest }) => {
      // a move is in CSS pixels, from the pointer
      update((current, measured) =>
        changed(current, measured, {
          ...rest,
          ...(dx !== undefined && { dx: dx / css }),
          ...(dy !== undefined && { dy: dy / css }),
          ...(origin && { origin: { x: origin.x / css, y: origin.y / css } }),
        }),
      );
    },
    zoom: (to) => {
      update((current, measured) => {
        if (to === 'fit') return fitted(measured);
        if (typeof to === 'number') return changed(current, measured, { factor: to / current.scale });
        return stepped(current, measured, to);
      });
    },
  };
}
