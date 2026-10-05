import { useState } from 'react';

import { useObjectUrl } from '@/shared/lib/object-url';

import { useSearch, useSearchRef } from '../model/context';
import { CornerLabel } from './corner-label';

declare module 'react' {
  // State reaches the stylesheet as custom properties (ADR-0002 D3), which React's types leave out.
  interface CSSProperties {
    [property: `--${string}`]: string | undefined;
  }
}

/** The image as it was dropped and as it was encoded, in one cell, split at the handle. */
export function Comparison() {
  const search = useSearchRef();
  const image = useSearch((snapshot) => snapshot.context.image);
  const preview = useSearch((snapshot) => snapshot.context.preview);
  const decoded = useSearch((snapshot) => snapshot.context.decoded);
  const result = useSearch((snapshot) => snapshot.context.result);
  const [split, setSplit] = useState(50);

  // an image the browser cannot show itself, a TIFF say, is shown as the worker decoded it
  const before = useObjectUrl<HTMLImageElement>(preview ?? image?.blob ?? null, 'src');
  const after = useObjectUrl<HTMLImageElement>(result?.file ?? null, 'src');

  const output = result && { width: result.output.outputWidth, height: result.output.outputHeight };
  // the size of the output once there is one, of the input until then
  const size = output ?? decoded;
  const properties = {
    '--split': `${split}%`,
    '--width': size ? `${size.width}px` : undefined,
    '--ratio': size ? `${size.width} / ${size.height}` : undefined,
  };

  // Two pictures in one cell, the second clipped at the handle. The size is the image's, once it is
  // known. The labels sit in the corners of the row, so an image narrower than the two still shows.
  return (
    <div className="relative min-h-10">
      <div
        className="checkerboard mx-auto grid aspect-(--ratio,auto) w-(--width,auto) max-w-full *:col-start-1 *:row-start-1"
        style={properties}
      >
        <img
          ref={before}
          className="size-full"
          alt="As it was dropped"
          onError={() => search.send({ type: 'unshowable' })}
        />
        <img
          ref={after}
          className="size-full [clip-path:inset(0_0_0_var(--split,50%))]"
          alt="As sqzer encoded it"
          hidden={!result}
        />
        <input
          type="range"
          className="m-0 w-full self-end accent-foreground opacity-85"
          min={0}
          max={100}
          value={split}
          onChange={(event) => setSplit(event.target.valueAsNumber)}
          aria-label="Before on the left, after on the right"
        />
      </div>
      {decoded && <CornerLabel side="before" name="Before" size={decoded} />}
      {output && <CornerLabel side="after" name="After" size={output} />}
    </div>
  );
}
