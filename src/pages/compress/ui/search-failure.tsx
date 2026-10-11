import { XIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/ui/button';

import { explain } from '../lib/failure';
import { useSearch } from '../model/context';
import type { Failure } from '../model/encoder';

type SearchFailureProps = {
  /**
   * Whose failure: the encoder's, before any image is on the page, where the empty state shows it,
   * or the image's, in the result panel. The empty state is also what the page shows while the
   * workspace is on its way, and an image that fails at once must not land there.
   */
  of: 'encoder' | 'image';
};

/**
 * Why the search failed, as the alert of ADR-0001 D6: one sentence that names the file and what to
 * do, the package's or the browser's own words under it, a button that dismisses it, and nothing
 * while the search has not failed. Where the search is otherwise, the loading, the reading, the
 * trials and the result, is a toast (ADR-0005). The machine makes a new failure of each one, so
 * the next is shown however the last was dismissed.
 */
export function SearchFailure({ of }: SearchFailureProps) {
  const failure = useSearch((snapshot) => {
    const { image, error } = snapshot.context;
    const mine = (image !== null) === (of === 'image');
    return mine && snapshot.matches({ open: 'failed' }) ? error : null;
  });
  const name = useSearch((snapshot) => snapshot.context.image?.name ?? null);
  const format = useSearch((snapshot) => snapshot.context.options.format);
  const maxPixels = useSearch((snapshot) => snapshot.context.options.maxPixels);
  const [dismissed, setDismissed] = useState<Failure | null>(null);

  if (failure === null || failure === dismissed) return null;
  const { sentence, detail } = explain(failure, { name, format, maxPixels });
  return (
    <div
      // into view as it lands: the reader is at the control that failed, which on a phone is further
      // down the bottom expander than the result
      ref={(alert) => alert?.scrollIntoView({ block: 'nearest' })}
      role="alert"
      className="flex w-full items-start gap-2 rounded-md border border-destructive bg-alert px-3 py-2 text-alert-foreground"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-xs/relaxed">{sentence}</p>
        <p className="font-mono text-[0.625rem]/relaxed break-words">{detail}</p>
      </div>
      <Button
        variant="destructive"
        size="icon-xs"
        aria-label="Dismiss"
        className="shrink-0"
        onClick={() => {
          setDismissed(failure);
        }}
      >
        <XIcon />
      </Button>
    </div>
  );
}
