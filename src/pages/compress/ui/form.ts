import { useForm } from '@tanstack/react-form';
import { useEffect, useRef, type RefObject } from 'react';

import type { EncodeOptions } from '@/shared/api';

import { optionsOf } from '../lib/options-of';
import { useSearchRef } from '../model/context';
import { UNTOUCHED } from '../model/controls';

// How long the controls rest before a search starts with what they say.
const TYPING_MS = 250;

/**
 * What the controls say now, for a pick made above the workspace: the options as they stand, and
 * the change still at rest, dropped. A picked image starts its search with what the controls say at
 * that moment, so a change still at rest has nothing left to report then, and reporting it would end
 * the worker for no reason.
 */
export type ControlsNow = {
  options: () => EncodeOptions;
  settle: () => void;
};

/**
 * The form the controls are the fields of (ADR-0007). It starts untouched. A change of a field rests
 * a moment, then starts a search with what every field says. The workspace holds it, above the
 * panels, so a change of layout keeps it and the empty state carries none of it; the page above
 * reaches it through `now`, for an image picked while the workspace is up.
 */
export function useControlsForm(nowRef: RefObject<ControlsNow | null>) {
  const search = useSearchRef();
  const resting = useRef(0);
  const form = useForm({
    defaultValues: UNTOUCHED,
    listeners: {
      onChange: ({ formApi }) => {
        clearTimeout(resting.current);
        resting.current = window.setTimeout(() => {
          search.send({
            type: 'options',
            options: optionsOf(formApi.state.values, search.getSnapshot().context.codecs),
          });
        }, TYPING_MS);
      },
    },
  });

  useEffect(() => {
    nowRef.current = {
      options: () => optionsOf(form.state.values, search.getSnapshot().context.codecs),
      settle: () => {
        clearTimeout(resting.current);
      },
    };
    return () => {
      nowRef.current = null;
    };
  }, [nowRef, form, search]);

  return form;
}

export type ControlsForm = ReturnType<typeof useControlsForm>;

/**
 * A field of the form, as a field component takes it: what it says and how it is changed. The
 * shape the form's `Field` hands its render prop, named by what matters to the control.
 */
export type FieldOf<Value> = {
  state: { value: Value };
  handleChange: (value: Value) => void;
  handleBlur: () => void;
};
