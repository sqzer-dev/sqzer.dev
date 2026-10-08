import { useState, type KeyboardEvent } from 'react';

import { Input } from '@/shared/ui/input';

import { percent } from '../lib/view';

type ZoomFieldProps = {
  /** The picture's scale, in screen pixels per image pixel. Null until the picture is measured. */
  scale: number | null;
  /** The scale to go to. */
  onZoom: (scale: number) => void;
};

/**
 * The percent, as a field: a number typed into it is the zoom to go to, on Enter or on leaving it,
 * and a double click brings the picture to its own pixels.
 */
export function ZoomField({ scale, onZoom }: ZoomFieldProps) {
  // what is being typed, until it is applied or let go
  const [draft, setDraft] = useState<string | null>(null);
  const apply = () => {
    const typed = Number(draft);
    if (draft !== null && draft.trim() !== '' && Number.isFinite(typed) && typed > 0) onZoom(typed / 100);
    setDraft(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') apply();
    else if (event.key === 'Escape') setDraft(null);
    else return;
    event.preventDefault();
  };
  return (
    <span className="flex items-center gap-0.5 font-mono text-xs">
      <Input
        aria-label="Zoom"
        inputMode="numeric"
        className="w-12 text-right font-mono tabular-nums"
        value={draft ?? (scale === null ? '' : percent(scale))}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={apply}
        onKeyDown={onKeyDown}
        onDoubleClick={() => onZoom(1)}
      />
      %
    </span>
  );
}
