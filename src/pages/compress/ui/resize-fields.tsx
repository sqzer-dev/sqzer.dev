import type { EncodeOptions } from '@/shared/api';
import { FieldSet } from '@/shared/ui/field';

import type { Applicable } from '../lib/codec';
import { DEFAULTS } from '../lib/defaults';
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

type ResizeFieldsProps = {
  form: ControlsForm;
  applies: Applicable;
};

/** The box, and how the image meets it: the width and height, the fit, and where and with what. */
function BoxFields({ form, applies }: ResizeFieldsProps) {
  return (
    <>
      <div className="flex gap-3">
        <form.Field name="width">
          {(field) => <NumberField field={field} label="Width" placeholder="original" min={1} />}
        </form.Field>
        <form.Field name="height">
          {(field) => <NumberField field={field} label="Height" placeholder="original" min={1} />}
        </form.Field>
      </div>
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
    </>
  );
}

/**
 * The resize, as one section with a switch, as on Squoosh (ADR-0007 D6): off, nothing of it is
 * sent and the image keeps its size. On, the box, a factor instead of it, whether anything scales
 * up, and the filter.
 */
export function ResizeFields({ form, applies }: ResizeFieldsProps) {
  return (
    <FieldSet className="gap-3">
      <form.Field name="resize">
        {(field) => <SwitchField field={field} label="Resize" help={applies.resize ? undefined : HELP.resize} />}
      </form.Field>
      {applies.resize && (
        <div className="flex flex-col gap-4 pl-9">
          <BoxFields form={form} applies={applies} />
          <form.Field name="scale">
            {(field) => (
              <NumberField field={field} label="Scale" placeholder="none" min={0} step="any" help={HELP.scale} />
            )}
          </form.Field>
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
        </div>
      )}
    </FieldSet>
  );
}
