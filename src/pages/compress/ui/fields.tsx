import { useId, type ReactNode } from 'react';

import { Field, FieldContent, FieldDescription, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';

import type { FieldOf } from './form';

// The field components, each over a field of the form (`form.ts`), and each saying what the package
// does with it, under the control. A field that was not touched is empty, and says `default` where
// the package has one (ADR-0001 D3).

type FieldProps<Value> = {
  field: FieldOf<Value>;
  label: string;
  /** What the option does, in the package's words. */
  help?: string;
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
  /** What the empty field says: the package's default, or what the package does without it. */
  placeholder?: string;
  min?: number;
  max?: number;
  /** `any` for a factor. */
  step?: number | 'any';
};

/** A number, typed. Empty until it is, which leaves the package its default. */
export function NumberField({ field, label, help, placeholder = 'default', min, max, step = 1 }: NumberFieldProps) {
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
          className="w-24 font-mono"
          type="number"
          inputMode={step === 1 ? 'numeric' : 'decimal'}
          min={min}
          max={max}
          step={step}
          value={field.state.value}
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

type TextFieldProps = FieldProps<string> & { placeholder: string };

/** Text, typed, in the package's own spelling: a colour, or a backend option. */
export function TextField({ field, label, help, placeholder }: TextFieldProps) {
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
          value={field.state.value}
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
};

/** One of the values the package lists, or none, which leaves the package its default. */
export function SelectField<Value extends string>({ field, label, help, options }: SelectFieldProps<Value>) {
  const id = useId();
  const { describedBy, description } = useHelp(help);
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={field.state.value}
        onValueChange={(value: Value | null) => {
          field.handleChange(value);
        }}
      >
        <SelectTrigger id={id} className="w-full" aria-describedby={describedBy}>
          <SelectValue placeholder="default" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>default</SelectItem>
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
