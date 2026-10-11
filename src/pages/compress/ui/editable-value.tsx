import { useEffect, useRef, useState, type KeyboardEvent, type RefObject, type SyntheticEvent } from 'react';

import { Input } from '@/shared/ui/input';

type EditableValueProps = {
  /** What the value reads as, next to its control. */
  text: string;
  /** What the field starts from when it opens, or empty when the value is the default. */
  start: number | null;
  min: number;
  max: number;
  step?: number;
  /** Names the field. */
  label: string;
  onCommit: (value: number) => void;
};

/**
 * A press on the value, and the focus of its field, are the value's own: the radio group around the
 * quality cards selects the text of any input that gains focus inside it, which a number input
 * refuses, and it would hear the press as a pick.
 */
const keep = (event: SyntheticEvent) => {
  event.stopPropagation();
};

type DraftProps = Pick<EditableValueProps, 'min' | 'max' | 'step' | 'label'> & {
  field: RefObject<HTMLInputElement | null>;
  draft: string;
  setDraft: (draft: string) => void;
  apply: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/** The field while it is open, in the text's place. */
function Draft({ field, draft, setDraft, apply, onKeyDown, min, max, step, label }: DraftProps) {
  return (
    <Input
      ref={field}
      type="number"
      inputMode="numeric"
      className="h-5 w-20 px-1 text-right font-mono tabular-nums"
      min={min}
      max={max}
      step={step}
      value={draft}
      aria-label={label}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={apply}
      onKeyDown={onKeyDown}
      onFocus={keep}
      onPointerDown={keep}
      onClick={keep}
    />
  );
}

/** What is being typed, null while the text shows, and what applies or drops it. */
function useDraft({ min, max, onCommit }: Pick<EditableValueProps, 'min' | 'max' | 'onCommit'>) {
  const [draft, setDraft] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const open = draft !== null;
  // once, as the field opens: selecting on every keystroke would have each digit replace the last
  useEffect(() => {
    if (open) {
      field.current?.focus();
      field.current?.select();
    }
  }, [open]);
  const apply = () => {
    const typed = Number(draft);
    if (draft !== null && draft.trim() !== '' && Number.isFinite(typed)) onCommit(Math.min(max, Math.max(min, typed)));
    setDraft(null);
  };
  // leaving the field applies it; the window losing the focus, to another window or frame, does not
  const leave = () => {
    if (document.hasFocus()) apply();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') apply();
    else if (event.key === 'Escape') setDraft(null);
    else return;
    event.preventDefault();
  };
  return { draft, setDraft, field, leave, onKeyDown };
}

/**
 * A value that is typed where it is shown: the text, dotted under, until it is pressed, then a
 * field in its place, focused, with the number to go to on Enter or on leaving it, kept within the
 * range, and nothing on Escape (ADR-0007 D8). The window losing the focus leaves the field open.
 */
export function EditableValue({ text, start, min, max, step = 1, label, onCommit }: EditableValueProps) {
  const { draft, setDraft, field, leave, onKeyDown } = useDraft({ min, max, onCommit });

  if (draft !== null)
    return (
      <Draft
        field={field}
        draft={draft}
        setDraft={setDraft}
        apply={leave}
        onKeyDown={onKeyDown}
        min={min}
        max={max}
        step={step}
        label={label}
      />
    );
  return (
    <button
      type="button"
      className="rounded-sm font-mono text-xs/relaxed text-muted-foreground tabular-nums underline decoration-dotted underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${label}: ${text}. Press to type one`}
      onPointerDown={keep}
      onClick={(event) => {
        keep(event);
        setDraft(start === null ? '' : String(start));
      }}
    >
      {text}
    </button>
  );
}
