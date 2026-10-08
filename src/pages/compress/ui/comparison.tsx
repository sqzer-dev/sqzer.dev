import { cn } from 'cn';
import { useState, type ReactNode, type SyntheticEvent } from 'react';

import { useObjectUrl } from '@/shared/lib/object-url';

import { useSearch, useSearchRef } from '../model/context';
import type { Picked } from '../model/picked';
import { CornerLabel } from './corner-label';
import { SplitHandle } from './split-handle';

declare module 'react' {
  // State reaches the stylesheet as custom properties (ADR-0002 D3), which React's types leave out.
  interface CSSProperties {
    [property: `--${string}`]: string | undefined;
  }
}

// The picture is as large as the screen lets it be, and never larger than the input's own pixels.
const FIT = 'w-[min(100cqw,calc(100cqh*var(--aspect,1)),var(--width,100cqw))]';

/**
 * The image as it was dropped and as it was encoded, over the whole screen (ADR-0001 D2): two layers
 * the size of the screen, each with the picture in its middle, the second clipped at the line. Both
 * pictures take the box of the input, as on Squoosh: a resized output is drawn into it, so the two
 * sides are scaled the same way and line up, where a box of the output's size had the browser scale
 * the input into it and the two a pixel apart. The
 * line runs the height of the screen and moves across all of it, as on Squoosh, so the split is a
 * share of the screen, not of the picture. `flat` puts the page's own background under a transparent
 * image where the checkerboard was, so the picture's bounds vanish into the page. Nothing on the
 * screen is selectable: a drag of the handle would otherwise select the pictures and the labels on
 * its way. An image nobody could decode shows nothing, not the alt text of an empty `<img>`.
 *
 * Each side shows once the browser has loaded it, not before: the input's box is sized from the
 * browser's own load until the worker has decoded it, so a small image after a large one does not
 * start at the screen's width, and the after side waits for the first encode of an image to load,
 * so nothing flashes where it will be. The encodes after that replace it in place: the `<img>`
 * keeps the last one until the next has loaded, as Squoosh does, instead of blinking.
 */
export function Comparison({ flat }: { flat: boolean }) {
  const search = useSearchRef();
  const image = useSearch((snapshot) => snapshot.context.image);
  const preview = useSearch((snapshot) => snapshot.context.preview);
  const decoded = useSearch((snapshot) => snapshot.context.decoded);
  const result = useSearch((snapshot) => snapshot.context.result);
  const unshowable = useSearch((snapshot) => snapshot.context.unshowable);
  const [split, setSplit] = useState(50);

  // an image the browser cannot show itself, a TIFF say, is shown as the worker decoded it
  const input = preview ?? image?.blob ?? null;
  const before = useObjectUrl<HTMLImageElement>(input, 'src');
  const after = useObjectUrl<HTMLImageElement>(result?.file ?? null, 'src');
  const [loadedBefore, loadBefore] = useLoaded(input);
  // the image an encode has loaded for, which the encodes after it replace in place
  const [afterOf, setAfterOf] = useState<Picked | null>(null);
  const afterShown = result !== null && image !== null && afterOf === image;

  const output = result && { width: result.output.outputWidth, height: result.output.outputHeight };
  // the size of the input: as the worker decoded it, or as the browser loaded it before that. A vector
  // has no size of its own until it is drawn.
  const size = decoded ?? (image?.vector === false ? loadedBefore : null);
  const properties = drawn(split, size);
  // the same ground under both pictures, so a transparent area of the one shows nothing of the other.
  // Each `<img>` is pinned to the box's edges and keeps its own aspect inside them, as on Squoosh: a
  // resized output's height is rounded, so stretched into the input's box it would be a pixel off
  // the input, where contained it is scaled evenly and at most half a pixel of ground shows at an edge.
  const picture = cn('relative aspect-(--aspect,auto)', FIT, flat ? 'bg-background' : 'checkerboard');

  return (
    <div className="absolute inset-0 select-none [container-type:size]" style={properties}>
      <Side picture={picture} hidden={size === null || (unshowable && preview === null)}>
        <img
          ref={before}
          className="absolute inset-0 size-full object-contain"
          alt="As it was dropped"
          onLoad={loadBefore}
          onError={() => search.send({ type: 'unshowable' })}
        />
      </Side>
      <Side picture={picture} after hidden={!afterShown}>
        <img
          ref={after}
          className="absolute inset-0 size-full object-contain"
          alt="As sqzer encoded it"
          onLoad={() => {
            if (result) setAfterOf(image);
          }}
        />
      </Side>
      {afterShown && <SplitHandle value={split} onChange={setSplit} />}
      {decoded && <CornerLabel side="before" name="Before" size={decoded} />}
      {output && <CornerLabel side="after" name="After" size={output} />}
    </div>
  );
}

type Size = { width: number; height: number };

/** What the stylesheet draws from: where the line stands, and the picture's size once it is known. */
function drawn(split: number, size: Size | null) {
  return {
    '--split': `${split}%`,
    '--width': size ? `${size.width}px` : undefined,
    '--aspect': size ? String(size.width / size.height) : undefined,
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
      className={cn('absolute inset-0 grid place-items-center', after && '[clip-path:inset(0_0_0_var(--split,50%))]')}
      data-slot={after ? 'after' : 'before'}
      hidden={hidden}
    >
      <div className={picture}>{children}</div>
    </div>
  );
}

type Loaded = { of: Blob; width: number; height: number };

/**
 * The size of `blob` as the `<img>` it is shown in has loaded it, and the handler for that load.
 * Null until then, and null again once `blob` is another: a size the browser reported for the
 * blob before is not this one's.
 */
function useLoaded(blob: Blob | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const onLoad = ({ currentTarget }: SyntheticEvent<HTMLImageElement>) => {
    if (blob) setLoaded({ of: blob, width: currentTarget.naturalWidth, height: currentTarget.naturalHeight });
  };
  return [loaded?.of === blob ? loaded : null, onLoad] as const;
}
