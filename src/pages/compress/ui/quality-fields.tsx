import { useId } from 'react';

import { FieldLegend, FieldSet } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';

import type { Applicable } from '../lib/codec';
import type { Controls } from '../model/controls';
import type { ControlsForm } from './form';
import { TargetSlider } from './target-slider';

// A label wrapped around its radio, in the type of `Label`.
const WRAPPED = 'flex items-center gap-2 text-xs/relaxed font-medium';

type ChoiceProps = {
  form: ControlsForm;
  /** Says this is the way the quality is said now. */
  pick: (mode: Controls['mode']) => void;
};

/** The target score, under its radio: the first control of the page. */
function TargetChoice({ form, pick }: ChoiceProps) {
  const label = useId();
  return (
    <div className="flex flex-col gap-2">
      <label id={label} className={WRAPPED}>
        <RadioGroupItem value="target" /> Target score
      </label>
      <form.Field name="target">
        {(field) => <TargetSlider field={field} labelledBy={label} onMove={() => pick('target')} />}
      </form.Field>
    </div>
  );
}

/** A fixed quality, no search. Typing one picks it. */
function QualityChoice({ form, pick }: ChoiceProps) {
  return (
    <div className="flex items-center gap-2">
      <label className={WRAPPED}>
        <RadioGroupItem value="quality" /> Fixed quality
      </label>
      <form.Field name="quality">
        {(field) => (
          <Input
            className="w-24 font-mono"
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            value={field.state.value}
            aria-label="Encoder quality, no search"
            onBlur={field.handleBlur}
            onChange={(event) => {
              pick('quality');
              field.handleChange(event.target.value);
            }}
          />
        )}
      </form.Field>
    </div>
  );
}

type QualityFieldsProps = {
  form: ControlsForm;
  applies: Applicable;
};

/**
 * The way the quality is said (ADR-0001 D3): the target score first, and under it the two
 * alternatives, a fixed quality and lossless, each where `codecs()` says the chosen encoder has
 * it. Moving the slider or typing a quality picks that way, as its radio does.
 */
export function QualityFields({ form, applies }: QualityFieldsProps) {
  const legend = useId();

  return (
    <FieldSet>
      <FieldLegend variant="label" id={legend}>
        Quality
      </FieldLegend>
      <form.Field name="mode">
        {(mode) => (
          <RadioGroup
            className="flex w-auto flex-col gap-3"
            // as the chosen encoder can take it: a lossless choice reads as the target under JPEG
            value={applies.mode}
            aria-labelledby={legend}
            onValueChange={(value: unknown) => {
              if (value === 'target' || value === 'quality' || value === 'lossless') mode.handleChange(value);
            }}
          >
            {applies.target && <TargetChoice form={form} pick={mode.handleChange} />}
            {applies.quality && <QualityChoice form={form} pick={mode.handleChange} />}
            {applies.lossless && (
              <label className={WRAPPED}>
                <RadioGroupItem value="lossless" /> Lossless
              </label>
            )}
          </RadioGroup>
        )}
      </form.Field>
    </FieldSet>
  );
}
