import { useEffect, useEffectEvent, useState } from 'react';

/** Where a file comes in: chosen, pasted, or dropped anywhere on the window. */
export function DropZone({ onPick }: { onPick: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const pick = useEffectEvent(onPick);

  useEffect(() => {
    const listeners = new AbortController();
    const { signal } = listeners;
    addEventListener(
      'paste',
      (event) => {
        const file = event.clipboardData?.files[0];
        if (!file) return;
        event.preventDefault();
        pick(file);
      },
      { signal },
    );
    addEventListener(
      'dragover',
      (event) => {
        event.preventDefault();
        setDragging(true);
      },
      { signal },
    );
    addEventListener(
      'dragleave',
      (event) => {
        // leaving the window, not moving from one element to the next
        if (!event.relatedTarget) setDragging(false);
      },
      { signal },
    );
    addEventListener(
      'drop',
      (event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer?.files[0];
        if (file) pick(file);
      },
      { signal },
    );
    return () => listeners.abort();
  }, []);

  return (
    <label id="drop" htmlFor="file" data-dragging={dragging || undefined}>
      <span>Drop an image here, paste one, or choose a file.</span>
      <input
        id="file"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
        }}
      />
    </label>
  );
}
