import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import { percent } from '../lib/view';

type ZoomFieldProps = {
  /** The picture's scale, in screen pixels per image pixel. Null until the picture is measured. */
  scale: number | null;
  /** The scale to go to. */
  onZoom: (scale: number) => void;
};

// How long a click waits for a second one before it opens the field.
const DOUBLE_CLICK_MS = 250;

/** What is being typed into the field, null while it is closed, and what applies or drops it. */
function useDraft(onZoom: ZoomFieldProps['onZoom']) {
  const [draft, setDraft] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  // once, as the field opens: selecting on every keystroke would have each digit replace the last
  const open = draft !== null;
  useEffect(() => {
    if (open) {
      field.current?.focus();
      field.current?.select();
    }
  }, [open]);
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
  return { draft, setDraft, field, apply, onKeyDown };
}

/**
 * The percent, as an editable in the manner of Ark UI's: the text until it is clicked, then a
 * field in its place, focused, with the number to go to on Enter or on leaving it, and nothing on
 * Escape. A double click goes to 100 %. A click waits a moment for a second one, so a double click
 * does not open the field first.
 */
export function ZoomField({ scale, onZoom }: ZoomFieldProps) {
  const { draft, setDraft, field, apply, onKeyDown } = useDraft(onZoom);
  const waiting = useRef(0);
  const shown = scale === null ? '' : percent(scale);
  const open = () => {
    setDraft(shown);
  };
  const onClick = ({ detail }: MouseEvent<HTMLButtonElement>) => {
    clearTimeout(waiting.current);
    if (detail >= 2) onZoom(1);
    else waiting.current = window.setTimeout(open, DOUBLE_CLICK_MS);
  };
  // a key has no second press to wait for, so it opens the field itself, and no click follows it
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    open();
  };

  if (draft !== null) {
    return (
      <span className="flex items-center gap-0.5 font-mono text-xs">
        <Input
          ref={field}
          aria-label="Zoom"
          inputMode="numeric"
          className="w-12 text-right font-mono tabular-nums"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onBlur={apply}
          onKeyDown={onKeyDown}
        />
        %
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" className="min-w-14 font-mono tabular-nums" aria-label={`Zoom ${shown} %`} />}
        onClick={onClick}
        onKeyDown={onKey}
      >
        {shown} %
      </TooltipTrigger>
      <TooltipContent>Click to type a zoom, double click for 100 %</TooltipContent>
    </Tooltip>
  );
}
