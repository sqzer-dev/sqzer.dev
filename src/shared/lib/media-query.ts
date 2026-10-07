import { useSyncExternalStore } from 'react';

/** Whether `query` matches, kept in step with the browser. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (changed) => {
      const media = matchMedia(query);
      media.addEventListener('change', changed);
      return () => {
        media.removeEventListener('change', changed);
      };
    },
    () => matchMedia(query).matches,
  );
}
