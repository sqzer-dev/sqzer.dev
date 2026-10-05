import { cn } from 'cn';
import { useState } from 'react';

import { useObjectUrl } from '@/shared/lib/object-url';

import { useSearch, useSearchRef } from '../model/context';
import { CornerLabel } from './corner-label';
import { SplitHandle } from './split-handle';

declare module 'react' {
  // State reaches the stylesheet as custom properties (ADR-0002 D3), which React's types leave out.
  interface CSSProperties {
    [property: `--${string}`]: string | undefined;
  }
}

// The picture is as large as the screen lets it be, and never larger than its own pixels.
const FIT = 'w-[min(100cqw,calc(100cqh*var(--aspect,1)),var(--width,100cqw))]';

/**
 * The image as it was dropped and as it was encoded, over the whole screen (ADR-0001 D2): two
 * pictures in one cell, the second clipped at the handle. `flat` puts a plain colour under a
 * transparent image where the checkerboard was.
 */
export function Comparison({ flat }: { flat: boolean }) {
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
    '--aspect': size ? String(size.width / size.height) : undefined,
  };

  return (
    <div className="absolute inset-0 grid place-items-center [container-type:size]" style={properties}>
      <div
        className={cn(
          'grid aspect-(--aspect,auto) *:col-start-1 *:row-start-1',
          FIT,
          flat ? 'bg-card' : 'checkerboard',
        )}
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
        {result && <SplitHandle value={split} onChange={setSplit} />}
      </div>
      {decoded && <CornerLabel side="before" name="Before" size={decoded} />}
      {output && <CornerLabel side="after" name="After" size={output} />}
    </div>
  );
}
