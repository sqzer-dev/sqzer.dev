import { afterEach, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { BASE_RATIO, useDevicePixelRatio } from './device-pixel-ratio';

/** A browser whose zoom the test sets: the ratio, and the one media query that says when it changed. */
function zoomable() {
  const listeners = new Set<() => void>();
  const queries: string[] = [];
  const query = vi.fn((media: string) => {
    queries.push(media);
    return {
      media,
      matches: true,
      addEventListener: (_: 'change', listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_: 'change', listener: () => void) => {
        listeners.delete(listener);
      },
    };
  });
  vi.stubGlobal('matchMedia', query);
  const zoom = (ratio: number) => {
    Object.defineProperty(window, 'devicePixelRatio', { value: ratio, configurable: true });
    for (const listener of listeners) listener();
  };
  return { zoom, queries, listeners };
}

afterEach(() => {
  vi.unstubAllGlobals();
  // the property that shadowed the browser's own
  Reflect.deleteProperty(window, 'devicePixelRatio');
});

test("the ratio follows the browser's zoom, through a query for the ratio of the moment", async () => {
  const { zoom, queries, listeners } = zoomable();
  const { result, unmount } = await renderHook(() => useDevicePixelRatio());
  expect(result.current).toBe(BASE_RATIO);
  expect(queries.at(-1)).toBe(`(resolution: ${BASE_RATIO}dppx)`);

  zoom(BASE_RATIO * 1.25);
  await vi.waitFor(() => {
    expect(result.current).toBe(BASE_RATIO * 1.25);
  });
  // the query is for the new ratio now, and the old one is no longer listened to
  expect(queries.at(-1)).toBe(`(resolution: ${BASE_RATIO * 1.25}dppx)`);
  expect(listeners.size).toBe(1);

  await unmount();
  expect(listeners.size).toBe(0);
});
