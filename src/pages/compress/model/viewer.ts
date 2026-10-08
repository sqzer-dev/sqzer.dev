import { useState, type RefObject, type SyntheticEvent } from 'react';

import { useSize } from '../lib/size';
import { changed, fitted, overflows, stepped, type Change, type Frame, type Size, type View } from '../lib/view';
import { useSearch } from './context';
import type { Picked } from './picked';

type Loaded = { of: Blob; width: number; height: number };

/** The reader's own zoom and pan, and the image it is of: another image starts fitted. */
type Zoomed = { of: Picked | null; view: View | null };

export type Viewer = {
  /** What the before side shows: the worker's preview, or the file itself. */
  input: Blob | null;
  /** The picture's size, once it is known. */
  picture: Size | null;
  /** Where the picture stands, once the screen and the picture are measured. */
  view: View | null;
  /** The picture reaches past the screen, so a drag has somewhere to take it. */
  pannable: boolean;
  /** What the before side's `<img>` reports on load: the picture's size until the worker has decoded it. */
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  change: (change: Change) => void;
  zoom: (step: 'in' | 'out' | 'fit') => void;
};

/**
 * Where the picture stands on the screen (ADR-0001 D2): fitted to it until the reader zooms or pans,
 * then as the reader left it, for as long as the image is on the page. Both sides of the comparison
 * share it, so they zoom and pan together, as on Squoosh. `screen` is the box the comparison fills,
 * measured here.
 */
export function useViewer(screen: RefObject<Element | null>): Viewer {
  const image = useSearch((snapshot) => snapshot.context.image);
  const preview = useSearch((snapshot) => snapshot.context.preview);
  const decoded = useSearch((snapshot) => snapshot.context.decoded);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [zoomed, setZoomed] = useState<Zoomed>({ of: null, view: null });
  const box = useSize(screen);

  // an image the browser cannot show itself, a TIFF say, is shown as the worker decoded it
  const input = preview ?? image?.blob ?? null;
  // the size of the input: as the worker decoded it, or as the browser loaded it before that. A vector
  // has no size of its own until it is drawn.
  const picture = decoded ?? (image?.vector === false && loaded?.of === input ? loaded : null);
  const frame: Frame | null =
    box && picture ? { screen: box, picture: { width: picture.width, height: picture.height } } : null;
  const view = frame ? ((zoomed.of === image ? zoomed.view : null) ?? fitted(frame)) : null;

  // from what the view is at the moment of the update: a run of moves between two renders adds up
  const update = (next: (current: View, measured: Frame) => View) => {
    if (!frame) return;
    setZoomed((was) => ({ of: image, view: next((was.of === image ? was.view : null) ?? fitted(frame), frame) }));
  };

  return {
    input,
    picture: frame?.picture ?? null,
    view,
    pannable: frame !== null && view !== null && overflows(view, frame),
    onLoad: ({ currentTarget }) => {
      if (input) setLoaded({ of: input, width: currentTarget.naturalWidth, height: currentTarget.naturalHeight });
    },
    change: (change) => {
      update((current, measured) => changed(current, measured, change));
    },
    zoom: (step) => {
      update((current, measured) => (step === 'fit' ? fitted(measured) : stepped(current, measured, step)));
    },
  };
}
