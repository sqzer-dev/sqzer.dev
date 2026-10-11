import type { EncodeOptions } from '@/shared/api';
import { Field, FieldLabel, FieldSet } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';

import type { Applicable } from '../lib/codec';
import { DEFAULTS } from '../lib/defaults';
import { useSearch } from '../model/context';
import { NumberField, SelectField, SwitchField, TextField } from './fields';
import type { ControlsForm } from './form';
import { choices, HELP } from './help';

/** The values an option takes, in the package's spelling, each with its label. Every value of the package's type, or `tsc` says which is missing. */
type Choices<Key extends 'fit' | 'position' | 'filter'> = Record<NonNullable<EncodeOptions[Key]>, string>;

const FIT: Choices<'fit'> = { inside: 'inside', cover: 'cover', contain: 'contain', fill: 'fill', outside: 'outside' };
const POSITION: Choices<'position'> = {
  center: 'center',
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  'top-left': 'top left',
  'top-right': 'top right',
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right',
};
const FILTER: Choices<'filter'> = {
  lanczos3: 'lanczos3',
  mitchell: 'mitchell',
  'catmull-rom': 'catmull-rom',
  bilinear: 'bilinear',
  box: 'box',
  nearest: 'nearest',
};
/** Shares of the image's size the box can be set to, as Squoosh offers them. */
const PRESETS = ['25', '50', '75', '100'].map((value) => ({ value, label: `${value} %` }));

type ResizeFieldsProps = {
  form: ControlsForm;
  applies: Applicable;
};

/** A side of the box, from the image's size and a share of it. */
const side = (size: number, share: number) => String(Math.max(1, Math.round((size * share) / 100)));

type SideFieldProps = {
  form: ControlsForm;
  which: 'width' | 'height';
  /** The image's size, shown until a side is typed. */
  image: { width: number; height: number } | null;
};

/** A side of the box. Typed, it sets the other by the image's ratio while the lock is on, and the preset no longer holds. */
function SideField({ form, which, image }: SideFieldProps) {
  const other = which === 'width' ? 'height' : 'width';
  const type = (value: string) => {
    if (form.state.values.ratio && image !== null) {
      const factor = which === 'width' ? image.height / image.width : image.width / image.height;
      form.setFieldValue(other, value === '' ? '' : String(Math.max(1, Math.round(Number(value) * factor))));
    }
    form.setFieldValue('preset', '');
  };
  return (
    <form.Field name={which}>
      {(field) => (
        <NumberField
          label={which === 'width' ? 'Width' : 'Height'}
          min={1}
          fallback={image === null ? undefined : String(image[which])}
          placeholder="original"
          field={{
            state: { value: field.state.value },
            handleBlur: field.handleBlur,
            handleChange: (value) => {
              type(value);
              field.handleChange(value);
            },
          }}
        />
      )}
    </form.Field>
  );
}

/** A share of the image's size, which sets both sides. */
function PresetField({ form, image }: Pick<SideFieldProps, 'form' | 'image'>) {
  return (
    <form.Field name="preset">
      {(field) => (
        <SelectField
          label="Preset"
          options={PRESETS}
          help={HELP.preset}
          field={{
            state: { value: field.state.value === '' ? null : field.state.value },
            handleBlur: field.handleBlur,
            handleChange: (value) => {
              if (value !== null && image !== null) {
                form.setFieldValue('width', side(image.width, Number(value)));
                form.setFieldValue('height', side(image.height, Number(value)));
              }
              field.handleChange(value ?? '');
            },
          }}
        />
      )}
    </form.Field>
  );
}

/** The box: width and height side by side, the lock between them, and a preset that sets both. */
function BoxFields({ form }: { form: ControlsForm }) {
  const image = useSearch((snapshot) => snapshot.context.decoded);
  return (
    <>
      <div className="flex gap-3">
        <SideField form={form} which="width" image={image} />
        <SideField form={form} which="height" image={image} />
      </div>
      <form.Field name="ratio">
        {(field) => <SwitchField field={field} label="Keep the ratio" help={HELP.ratio} />}
      </form.Field>
      <PresetField form={form} image={image} />
    </>
  );
}

/** How the image meets the box, and where and with what, then whether anything scales up, and the filter. */
function FitFields({ form, applies }: ResizeFieldsProps) {
  return (
    <>
      <form.Field name="fit">
        {(field) => (
          <SelectField field={field} label="Fit" options={choices(FIT)} fallback={DEFAULTS.fit} help={HELP.fit} />
        )}
      </form.Field>
      {applies.position && (
        <form.Field name="position">
          {(field) => (
            <SelectField
              field={field}
              label="Position"
              options={choices(POSITION)}
              fallback={DEFAULTS.position}
              help={HELP.position}
            />
          )}
        </form.Field>
      )}
      {applies.background && (
        <form.Field name="background">
          {(field) => <TextField field={field} label="Background" placeholder="default" help={HELP.background} />}
        </form.Field>
      )}
      <form.Field name="enlarge">
        {(field) => <SwitchField field={field} label="Allow enlarging" help={HELP.enlarge} />}
      </form.Field>
      <form.Field name="filter">
        {(field) => (
          <SelectField
            field={field}
            label="Filter"
            options={choices(FILTER)}
            fallback={DEFAULTS.filter}
            help={HELP.filter}
          />
        )}
      </form.Field>
    </>
  );
}

/**
 * The resize, as one section under a switch, as on Squoosh (ADR-0007 D6, D7): the row names it and
 * the switch at its end opens it. Off, nothing of it is sent and the image keeps its size.
 */
export function ResizeFields({ form, applies }: ResizeFieldsProps) {
  return (
    <FieldSet className="gap-3">
      <form.Field name="resize">
        {(field) => (
          <Field orientation="horizontal" className="justify-between">
            <FieldLabel htmlFor="resize" className="text-sm">
              Resize
            </FieldLabel>
            <Switch
              id="resize"
              checked={field.state.value}
              onCheckedChange={(checked) => {
                field.handleChange(checked);
              }}
            />
          </Field>
        )}
      </form.Field>
      {applies.resize && (
        <div className="flex flex-col gap-4">
          <BoxFields form={form} />
          <FitFields form={form} applies={applies} />
        </div>
      )}
    </FieldSet>
  );
}
