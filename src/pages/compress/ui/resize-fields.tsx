import type { EncodeOptions } from '@/shared/api';

import type { Applicable } from '../lib/codec';
import { useSearch } from '../model/context';
import { Expander } from './expander';
import { NumberField, SelectField, SwitchField, TextField } from './fields';
import type { ControlsForm, FieldOf } from './form';
import { choices, chosenFrom, HELP } from './help';
import { RatioLink } from './ratio-link';

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
const PRESETS = ['25', '33.33', '50', '100', '200', '300', '400'].map((value) => ({ value, label: `${value} %` }));

type Size = { width: number; height: number };

/** What a side shows: as typed, or the image's own size. */
const shown = (field: FieldOf<string>, size: number) => (field.state.value === '' ? String(size) : field.state.value);

/** A side of the box, from the image's size and a share of it. */
const side = (size: number, share: number) => String(Math.max(1, Math.round((size * share) / 100)));

type BoxProps = {
  form: ControlsForm;
  /** The image's own size, which the sides show until typed. */
  image: Size | null;
  width: FieldOf<string>;
  height: FieldOf<string>;
};

/** A side of the box. Typed, it sets the other by the image's ratio while the sides are linked. */
function SideField({
  form,
  image,
  which,
  own,
  other,
}: Omit<BoxProps, 'width' | 'height'> & { which: 'width' | 'height'; own: FieldOf<string>; other: FieldOf<string> }) {
  return (
    <NumberField
      label={which === 'width' ? 'Width' : 'Height'}
      min={1}
      inputClassName="w-full"
      fallback={image === null ? undefined : String(image[which])}
      placeholder="original"
      field={{
        state: { value: own.state.value },
        handleBlur: own.handleBlur,
        handleChange: (value) => {
          if (form.state.values.ratio && image !== null) {
            const factor = which === 'width' ? image.height / image.width : image.width / image.height;
            other.handleChange(value === '' ? '' : String(Math.max(1, Math.round(Number(value) * factor))));
          }
          own.handleChange(value);
        },
      }}
    />
  );
}

/**
 * A share of the image's size, which sets both sides, and shows when the sides stand at one; else
 * `Custom`. A share above 100 % allows enlarging, since nothing scales up without it.
 */
function PresetField({ form, image, width, height }: BoxProps) {
  const current =
    image === null
      ? null
      : (PRESETS.find(
          ({ value }) =>
            side(image.width, Number(value)) === shown(width, image.width) &&
            side(image.height, Number(value)) === shown(height, image.height),
        )?.value ?? null);
  return (
    <SelectField
      label="Preset"
      options={PRESETS}
      placeholder="Custom"
      help={HELP.preset}
      field={{
        state: { value: current },
        handleBlur: width.handleBlur,
        handleChange: (value) => {
          if (value === null || image === null) return;
          if (Number(value) > 100) form.setFieldValue('enlarge', true);
          height.handleChange(side(image.height, Number(value)));
          width.handleChange(side(image.width, Number(value)));
        },
      }}
    />
  );
}

/** The box: width and height on one line with the link at their end, at their height, and the preset under them. */
function BoxFields({ form }: { form: ControlsForm }) {
  const image = useSearch((snapshot) => snapshot.context.original);
  return (
    <form.Field name="width">
      {(width) => (
        <form.Field name="height">
          {(height) => (
            <>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <SideField form={form} image={image} which="width" own={width} other={height} />
                </div>
                <div className="flex-1">
                  <SideField form={form} image={image} which="height" own={height} other={width} />
                </div>
                <form.Field name="ratio">{(ratio) => <RatioLink field={ratio} />}</form.Field>
              </div>
              <PresetField form={form} image={image} width={width} height={height} />
            </>
          )}
        </form.Field>
      )}
    </form.Field>
  );
}

type ResizeFieldsProps = {
  form: ControlsForm;
  applies: Applicable;
};

/** The padding of `contain`, typed, empty until then, with the package's word for its default where it would be. */
function BackgroundField({ form }: Pick<ResizeFieldsProps, 'form'>) {
  const fallback = useSearch((snapshot) => snapshot.context.defaults.background);
  return (
    <form.Field name="background">
      {(field) => (
        <TextField field={field} label="Background" placeholder={fallback ?? 'default'} help={HELP.background} />
      )}
    </form.Field>
  );
}

/** How the image meets the box, and where and with what, then whether anything scales up, and the filter. */
function FitFields({ form, applies }: ResizeFieldsProps) {
  const defaults = useSearch((snapshot) => snapshot.context.defaults);
  return (
    <>
      <form.Field name="fit">
        {(field) => (
          <SelectField
            field={field}
            label="Fit"
            options={choices(FIT)}
            fallback={chosenFrom(FIT, defaults.fit)}
            help={HELP.fit}
          />
        )}
      </form.Field>
      {applies.position && (
        <form.Field name="position">
          {(field) => (
            <SelectField
              field={field}
              label="Position"
              options={choices(POSITION)}
              fallback={chosenFrom(POSITION, defaults.position)}
              help={HELP.position}
            />
          )}
        </form.Field>
      )}
      {applies.background && <BackgroundField form={form} />}
      <form.Field name="enlarge">
        {(field) => <SwitchField field={field} label="Allow enlarging" help={HELP.enlarge} />}
      </form.Field>
      <form.Field name="filter">
        {(field) => (
          <SelectField
            field={field}
            label="Filter"
            options={choices(FILTER)}
            fallback={chosenFrom(FILTER, defaults.filter)}
            help={HELP.filter}
          />
        )}
      </form.Field>
    </>
  );
}

/**
 * The resize, behind an expander like Advanced (ADR-0007 D8): the box, how the image meets it, and
 * the filter. The sides show the image's own size until typed, and send nothing then.
 */
export function ResizeFields({ form, applies }: ResizeFieldsProps) {
  return (
    <Expander title="Resize">
      <BoxFields form={form} />
      <FitFields form={form} applies={applies} />
    </Expander>
  );
}
