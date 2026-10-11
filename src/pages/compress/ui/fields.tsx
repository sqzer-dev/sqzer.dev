import { cn } from 'cn';
import { useId, type ReactNode } from 'react';

import { Field, FieldContent, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import { Switch } from '@/shared/ui/switch';

import { EditableValue } from './editable-value';
import type { FieldOf } from './form';

// The field components, each over a field of the form (`form.ts`), and each saying what the package
// does with it, under the control. A field that was not touched shows the package's default as its
// value, so a field steps from it and a select opens on it, and sends nothing: the field itself is
// empty, and only what is typed or chosen is the reader's (ADR-0001 D3, ADR-0007 D6, D7).

type FieldProps<Value> = {
  field: FieldOf<Value>;
  label: string;
  /** What the option does, in the package's words. */
  help?: string | undefined;
};

/** The help, under the control, and what the control says it is described by. */
function useHelp(help: string | undefined) {
  const id = useId();
  return {
    describedBy: help === undefined ? undefined : id,
    description: help === undefined ? null : <FieldDescription id={id}>{help}</FieldDescription>,
  };
}

/** A label over its control, the help under it. The control keeps its own width inside the field. */
function Labelled({
  id,
  label,
  control,
  description,
}: {
  id: string;
  label: string;
  control: ReactNode;
  description: ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div>{control}</div>
      {description}
    </Field>
  );
}

type NumberFieldProps = FieldProps<string> & {
  /** On the input: `w-full` for a side of the box, say. */
  inputClassName?: string | undefined;
  /** What the empty field shows as its value: the package's default, or the image's own size. */
  fallback?: string | undefined;
  /** What the empty field says when there is no value to show. */
  placeholder?: string | undefined;
  min?: number;
  max?: number;
  /** `any` for a factor. */
  step?: number | 'any';
};

/** A number, typed, or stepped from the default it shows. Empty until it is, which leaves the package its default. */
export function NumberField({
  field,
  label,
  help,
  fallback,
  placeholder,
  min,
  max,
  step = 1,
  inputClassName,
}: NumberFieldProps) {
  const id = useId();
  const { describedBy, description } = useHelp(help);
  return (
    <Labelled
      id={id}
      label={label}
      description={description}
      control={
        <Input
          id={id}
          className={cn('w-28 font-mono', inputClassName)}
          type="number"
          inputMode={step === 1 ? 'numeric' : 'decimal'}
          min={min}
          max={max}
          step={step}
          value={field.state.value === '' && fallback !== undefined ? fallback : field.state.value}
          placeholder={placeholder}
          aria-describedby={describedBy}
          onBlur={field.handleBlur}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      }
    />
  );
}

type TextFieldProps = FieldProps<string> & {
  /** What the empty field shows as its value: the package's default. */
  fallback?: string | undefined;
  placeholder?: string | undefined;
};

/** Text, typed, in the package's own spelling: a colour, or a backend option. */
export function TextField({ field, label, help, fallback, placeholder }: TextFieldProps) {
  const id = useId();
  const { describedBy, description } = useHelp(help);
  return (
    <Labelled
      id={id}
      label={label}
      description={description}
      control={
        <Input
          id={id}
          className="w-36 font-mono"
          value={field.state.value === '' && fallback !== undefined ? fallback : field.state.value}
          placeholder={placeholder}
          aria-describedby={describedBy}
          onBlur={field.handleBlur}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      }
    />
  );
}

type SelectFieldProps<Value extends string> = FieldProps<Value | null> & {
  /** The values the package lists, in its spelling. */
  options: { value: Value; label: string }[];
  /** The package's default, which the select opens on until one is chosen. */
  fallback?: Value;
  /** What the select says with nothing chosen and no default. */
  placeholder?: string;
};

/** One of the values the package lists. It shows the package's default until one is chosen, and sends nothing then. */
export function SelectField<Value extends string>({
  field,
  label,
  help,
  options,
  fallback,
  placeholder = 'default',
}: SelectFieldProps<Value>) {
  const id = useId();
  const { describedBy, description } = useHelp(help);
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={field.state.value ?? fallback ?? null}
        onValueChange={(value: Value | null) => {
          field.handleChange(value);
        }}
      >
        <SelectTrigger id={id} className="w-full" aria-describedby={describedBy}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {fallback === undefined && <SelectItem value={null}>{placeholder}</SelectItem>}
          {options.map(({ value, label: name }) => (
            <SelectItem key={value} value={value}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description}
    </Field>
  );
}

/** On or off. Off until it is turned on, which is the package's default for every one of them. */
export function SwitchField({ field, label, help }: FieldProps<boolean>) {
  const id = useId();
  const { describedBy, description } = useHelp(help);
  return (
    <Field orientation="horizontal">
      <Switch
        id={id}
        checked={field.state.value}
        aria-describedby={describedBy}
        onCheckedChange={(checked) => {
          field.handleChange(checked);
        }}
      />
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description}
      </FieldContent>
    </Field>
  );
}

type RangeFieldProps = FieldProps<number | null> & {
  min: number;
  max: number;
  step?: number;
  /**
   * The package's default, shown until the slider is moved: a number rests the thumb there, any
   * other word, `auto` say, gives the slider a notch left of its range that means the default.
   * Left out, the slider has no default and always says a number.
   */
  fallback?: number | string;
  /** What a value looks like, next to its number. */
  words?: (value: number) => string;
};

/** A number in a range, as a slider with its value at the right, where it can be typed too. Null, the default, until it is moved. */
export function RangeField({ field, label, help, min, max, step = 1, fallback, words }: RangeFieldProps) {
  const id = useId();
  const { describedBy, description } = useHelp(help);
  const chosen = field.state.value;
  // the notch, one step left of the range, when the default is not a number of the range
  const notch = fallback !== undefined && typeof fallback !== 'number';
  const resting = typeof fallback === 'number' ? fallback : min - step;
  const shown = chosen ?? resting;
  const said = (value: number) => (words === undefined ? String(value) : `${value}, ${words(value)}`);
  const text = chosen === null ? (fallback === undefined ? said(shown) : `default: ${fallback}`) : said(chosen);
  return (
    <Field>
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel htmlFor={id} id={`${id}-label`}>
          {label}
        </FieldLabel>
        <EditableValue
          text={text}
          start={chosen ?? (typeof fallback === 'number' ? fallback : null)}
          min={min}
          max={max}
          step={step}
          label={label}
          onCommit={field.handleChange}
        />
      </div>
      <Slider
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        className="px-1.5"
        thumbAlignment="center"
        min={notch ? min - step : min}
        max={max}
        step={step}
        value={[shown]}
        getAriaValueText={(_, value) =>
          value < min || (chosen === null && fallback !== undefined) ? 'default' : said(value)
        }
        onValueChange={(value: number | readonly number[]) => {
          const next = typeof value === 'number' ? value : (value[0] ?? shown);
          field.handleChange(next < min ? null : next);
        }}
      />
      {description}
    </Field>
  );
}
