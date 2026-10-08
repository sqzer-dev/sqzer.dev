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

/**
 * What is being typed into the field, null while it is closed, and what applies or drops it. A
 * field closed by a key hands the focus back to the text it opened from, so a keyboard keeps its
 * place in the bar; one left by a click or a tab does not take the focus back.
 */
function useDraft(onZoom: ZoomFieldProps['onZoom']) {
  const [draft, setDraft] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLButtonElement>(null);
  const restore = useRef(false);
  // once, as the field opens: selecting on every keystroke would have each digit replace the last
  const open = draft !== null;
  useEffect(() => {
    if (open) {
      field.current?.focus();
      field.current?.select();
    } else if (restore.current) {
      restore.current = false;
      preview.current?.focus();
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
    restore.current = true;
    event.preventDefault();
  };
  return { draft, setDraft, field, preview, apply, onKeyDown };
}

type FieldProps = Omit<ReturnType<typeof useDraft>, 'preview' | 'draft'> & { draft: string };

/** The field while it is open, in the text's place. */
function Field({ draft, field, setDraft, apply, onKeyDown }: FieldProps) {
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

/** A click's wait for a second one: begun by a click, and dropped by a key or by the bar going. */
function useWait() {
  const waiting = useRef(0);
  const drop = () => {
    clearTimeout(waiting.current);
  };
  useEffect(
    () => () => {
      clearTimeout(waiting.current);
    },
    [],
  );
  return {
    drop,
    begin: (open: () => void) => {
      drop();
      waiting.current = window.setTimeout(open, DOUBLE_CLICK_MS);
    },
  };
}

/**
 * The percent, as an editable in the manner of Ark UI's: the text until it is clicked, then a
 * field in its place, focused, with the number to go to on Enter or on leaving it, and nothing on
 * Escape. A double click goes to 100 %. A click waits a moment for a second one, so a double click
 * does not open the field first.
 */
export function ZoomField({ scale, onZoom }: ZoomFieldProps) {
  const { draft, setDraft, field, preview, apply, onKeyDown } = useDraft(onZoom);
  const wait = useWait();
  const shown = scale === null ? '' : percent(scale);
  const open = () => {
    setDraft(shown);
  };
  const onClick = ({ detail }: MouseEvent<HTMLButtonElement>) => {
    wait.drop();
    if (detail >= 2) onZoom(1);
    else
      wait.begin(() => {
        // not under a reader who has moved on to another control in the meantime. The text may never
        // have had the focus: a click does not give a button the focus on every platform
        const active = document.activeElement;
        if (active === null || active === document.body || active === preview.current) open();
      });
  };
  // a key has no second press to wait for, so it opens the field itself, and no click follows it
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    wait.drop();
    open();
  };

  if (draft !== null)
    return <Field draft={draft} field={field} setDraft={setDraft} apply={apply} onKeyDown={onKeyDown} />;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            ref={preview}
            variant="ghost"
            className="min-w-14 font-mono tabular-nums"
            aria-label={`Zoom ${shown} %`}
          />
        }
        onClick={onClick}
        onKeyDown={onKey}
      >
        {shown} %
      </TooltipTrigger>
      <TooltipContent>Click to type a zoom, double click for 100 %</TooltipContent>
    </Tooltip>
  );
}
