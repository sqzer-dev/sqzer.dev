import { useEffect, useRef } from 'react';

/**
 * A ref for an element whose `attribute` is to point at `blob`. The object
 * URL is made and revoked together with the attribute, so no render ever
 * holds one that was revoked.
 */
export function useObjectUrl<T extends Element>(blob: Blob | null, attribute: 'src' | 'href') {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !blob) return;
    const url = URL.createObjectURL(blob);
    element.setAttribute(attribute, url);
    return () => {
      element.removeAttribute(attribute);
      URL.revokeObjectURL(url);
    };
  }, [blob, attribute]);
  return ref;
}
