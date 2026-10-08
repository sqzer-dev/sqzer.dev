import { useEffect, useState, type RefObject } from 'react';

import type { Size } from './view';

/** The size of the element `ref` points at, kept in step with the browser's layout. Null until it is measured. */
export function useSize(ref: RefObject<Element | null>) {
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentBoxSize[0];
      if (box) setSize({ width: box.inlineSize, height: box.blockSize });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return size;
}
