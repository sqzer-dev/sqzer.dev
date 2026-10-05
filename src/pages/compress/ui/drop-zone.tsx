import type { VariantProps } from 'class-variance-authority';
import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';

import { buttonVariants } from '@/shared/ui/button';

/** A file pasted or dropped anywhere on the window goes to `onPick`. Says whether one is being dragged over it. */
export function useWindowFiles(onPick: (file: File) => void) {
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

type FilePickerProps = VariantProps<typeof buttonVariants> & {
  onPick: (file: File) => void;
  /** What the button says, which is also the name of the file input inside it. */
  children: ReactNode;
};

/**
 * The button that opens the picker. It is a `<label>` around a real file input, so the picker
 * opens without a script and the page works without a pointer that can drag (ADR-0001 D1).
 */
export function FilePicker({ variant, size, onPick, children }: FilePickerProps) {
  return (
    <label
      className={buttonVariants({
        variant,
        size,
        className: 'cursor-pointer has-focus-visible:border-ring has-focus-visible:ring-2 has-focus-visible:ring-ring',
      })}
    >
      {children}
      <input
        className="sr-only"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          // the same file picked again is a change again
          event.target.value = '';
        }}
      />
    </label>
  );
}
