import { useId, type ReactNode } from 'react';

import { FieldLegend, FieldSet } from '@/shared/ui/field';
import { RadioGroup, RadioGroupTitle } from '@/shared/ui/radio-group';

import type { Applicable } from '../lib/codec';
import type { Controls } from '../model/controls';
import { RangeField } from './fields';
import type { ControlsForm } from './form';
import { TargetSlider } from './target-slider';

type ChoiceProps = {
  /** The way of saying the quality this card is. */
  value: Controls['mode'];
  title: string;
  /** This is the way chosen now. */
  active: boolean;
  /** The id the title carries, for the control under it to be named by. */
  titleId?: string;
  children?: ReactNode;
};

/**
 * One way to say the quality, as a card: its title is the radio, without a circle, and the card's
 * look says which is chosen, the border on the active one and the others dimmed. A press anywhere
 * on the card picks it, which the group hears by `data-choice`, and so does moving its control.
 */
function Choice({ value, title, active, titleId, children }: ChoiceProps) {
  return (
    <div
      data-choice={value}
      data-active={active || undefined}
      className="flex flex-col gap-2 rounded-md border border-transparent p-2 transition-[border-color,opacity] not-data-active:opacity-60 data-active:border-input"
    >
      <RadioGroupTitle value={value}>
        {/* the id is on the text: the radio gives its own id to its parts */}
        <span id={titleId}>{title}</span>
      </RadioGroupTitle>
      {children}
    </div>
  );
}

type QualityChoiceProps = {
  form: ControlsForm;
  active: boolean;
  /** Says this is the way the quality is said now. */
  pick: () => void;
};

/** A fixed quality, no search, as a slider. Moving it picks this way. */
function QualityChoice({ form, active, pick }: QualityChoiceProps) {
  return (
    <Choice value="quality" title="Fixed quality" active={active}>
      <form.Field name="quality">
        {(quality) => (
          <RangeField
            label="Encoder quality, no search"
            min={0}
            max={100}
            field={{
              state: { value: quality.state.value },
              handleBlur: quality.handleBlur,
              handleChange: (value) => {
                if (value === null) return;
                pick();
                quality.handleChange(value);
              },
            }}
          />
        )}
      </form.Field>
    </Choice>
  );
}

type QualityFieldsProps = {
  form: ControlsForm;
  applies: Applicable;
};

/**
 * The way the quality is said (ADR-0001 D3): the target score first, and under it the two
 * alternatives, a fixed quality and lossless, each where `codecs()` says the chosen encoder has
 * it. Moving a slider picks its way, as its title does.
 */
export function QualityFields({ form, applies }: QualityFieldsProps) {
  const legend = useId();
  const titleId = useId();
  const { mode } = applies;

  return (
    <FieldSet>
      <FieldLegend variant="label" id={legend}>
        Quality
      </FieldLegend>
      <form.Field name="mode">
        {(field) => (
          <RadioGroup
            className="flex w-auto flex-col gap-1"
            value={mode}
            aria-labelledby={legend}
            onValueChange={(value: unknown) => {
              if (value === 'target' || value === 'quality' || value === 'lossless') field.handleChange(value);
            }}
            // a press anywhere on a card picks it; the title has the keys
            onClick={({ target }) => {
              const card = target instanceof Element ? target.closest('[data-choice]') : null;
              const choice = card instanceof HTMLElement ? card.dataset['choice'] : undefined;
              if (choice === 'target' || choice === 'quality' || choice === 'lossless') field.handleChange(choice);
            }}
          >
            {applies.target && (
              <Choice value="target" title="Target score" active={mode === 'target'} titleId={titleId}>
                <form.Field name="target">
                  {(score) => (
                    <TargetSlider field={score} labelledBy={titleId} onMove={() => field.handleChange('target')} />
                  )}
                </form.Field>
              </Choice>
            )}
            {applies.quality && (
              <QualityChoice form={form} active={mode === 'quality'} pick={() => field.handleChange('quality')} />
            )}
            {applies.lossless && <Choice value="lossless" title="Lossless" active={mode === 'lossless'} />}
          </RadioGroup>
        )}
      </form.Field>
    </FieldSet>
  );
}
