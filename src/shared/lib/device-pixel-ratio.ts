import { useEffect, useState } from 'react';

/** The ratio when the page loaded: what a CSS pixel was then, which the picture holds to. */
export const BASE_RATIO = window.devicePixelRatio;

/**
 * The device pixel ratio, kept in step with the browser's zoom: a zoom in or out changes it, and a
 * page that reads it can hold something to its size on the device while the rest scales.
 */
export function useDevicePixelRatio() {
  const [ratio, setRatio] = useState(window.devicePixelRatio);
  useEffect(() => {
    // the query matches the ratio of the moment; a change of zoom stops it matching, once
    const query = matchMedia(`(resolution: ${ratio}dppx)`);
    const changed = () => {
      setRatio(window.devicePixelRatio);
    };
    query.addEventListener('change', changed);
    return () => {
      query.removeEventListener('change', changed);
    };
  }, [ratio]);
  return ratio;
}
