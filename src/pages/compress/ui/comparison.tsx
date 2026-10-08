import { cn } from 'cn';
import { useRef, useState, type ReactNode } from 'react';

import { useObjectUrl } from '@/shared/lib/object-url';

import { useGestures } from '../lib/gestures';
import type { Size, View } from '../lib/view';
import { useSearch, useSearchRef } from '../model/context';
import type { Picked } from '../model/picked';
import type { Viewer } from '../model/viewer';
import { CornerLabel } from './corner-label';
import { SplitHandle } from './split-handle';

declare module 'react' {
  // State reaches the stylesheet as custom properties (ADR-0002 D3), which React's types leave out.
  interface CSSProperties {
    [property: `--${string}`]: string | undefined;
  }
}

type ComparisonProps = {
  /** A plain colour is under the image, not the checkerboard. */
  flat: boolean;
  /** Where the picture stands on the screen, shared with the view bar. */
  viewer: Viewer;
};

/**
 * The image as it was dropped and as it was encoded, over the whole screen (ADR-0001 D2): two layers
 * the size of the screen, each with the picture in its middle, the second clipped at the line. Both
 * pictures take the box of the input, as on Squoosh: a resized output is drawn into it, so the two
 * sides are scaled the same way and line up. The box is the input's own pixels, and the viewer's
 * scale and offset move it, so both sides zoom and pan together. At 100 % and above the pictures
 * are drawn pixelated, so the artifacts the score is about are what the reader sees. The line runs
 * the height of the screen and moves across all of it, so the split is a share of the screen, not
 * of the picture. `flat` puts the page's own background under a transparent image where the
 * checkerboard was. Nothing on the screen is selectable: a drag would otherwise select the pictures
 * and the labels on its way. An image nobody could decode shows nothing, not the alt text of an
 * empty `<img>`.
 *
 * Each side shows once the browser has loaded it, not before, and the after side waits for the
 * first encode of an image to load, so nothing flashes where it will be. The encodes after that
 * replace it in place: the `<img>` keeps the last one until the next has loaded, as Squoosh does.
 */
export function Comparison({ flat, viewer }: ComparisonProps) {
  const search = useSearchRef();
  const image = useSearch((snapshot) => snapshot.context.image);
  const preview = useSearch((snapshot) => snapshot.context.preview);
  const decoded = useSearch((snapshot) => snapshot.context.decoded);
  const result = useSearch((snapshot) => snapshot.context.result);
  const unshowable = useSearch((snapshot) => snapshot.context.unshowable);
  const [split, setSplit] = useState(50);
  const root = useRef<HTMLDivElement>(null);
  useGestures(root, { onChange: viewer.change, onStep: viewer.zoom });

  const before = useObjectUrl<HTMLImageElement>(viewer.input, 'src');
  const [after, afterShown, afterLoaded] = useAfterSide(result?.file ?? null, image);

  const output = result && { width: result.output.outputWidth, height: result.output.outputHeight };
  const properties = drawn(split, viewer.picture, viewer.view);
  // the same ground under both pictures, so a transparent area of the one shows nothing of the other.
  // Each `<img>` is pinned to the box's edges and keeps its own aspect inside them, as on Squoosh: a
  // resized output's height is rounded, so stretched into the input's box it would be a pixel off
  // the input, where contained it is scaled evenly and at most half a pixel of ground shows at an edge.
  // The box's centre is pinned to the screen's, not centred by a grid: a box larger than the screen
  // would make the grid's track larger too, and be centred in that, off to the bottom right.
  const picture = cn(
    'absolute top-1/2 left-1/2 w-(--width) aspect-(--aspect,auto) translate-x-[calc(var(--x)-50%)] translate-y-[calc(var(--y)-50%)] scale-(--scale)',
    flat ? 'bg-background' : 'checkerboard',
  );
  const img = 'absolute inset-0 size-full object-contain in-data-pixelated:[image-rendering:pixelated]';

  return (
    // A region with keys of its own: the arrows pan, plus and minus zoom (ADR-0001 D9). It is a stacking
    // context of its own, so the handle, which Base UI raises, stays under the panels. The pictures are not
    // draggable: a drag over them pans, and does not pick the file up.
    <div
      ref={root}
      role="application"
      aria-label="Before and after"
      tabIndex={0}
      className="absolute inset-0 isolate cursor-grab touch-none overflow-hidden outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      style={properties}
      data-pixelated={viewer.view !== null && viewer.view.scale >= 1 ? '' : undefined}
    >
      <Side picture={picture} hidden={viewer.view === null || (unshowable && preview === null)}>
        <img
          ref={before}
          className={img}
          draggable={false}
          alt="As it was dropped"
          onLoad={viewer.onLoad}
          onError={() => search.send({ type: 'unshowable' })}
        />
      </Side>
      <Side picture={picture} after hidden={!afterShown}>
        <img ref={after} className={img} draggable={false} alt="As sqzer encoded it" onLoad={afterLoaded} />
      </Side>
      {afterShown && <SplitHandle value={split} onChange={setSplit} />}
      {decoded && <CornerLabel side="before" name="Before" size={decoded} />}
      {output && <CornerLabel side="after" name="After" size={output} />}
    </div>
  );
}

/**
 * The after side's `<img>`, pointed at `file`: its ref, whether it is shown, and its load handler. It
 * is shown once an encode of `image` has loaded, and kept through the encodes after it, which
 * replace it in place.
 */
function useAfterSide(file: Blob | null, image: Picked | null) {
  const ref = useObjectUrl<HTMLImageElement>(file, 'src');
  // the image an encode has loaded for
  const [of, setOf] = useState<Picked | null>(null);
  const onLoad = () => {
    if (file) setOf(image);
  };
  return [ref, file !== null && image !== null && of === image, onLoad] as const;
}

/** What the stylesheet draws from: where the line stands, the picture's own size, and where it stands on the screen. */
function drawn(split: number, size: Size | null, view: View | null) {
  return {
    '--split': `${split}%`,
    '--width': size ? `${size.width}px` : undefined,
    '--aspect': size ? String(size.width / size.height) : undefined,
    '--scale': view ? String(view.scale) : undefined,
    '--x': view ? `${view.x}px` : undefined,
    '--y': view ? `${view.y}px` : undefined,
  };
}

type SideProps = {
  /** The classes of the picture's box. */
  picture: string;
  /** The side as encoded, clipped at the line. */
  after?: boolean;
  hidden: boolean;
  children: ReactNode;
};

/** One side, the size of the screen, with the picture in its middle. */
function Side({ picture, after = false, hidden, children }: SideProps) {
  return (
    <div
      className={cn('absolute inset-0', after && '[clip-path:inset(0_0_0_var(--split,50%))]')}
      data-slot={after ? 'after' : 'before'}
      hidden={hidden}
    >
      <div className={picture}>{children}</div>
    </div>
  );
}
