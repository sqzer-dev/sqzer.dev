import type { CodecOption, EncodeOptions } from '@/shared/api';
import { FieldLegend, FieldSet } from '@/shared/ui/field';

import type { Applicable, CodecOptions } from '../lib/codec';
import { DEFAULTS } from '../lib/defaults';
import { kindOf } from '../lib/option-kind';
import { Expander } from './expander';
import { NumberField, RangeField, SelectField, SwitchField, TextField } from './fields';
import type { ControlsForm, FieldOf } from './form';
import { choices, HELP } from './help';

const SUBSAMPLING: Record<NonNullable<EncodeOptions['subsampling']>, string> = {
  auto: 'auto',
  '444': '4:4:4',
  '422': '4:2:2',
  '420': '4:2:0',
};

type AdvancedFieldsProps = {
  form: ControlsForm;
  applies: Applicable;
};

/** The encode: the effort, the subsampling, the search skipped, and what is kept of the input. */
function EncodeFields({ form, applies }: AdvancedFieldsProps) {
  return (
    <>
      <form.Field name="effort">
        {(field) => (
          <RangeField field={field} label="Effort" min={0} max={10} fallback="the package's" help={HELP.effort} />
        )}
      </form.Field>
      {applies.subsampling && (
        <form.Field name="subsampling">
          {(field) => (
            <SelectField
              field={field}
              label="Chroma subsampling"
              options={choices(SUBSAMPLING)}
              fallback={DEFAULTS.subsampling}
              help={HELP.subsampling}
            />
          )}
        </form.Field>
      )}
      {applies.fast && (
        <form.Field name="fast">{(field) => <SwitchField field={field} label="Fast" help={HELP.fast} />}</form.Field>
      )}
      <form.Field name="keepIcc">
        {(field) => <SwitchField field={field} label="Keep the ICC profile" help={HELP.keepIcc} />}
      </form.Field>
      <form.Field name="keepMetadata">
        {(field) => <SwitchField field={field} label="Keep metadata" help={HELP.keepMetadata} />}
      </form.Field>
    </>
  );
}

type CodecFieldProps = {
  /** The option, as `codecs()` lists it: its key, its default and its help. */
  option: CodecOption;
  /** What was set, as the package spells it, or empty for the default. */
  field: FieldOf<string>;
};

type CodecControlProps = CodecFieldProps & {
  /** Sets the option, or clears it when the value is its default. */
  set: (next: string) => void;
};

/** A backend option that is `true` or `false`, shown at its default until it is flipped. */
function CodecSwitch({ option: { key, default: fallback, help }, field, set }: CodecControlProps) {
  const on = (field.state.value === '' ? fallback : field.state.value) === 'true';
  return (
    <SwitchField
      label={key}
      help={help}
      field={{ state: { value: on }, handleBlur: field.handleBlur, handleChange: (checked) => set(String(checked)) }}
    />
  );
}

/** A backend option in a range, resting at its default, which is a number of the range or a word like `auto`. */
function CodecRange({
  option: { key, default: fallback, help },
  field,
  set,
  min,
  max,
}: CodecControlProps & { min: number; max: number }) {
  const number = field.state.value === '' ? null : Number(field.state.value);
  return (
    <RangeField
      label={key}
      help={help}
      min={min}
      max={max}
      fallback={/^-?\d+$/u.test(fallback) ? Number(fallback) : fallback}
      field={{
        state: { value: number },
        handleBlur: field.handleBlur,
        handleChange: (next) => set(next === null ? '' : String(next)),
      }}
    />
  );
}

/**
 * One backend option, as the control its help says it takes (ADR-0007 D6). Every kind shows the
 * default until it is set, and a value set back to the default is the default again: empty.
 */
function CodecField({ option, field }: CodecFieldProps) {
  const { key, default: fallback, help } = option;
  const { value } = field.state;
  const set = (next: string) => {
    field.handleChange(next === fallback ? '' : next);
  };
  const kind = kindOf(option);
  if (kind.kind === 'switch') return <CodecSwitch option={option} field={field} set={set} />;
  if (kind.kind === 'range')
    return <CodecRange option={option} field={field} set={set} min={kind.min} max={kind.max} />;
  if (kind.kind === 'select') {
    return (
      <SelectField
        label={key}
        help={help}
        options={kind.values.map((choice) => ({ value: choice, label: choice }))}
        fallback={fallback}
        field={{
          state: { value: value === '' ? null : value },
          handleBlur: field.handleBlur,
          handleChange: (next) => set(next ?? ''),
        }}
      />
    );
  }
  return <TextField field={field} label={key} fallback={fallback} help={help} />;
}

/** The backend options of the encoder in use, as `codecs()` lists them. */
function CodecFields({ form, groups }: { form: ControlsForm; groups: CodecOptions[] }) {
  return groups.map(({ format, options }) => (
    <FieldSet key={format}>
      <FieldLegend variant="label">{format.toUpperCase()} options</FieldLegend>
      {options.map((option) => (
        <form.Field key={option.key} name={`codecOpts.${option.key}`}>
          {(field) => (
            <CodecField
              option={option}
              field={{
                // the form gives nothing for a key that is not in the record yet
                state: { value: field.state.value ?? '' },
                handleBlur: field.handleBlur,
                handleChange: field.handleChange,
              }}
            />
          )}
        </form.Field>
      ))}
    </FieldSet>
  ));
}

/**
 * Every option of the package that is not the format, the quality or the resize, behind an expander
 * that stays closed until opened (ADR-0001 D3). A control shows only where it applies.
 */
export function AdvancedFields({ form, applies }: AdvancedFieldsProps) {
  return (
    <Expander title="Advanced">
      <EncodeFields form={form} applies={applies} />
      <hr className="border-border" />
      <form.Field name="maxPixels">
        {(field) => (
          <NumberField
            field={field}
            label="Max pixels"
            min={1}
            fallback={String(DEFAULTS.maxPixels)}
            help={HELP.maxPixels}
          />
        )}
      </form.Field>
      {applies.codecOpts.length > 0 && <hr className="border-border" />}
      <CodecFields form={form} groups={applies.codecOpts} />
    </Expander>
  );
}
