import { useEffect, useEffectEvent, useState } from 'react';

import { Input } from '@/shared/ui/input';

/** A file pasted or dropped anywhere on the window goes to `onPick`. Says whether one is being dragged over it. */
function useWindowFiles(onPick: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const pick = useEffectEvent(onPick);

  useEffect(() => {
    const listeners = new AbortController();
    const { signal } = listeners;
    const paste = (event: ClipboardEvent) => {
      const file = event.clipboardData?.files[0];
      if (!file) return;
      event.preventDefault();
      pick(file);
    };
    const over = (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    };
    const leave = (event: DragEvent) => {
      // leaving the window, not moving from one element to the next
      if (!event.relatedTarget) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) pick(file);
    };
    addEventListener('paste', paste, { signal });
    addEventListener('dragover', over, { signal });
    addEventListener('dragleave', leave, { signal });
    addEventListener('drop', drop, { signal });
    return () => {
      listeners.abort();
    };
  }, []);

  return dragging;
}

/** Where a file comes in: chosen, pasted, or dropped anywhere on the window. */
export function DropZone({ onPick }: { onPick: (file: File) => void }) {
  const dragging = useWindowFiles(onPick);

  return (
    <label
      htmlFor="file"
      className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm data-dragging:border-foreground data-dragging:bg-muted"
      data-dragging={dragging || undefined}
    >
      <span>Drop an image here, paste one, or choose a file.</span>
      <Input
        id="file"
        type="file"
        className="w-auto max-w-full cursor-pointer"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
    </label>
  );
}
