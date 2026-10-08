import { useEffect, useRef } from 'react';

/**
 * A ref for an element whose `attribute` is to point at `blob`. The object URL is made with the
 * attribute and revoked when the blob is replaced or the element goes. The attribute itself stays
 * on the element until the next blob's URL takes its place: an `<img>` keeps showing what it had
 * while the next one loads, where an empty `src` would show nothing for that moment.
 */
export function useObjectUrl<T extends Element>(blob: Blob | null, attribute: 'src' | 'href') {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!blob) {
      element.removeAttribute(attribute);
      return;
    }
    const url = URL.createObjectURL(blob);
    element.setAttribute(attribute, url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob, attribute]);
  return ref;
}
