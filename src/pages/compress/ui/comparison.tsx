import { useState } from 'react';

import { useObjectUrl } from '@/shared/lib/object-url';

import { useSearch, useSearchRef } from '../model/context';

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

  // the size of the output once there is one, of the input until then
  const size = result ? { width: result.output.outputWidth, height: result.output.outputHeight } : decoded;
  const properties = {
    '--split': `${split}%`,
    '--width': size ? `${size.width}px` : undefined,
    '--ratio': size ? `${size.width} / ${size.height}` : undefined,
  };

  return (
    <div id="compare" style={properties}>
      <img id="before" ref={before} alt="As it was dropped" onError={() => search.send({ type: 'unshowable' })} />
      <img id="after" ref={after} alt="As sqzer encoded it" hidden={!result} />
      <input
        id="split"
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(event) => setSplit(event.target.valueAsNumber)}
        aria-label="Before on the left, after on the right"
      />
    </div>
  );
}
